/**
 * RAOS-0005 · Inventory & Availability
 *
 * Types for the inventory extension — variant config, computed availability,
 * and reservation state.
 *
 * DETERMINISM CONTRACT:
 *   All time comparisons use the injected `now` parameter from the pipeline.
 *   No Date.now(), new Date(), or I/O anywhere in src/lib/rules/** or
 *   src/lib/extensions/**. Reservation state is passed as explicit input;
 *   no module-level mutable state.
 */

import type { Freshness } from './envelope';

// ---------------------------------------------------------------------------
// Variant config (merchant-declared)
// ---------------------------------------------------------------------------

/**
 * Availability state values a merchant declares on a variant.
 *
 * - `in_stock`:     Available now, at declared quantity.
 * - `low_stock`:    Available but threshold count reached (triggers LOW_STOCK INFO).
 * - `out_of_stock`: Not available; agent should not recommend for immediate add.
 * - `backorder`:    Unavailable now but orderable with an ETA.
 * - `preorder`:     Product not yet released; visible but not immediately buyable.
 */
export type InventoryState =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'backorder'
  | 'preorder';

/** Per-location stock breakdown for merchants that track store-level inventory. */
export interface LocationStock {
  locationId: string;
  quantity: number;
}

/**
 * The merchant-declared inventory configuration on a variant.
 *
 * All fields except `state` and `reservationPolicy` are optional.
 * Variants without this config are treated as `in_stock` with no reasons
 * emitted — this preserves the implicit behavior of pre-RAOS-0005 variants.
 */
export interface InventoryConfig {
  /** Canonical availability state at the time of last update. */
  state: InventoryState;

  /**
   * Absolute quantity available across all locations.
   * When set and state is `in_stock` or `low_stock`, used to compute onlyXLeft.
   */
  quantityAvailable?: number;

  /**
   * Per-location breakdown. Used for BOPIS / pickup scenarios where a buyer's
   * fulfillment location determines whether the item is available to them.
   * RAOS-0003 (Fulfillment Feasibility) joins this data later; here we expose
   * the raw per-location state as output on ComputedAvailability.
   */
  perLocation?: LocationStock[];

  /**
   * For `backorder` state: an ISO 8601 date string (e.g. "2026-08-01") or a
   * human-readable description of the expected replenishment date.
   * Emitted in BACKORDER_AVAILABLE reason requirements[].
   */
  backorderEta?: string;

  /**
   * For `preorder` state: an ISO 8601 date string (e.g. "2026-09-15") or a
   * human-readable description of the release date.
   * Emitted in PREORDER_NOT_YET_BUYABLE reason requirements[].
   */
  preorderReleaseDate?: string;

  /**
   * When quantityAvailable is at or below this threshold, state is effectively
   * `low_stock` even if declared as `in_stock`, and LOW_STOCK is emitted.
   * Default: 5 if unset.
   */
  lowStockThreshold?: number;

  /**
   * Reservation policy on add-to-cart:
   * - `none`:      No hold placed; stock is first-come first-served at checkout.
   * - `soft_hold`: A soft reservation is placed for `reservationTtlSeconds`.
   *               If the hold expires before checkout, the item must be
   *               re-evaluated (RESERVATION_EXPIRED block at cart stage).
   */
  reservationPolicy: 'none' | 'soft_hold';

  /**
   * How long (in seconds) a soft hold is valid after add-to-cart.
   * Only relevant when `reservationPolicy === 'soft_hold'`.
   * Default: 900 (15 minutes) if unset.
   */
  reservationTtlSeconds?: number;

  /**
   * Unix epoch milliseconds at which this inventory data was last fetched
   * from the merchant's source-of-truth. Used to compute freshness / staleness.
   * Set by the evaluator from the injected `now` when absent.
   */
  dataFetchedAt?: number;

  /**
   * TTL in seconds for the inventory data itself (independent of reservation TTL).
   * After this period, STOCK_STALE is emitted. Default: 60 seconds (per RAOS-0008
   * spec guidance: inventory TTL = 60s; price TTL = 300s; eligibility TTL = 3600s).
   */
  dataTtlSeconds?: number;
}

// ---------------------------------------------------------------------------
// Reservation state (injected as input — never module-level mutable state)
// ---------------------------------------------------------------------------

/**
 * An active soft hold placed by a prior add-to-cart action.
 *
 * Reservation state is always passed as explicit input to the evaluator
 * (never stored in module-level mutable state). The pipeline caller is
 * responsible for tracking holds. This ensures the determinism invariant:
 * same (config, context, holds, now) → same output.
 *
 * Oversell race: two agents evaluating concurrently each see a deterministic
 * result per-evaluation. The reservation TTL is the checkout-time mitigation —
 * the checkout system is responsible for atomic stock decrement. The RAOS layer
 * surfaces the RESERVATION_EXPIRED signal to trigger re-evaluation.
 */
export interface InventoryHold {
  /** The variant this hold is for. */
  variantId: string;
  /** Quantity reserved. */
  quantity: number;
  /** Unix epoch milliseconds at which this hold was placed. */
  heldAt: number;
  /** TTL in seconds. Expiry = heldAt + ttlSeconds * 1000. */
  ttlSeconds: number;
}

// ---------------------------------------------------------------------------
// Computed output contract
// ---------------------------------------------------------------------------

/**
 * The computed availability state produced by the inventory evaluator.
 *
 * `freshness` is MANDATORY here — inventory is the most time-sensitive data
 * in the pipeline (TTL default 60s). RAOS-0008 will add full provenance
 * signing; this field establishes the freshness seam.
 */
export interface ComputedAvailability {
  /** The resolved availability state after evaluating config + holds + now. */
  state: InventoryState;

  /**
   * Set when state is `low_stock` or `in_stock` with quantity <= threshold.
   * The integer value is the number the agent should surface: "Only 3 left".
   */
  onlyXLeft?: number;

  /**
   * Per-location breakdown from the variant config, passed through for
   * RAOS-0003 (Fulfillment Feasibility) to join on location-specific
   * availability. Present only when the variant has perLocation data.
   */
  perLocation?: LocationStock[];

  /**
   * Freshness envelope for this availability data (mandatory for inventory).
   * `computedAt` is set from the injected `now`. `ttlSeconds` comes from
   * `InventoryConfig.dataTtlSeconds` (default 60).
   */
  freshness: Freshness;
}
