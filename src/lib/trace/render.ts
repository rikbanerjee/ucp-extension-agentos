/**
 * RAOS-0013 (part 1) · Decision Trace — audience renderers
 *
 * Three pure, deterministic renderer functions that transform a DecisionTrace
 * into audience-specific output. None of these functions call evaluateOffer,
 * Date.now(), Math.random(), or any I/O. They transform, never augment.
 *
 * DENY-LIST (buyer audience): the buyer renderer must NEVER include in its
 * output the fields listed in BUYER_DENY_LIST. This is enforced by construction
 * (only whitelisted fields are written) and verified by unit tests.
 *
 * DETERMINISM: same DecisionTrace input → identical output for all three
 * renderers on every call.
 */

import type { DecisionTrace, MerchantTraceRow, BuyerTraceView } from './types';
import type { ReasonEntry } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Buyer deny-list — no field from this set may appear in renderBuyerTrace output
// ---------------------------------------------------------------------------

/**
 * Fields that must never appear in buyer-audience trace output.
 * Test: JSON.stringify(renderBuyerTrace(trace)) must not contain any of these
 * as substring-keys.
 */
export const BUYER_DENY_LIST = [
  'floor',
  'margin',
  'cost',
  'suppressed',
  'inputsHash',
  'computedAt',
  'keyId',
  'signature',
  'source',
  'appliedOffers',
] as const;

export type BuyerDenyListField = typeof BUYER_DENY_LIST[number];

// ---------------------------------------------------------------------------
// Stable JSON serialization (alphabetically sorted keys at all levels)
// ---------------------------------------------------------------------------

/**
 * Deep-sort object keys alphabetically at every nesting level.
 * Arrays preserve their element order (only object keys are sorted).
 * Produces a stable, round-trip-safe JSON representation.
 */
function sortedKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortedKeys);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortedKeys(obj[key]);
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Action hint lookup table — no LLM, pure switch
// ---------------------------------------------------------------------------

function merchantActionHint(code: string): string {
  switch (code) {
    case 'TIER_RESTRICTION':
      return 'Review eligibilityRules.requiredTier in your catalog config';
    case 'WHOLESALE_ONLY':
      return 'Verify customerType gating in eligibilityRules';
    case 'RESALE_CERTIFICATE_REQUIRED':
      return 'Check requireResaleCertificate in eligibilityRules';
    case 'HIDDEN_PRODUCT':
      return 'Review hideFromGuests flag in eligibilityRules';
    case 'REGION_RESTRICTED':
      return 'Check restrictedRegions in fulfillmentConstraints';
    case 'FULFILLMENT_UNAVAILABLE':
      return 'Verify availableModes in fulfillmentConstraints';
    case 'MEMBER_PRICE_APPLIED':
      return 'Member pricing is active — check memberPrice config';
    case 'TEASER_LOCKED':
      return 'Teaser pricing shown to non-members — verify memberPricing.teaserPrice';
    case 'BULK_TIER_APPLIED':
      return 'Bulk tier discount applied — review bulkPricing.tiers config';
    case 'BELOW_MOQ':
      return 'Quantity is below minimum order quantity — check bulkPricing.moq';
    case 'QUANTITY_INCREMENT_MISMATCH':
      return 'Quantity must be a multiple of increment — check bulkPricing.quantityIncrement';
    case 'PURCHASE_LIMIT_EXCEEDED':
      return 'Quantity exceeds per-order purchase limit — check purchaseLimit config';
    case 'CALL_FOR_PRICE':
      return 'Variant requires manual pricing — verify callForPrice flag';
    case 'OUT_OF_STOCK':
      return 'Check inventory levels in your fulfillment system';
    case 'LOW_STOCK':
      return 'Stock is low — consider restocking or surfacing urgency';
    case 'BACKORDER_AVAILABLE':
      return 'Backorder enabled — verify inventory.backorderPolicy';
    case 'PREORDER_NOT_YET_BUYABLE':
      return 'Preorder window not open — check inventory.preorderConfig';
    case 'STOCK_STALE':
      return 'Inventory data is stale — reduce dataTtlSeconds or refresh feed';
    case 'LOCATION_OUT_OF_STOCK':
      return 'This location has no stock — check per-location inventory';
    case 'RESERVATION_EXPIRED':
      return 'Soft reservation expired — reduce reservation TTL or surface urgency';
    case 'QUOTE_EXPIRED':
      return 'Reduce TTL or enable honor_grace in quotePolicy';
    case 'QUOTE_CONTEXT_CHANGED':
      return 'Buyer context changed since quote issue — re-issue quote';
    case 'QUOTE_STOCK_LOST':
      return 'Stock lost after quote issued — check inventory allocation';
    case 'QUOTE_PARTIALLY_HONORED':
      return 'Partial fulfillment — surface reduced quantity to buyer';
    case 'QUOTE_FORGED':
      return 'Token signature invalid — investigate signing key integrity';
    case 'QUOTE_HONORED_GRACE':
      return 'Quote honored within grace window — consider tightening TTL';
    case 'TRUST_SIMULATED':
      return 'Upgrade to signed trust envelopes for production';
    case 'DATA_STALE':
      return 'Data freshness exceeded TTL — re-evaluate before acting';
    default:
      return 'Review merchant configuration for ' + code;
  }
}

// ---------------------------------------------------------------------------
// Buyer-facing next step lookup table
// ---------------------------------------------------------------------------

function buyerNextStep(code: string): string | undefined {
  switch (code) {
    case 'TIER_RESTRICTION':
      return 'Upgrade to gold membership to unlock this item';
    case 'WHOLESALE_ONLY':
      return 'Contact us for wholesale pricing';
    case 'RESALE_CERTIFICATE_REQUIRED':
      return 'Provide a resale certificate to complete your purchase';
    case 'REGION_RESTRICTED':
      return 'This item cannot be shipped to your location';
    case 'FULFILLMENT_UNAVAILABLE':
      return 'Choose a different delivery method to proceed';
    case 'OUT_OF_STOCK':
      return 'Check back later or sign up for back-in-stock alerts';
    case 'BACKORDER_AVAILABLE':
      return 'You can order now — item will ship when back in stock';
    case 'PREORDER_NOT_YET_BUYABLE':
      return 'Pre-orders are not yet open — check back soon';
    case 'BELOW_MOQ':
      return 'Add more units to meet the minimum order requirement';
    case 'QUANTITY_INCREMENT_MISMATCH':
      return 'Adjust quantity to a valid increment';
    case 'PURCHASE_LIMIT_EXCEEDED':
      return 'Reduce quantity to stay within the per-order limit';
    case 'QUOTE_EXPIRED':
      return 'Get a fresh price quote before checkout';
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// renderDeveloperTrace
// ---------------------------------------------------------------------------

/**
 * Render a `DecisionTrace` as a stable, alphabetically-sorted JSON string.
 *
 * Top-level shape: `{ traceSchema, computedAt, governingReason, inputsHash,
 * isTransactable, offerStatus, reasons, stageVerdicts, suppressedOffers, unitPrice }`
 *
 * Round-trips: `renderDeveloperTrace(trace) === renderDeveloperTrace(JSON.parse(renderDeveloperTrace(trace)))`
 */
export function renderDeveloperTrace(trace: DecisionTrace): string {
  // Only include fields appropriate for developer audience (everything)
  const payload = {
    traceSchema: trace.traceSchema,
    computedAt: trace.computedAt,
    envelope: trace.envelope,
    governingReason: trace.governingReason,
    inputsHash: trace.inputsHash,
    isTransactable: trace.isTransactable,
    offerStatus: trace.offerStatus,
    reasons: trace.reasons,
    stageVerdicts: trace.stageVerdicts,
    suppressedOffers: trace.suppressedOffers,
    unitPrice: trace.unitPrice,
  };
  return JSON.stringify(sortedKeys(payload), null, 2);
}

// ---------------------------------------------------------------------------
// renderMerchantTrace
// ---------------------------------------------------------------------------

/**
 * Render a `DecisionTrace` as an array of merchant-ops-actionable rows.
 *
 * Only reasons with severity BLOCK or CONDITION are included — INFO reasons
 * are too noisy for an ops view. If no blocking/conditional reasons exist,
 * a single PASS row is returned.
 *
 * Does NOT expose: floor, margin, cost, inputsHash, signature, keyId.
 */
export function renderMerchantTrace(trace: DecisionTrace): MerchantTraceRow[] {
  // Filter to actionable severities only (BLOCK / CONDITION)
  const actionable = trace.reasons.filter(
    (r: ReasonEntry) => r.severity === 'BLOCK' || r.severity === 'CONDITION',
  );

  if (actionable.length === 0) {
    return [
      {
        stage: 'ALL',
        status: 'PASS',
        code: 'NO_ISSUES',
        message: 'All pipeline stages passed — offer is available.',
        actionHint: 'No action required.',
      },
    ];
  }

  return actionable.map((r: ReasonEntry) => {
    // Determine which stage this reason came from by looking at the stageVerdicts
    // We resolve stage by finding which pipeline stage's evaluators emitted this reason.
    // The AttributedReasonEntry has `source` (namespace). Map source to stage.
    const stage = resolveStageForSource((r as ReasonEntry & { source?: string }).source ?? '', trace);
    return {
      stage,
      status: r.severity === 'BLOCK' ? 'BLOCK' : 'CONDITION',
      code: r.code,
      message: r.message,
      actionHint: merchantActionHint(r.code),
    };
  });
}

/**
 * Resolve the pipeline stage name for a reason's source namespace by
 * scanning the trace's stage data. Falls back to 'UNKNOWN'.
 */
function resolveStageForSource(source: string, trace: DecisionTrace): string {
  // Stage is encoded in the stageVerdicts — each ran stage has evaluators.
  // We use the source namespace prefix to determine the stage.
  for (const verdict of trace.stageVerdicts) {
    if (!verdict.ran) continue;
    // The namespace convention: eligibility ns → ELIGIBILITY stage, etc.
    const ns = source.toLowerCase();
    const stage = verdict.stage.toLowerCase();
    if (
      ns.includes(stage) ||
      (stage === 'eligibility' && (ns.includes('eligib') || ns.includes('visibility'))) ||
      (stage === 'price' && (ns.includes('pric') || ns.includes('member') || ns.includes('bulk'))) ||
      (stage === 'fulfillment' && ns.includes('fulfil')) ||
      (stage === 'visibility' && ns.includes('visib')) ||
      (stage === 'quote' && ns.includes('quot'))
    ) {
      return verdict.stage;
    }
  }
  // Trust namespace is a cross-cutting concern, not a pipeline stage
  if (source.includes('trust')) return 'TRUST';
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// renderBuyerTrace
// ---------------------------------------------------------------------------

/**
 * Render a `DecisionTrace` as a buyer-facing view.
 *
 * DENY-LIST ENFORCED: this function constructs its return value with only
 * whitelisted fields. It never reads `floor`, `margin`, `cost`, `suppressed*`,
 * `inputsHash`, `computedAt`, `keyId`, `signature`, `source`, or `appliedOffers`
 * from the trace — and it never writes them into the returned object.
 */
export function renderBuyerTrace(trace: DecisionTrace): BuyerTraceView {
  const { offerStatus, governingReason, isTransactable } = trace;
  const canPurchase = isTransactable;

  let headline: string;
  let detail: string | undefined;
  let nextStep: string | undefined;

  if (offerStatus === 'BLOCKED') {
    // Use the governing BLOCK reason's message as headline
    const blockReason = trace.reasons.find(r => r.severity === 'BLOCK');
    headline = blockReason?.message ?? 'This item is not available for purchase.';
    // Resolution path from requirements, if present
    if (governingReason?.resolutionPath) {
      detail = governingReason.resolutionPath;
    }
    nextStep = blockReason ? buyerNextStep(blockReason.code) : undefined;
  } else if (offerStatus === 'CONDITIONAL') {
    const condReason = trace.reasons.find(
      r => r.severity === 'BLOCK' || r.severity === 'CONDITION',
    );
    headline = condReason?.message ?? 'Additional requirements needed.';
    if (governingReason?.resolutionPath) {
      detail = governingReason.resolutionPath;
    }
    nextStep = condReason ? buyerNextStep(condReason.code) : undefined;
  } else {
    headline = 'Available for purchase';
    // If there is a unit price, show it
    if (typeof trace.unitPrice === 'number') {
      detail = `Price: $${trace.unitPrice.toFixed(2)}`;
    }
  }

  // Construct the return value with ONLY buyer-safe fields.
  // Never write any deny-list field.
  const result: BuyerTraceView = {
    canPurchase,
    headline,
    ...(detail !== undefined ? { detail } : {}),
    ...(nextStep !== undefined ? { nextStep } : {}),
  };

  return result;
}
