/**
 * RAOS-0007 · Quote Integrity & Price Lock — type definitions
 *
 * A QuoteToken binds variant + quantity + buyerContextHash + resolved price +
 * applied offers to a TTL, covered by a RAOS-0008 provenance envelope.
 *
 * Key design constraints:
 *   - `quoteId` is DETERMINISTIC: same (merchantId, variantId, qty, contextHash)
 *     within the same TTL bucket → same quoteId. Zero randomness.
 *   - `buyerContextHash` is a stable hash of the NORMALIZED BuyerContext.
 *   - The `envelope` field is a snapshot of the RAOS-0008 signature at issue time.
 *   - `HonorPolicy` is merchant-declared in the capability config and snapshotted
 *     into every issued token so validation can apply the policy that was in
 *     effect at issue time.
 *
 * DETERMINISM (RAOS-0000 / MASTER-BUILD-PLAN §1.3):
 *   No Date.now(), Math.random(), fetch(), or new Date() in this module or
 *   in src/lib/rules/quote.ts. Time is always the injected `now` parameter.
 */

import type { AppliedOffer } from './extensions';
import type { ProvenanceEnvelope } from './envelope';
import type { ReasonEntry } from './reasons';

// ---------------------------------------------------------------------------
// HonorPolicy — merchant-declared in capability config
// ---------------------------------------------------------------------------

/**
 * Declares how the merchant handles each invalidation path for a QuoteToken.
 * Snapshotted into the issued token so validation always uses the policy that
 * was in effect at issue time.
 *
 * Different merchants may (and should) declare different policies:
 *   - Wholesale: strict (requote on expiry, reject on stock loss)
 *   - Grocery: consumer-friendly (grace window on expiry, partial on stock loss)
 */
export interface HonorPolicy {
  /**
   * What to do when the quote token has passed its TTL.
   *   - 'honor_grace': honor within graceSeconds past TTL, then require requote.
   *   - 'requote':     require a fresh quote immediately on expiry.
   *   - 'reject':      hard reject on expiry (strictest path).
   */
  onExpiry: 'honor_grace' | 'requote' | 'reject';

  /**
   * Grace window in seconds after TTL expiry. Only relevant when
   * onExpiry === 'honor_grace'. Ignored otherwise.
   */
  graceSeconds?: number;

  /**
   * What to do when stock is insufficient to fulfill the quoted quantity.
   *   - 'partial': honor for available quantity (emit QUOTE_PARTIALLY_HONORED).
   *   - 'reject':  hard reject the entire quote.
   */
  onStockLoss: 'partial' | 'reject';

  /**
   * What to do when the buyer's context hash has changed since issue.
   * Always 'requote' per spec (§3 / §11.1 OQ). Present as a field for
   * documentation clarity and future extensibility.
   */
  onContextChange: 'requote';
}

// ---------------------------------------------------------------------------
// QuoteToken — the signed price commitment
// ---------------------------------------------------------------------------

/**
 * A signed, TTL'd commitment binding a specific price moment to a buyer.
 *
 * Issued by `issueQuote` after a successful ELIGIBLE + PRICED evaluation.
 * Validated by `validateQuote` at checkout time.
 *
 * `envelope` covers all other fields — modifying ANY field after signing
 * produces a signature mismatch → QUOTE_FORGED (BLOCK).
 */
export interface QuoteToken {
  /**
   * Deterministic quote identifier.
   * Same (merchantId, variantId, qty, contextHash) within the same TTL bucket
   * → same quoteId. Derived using djb2 hash + bucket number. Zero randomness.
   * See RAOS-0007 §7.2 for the full derivation algorithm.
   */
  quoteId: string;

  merchantId: string;
  variantId: string;
  quantity: number;

  /**
   * Stable hash of the NORMALIZED BuyerContext at issue time.
   * Computed via `buyerContextHash(normalizedContext)` which applies the same
   * canonicalization as RAOS-0008's `canonicalizePayload` — no second hasher.
   * A context change between issue and validate produces a different hash →
   * QUOTE_CONTEXT_CHANGED (BLOCK, resolution: requote).
   */
  buyerContextHash: string;

  /** Final unit price in dollars at issue time. Half-up rounded to cents (RAOS-0002). */
  unitPrice: number;

  /**
   * Currency code. Always 'USD' in v1 (RAOS-0000 §11 — single-currency seam).
   * Carried so the quote survives multi-currency work without reshaping.
   */
  currency: 'USD' | string;

  /**
   * Applied offers that produced `unitPrice`, bound exactly from the RAOS-0002
   * ComputedPriceState. RAOS-0006 will add more offer types; the array shape
   * is stable (MASTER-BUILD-PLAN §1.2-4).
   */
  appliedOffers: AppliedOffer[];

  /** Unix epoch milliseconds at which this token was issued (injected now). */
  issuedAt: number;

  /** How long this token is valid in seconds. */
  ttlSeconds: number;

  /**
   * Snapshot of the merchant's HonorPolicy at issue time.
   * Validation uses the snapshotted policy, not a live merchant lookup,
   * so policy changes after issue don't retroactively affect in-flight quotes.
   */
  honorPolicy: HonorPolicy;

  /**
   * RAOS-0008 provenance envelope covering all other token fields.
   * Any modification to other fields → signature mismatch → QUOTE_FORGED.
   * `trustMode` is always 'asserted' while crypto is simulated (B3/D2).
   */
  envelope: ProvenanceEnvelope;
}

// ---------------------------------------------------------------------------
// QuoteConfig — read from variant by the QUOTE-stage evaluator
// ---------------------------------------------------------------------------

/**
 * The config the QUOTE-stage evaluator reads from a variant.
 * Merchants that support quote integrity declare this in their capability config.
 */
export interface QuoteConfig {
  /** How long quotes for this variant are valid (defaults to 600s if absent). */
  ttlSeconds?: number;

  /** Merchant's declared honor policy for this variant. */
  honorPolicy: HonorPolicy;
}

// ---------------------------------------------------------------------------
// QuoteValidationResult — output of validateQuote
// ---------------------------------------------------------------------------

/**
 * The result of validating a QuoteToken at checkout time.
 *
 * `outcome`:
 *   - 'HONORED':           token is valid, price lock holds, proceed.
 *   - 'REQUOTE_REQUIRED':  token expired or context changed; get a new quote.
 *   - 'REJECTED':          token is forged, stock is gone, or hard reject.
 *
 * `honoredQuantity` is present when QUOTE_PARTIALLY_HONORED fires (partial
 * stock honor). The agent must surface this to the buyer before proceeding.
 */
export interface QuoteValidationResult {
  outcome: 'HONORED' | 'REQUOTE_REQUIRED' | 'REJECTED';
  reasons: ReasonEntry[];
  /** Present when outcome=HONORED and QUOTE_PARTIALLY_HONORED is in reasons. */
  honoredQuantity?: number;
}

// ---------------------------------------------------------------------------
// RAOS-0007 reason codes
// ---------------------------------------------------------------------------

export const QUOTE_NAMESPACE = 'com.os.retailagent.shopping.quote';

export const QUOTE_REASON_CODES = {
  QUOTE_ISSUED:            'QUOTE_ISSUED',
  QUOTE_EXPIRED:           'QUOTE_EXPIRED',
  QUOTE_CONTEXT_CHANGED:   'QUOTE_CONTEXT_CHANGED',
  QUOTE_STOCK_LOST:        'QUOTE_STOCK_LOST',
  QUOTE_PARTIALLY_HONORED: 'QUOTE_PARTIALLY_HONORED',
  QUOTE_FORGED:            'QUOTE_FORGED',
  QUOTE_HONORED_GRACE:     'QUOTE_HONORED_GRACE',
} as const;

export type QuoteReasonCode = typeof QUOTE_REASON_CODES[keyof typeof QUOTE_REASON_CODES];
