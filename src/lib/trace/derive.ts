/**
 * RAOS-0013 (part 1) · Decision Trace — derivation
 *
 * `deriveTrace(record)` is a pure, deterministic function that enriches a
 * DecisionRecord with all derived fields needed by the three audience renderers.
 *
 * No I/O, no Date.now(), no model calls. Every field is a pure computation
 * over the DecisionRecord's already-computed data.
 */

import type { DecisionRecord } from '@/lib/extensions/pipeline';
import type { PipelineStage } from '@/lib/extensions/contract';
import type { ComputedPriceState } from '@/lib/types/extensions';
import type {
  DecisionTrace,
  GoverningReason,
  StageVerdict,
  TraceSuppressedOffer,
} from './types';
import { STAGE_ORDER } from '@/lib/extensions/contract';
import type { ReasonSeverity } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Severity ordering (BLOCK > CONDITION > INFO)
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<ReasonSeverity, number> = {
  BLOCK: 2,
  CONDITION: 1,
  INFO: 0,
};

function worstSeverity(
  severities: ReasonSeverity[],
): ReasonSeverity | null {
  if (severities.length === 0) return null;
  return severities.reduce<ReasonSeverity>((worst, s) =>
    SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst,
  severities[0]);
}

// ---------------------------------------------------------------------------
// Offer status derivation (mirrors deriveEligibilityStatus in reasons.ts
// but scoped to the full reason list rather than eligibility-only)
// ---------------------------------------------------------------------------

function deriveOfferStatus(
  reasons: ReadonlyArray<{ severity: ReasonSeverity; requirements?: unknown[] }>,
): 'BLOCKED' | 'CONDITIONAL' | 'ELIGIBLE' {
  let hasUnresolvableBlock = false;
  let hasConditional = false;

  for (const r of reasons) {
    if (r.severity === 'INFO') continue;
    const hasResolution =
      Array.isArray(r.requirements) && r.requirements.length > 0;
    if (r.severity === 'BLOCK' && !hasResolution) {
      hasUnresolvableBlock = true;
    } else {
      hasConditional = true;
    }
  }

  if (hasUnresolvableBlock) return 'BLOCKED';
  if (hasConditional) return 'CONDITIONAL';
  return 'ELIGIBLE';
}

// ---------------------------------------------------------------------------
// Resolution path string — built from requirements[]
// ---------------------------------------------------------------------------

function buildResolutionPath(
  requirements?: Array<{ type: string; value?: unknown; message?: string }>,
): string | null {
  if (!requirements || requirements.length === 0) return null;
  const parts = requirements.map(req => {
    if (req.message) return req.message;
    switch (req.type) {
      case 'customer_type':
        return `Upgrade to ${String(req.value)} account`;
      case 'membership_tier':
        return `Requires membership tier: ${String(req.value)}`;
      case 'moq':
        return `Minimum order quantity: ${String(req.value)} units`;
      case 'quantity_increment':
        return `Order in increments of ${String(req.value)}`;
      case 'tax_exempt':
        return 'Tax-exempt status required';
      case 'resale_certificate':
        return 'Resale certificate on file required';
      default:
        return `Requires: ${req.type} = ${String(req.value)}`;
    }
  });
  return parts.join('; ');
}

// ---------------------------------------------------------------------------
// deriveTrace — the main entry point
// ---------------------------------------------------------------------------

/**
 * Derive a `DecisionTrace` from a `DecisionRecord`.
 *
 * Pure and deterministic: same DecisionRecord → same DecisionTrace.
 * No side effects, no I/O.
 */
export function deriveTrace(record: DecisionRecord): DecisionTrace {
  const { inputsHash, computedAt, reasons, stages, envelope } = record;

  // --- Per-stage verdicts ---------------------------------------------------
  const stageVerdicts: StageVerdict[] = STAGE_ORDER.map(stage => {
    const stageData = stages[stage];
    if (!stageData) {
      return {
        stage: stage as PipelineStage,
        ran: false,
        worstSeverity: null,
        reasonCount: 0,
      };
    }
    const stageReasons = reasons.filter(r => {
      // A reason belongs to this stage when its source namespace is one of
      // the evaluators that ran in this stage.
      const evaluatorNs = Object.keys(stageData);
      return evaluatorNs.includes(r.source);
    });
    return {
      stage: stage as PipelineStage,
      ran: true,
      worstSeverity: worstSeverity(stageReasons.map(r => r.severity)),
      reasonCount: stageReasons.length,
    };
  });

  // --- Governing reason -----------------------------------------------------
  // First BLOCK, else first CONDITION, else null.
  const firstBlock = reasons.find(r => r.severity === 'BLOCK');
  const firstCondition = reasons.find(r => r.severity === 'CONDITION');
  const governingRaw = firstBlock ?? firstCondition ?? null;

  const governingReason: GoverningReason | null = governingRaw
    ? {
        reason: governingRaw,
        resolutionPath: buildResolutionPath(
          governingRaw.requirements as Array<{ type: string; value?: unknown; message?: string }> | undefined,
        ),
      }
    : null;

  // --- Offer status ---------------------------------------------------------
  const offerStatus = deriveOfferStatus(reasons);
  const isTransactable = offerStatus !== 'BLOCKED';

  // --- Suppressed offers from PRICE stage -----------------------------------
  const suppressedOffers: TraceSuppressedOffer[] = [];
  const priceStage = stages['PRICE'];
  if (priceStage) {
    for (const ns of Object.keys(priceStage)) {
      const result = priceStage[ns];
      const priceOutput = result.output as ComputedPriceState | null | undefined;
      if (priceOutput?.suppressedOffers) {
        for (const so of priceOutput.suppressedOffers) {
          suppressedOffers.push({
            offerId: so.offerId,
            type: so.type,
            description: so.description,
            suppressedBy: so.suppressedBy,
            reason: so.reason,
          });
        }
      }
    }
  }

  // --- Unit price from PRICE stage ------------------------------------------
  let unitPrice: number | null = null;
  if (priceStage) {
    for (const ns of Object.keys(priceStage)) {
      const result = priceStage[ns];
      const priceOutput = result.output as ComputedPriceState | null | undefined;
      if (typeof priceOutput?.unitPrice === 'number') {
        unitPrice = priceOutput.unitPrice;
        break;
      }
    }
  }

  // --- Envelope summary -----------------------------------------------------
  const isStale = reasons.some(
    r => r.code === 'DATA_STALE' || r.code === 'STOCK_STALE',
  );

  const envelopeSummary: DecisionTrace['envelope'] = envelope
    ? {
        issuer: envelope.issuer,
        keyId: envelope.keyId,
        trustMode: envelope.trustMode,
        computedAt: envelope.computedAt,
        ttlSeconds: envelope.ttlSeconds,
        isStale,
      }
    : null;

  return {
    traceSchema: '1.0.0',
    inputsHash,
    computedAt,
    reasons,
    stageVerdicts,
    governingReason,
    isTransactable,
    offerStatus,
    suppressedOffers,
    unitPrice,
    envelope: envelopeSummary,
  };
}

/**
 * Alias for `deriveTrace` that matches the WP-08 spec API surface.
 *
 * `stageResults` is embedded inside the `DecisionRecord.stages` field, so
 * it is accepted as an ignored parameter for API compatibility. Callers from
 * the WP-08 brief may pass the DecisionRecord's stages map here; the
 * implementation uses `record.stages` directly (same data).
 */
export function buildDecisionTrace(
  record: DecisionRecord,
  // stageResults is already in record.stages — kept for spec API compat.
  _stageResults?: unknown,
): DecisionTrace {
  return deriveTrace(record);
}
