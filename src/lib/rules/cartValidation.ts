// TODO WP-08 debt: cartValidation.ts calls rule functions directly rather than
// going through evaluateOffer. Fully rewiring this module through the pipeline
// is out of scope for WP-08 (too risky mid-demo). Track as WP-08 tech debt.
// See MASTER-BUILD-PLAN.md WP-08 "Do NOT" constraints.

/**
 * Cart validation — RAOS-0002 update.
 *
 * `validateCartLine` now calls `computePrice` (the pricing pure function) to
 * obtain both the price state AND the structured reason codes. BELOW_MOQ and
 * QUANTITY_INCREMENT_MISMATCH are lifted from ad-hoc message strings to
 * `ReasonEntry` codes emitted by the pricing stage.
 *
 * Backward-compat guarantees (signatures preserved):
 *  - `validateCartLine(variant, quantity, context)` returns the same shape.
 *  - `messages[]` still contains the old human-readable strings for UI compat,
 *    derived from the new reason codes rather than hardcoded strings.
 *  - `valid` is still false when any BLOCK reason is emitted by either
 *    eligibility or pricing.
 *
 * The old direct calls to `getApplicablePrice` + inline MOQ/increment checks
 * are replaced by a single call to `computePrice`, making the pricing stage
 * the one source of truth (MASTER-BUILD-PLAN §1.3 invariant).
 */

import type { BuyerContext } from '../types/context';
import { Variant } from '../types/core';
import { calculateEligibility } from './eligibility';
import { computePrice } from './pricing';
import type { ReasonEntry } from '../types/reasons';

export function validateCartLine(variant: Variant, quantity: number, context: BuyerContext) {
  const eligibility = calculateEligibility(variant, context);
  const messages: string[] = [];
  let valid = eligibility.status === 'ELIGIBLE';

  if (eligibility.status !== 'ELIGIBLE') {
    messages.push(...eligibility.reasons.map(r => r.message));
  }

  // computePrice now owns ALL pricing + MOQ + increment validation.
  // BELOW_MOQ and QUANTITY_INCREMENT_MISMATCH are emitted as ReasonEntry codes;
  // we derive the UI messages from them for backward compat.
  const { priceState, reasons: priceReasons } = computePrice(variant, quantity, context);

  // Any BLOCK reason from pricing invalidates the line.
  const blockingPriceReasons = priceReasons.filter(r => r.severity === 'BLOCK');
  if (blockingPriceReasons.length > 0) {
    valid = false;
    // Emit human-readable messages for UI back-compat
    for (const reason of blockingPriceReasons) {
      messages.push(reason.message);
    }
  }

  return {
    valid,
    unitPrice: priceState.unitPrice,
    lineTotal: priceState.unitPrice * quantity,
    eligibility,
    appliedTier: priceState.appliedTier,
    priceSource: priceState.priceSource,
    appliedOfferState: priceState.appliedOfferState,
    // v2 fields
    appliedOffers: priceState.appliedOffers,
    suppressedOffers: priceState.suppressedOffers,
    priceReasons,
    messages,
  };
}

/**
 * Validate a full cart (array of lines). Thin multi-line wrapper around
 * validateCartLine. The cart is valid only if ALL lines are valid.
 *
 * This function is retained for callers that pass a CartLine[] + products map.
 * The Playground calls validateCartLine directly for per-product inspection.
 */
export function validateCart(
  lines: Array<{ variant: Variant; quantity: number }>,
  context: BuyerContext,
): {
  valid: boolean;
  lines: ReturnType<typeof validateCartLine>[];
  cartTotal: number;
  messages: string[];
} {
  const lineId = (v: Variant, q: number) => `${v.id}:${q}`;
  const validatedLines = lines.map(l => validateCartLine(l.variant, l.quantity, context));
  const cartTotal = validatedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const valid = validatedLines.every(l => l.valid);
  const messages = validatedLines.flatMap(l => l.messages);

  // suppress unused var warning
  void lineId;

  return { valid, lines: validatedLines, cartTotal, messages };
}

// ---------------------------------------------------------------------------
// Re-exported for callers that still do:
//   import { extractPriceReasons } from './cartValidation'
// ---------------------------------------------------------------------------

/**
 * Collect all BLOCK-severity pricing reasons from a validateCartLine result.
 * Used by the Playground to display per-line pricing blocks.
 */
export function extractPriceReasons(
  lineResult: ReturnType<typeof validateCartLine>,
): ReasonEntry[] {
  return lineResult.priceReasons ?? [];
}
