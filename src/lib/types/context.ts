/**
 * RAOS-0000 §4 — BuyerContext
 *
 * The single, buyer-scoped evaluation object every extension receives.
 * Supersedes the old `PricingContext` from `extensions.ts`.
 *
 * Three-axis identity model (locked OQ#1, 2026-06-07):
 *   - Conformance tier  → merchant capability (§5, this file is not the home)
 *   - loyaltyTier       → consumer loyalty (RAOS-0009)
 *   - membershipTier    → B2B account standing (RAOS-0001)
 *
 * The two buyer axes are orthogonal and never merged.
 */

// Re-export primitive types so callers that import from context.ts get them all.
export type CustomerType = 'guest' | 'member' | 'wholesale' | 'b2b';

/** Consumer loyalty tier (RAOS-0009). Distinct from conformance tier and membershipTier. */
export type LoyaltyTier = 'guest' | 'silver' | 'gold';

/** B2B account-standing tier (RAOS-0001). Distinct from conformance tier and loyaltyTier. */
export type MembershipTier = 'none' | 'gold' | 'reseller_plus' | 'distributor';

export type FulfillmentMode = 'shipping' | 'pickup' | 'local_delivery';

/**
 * Trust envelope on BuyerContext (RAOS-0000 §4.2 / B6).
 *
 * - `asserted`: claims were agent-supplied with no signature. Privilege-granting
 *   claims (membershipTier, loyaltyTier, taxExempt, resaleCertificateOnFile)
 *   MUST be downgraded for transaction-gating stages per §7.2.
 * - `signed`: claims arrived in a signed token; the signature is verified.
 *   Privilege-granting claims are trusted.
 *
 * Crypto is simulated (B3/D2); RAOS-0008 owns the real path. The swap is
 * mechanical — no consumer contract changes.
 */
export interface BuyerContextTrust {
  mode: 'asserted' | 'signed';
  /** Present when mode === 'signed'. The token issuer URI. */
  issuer?: string;
  /** Present when mode === 'signed'. The key identifier used for verification. */
  keyId?: string;
  /** Present when mode === 'signed'. Base64-encoded signature (simulated). */
  signature?: string;
}

/**
 * The buyer evaluation environment (RAOS-0000 §4).
 *
 * Carries buyer-scoped facts only. Merchant facts (which extensions are active)
 * live in the negotiated session manifest, not here.
 *
 * BACKWARD COMPAT NOTE:
 * `loyaltyTier` and `trust` are optional to allow legacy `PricingContext`-shaped
 * call sites (tests, old callers) to compile without changes. At the pipeline
 * boundary, `normalizeBuyerContext` fills any missing fields with most-restrictive
 * defaults (§4.3). Rule functions (eligibility, pricing) that don't read these
 * fields accept this interface directly. New code should always supply all fields.
 */
export interface BuyerContext {
  /** Who is shopping (guest / member / wholesale / b2b). */
  customerType: CustomerType;

  /**
   * Consumer loyalty tier (RAOS-0009). Orthogonal to membershipTier.
   * Default when absent: 'guest' (most-restrictive, §4.3).
   */
  loyaltyTier?: LoyaltyTier;

  /**
   * B2B account standing (RAOS-0001). Orthogonal to loyaltyTier.
   * Default: 'none' (most-restrictive, §4.3).
   */
  membershipTier: MembershipTier;

  /** Region / jurisdiction code (e.g. 'US', 'CA', 'NY', 'HI'). */
  marketRegion: string;

  fulfillmentMode: FulfillmentMode;

  /** Whether a loyalty/member account is linked for this session. */
  accountLinked: boolean;

  /** Tax-exempt claim — requires trust.mode === 'signed' to take effect at transaction stages. */
  taxExempt: boolean;

  /** Resale-certificate claim — requires trust.mode === 'signed' at transaction stages. */
  resaleCertificateOnFile: boolean;

  /**
   * Trust envelope (RAOS-0000 §4.2). Describes how much to believe the above
   * claims. Missing → treated as asserted (most-restrictive) by
   * `normalizeBuyerContext`. Optional for backward compat with legacy callers.
   */
  trust?: BuyerContextTrust;
}

/**
 * A fully-normalized BuyerContext where `loyaltyTier` and `trust` are always
 * present. This is what `normalizeBuyerContext` returns and what the pipeline
 * guarantees evaluators receive after normalization.
 */
export interface NormalizedBuyerContext extends Required<Pick<BuyerContext, 'loyaltyTier' | 'trust'>> {
  customerType: CustomerType;
  loyaltyTier: LoyaltyTier;
  membershipTier: MembershipTier;
  marketRegion: string;
  fulfillmentMode: FulfillmentMode;
  accountLinked: boolean;
  taxExempt: boolean;
  resaleCertificateOnFile: boolean;
  trust: BuyerContextTrust;
}

/**
 * Partial BuyerContext accepted by `normalizeBuyerContext`.
 * Every field is optional; missing fields default to most-restrictive (§4.3).
 */
export type PartialBuyerContext = Partial<BuyerContext>;

// ---------------------------------------------------------------------------
// Backward-compat deprecated alias
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `BuyerContext` instead.
 *
 * `PricingContext` was the old name. It is retained for one minor version
 * (RAOS-0000 §7.4 deprecation contract) to allow call sites to migrate.
 *
 * The `activeExtensions` field that was on the old `PricingContext` in
 * `extensions.ts` is intentionally NOT included here — that fact now lives
 * only in the negotiated session manifest (WP-01 registry + pipeline).
 *
 * @supersededBy BuyerContext
 */
export type PricingContext = BuyerContext & {
  /**
   * @deprecated Legacy field — no longer used. The negotiated manifest in
   * the pipeline determines active extensions. Remove this field from call
   * sites and use the pipeline directly.
   */
  activeExtensions?: string[];
};
