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
   * RAOS-0003 §4 — the buyer's fulfillment deadline, if any ('YYYY-MM-DD',
   * evaluated against the merchant's local calendar — see `MerchantProfile.timezone`
   * in core.ts). Consumed by `LEAD_TIME_EXCEEDS_NEED_BY`.
   *
   * OPTIONAL BY DESIGN (RAOS-0000 §13 changelog, following the 0001 §9.6
   * `servesRegions` precedent): the naive "most-restrictive" reading of an
   * unknown/missing field (§4.3) would be to treat absence as the most
   * urgent possible deadline and block on lead time by default — that would
   * break every existing fixture and every buyer who simply hasn't stated a
   * deadline. Absence means "no deadline asserted ⇒ never blocks on lead
   * time," the opposite of the usual most-restrictive default. This is a
   * deliberate, spec-documented exception to §4.3 for this field only.
   */
  needByDate?: string;

  /**
   * RAOS-0003 v1.1 §4.3.2 — an EXACT fulfillment deadline, for quick-commerce
   * / same-day scenarios where a calendar date (`needByDate`) is not granular
   * enough ("before midnight" is not "today"). ISO 8601 timestamp, MUST carry
   * an explicit UTC offset or `Z` (no bare local-time strings — this codebase
   * never infers a timezone from context).
   *
   * OPTIONAL, same deliberate-exception shape as `needByDate` (RAOS-0000 §13
   * changelog / §4.3.1 above): absent means "no exact deadline asserted ⇒
   * never blocks" on the new v1.1 minute-granular checks
   * (`PREPARATION_EXCEEDS_NEED_BY`, `INSUFFICIENT_TIME_BEFORE_CLOSE`), never
   * the most-urgent-possible default.
   *
   * SCOPE NOTE: `needByAt`, when present, takes precedence over `needByDate`
   * for the NEW v1.1 checks it feeds. It does NOT retroactively change
   * `LEAD_TIME_EXCEEDS_NEED_BY` (RAOS-0003 v1.0), which remains keyed to
   * `needByDate` exclusively — that check is day-granularity by design (§9.3
   * open question) and deriving a calendar date from `needByAt` would just
   * reproduce what `needByDate` already expresses, for no behavior change.
   * Callers with an exact deadline should assert BOTH fields when they want
   * both check families to see it.
   */
  needByAt?: string;

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
  /** RAOS-0003 §4 — passed through as-is; absence is meaningful (see BuyerContext.needByDate). */
  needByDate?: string;
  /** RAOS-0003 v1.1 §4.3.2 — passed through as-is; absence is meaningful (see BuyerContext.needByAt). */
  needByAt?: string;
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
