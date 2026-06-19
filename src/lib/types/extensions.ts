/**
 * Extension types for UCP Commerce Extension Demo.
 *
 * WP-02: This file has been updated to align with RAOS-0000.
 *
 * - `CustomerType`, `MembershipTier`, `FulfillmentMode`, `PricingContext` are
 *   now defined in `context.ts` and re-exported here for backward compatibility.
 *   Callers importing from this file continue to work unchanged.
 *
 * - `EligibilityReason` is now aligned with `ReasonEntry` from `reasons.ts`:
 *   it gains `severity` and `source` fields. The `blocking` field is kept
 *   (@deprecated) and is derived from severity.
 *
 * - `ComputedEligibility.status` is now derived per RAOS-0000 §8.1.
 */

import { CartLine } from './core';

// ---------------------------------------------------------------------------
// Re-exports from context.ts (canonical home post-WP-02)
// ---------------------------------------------------------------------------

export type {
  CustomerType,
  LoyaltyTier,
  MembershipTier,
  FulfillmentMode,
  BuyerContext,
  BuyerContextTrust,
  PartialBuyerContext,
  PricingContext,
} from './context';

// ---------------------------------------------------------------------------
// Requirements & Rules (Input configs) — unchanged
// ---------------------------------------------------------------------------

export interface EligibilityRules {
  hideFromGuests?: boolean;
  requireWholesale?: boolean;
  requiredTier?: import('./context').MembershipTier;
  requireResaleCertificate?: boolean;
}

export interface Requirement {
  type: 'customer_type' | 'membership_tier' | 'tax_exempt' | 'resale_certificate' | 'moq' | 'quantity_increment';
  value: unknown;
  message?: string;
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
}

export interface MemberPricing {
  available: boolean;
  teaserPrice?: number;
  memberPrice?: number;
  requiredTier?: import('./context').MembershipTier;
  /**
   * Per-order purchase limit for member pricing (RAOS-0002).
   * When the cart quantity exceeds this, PURCHASE_LIMIT_EXCEEDED is emitted
   * at cart stage (BLOCK severity). Owned by RAOS-0002; regulated-goods
   * per-customer limits are owned by RAOS-0011.
   */
  purchaseLimit?: number;
}

export interface BulkPricing {
  available: boolean;
  tiers?: PriceTier[];
  moq?: number;
  quantityIncrement?: number;
  /**
   * Per-order purchase limit for bulk pricing (RAOS-0002).
   * Enforced at cart stage. See MemberPricing.purchaseLimit for rationale.
   */
  purchaseLimit?: number;
}

export interface FulfillmentConstraints {
  availableModes?: import('./context').FulfillmentMode[];
  restrictedRegions?: string[]; // e.g., states or country codes where it cannot be sold
}

export interface PromoTier {
  minQuantity: number;
  promoPrice: number; // e.g., $2.50 each if you buy 2
  description?: string;
}

export interface PromoPricing {
  available: boolean;
  salePrice?: number; // simple markdown
  tiers?: PromoTier[]; // quantity-based promos
  description?: string; // e.g., "Weekly Ad Sale"
}

// ---------------------------------------------------------------------------
// RAOS-0002: Applied / Suppressed Offer shapes (forward-compatible for 0006/0007)
// ---------------------------------------------------------------------------

/**
 * An offer that was applied to compute the current unit price.
 *
 * This is the LOAD-BEARING forward shape: RAOS-0006 (stacking ladder) and
 * RAOS-0007 (quote token) bind this exact structure. Do not bikeshed it once
 * shipped — field additions are additive (RAOS-0000 §7.4).
 *
 * `type` is an extensible string union — RAOS-0006 will add 'promo_sale' and
 * 'promo_tier' entries as values already in scope here. Consumers must not
 * switch-exhaust this type.
 *
 * `priority`, `stackable`, and `exclusive` are present from day one even
 * though RAOS-0002 does not yet do stacking. RAOS-0006 will populate them
 * rather than reshaping the contract (MASTER-BUILD-PLAN §1.2-4).
 */
export interface AppliedOffer {
  /** Stable identifier for this offer instance. */
  offerId: string;

  /**
   * Offer type. Extensible — consumers must not crash on unknown values.
   * RAOS-0002 emits: 'member' | 'bulk_tier'
   * RAOS-0006 will add: 'promo_sale' | 'promo_tier'
   */
  type: 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier' | string;

  /** Owning namespace (trace attribution). */
  namespace: string;

  /**
   * Evaluation priority within the stacking ladder (RAOS-0006).
   * Lower = applied first. RAOS-0002 sets member=10, bulk=20, promo=30
   * mirroring the evaluator sub-priorities from WP-01.
   */
  priority: number;

  /**
   * Whether this offer can stack with others already applied.
   * RAOS-0002 sets false — single-offer semantics. RAOS-0006 makes this live.
   */
  stackable: boolean;

  /**
   * Whether this offer is exclusive (prevents all further stacking).
   * RAOS-0002 sets false. RAOS-0006 makes this live.
   */
  exclusive: boolean;

  /** The unit price after this offer is applied. */
  unitPriceAfter: number;

  /** Human-readable description of the offer. */
  description: string;
}

/**
 * An offer that was evaluated but NOT applied (e.g. member price was
 * superseded by bulk tier in last-wins semantics).
 *
 * `suppressedBy` and `reason` explain which offer won and why.
 * RAOS-0006 will enrich the `reason` vocabulary (floor protection, etc.).
 */
export interface SuppressedOffer extends Omit<AppliedOffer, 'unitPriceAfter'> {
  /** The offerId of the winning offer that caused this suppression. */
  suppressedBy: string;

  /** Machine-readable suppression reason code (RAOS-0002 / RAOS-0006). */
  reason: string;
}

// ---------------------------------------------------------------------------
// Computed Output Contracts (UI-ready)
// ---------------------------------------------------------------------------

import type { ReasonSeverity } from './reasons';

/**
 * A single reason emitted by an eligibility evaluator (RAOS-0000 §8).
 *
 * WP-02: `severity` and `source` fields added; `blocking` kept as
 * @deprecated derived from `severity !== 'INFO'`.
 */
export interface EligibilityReason {
  code: string;
  message: string;

  /**
   * Severity per RAOS-0000 §8.1.
   * - BLOCK:     gates the transaction.
   * - CONDITION: resolvable path available.
   * - INFO:      advisory only.
   */
  severity: ReasonSeverity;

  /**
   * @deprecated Use `severity !== 'INFO'` instead.
   * Derived: `true` when `severity !== 'INFO'`.
   * @supersededBy severity
   */
  blocking: boolean;

  requirements?: Requirement[];

  /** Owning namespace — trace attribution (RAOS-0000 §8.2). */
  source: string;
}

export interface ComputedVisibility {
  status: 'VISIBLE' | 'HIDDEN';
  reason?: string;
}

export interface ComputedEligibility {
  /** Derived per RAOS-0000 §8.1 via `deriveEligibilityStatus`. */
  status: 'ELIGIBLE' | 'CONDITIONAL' | 'BLOCKED';
  reasons: EligibilityReason[];
}

/**
 * ComputedPriceState v2 (RAOS-0002).
 *
 * New fields: `currency`, `appliedOffers`, `suppressedOffers`.
 * The old `appliedOfferState` string field is kept and emitted for one minor
 * version (backward compat) but is @deprecated — use `appliedOffers` instead.
 *
 * Rounding policy: half-up to cents (USD only per C toggle; multi-currency → V2).
 */
export interface ComputedPriceState {
  /** Final unit price in the smallest unit (dollars with cents). */
  unitPrice: number;

  /**
   * Currency code. Always 'USD' in v1 (RAOS-0000 §11 — single-currency seam).
   * Carried as a field so RAOS-0007 quote tokens and future multi-currency work
   * can bind it without reshaping the contract.
   */
  currency: 'USD' | string;

  /** Which pricing path produced the final unitPrice. */
  priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';

  /**
   * All offers that were applied (contributed to the final unitPrice).
   * RAOS-0007 quote tokens bind this array exactly as shipped.
   * RAOS-0006 will add entries; the array shape is stable.
   */
  appliedOffers: AppliedOffer[];

  /**
   * Offers that were evaluated but suppressed (e.g. bulk tier won over member).
   * Agents should surface these in "price breakdown" UI so buyers understand
   * why their expected discount didn't apply.
   */
  suppressedOffers: SuppressedOffer[];

  /**
   * Display-only teaser for unqualified buyers (e.g. guests seeing a member price).
   * A teaser price is NEVER addable to cart — that constraint is enforced by
   * RAOS-0001 eligibility. The cross-reference: a guest sees TEASER_LOCKED here;
   * RAOS-0001 emits the actual BLOCK reason that prevents cart add.
   */
  teaser?: {
    message: string;
    price: number;
  };

  // -------------------------------------------------------------------------
  // Deprecated fields — kept for one minor version per RAOS-0000 §7.4
  // -------------------------------------------------------------------------

  /**
   * @deprecated Use `appliedOffers[0]?.description` instead.
   * Free-form offer state string from pre-v2 pricing. Emitted from the first
   * applied offer's description for backward compat; removed in v2.0.
   * @supersededBy appliedOffers
   */
  appliedOfferState?: string;

  /**
   * @deprecated Use `appliedOffers.some(o => o.type === 'member')` instead.
   * True when a member price is applied. Kept for one minor.
   * @supersededBy appliedOffers
   */
  isMemberPrice: boolean;

  /**
   * @deprecated Use `appliedOffers[0]` for the tier object instead.
   * The raw applied bulk/promo tier. Kept for one minor.
   * @supersededBy appliedOffers
   */
  appliedTier?: PriceTier | PromoTier;
}

export interface CartValidationResult {
  valid: boolean;
  lines: {
    lineId: string;
    valid: boolean;
    unitPrice: number;
    lineTotal: number;
    eligibility: ComputedEligibility;
    appliedTier?: PriceTier | PromoTier;
    priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';
    appliedOfferState?: string;
    messages: string[];
  }[];
  cartTotal: number;
  messages: string[];
}
