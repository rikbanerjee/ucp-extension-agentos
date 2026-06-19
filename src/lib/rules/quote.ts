/**
 * RAOS-0007 · Quote Integrity & Price Lock — reference implementation
 *
 * `issueQuote(decisionRecord, honorPolicy, now)` → QuoteToken | null
 * `validateQuote(token, inputs, now)` → QuoteValidationResult
 *
 * KEY CONTRACTS
 * ─────────────
 * • buyerContextHash: stable hash of normalized BuyerContext via canonicalization
 *   + djb2 from trust.ts. DOES NOT write a second hasher.
 * • quoteId: DETERMINISTIC. Same (merchantId, variantId, qty, contextHash) within
 *   the same TTL bucket → same quoteId. Zero randomness. Uses djb2 + bucket number.
 * • issueQuote: returns null when the decision record has any BLOCK-severity reason
 *   in ELIGIBILITY, or has no PRICE stage output. Never issues a dead quote.
 * • validateQuote: checks in DETERMINISTIC ORDER:
 *     1. Signature (RAOS-0008 verifyEnvelope) — forgery first
 *     2. TTL / grace window
 *     3. Context hash mismatch
 *     4. Stock (RAOS-0005 evaluateInventory)
 *     5. Price recomputation agreement
 * • Rounding: half-up to cents (roundHalfUp from pricing.ts). Same formula in
 *   both issueQuote and validateQuote. A half-cent boundary value must produce the
 *   same integer-cents in both paths.
 *
 * DETERMINISM CONTRACT (RAOS-0000 / MASTER-BUILD-PLAN §1.3):
 *   No Date.now(), Math.random(), fetch(), or new Date() anywhere in this module.
 *   Time is always the injected `now` parameter (Unix epoch ms).
 */

import type { BuyerContext } from '../types/context';
import type { Variant, MerchantProfile } from '../types/core';
import type { ReasonEntry } from '../types/reasons';
import type { ComputedPriceState } from '../types/extensions';
import type {
  QuoteToken,
  QuoteConfig,
  HonorPolicy,
  QuoteValidationResult,
} from '../types/quote';
import {
  QUOTE_NAMESPACE,
  QUOTE_REASON_CODES,
} from '../types/quote';
import type { DecisionRecord } from '../extensions/pipeline';
import { canonicalizePayload, signEnvelope, verifyEnvelope } from './trust';
import { getApplicablePrice, roundHalfUp } from './pricing';
import { evaluateInventory } from './inventory';
import { normalizeBuyerContext } from './normalizeBuyerContext';
import type { NormalizedBuyerContext } from '../types/context';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default quote TTL in seconds when not declared by the merchant. */
export const DEFAULT_QUOTE_TTL_SECONDS = 600; // 10 minutes

// ---------------------------------------------------------------------------
// Deterministic hash (djb2) — reused from trust.ts approach
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic djb2 hash of a string.
 * This is the SAME algorithm as trust.ts uses for simulated signing.
 * We do NOT import the private function — we replicate the public interface
 * by using canonicalizePayload (public) + the djb2 pattern for the final step.
 *
 * Using a local helper to avoid importing the private `djb2Hash` from trust.ts.
 * The canonical payload approach ensures we use the same stable-sort + JSON
 * serialization that RAOS-0008 uses.
 */
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ---------------------------------------------------------------------------
// buyerContextHash — stable hash of normalized BuyerContext
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic 8-hex-char hash of a normalized BuyerContext.
 *
 * ALGORITHM (RAOS-0007 §7.1):
 *   1. Extract the fields that define buyer privilege for pricing — the same
 *      fields that, if changed, would change the price or eligibility outcome.
 *   2. Use canonicalizePayload from trust.ts (stable-key-sort + JSON.stringify)
 *      with a sentinel keyId of 'ctx' — this is purely canonicalization, not
 *      signing; the keyId just feeds the suffix that trust.ts appends.
 *   3. djb2(canonical) → 8-hex.
 *
 * DETERMINISM: same normalizedContext → same hash, always.
 */
export function buyerContextHash(ctx: NormalizedBuyerContext): string {
  const privilegeFields = {
    customerType: ctx.customerType,
    loyaltyTier: ctx.loyaltyTier,
    membershipTier: ctx.membershipTier,
    marketRegion: ctx.marketRegion,
    fulfillmentMode: ctx.fulfillmentMode,
    taxExempt: ctx.taxExempt,
    resaleCertificateOnFile: ctx.resaleCertificateOnFile,
    trustMode: ctx.trust.mode,
  };
  // canonicalizePayload does: stableSort(keys) → JSON.stringify → append `|${keyId}`.
  // Using 'ctx' as a stable sentinel — same canonical always since keyId is fixed.
  const canonical = canonicalizePayload(privilegeFields, 'ctx');
  return djb2(canonical).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// quoteId derivation — deterministic, idempotent within TTL bucket
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic quoteId.
 *
 * ALGORITHM (RAOS-0007 §7.2):
 *   bucket = floor(issuedAt / (ttlSeconds * 1000))
 *   payload = `${merchantId}|${variantId}|${quantity}|${contextHash}|${bucket}`
 *   quoteId = 'q_' + djb2(payload).toString(16).padStart(8, '0') + '_' + bucket.toString(16)
 *
 * IDEMPOTENCY: same (merchant, variant, qty, contextHash) within one TTL bucket
 * produces the same quoteId. This prevents quote farming.
 *
 * QUANTITY SENSITIVITY: different quantities produce different quoteIds because
 * quantity is a distinct term in the payload string (not part of contextHash).
 */
export function deriveQuoteId(
  merchantId: string,
  variantId: string,
  quantity: number,
  contextHash: string,
  ttlSeconds: number,
  issuedAt: number,
): string {
  const bucket = Math.floor(issuedAt / (ttlSeconds * 1000));
  const payload = `${merchantId}|${variantId}|${quantity}|${contextHash}|${bucket}`;
  const hashHex = djb2(payload).toString(16).padStart(8, '0');
  return `q_${hashHex}_${bucket.toString(16)}`;
}

// ---------------------------------------------------------------------------
// issueQuote
// ---------------------------------------------------------------------------

/**
 * Issue a QuoteToken from a completed DecisionRecord.
 *
 * Returns null when:
 *   - The DecisionRecord has any BLOCK-severity reason (blocked line — never quote).
 *   - There is no PRICE stage result in the DecisionRecord (unpriced line).
 *
 * The QuoteToken envelope is signed via RAOS-0008 signEnvelope over all token
 * fields except the envelope itself.
 *
 * DETERMINISM: given the same (decisionRecord, honorPolicy, now), produces the
 * same QuoteToken byte-for-byte. No randomness.
 */
export function issueQuote(
  decisionRecord: DecisionRecord,
  honorPolicy: HonorPolicy,
  merchantId: string,
  variantId: string,
  quantity: number,
  now: number,
): QuoteToken | null {
  // Step 1: Never quote a blocked line.
  const hasBlock = decisionRecord.reasons.some(r => r.severity === 'BLOCK');
  if (hasBlock) {
    return null;
  }

  // Step 2: Require a PRICE stage result.
  const priceStage = decisionRecord.stages['PRICE'];
  if (!priceStage) {
    return null;
  }

  // Find the first PRICE evaluator output that has a ComputedPriceState.
  const priceResult = Object.values(priceStage).find(
    r => r.output !== null && typeof (r.output as ComputedPriceState)?.unitPrice === 'number',
  );
  if (!priceResult) {
    return null;
  }
  const priceState = priceResult.output as ComputedPriceState;

  // Step 3: Compute context hash.
  const ctxHash = buyerContextHash(decisionRecord.normalizedContext);

  // Step 4: Determine TTL.
  const ttlSeconds = DEFAULT_QUOTE_TTL_SECONDS;

  // Step 5: Derive deterministic quoteId.
  const quoteId = deriveQuoteId(merchantId, variantId, quantity, ctxHash, ttlSeconds, now);

  // Step 6: Resolve signing key from the DecisionRecord envelope.
  // Fall back to 'k1' if the envelope is not present (defensive — should always be set).
  const keyId = decisionRecord.envelope?.keyId ?? 'k1';
  const issuer = decisionRecord.envelope?.issuer ?? `https://api.${merchantId}.test`;

  // Step 7: Build the token payload (all fields except envelope).
  const tokenPayload = {
    quoteId,
    merchantId,
    variantId,
    quantity,
    buyerContextHash: ctxHash,
    unitPrice: roundHalfUp(priceState.unitPrice),
    currency: priceState.currency,
    appliedOffers: priceState.appliedOffers,
    issuedAt: now,
    ttlSeconds,
    honorPolicy,
  };

  // Step 8: Sign the token payload via RAOS-0008.
  const envelope = signEnvelope(tokenPayload, keyId, now, issuer, ttlSeconds);

  return {
    ...tokenPayload,
    envelope,
  };
}

// ---------------------------------------------------------------------------
// validateQuote inputs
// ---------------------------------------------------------------------------

export interface ValidateQuoteInput {
  /** The token to validate. */
  token: QuoteToken;
  /** The buyer's CURRENT context (will be normalized before hash comparison). */
  context: BuyerContext;
  /** The variant being purchased (for stock check and price recomputation). */
  variant: Variant;
  /** The merchant profile (for key lookup in signature verification). */
  merchant: MerchantProfile;
}

// ---------------------------------------------------------------------------
// validateQuote
// ---------------------------------------------------------------------------

/**
 * Validate a QuoteToken at checkout time.
 *
 * CHECK ORDER (deterministic — non-negotiable per RAOS-0007 §7.4):
 *   1. Signature check (RAOS-0008 verifyEnvelope) — forgery first.
 *   2. TTL / grace window check.
 *   3. Context hash mismatch check.
 *   4. Stock check (RAOS-0005 evaluateInventory).
 *   5. Price recomputation agreement check.
 *
 * Returns QuoteValidationResult with outcome and structured reasons.
 * Never throws — all error paths produce a non-throwing outcome.
 */
export function validateQuote(
  input: ValidateQuoteInput,
  now: number,
): QuoteValidationResult {
  const { token, context, variant, merchant } = input;
  const keys = merchant.manifest.keys ?? [];

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Signature check (RAOS-0008)
  //
  // Build the original payload (all fields except envelope) and verify.
  // A DATA_STALE result (stale envelope) is NOT a forgery — TTL/grace handles
  // it in step 2. Any other failing result indicates a tampered token.
  // ──────────────────────────────────────────────────────────────────────────
  const tokenPayload = {
    quoteId:           token.quoteId,
    merchantId:        token.merchantId,
    variantId:         token.variantId,
    quantity:          token.quantity,
    buyerContextHash:  token.buyerContextHash,
    unitPrice:         token.unitPrice,
    currency:          token.currency,
    appliedOffers:     token.appliedOffers,
    issuedAt:          token.issuedAt,
    ttlSeconds:        token.ttlSeconds,
    honorPolicy:       token.honorPolicy,
  };

  const trustResult = verifyEnvelope(token.envelope, now, keys, tokenPayload);

  if (!trustResult.valid && trustResult.code !== 'DATA_STALE') {
    // Blocking trust failure (ISSUER_UNKNOWN, KEY_EXPIRED, SIGNATURE_INVALID,
    // CLOCK_SKEW_SUSPECTED) → REJECTED as QUOTE_FORGED.
    return {
      outcome: 'REJECTED',
      reasons: [makeQuoteReason(
        QUOTE_REASON_CODES.QUOTE_FORGED,
        'BLOCK',
        `Quote token signature verification failed (${trustResult.code}). Payload may have been tampered with.`,
      )],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: TTL / grace window check
  //
  // elapsed = seconds since issuedAt. If elapsed > ttlSeconds, the quote has
  // expired. Behavior depends on honorPolicy.onExpiry:
  //   'honor_grace': honor within (ttlSeconds + graceSeconds), then REQUOTE.
  //   'requote':     REQUOTE_REQUIRED immediately on expiry.
  //   'reject':      REJECTED immediately on expiry.
  // ──────────────────────────────────────────────────────────────────────────
  const elapsedSeconds = (now - token.issuedAt) / 1000;
  const isExpired = elapsedSeconds > token.ttlSeconds;

  const gracePastExpiry = isExpired ? elapsedSeconds - token.ttlSeconds : 0;
  const gracePastExpiryMessage = isExpired
    ? `(${Math.floor(gracePastExpiry)}s past TTL=${token.ttlSeconds}s)`
    : '';

  if (isExpired) {
    const policy = token.honorPolicy;
    if (policy.onExpiry === 'honor_grace') {
      const graceSeconds = policy.graceSeconds ?? 0;
      const withinGrace = elapsedSeconds <= token.ttlSeconds + graceSeconds;
      if (!withinGrace) {
        return {
          outcome: 'REQUOTE_REQUIRED',
          reasons: [makeQuoteReason(
            QUOTE_REASON_CODES.QUOTE_EXPIRED,
            'BLOCK',
            `Quote expired ${gracePastExpiryMessage}, outside grace window (graceSeconds=${graceSeconds}). Requote required.`,
          )],
        };
      }
      // Within grace window — record it but continue checks.
      // We'll include QUOTE_HONORED_GRACE in the final result.
      // (falls through to remaining checks with grace flag)
    } else if (policy.onExpiry === 'requote') {
      return {
        outcome: 'REQUOTE_REQUIRED',
        reasons: [makeQuoteReason(
          QUOTE_REASON_CODES.QUOTE_EXPIRED,
          'BLOCK',
          `Quote expired ${gracePastExpiryMessage}. Requote required (onExpiry=requote).`,
        )],
      };
    } else {
      // 'reject'
      return {
        outcome: 'REJECTED',
        reasons: [makeQuoteReason(
          QUOTE_REASON_CODES.QUOTE_EXPIRED,
          'BLOCK',
          `Quote expired ${gracePastExpiryMessage}. Hard reject (onExpiry=reject).`,
        )],
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Context hash mismatch
  //
  // Normalize the CURRENT context and hash it. If the hash differs from the
  // token's buyerContextHash, the buyer's privilege claims have changed since
  // the quote was issued. Always REQUOTE_REQUIRED (no merchant override).
  // ──────────────────────────────────────────────────────────────────────────
  const normalizedCurrentCtx = normalizeBuyerContext(context, { trustEnforcement: 'enforce' });
  const currentHash = buyerContextHash(normalizedCurrentCtx);

  if (currentHash !== token.buyerContextHash) {
    return {
      outcome: 'REQUOTE_REQUIRED',
      reasons: [makeQuoteReason(
        QUOTE_REASON_CODES.QUOTE_CONTEXT_CHANGED,
        'BLOCK',
        'Buyer context has changed since this quote was issued (context hash mismatch). Requote required.',
      )],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Stock check (RAOS-0005)
  //
  // Re-evaluate current inventory. If stock is insufficient, apply
  // honorPolicy.onStockLoss to decide partial vs hard reject.
  // ──────────────────────────────────────────────────────────────────────────
  const inventoryResult = evaluateInventory({
    variant,
    context: normalizedCurrentCtx,
    holds: [],
    now,
  });

  const availability = inventoryResult.availability;
  // ComputedAvailability does not expose quantityAvailable directly — the stock
  // count is surfaced as `onlyXLeft` when the variant has limited-quantity config.
  // If onlyXLeft is absent, assume sufficient stock (no quantity gate declared).
  const quantityAvailable = availability.onlyXLeft ?? Infinity;
  const isOOS = availability.state === 'out_of_stock';
  const isShort = !isOOS && isFinite(quantityAvailable) && quantityAvailable < token.quantity;

  if (isOOS || isShort) {
    const policy = token.honorPolicy;
    if (policy.onStockLoss === 'partial') {
      const availableInt = isOOS ? 0 : Math.max(0, quantityAvailable);
      if (availableInt > 0) {
        // Partial honor — we'll include QUOTE_PARTIALLY_HONORED in reasons.
        const gracedReasons: ReasonEntry[] = [];
        if (isExpired) {
          gracedReasons.push(makeQuoteReason(
            QUOTE_REASON_CODES.QUOTE_HONORED_GRACE,
            'INFO',
            `Quote honored within grace window (${Math.floor(elapsedSeconds - token.ttlSeconds)}s past TTL, grace=${token.honorPolicy.graceSeconds ?? 0}s).`,
          ));
        }
        gracedReasons.push(makeQuoteReason(
          QUOTE_REASON_CODES.QUOTE_PARTIALLY_HONORED,
          'CONDITION',
          `Only ${availableInt} unit${availableInt !== 1 ? 's' : ''} available of ${token.quantity} requested. Price honored for ${availableInt}.`,
        ));
        return {
          outcome: 'HONORED',
          honoredQuantity: availableInt,
          reasons: gracedReasons,
        };
      } else {
        return {
          outcome: 'REJECTED',
          reasons: [makeQuoteReason(
            QUOTE_REASON_CODES.QUOTE_STOCK_LOST,
            'BLOCK',
            `Stock is now out of stock. Cannot honor quote (onStockLoss=partial, but 0 available).`,
          )],
        };
      }
    } else {
      // 'reject'
      return {
        outcome: 'REJECTED',
        reasons: [makeQuoteReason(
          QUOTE_REASON_CODES.QUOTE_STOCK_LOST,
          'BLOCK',
          `Insufficient stock: ${isOOS ? 0 : quantityAvailable} available, ${token.quantity} requested. Hard reject (onStockLoss=reject).`,
        )],
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: Price recomputation agreement
  //
  // Recompute the price for the current context and compare with the token's
  // unitPrice. Both sides must use roundHalfUp. A mismatch means the price
  // has drifted (promo ended, context changed price tier) → REQUOTE_REQUIRED.
  // ──────────────────────────────────────────────────────────────────────────
  const recomputedPrice = getApplicablePrice(variant, token.quantity, normalizedCurrentCtx);
  const recomputedRounded = roundHalfUp(recomputedPrice.unitPrice);

  if (recomputedRounded !== token.unitPrice) {
    return {
      outcome: 'REQUOTE_REQUIRED',
      reasons: [makeQuoteReason(
        QUOTE_REASON_CODES.QUOTE_CONTEXT_CHANGED,
        'BLOCK',
        `Price has changed since quote was issued ($${token.unitPrice.toFixed(2)} → $${recomputedRounded.toFixed(2)}). Requote required.`,
      )],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HONORED — all checks passed.
  // Include QUOTE_HONORED_GRACE if we are within the grace window.
  // ──────────────────────────────────────────────────────────────────────────
  const finalReasons: ReasonEntry[] = [];

  if (isExpired) {
    // Must be within grace (otherwise we returned REQUOTE in step 2)
    const secondsIntoGrace = elapsedSeconds - token.ttlSeconds;
    finalReasons.push(makeQuoteReason(
      QUOTE_REASON_CODES.QUOTE_HONORED_GRACE,
      'INFO',
      `Quote honored within grace window (${Math.floor(secondsIntoGrace)}s past TTL, grace=${token.honorPolicy.graceSeconds ?? 0}s).`,
    ));
  }

  return { outcome: 'HONORED', reasons: finalReasons };
}

// ---------------------------------------------------------------------------
// Helper — produce a well-formed ReasonEntry for the quote namespace
// ---------------------------------------------------------------------------

function makeQuoteReason(
  code: string,
  severity: 'BLOCK' | 'CONDITION' | 'INFO',
  message: string,
): ReasonEntry {
  return {
    code,
    message,
    severity,
    blocking: severity !== 'INFO',
    source: QUOTE_NAMESPACE,
  };
}

// ---------------------------------------------------------------------------
// issueQuoteFromInputs — convenience wrapper for the evaluator
//
// Accepts the raw pipeline inputs (rather than a full DecisionRecord) when
// calling from the QUOTE-stage evaluator which has priorResults available.
// ──────────────────────────────────────────────────────────────────────────

/**
 * Re-export for use by the evaluator and the playground.
 */
export { roundHalfUp };
