/**
 * RAOS-0005 · Inventory & Availability — reference implementation
 *
 * Pure, deterministic evaluation of a variant's inventory state. Returns a
 * ComputedAvailability contract and the ReasonEntry[] array the pipeline
 * folds into the DecisionRecord.
 *
 * DETERMINISM CONTRACT (RAOS-0000 / MASTER-BUILD-PLAN §1.3):
 *   - No Date.now(), Math.random(), fetch(), or new Date() anywhere in
 *     this module.
 *   - Time is always the injected `now` parameter (Unix epoch ms).
 *   - Reservation state is passed as explicit input (no module-level mutable
 *     state). Two calls with the same inputs produce identical outputs.
 *
 * VARIANTS WITHOUT INVENTORY CONFIG:
 *   When a variant has no `inventory` config, the evaluator treats it as
 *   `in_stock` and emits NO reasons. This preserves the implicit behavior of
 *   all pre-RAOS-0005 catalog variants and ensures golden fixtures for those
 *   variants are unchanged.
 *
 * OVERSELL RACE (spec note, not code):
 *   When two agents evaluate the same last unit simultaneously, each call
 *   produces a deterministic result *per evaluation*. The reservation TTL
 *   is the checkout-time mitigation: the checkout system is responsible for
 *   atomic stock decrement and must reject the second checkout if stock is
 *   exhausted. RAOS-0005 surfaces the RESERVATION_EXPIRED signal to trigger
 *   re-evaluation by the agent before checkout.
 */

import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { ReasonEntry } from '@/lib/types/reasons';
import type {
  InventoryConfig,
  InventoryHold,
  ComputedAvailability,
  InventoryState,
} from '@/lib/types/inventory';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INVENTORY_NAMESPACE = 'com.os.retailagent.shopping.inventory';
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const DEFAULT_DATA_TTL_SECONDS = 60;
const DEFAULT_RESERVATION_TTL_SECONDS = 900; // 15 minutes

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface InventoryEvaluationInput {
  variant: Variant;
  /**
   * Buyer context — used to check fulfillmentMode against per-location stock.
   * For the pickup path, we surface LOCATION_OUT_OF_STOCK when the buyer's
   * preferred location has no stock even if another does.
   * (RAOS-0003 will do the full feasibility join; here we emit the signal.)
   */
  context: BuyerContext;
  /**
   * Active soft holds for this variant. Pass an empty array when no holds
   * are in effect. Never undefined — the caller controls hold state.
   */
  holds: InventoryHold[];
  /**
   * Injected Unix epoch milliseconds. Never call Date.now() here.
   * Used for freshness computation and reservation expiry checks.
   */
  now: number;
}

export interface InventoryEvaluationResult {
  availability: ComputedAvailability;
  reasons: ReasonEntry[];
  /**
   * True when an BLOCK-severity reason is present (OUT_OF_STOCK or
   * RESERVATION_EXPIRED). Used by the evaluator wrapper to decide whether
   * to surface the block in the ELIGIBILITY stage output.
   */
  blocked: boolean;
}

/**
 * Evaluate a variant's inventory state given the current buyer context,
 * any active reservation holds, and the injected now timestamp.
 *
 * Returns ComputedAvailability + reason codes. Never throws.
 */
export function evaluateInventory(
  input: InventoryEvaluationInput,
): InventoryEvaluationResult {
  const { variant, context, holds, now } = input;
  const config = variant.inventory;

  // -------------------------------------------------------------------------
  // No inventory config → treat as in_stock, emit nothing.
  // This preserves pre-RAOS-0005 implicit behavior for all existing variants.
  // -------------------------------------------------------------------------
  if (!config) {
    return {
      availability: {
        state: 'in_stock',
        freshness: {
          computedAt: now,
          ttlSeconds: DEFAULT_DATA_TTL_SECONDS,
        },
      },
      reasons: [],
      blocked: false,
    };
  }

  const reasons: ReasonEntry[] = [];
  const dataTtl = config.dataTtlSeconds ?? DEFAULT_DATA_TTL_SECONDS;

  // -------------------------------------------------------------------------
  // Step 1: Freshness check
  //
  // If the inventory data itself is stale (dataFetchedAt + dataTtl < now),
  // emit STOCK_STALE. The agent must re-fetch before acting.
  // We do NOT block here — the agent decides whether to use stale data.
  // -------------------------------------------------------------------------
  const dataFetchedAt = config.dataFetchedAt ?? now;
  const isStale = (dataFetchedAt + dataTtl * 1000) < now;
  if (isStale) {
    reasons.push({
      code: 'STOCK_STALE',
      message: `Inventory data is stale (fetched ${Math.round((now - dataFetchedAt) / 1000)}s ago, TTL ${dataTtl}s). Re-fetch before acting.`,
      severity: 'CONDITION',
      blocking: false,
      source: INVENTORY_NAMESPACE,
    });
  }

  // -------------------------------------------------------------------------
  // Step 2: Reservation expiry check
  //
  // If there is an active hold for this variant that has expired, the item
  // must be re-evaluated. Emit RESERVATION_EXPIRED (BLOCK).
  // An expired hold is one where heldAt + ttlSeconds * 1000 < now.
  // -------------------------------------------------------------------------
  const expiredHolds = holds.filter(
    h => h.variantId === variant.id && (h.heldAt + h.ttlSeconds * 1000) < now,
  );
  if (expiredHolds.length > 0) {
    reasons.push({
      code: 'RESERVATION_EXPIRED',
      message: `A soft hold on this item expired ${Math.round((now - (expiredHolds[0].heldAt + expiredHolds[0].ttlSeconds * 1000)) / 1000)}s ago. Re-evaluate availability before checkout.`,
      severity: 'BLOCK',
      blocking: true,
      source: INVENTORY_NAMESPACE,
    });
    // Return early — an expired hold is always a block.
    return {
      availability: makeAvailability(config, now, dataTtl),
      reasons,
      blocked: true,
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: State-based evaluation
  // -------------------------------------------------------------------------
  const state = config.state;

  switch (state) {
    case 'out_of_stock': {
      reasons.push({
        code: 'OUT_OF_STOCK',
        message: 'This item is out of stock and cannot be added to cart. You may request a notification when it becomes available.',
        severity: 'BLOCK',
        blocking: true,
        requirements: [
          {
            type: 'customer_type',
            value: 'notify-me',
            message: 'Request notify-me alert (RAOS-0013 intent capture)',
          },
        ],
        source: INVENTORY_NAMESPACE,
      });
      break;
    }

    case 'backorder': {
      reasons.push({
        code: 'BACKORDER_AVAILABLE',
        message: config.backorderEta
          ? `Item is on backorder with estimated availability: ${config.backorderEta}. You can order now and receive it when restocked.`
          : 'Item is on backorder. You can order now and receive it when restocked.',
        severity: 'CONDITION',
        blocking: false,
        requirements: config.backorderEta
          ? [{ type: 'customer_type', value: 'acknowledged', message: `ETA: ${config.backorderEta}` }]
          : [],
        source: INVENTORY_NAMESPACE,
      });
      break;
    }

    case 'preorder': {
      reasons.push({
        code: 'PREORDER_NOT_YET_BUYABLE',
        message: config.preorderReleaseDate
          ? `This item is available for preorder — release date: ${config.preorderReleaseDate}. It is visible but cannot be added to cart until release.`
          : 'This item is available for preorder but cannot be purchased until its release date.',
        severity: 'CONDITION',
        blocking: false,
        requirements: config.preorderReleaseDate
          ? [{ type: 'customer_type', value: 'preorder', message: `Release date: ${config.preorderReleaseDate}` }]
          : [],
        source: INVENTORY_NAMESPACE,
      });
      break;
    }

    case 'low_stock':
    case 'in_stock': {
      const threshold = config.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
      const qty = config.quantityAvailable;

      // Normalize: if declared in_stock but quantity is at or below threshold,
      // treat as low_stock for display purposes.
      const effectivelyLow =
        state === 'low_stock' ||
        (qty !== undefined && qty <= threshold);

      if (effectivelyLow && qty !== undefined && qty > 0) {
        reasons.push({
          code: 'LOW_STOCK',
          message: `Only ${qty} left in stock — limited availability.`,
          severity: 'INFO',
          blocking: false,
          source: INVENTORY_NAMESPACE,
        });
      }

      // Per-location check: when buyer wants pickup, check their preferred location.
      // If a perLocation array is provided and the buyer is in pickup mode, we
      // check whether any location has stock. If the buyer's region can be mapped
      // to a locationId and it has 0 stock, emit LOCATION_OUT_OF_STOCK.
      if (config.perLocation && config.perLocation.length > 0) {
        const pickupMode = context.fulfillmentMode === 'pickup';
        if (pickupMode) {
          // Check if any location has stock at all
          const locationsWithStock = config.perLocation.filter(l => l.quantity > 0);
          const locationsWithoutStock = config.perLocation.filter(l => l.quantity === 0);

          if (locationsWithStock.length === 0) {
            // All locations out of stock — escalate to OUT_OF_STOCK
            reasons.push({
              code: 'OUT_OF_STOCK',
              message: 'This item is out of stock at all available pickup locations.',
              severity: 'BLOCK',
              blocking: true,
              requirements: [
                {
                  type: 'customer_type',
                  value: 'notify-me',
                  message: 'Request notify-me alert (RAOS-0013 intent capture)',
                },
              ],
              source: INVENTORY_NAMESPACE,
            });
          } else if (locationsWithoutStock.length > 0) {
            // Some locations have it, some don't — CONDITION
            const haveIds = locationsWithStock.map(l => l.locationId).join(', ');
            const missingIds = locationsWithoutStock.map(l => l.locationId).join(', ');
            reasons.push({
              code: 'LOCATION_OUT_OF_STOCK',
              message: `Available for pickup at: ${haveIds}. Not available at: ${missingIds}.`,
              severity: 'CONDITION',
              blocking: false,
              requirements: [
                {
                  type: 'customer_type',
                  value: 'location_select',
                  message: `Select a pickup location with stock: ${haveIds}`,
                },
              ],
              source: INVENTORY_NAMESPACE,
            });
          }
        }
      }

      break;
    }
  }

  const blocked = reasons.some(r => r.severity === 'BLOCK');

  return {
    availability: {
      ...makeAvailability(config, now, dataTtl),
      // Propagate onlyXLeft only for in/low stock
      ...(
        (state === 'in_stock' || state === 'low_stock') &&
        config.quantityAvailable !== undefined
          ? { onlyXLeft: config.quantityAvailable }
          : {}
      ),
    },
    reasons,
    blocked,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build the base ComputedAvailability from config.
 * Caller may spread additional fields (onlyXLeft) on top.
 */
function makeAvailability(
  config: InventoryConfig,
  now: number,
  dataTtl: number,
): ComputedAvailability {
  const result: ComputedAvailability = {
    state: config.state,
    freshness: {
      computedAt: now,
      ttlSeconds: dataTtl,
    },
  };

  if (config.perLocation) {
    result.perLocation = config.perLocation;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reservation factory — for use by the playground simulator
// ---------------------------------------------------------------------------

/**
 * Create a soft hold record. Called by the playground's "add to cart" action.
 * Returns the hold that should be stored and passed as input on subsequent
 * evaluations. Pure — does not persist state.
 */
export function createSoftHold(
  variantId: string,
  quantity: number,
  now: number,
  ttlSeconds: number = DEFAULT_RESERVATION_TTL_SECONDS,
): InventoryHold {
  return {
    variantId,
    quantity,
    heldAt: now,
    ttlSeconds,
  };
}

/**
 * Check if a hold is still active at the given `now`.
 * Pure — no side effects.
 */
export function isHoldActive(hold: InventoryHold, now: number): boolean {
  return (hold.heldAt + hold.ttlSeconds * 1000) >= now;
}
