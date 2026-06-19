/**
 * RAOS-0005: Inventory & Availability Evaluator
 *
 * Registered in the ELIGIBILITY stage at priority 20 (after the RAOS-0001
 * eligibility evaluator at priority 10). An out-of-stock item is visible
 * but not addable — this evaluator adds the availability BLOCK to the
 * eligibility gate.
 *
 * The ComputedAvailability output rides as an INFO-level structured output
 * on the DecisionRecord (accessible via priorResults in later stages).
 *
 * DETERMINISM: `now` is always injected from the pipeline. Never calls
 * Date.now() or new Date() inside this module.
 */

import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { UcpExtension, ExtensionResult } from '../contract';
import type { ComputedAvailability, InventoryHold } from '@/lib/types/inventory';
import { evaluateInventory } from '@/lib/rules/inventory';

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------

export const INVENTORY_NAMESPACE = 'com.os.retailagent.shopping.inventory';

// ---------------------------------------------------------------------------
// Evaluator input config
// ---------------------------------------------------------------------------

/**
 * The config this evaluator reads from a variant.
 * `holds` is injected from the pipeline input context (see below).
 *
 * Because UcpExtension.readConfig only receives a Variant, reservation holds
 * must be surfaced via a separate mechanism. The evaluator uses a module-level
 * holds getter that callers set before evaluation. This is the only acceptable
 * use of module-level state because:
 *   (a) holds are per-evaluation-call, set immediately before evaluateOffer
 *   (b) they are pure data with no side effects
 *   (c) this pattern is the minimal shim until the pipeline grows a
 *       "pre-evaluation context" slot (a future RAOS-0000 extension point)
 *
 * Alternatively, callers can pass an empty array (no active holds) — which
 * is the default when calling evaluateOffer without explicit hold state.
 */

type InventoryConfig = {
  variant: Variant;
  holds: InventoryHold[];
};

// Module-level holds slot — set by setInventoryHolds() before evaluateOffer.
// This is reset to [] after each evaluation to prevent hold state leaking
// across calls. Tests must call setInventoryHolds() explicitly.
let _activeHolds: InventoryHold[] = [];

/**
 * Set the active reservation holds to be used in the next inventory
 * evaluation. Callers (playground, tests) set this before calling
 * evaluateOffer. Automatically reset to [] after use.
 */
export function setInventoryHolds(holds: InventoryHold[]): void {
  _activeHolds = holds;
}

/**
 * Read and clear the active holds. Called internally by the evaluator's
 * evaluate() to consume and reset the slot.
 */
function consumeHolds(): InventoryHold[] {
  const holds = _activeHolds;
  _activeHolds = [];
  return holds;
}

// ---------------------------------------------------------------------------
// ELIGIBILITY-stage inventory evaluator
// ---------------------------------------------------------------------------

export const inventoryEvaluator: UcpExtension<InventoryConfig, ComputedAvailability> = {
  namespace: INVENTORY_NAMESPACE,
  version: '1.0.0',
  stage: 'ELIGIBILITY',
  /**
   * Priority 20 — runs AFTER the RAOS-0001 eligibility evaluator (priority 10).
   * An OOS item is visible; this evaluator adds the addability block.
   */
  priority: 20,
  reasonCodes: [
    'OUT_OF_STOCK',
    'LOW_STOCK',
    'BACKORDER_AVAILABLE',
    'PREORDER_NOT_YET_BUYABLE',
    'STOCK_STALE',
    'LOCATION_OUT_OF_STOCK',
    'RESERVATION_EXPIRED',
  ] as const,

  readConfig(variant: Variant): InventoryConfig | undefined {
    // Always return a config — even without inventory data we want to run
    // the evaluator (it gracefully returns "in_stock, no reasons" for
    // variants with no inventory config). However, to keep the pipeline
    // efficient and not pollute DecisionRecords for merchants that haven't
    // declared inventory at all, only run when the variant OR the merchant
    // manifest has the inventory capability. The manifest check is done at
    // the pipeline level (manifestSubset); here we always return a config.
    //
    // The evaluator is only called when the merchant's manifest includes
    // the inventory capability — so readConfig need not guard on that.
    return { variant, holds: [] };
  },

  evaluate({
    config,
    context,
    now,
  }: {
    config: InventoryConfig;
    context: BuyerContext;
    priorResults: unknown;
    now: number;
  }): ExtensionResult<ComputedAvailability> {
    // Consume module-level holds (set by caller before evaluateOffer).
    const holds = consumeHolds();

    const result = evaluateInventory({
      variant: config.variant,
      context,
      holds,
      now,
    });

    return {
      namespace: INVENTORY_NAMESPACE,
      reasons: result.reasons,
      output: result.availability,
    };
  },
};
