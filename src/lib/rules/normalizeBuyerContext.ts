/**
 * RAOS-0000 §4.3 + §7.2 — BuyerContext normalization and trust downgrade.
 *
 * Two responsibilities:
 *
 * 1. MOST-RESTRICTIVE DEFAULTS (§4.3):
 *    Unknown or missing fields default to their most-restrictive interpretation.
 *    Unknown `customerType` → 'guest'; unknown `loyaltyTier` → 'guest';
 *    unknown `membershipTier` → 'none'; unknown region → treat as restricted;
 *    unknown `fulfillmentMode` → 'shipping' (safest, no pickup/delivery assumptions).
 *
 * 2. TRUST-DOWNGRADE (§7.2):
 *    When `trust.mode === 'asserted'`, privilege-granting claims are downgraded
 *    to their most-restrictive values for transaction-gating stages:
 *      - membershipTier → 'none'
 *      - loyaltyTier    → 'guest'
 *      - taxExempt      → false
 *      - resaleCertificateOnFile → false
 *    An asserted "I'm a gold member" never grants member pricing at transaction
 *    stages. For discovery convenience (§7.2), asserted claims MAY still be
 *    used — this is controlled by the `trustEnforcement` option below.
 *
 * BACKWARD-COMPAT DECISION (WP-02):
 *    Existing demo and tests pass contexts without a `trust` field. To avoid
 *    breaking them while still demonstrating the downgrade:
 *
 *    - `trustEnforcement: 'enforce'` (default for new code / transaction stages):
 *       asserted → downgrade privilege claims.
 *    - `trustEnforcement: 'legacy'` (used when the caller passes a context
 *       without a trust field, e.g. old PricingContext shape):
 *       privilege claims are respected regardless of trust.mode — behaves as
 *       if trust were 'signed'. This is the "trust-implied" mode documented in
 *       the WP-02 brief. The demo explicitly sets trust.mode to show the toggle.
 */

import type {
  BuyerContext,
  BuyerContextTrust,
  NormalizedBuyerContext,
  PartialBuyerContext,
  CustomerType,
  LoyaltyTier,
  MembershipTier,
  FulfillmentMode,
} from '../types/context';

export type TrustEnforcement = 'enforce' | 'legacy';

export interface NormalizationOptions {
  /**
   * Controls how `trust.mode === 'asserted'` is handled.
   *
   * - 'enforce' (default): asserted contexts have privilege-granting claims
   *   downgraded to most-restrictive. Use this for transaction-gating stages.
   * - 'legacy': privilege claims are respected regardless of trust mode.
   *   Use this when the caller is passing old PricingContext-shaped input
   *   (no trust field) and you need backward compat.
   */
  trustEnforcement?: TrustEnforcement;
}

// ---------------------------------------------------------------------------
// Defaults (most-restrictive per §4.3)
// ---------------------------------------------------------------------------

const DEFAULT_CUSTOMER_TYPE: CustomerType = 'guest';
const DEFAULT_LOYALTY_TIER: LoyaltyTier = 'guest';
const DEFAULT_MEMBERSHIP_TIER: MembershipTier = 'none';
const DEFAULT_MARKET_REGION = 'UNKNOWN'; // treated as restricted by region-gating rules
const DEFAULT_FULFILLMENT_MODE: FulfillmentMode = 'shipping';

// ---------------------------------------------------------------------------
// Valid value sets (for unknown-value detection)
// ---------------------------------------------------------------------------

const VALID_CUSTOMER_TYPES = new Set<CustomerType>(['guest', 'member', 'wholesale', 'b2b']);
const VALID_LOYALTY_TIERS = new Set<LoyaltyTier>(['guest', 'silver', 'gold']);
const VALID_MEMBERSHIP_TIERS = new Set<MembershipTier>(['none', 'gold', 'reseller_plus', 'distributor']);
const VALID_FULFILLMENT_MODES = new Set<FulfillmentMode>(['shipping', 'pickup', 'local_delivery']);

// ---------------------------------------------------------------------------
// Main normalization function
// ---------------------------------------------------------------------------

/**
 * Normalize a partial (or fully populated) context to a complete `BuyerContext`.
 *
 * Missing fields → most-restrictive defaults (§4.3).
 * Unknown enum values → most-restrictive defaults.
 * Asserted trust + enforce mode → privilege claims downgraded (§7.2).
 *
 * DETERMINISM: pure function, no I/O, no clock.
 */
export function normalizeBuyerContext(
  partial: PartialBuyerContext,
  options: NormalizationOptions = {},
): NormalizedBuyerContext {
  const { trustEnforcement = 'enforce' } = options;

  // Resolve trust first — it determines whether downgrade applies.
  const trustMode: 'asserted' | 'signed' =
    partial.trust?.mode === 'signed' ? 'signed' : 'asserted';
  const trust: BuyerContextTrust = {
    mode: trustMode,
    issuer: partial.trust?.issuer,
    keyId: partial.trust?.keyId,
    signature: partial.trust?.signature,
  };

  // Resolve base fields with most-restrictive defaults.
  const customerType: CustomerType =
    partial.customerType && VALID_CUSTOMER_TYPES.has(partial.customerType)
      ? partial.customerType
      : DEFAULT_CUSTOMER_TYPE;

  const marketRegion: string =
    typeof partial.marketRegion === 'string' && partial.marketRegion.trim().length > 0
      ? partial.marketRegion
      : DEFAULT_MARKET_REGION;

  const fulfillmentMode: FulfillmentMode =
    partial.fulfillmentMode && VALID_FULFILLMENT_MODES.has(partial.fulfillmentMode)
      ? partial.fulfillmentMode
      : DEFAULT_FULFILLMENT_MODE;

  const accountLinked: boolean = partial.accountLinked === true;

  // ---------------------------------------------------------------------------
  // Trust downgrade for privilege-granting claims (§7.2)
  //
  // When trustEnforcement === 'enforce' AND trust.mode === 'asserted':
  //   - loyaltyTier, membershipTier → most-restrictive (guest / none)
  //   - taxExempt, resaleCertificateOnFile → false
  //
  // When trustEnforcement === 'legacy' OR trust.mode === 'signed':
  //   - Claims are accepted as-is.
  // ---------------------------------------------------------------------------

  const mustDowngrade =
    trustEnforcement === 'enforce' && trustMode === 'asserted';

  const membershipTier: MembershipTier = mustDowngrade
    ? DEFAULT_MEMBERSHIP_TIER
    : partial.membershipTier && VALID_MEMBERSHIP_TIERS.has(partial.membershipTier)
      ? partial.membershipTier
      : DEFAULT_MEMBERSHIP_TIER;

  const loyaltyTier: LoyaltyTier = mustDowngrade
    ? DEFAULT_LOYALTY_TIER
    : partial.loyaltyTier && VALID_LOYALTY_TIERS.has(partial.loyaltyTier)
      ? partial.loyaltyTier
      : DEFAULT_LOYALTY_TIER;

  const taxExempt: boolean = mustDowngrade ? false : partial.taxExempt === true;

  const resaleCertificateOnFile: boolean = mustDowngrade
    ? false
    : partial.resaleCertificateOnFile === true;

  return {
    customerType,
    loyaltyTier,
    membershipTier,
    marketRegion,
    fulfillmentMode,
    accountLinked,
    taxExempt,
    resaleCertificateOnFile,
    trust,
  } satisfies NormalizedBuyerContext;
}
