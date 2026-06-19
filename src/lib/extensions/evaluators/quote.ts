/**
 * RAOS-0007: Quote Integrity & Price Lock — QUOTE-stage evaluator
 *
 * Registered in the QUOTE stage at priority 10. Runs only when the merchant's
 * manifest lists the `ext.quote` capability. Issues a QuoteToken for ELIGIBLE,
 * priced lines; emits QUOTE_ISSUED (INFO) on success.
 *
 * SAFETY CLASSIFICATION: QUOTE is a SAFETY_CRITICAL stage (per pipeline.ts
 * STAGE_CLASS). A throwing evaluator degrades to BLOCK, never to omit.
 *
 * CONTEXT INJECTION NOTE:
 * The UcpExtension.evaluate() contract receives the normalized context directly.
 * The merchant envelope (issuer + keyId for signing) is not in the evaluator
 * interface. We use a module-level slot — the same pattern as the inventory
 * evaluator's `setInventoryHolds` — to pass it through. Callers set this via
 * `setQuoteMeta` before calling `evaluateOffer`. The slot auto-clears on use.
 *
 * DETERMINISM: `now` is always injected from the pipeline. Never calls
 * Date.now() or new Date() inside this module.
 */

import type { Variant } from '@/lib/types/core';
import type { NormalizedBuyerContext } from '@/lib/types/context';
import type { BuyerContext } from '@/lib/types/context';
import type { UcpExtension, ExtensionResult, StageResults } from '../contract';
import type { QuoteToken } from '@/lib/types/quote';
import type { QuoteConfig } from '@/lib/types/quote';
import { QUOTE_NAMESPACE, QUOTE_REASON_CODES } from '@/lib/types/quote';
import { issueQuote } from '@/lib/rules/quote';
import type { DecisionRecord } from '../pipeline';

// ---------------------------------------------------------------------------
// Evaluator input config
// ---------------------------------------------------------------------------

type QuoteEvaluatorConfig = QuoteConfig & {
  variant: Variant;
  variantId: string;
  quantity: number;   // overwritten by pipeline injectQuantityIfNeeded
};

// ---------------------------------------------------------------------------
// Module-level slot for merchant metadata
// (same pattern as inventory evaluator's _activeHolds)
// ---------------------------------------------------------------------------

interface QuoteMeta {
  merchantId: string;
  envelope?: DecisionRecord['envelope'];
}

let _quoteMeta: QuoteMeta | null = null;

/**
 * Set the merchant metadata for the next QUOTE stage evaluation.
 * Called by the caller (playground, tests) before `evaluateOffer`.
 * The slot is consumed and cleared on the first `evaluate()` call.
 *
 * This is the same shim pattern as `setInventoryHolds` in inventory.ts —
 * a minimal bridge until the pipeline grows a first-class "evaluation context"
 * slot for non-BuyerContext per-call metadata.
 */
export function setQuoteMeta(meta: QuoteMeta): void {
  _quoteMeta = meta;
}

/**
 * Read and clear the quote meta slot.
 */
function consumeQuoteMeta(): QuoteMeta | null {
  const m = _quoteMeta;
  _quoteMeta = null;
  return m;
}

// ---------------------------------------------------------------------------
// QUOTE-stage evaluator
// ---------------------------------------------------------------------------

export const quoteEvaluator: UcpExtension<QuoteEvaluatorConfig, QuoteToken | null> = {
  namespace: QUOTE_NAMESPACE,
  version: '1.0.0',
  stage: 'QUOTE',
  /**
   * Priority 10 — first (and currently only) evaluator in the QUOTE stage.
   */
  priority: 10,
  reasonCodes: [
    'QUOTE_ISSUED',
    'QUOTE_EXPIRED',
    'QUOTE_CONTEXT_CHANGED',
    'QUOTE_STOCK_LOST',
    'QUOTE_PARTIALLY_HONORED',
    'QUOTE_FORGED',
    'QUOTE_HONORED_GRACE',
  ] as const,

  readConfig(variant: Variant): QuoteEvaluatorConfig | undefined {
    // Only run if the variant declares a quoteConfig (HonorPolicy).
    // The pipeline's manifestSubset ensures this evaluator only runs for
    // merchants with ext.quote in capabilities[]. The variant-level quoteConfig
    // carries the merchant's specific HonorPolicy for this item.
    const quoteConfig = variant.quoteConfig;
    if (!quoteConfig) {
      return undefined;
    }

    return {
      ...quoteConfig,
      variant,
      variantId: variant.id,
      quantity: 1,  // overwritten by pipeline injectQuantityIfNeeded
    };
  },

  evaluate({
    config,
    context,
    priorResults,
    now,
  }: {
    config: QuoteEvaluatorConfig;
    context: BuyerContext;
    priorResults: StageResults;
    now: number;
  }): ExtensionResult<QuoteToken | null> {
    const eligibilityStage = priorResults['ELIGIBILITY'] ?? {};
    const priceStage = priorResults['PRICE'] ?? {};

    // Collect all reasons from prior stages.
    const priorReasons = [
      ...Object.values(eligibilityStage).flatMap(r => r.reasons),
      ...Object.values(priceStage).flatMap(r => r.reasons),
    ];

    // Never quote a blocked line.
    const hasBlock = priorReasons.some(r => r.severity === 'BLOCK');
    if (hasBlock) {
      consumeQuoteMeta(); // clear slot even on early return
      return { namespace: QUOTE_NAMESPACE, reasons: [], output: null };
    }

    // Consume the merchant metadata slot.
    const meta = consumeQuoteMeta();
    if (!meta) {
      // No meta injected — skip without error (evaluator not wired for this call).
      return { namespace: QUOTE_NAMESPACE, reasons: [], output: null };
    }

    // Build the minimal DecisionRecord structure issueQuote expects.
    // We have the normalizedContext via the `context` param (which the pipeline
    // guarantees is the normalized BuyerContext after normalizeBuyerContext).
    const normalizedContext = context as NormalizedBuyerContext;

    const fakeRecord: DecisionRecord = {
      inputsHash: '',
      stages: {
        ELIGIBILITY: eligibilityStage as Record<string, ExtensionResult<unknown>>,
        PRICE: priceStage as Record<string, ExtensionResult<unknown>>,
      },
      reasons: priorReasons.map(r => ({ ...r, source: r.source ?? QUOTE_NAMESPACE })),
      computedAt: now,
      normalizedContext,
      envelope: meta.envelope,
    };

    const token = issueQuote(
      fakeRecord,
      config.honorPolicy,
      meta.merchantId,
      config.variantId,
      config.quantity,
      now,
    );

    if (!token) {
      return { namespace: QUOTE_NAMESPACE, reasons: [], output: null };
    }

    return {
      namespace: QUOTE_NAMESPACE,
      reasons: [
        {
          code: QUOTE_REASON_CODES.QUOTE_ISSUED,
          message: `Quote issued: quoteId=${token.quoteId}, unitPrice=$${token.unitPrice.toFixed(2)}, TTL=${token.ttlSeconds}s.`,
          severity: 'INFO',
          blocking: false,
          source: QUOTE_NAMESPACE,
        },
      ],
      output: token,
    };
  },
};
