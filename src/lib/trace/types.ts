/**
 * RAOS-0013 (part 1) · Decision Trace — type definitions
 *
 * DecisionTrace = DecisionRecord + derived fields.
 * The trace is NEVER the substrate — it derives from the DecisionRecord that
 * the pipeline already produces. Renderers are pure functions over DecisionTrace.
 *
 * traceSchema '1.0.0' is a **review-pending** schema version. The owner reviews
 * the concrete shape and sample renderings before the /specs/0013 page goes
 * live. See specs/0013-intent-capture.md §3 (schema review gate).
 *
 * DETERMINISM: no Date.now(), Math.random(), fetch(), or I/O anywhere in
 * src/lib/trace/**. All derivations are pure functions of their inputs.
 */

import type { DecisionRecord, AttributedReasonEntry } from '@/lib/extensions/pipeline';
import type { PipelineStage } from '@/lib/extensions/contract';
import type { ReasonSeverity } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Per-stage verdict
// ---------------------------------------------------------------------------

/**
 * A summary verdict for a single pipeline stage: whether the stage ran,
 * and the worst severity seen across all reason entries from that stage.
 */
export interface StageVerdict {
  stage: PipelineStage;
  /** Whether at least one evaluator ran and produced output in this stage. */
  ran: boolean;
  /**
   * The worst severity from this stage's reason entries.
   * BLOCK > CONDITION > INFO. null when no reasons were emitted.
   */
  worstSeverity: ReasonSeverity | null;
  /** Number of reasons emitted by this stage. */
  reasonCount: number;
}

// ---------------------------------------------------------------------------
// Governing reason
// ---------------------------------------------------------------------------

/**
 * The single "most important" reason from the entire trace.
 * Selection rule (deterministic): first BLOCK, else first CONDITION, else null.
 * When null, the offer is unrestricted (or INFO-only).
 */
export interface GoverningReason {
  reason: AttributedReasonEntry;
  /**
   * A brief resolution path for this reason, if one exists.
   * Derived from `reason.requirements[]` — present when the block is
   * satisfiable and the buyer has a path forward.
   */
  resolutionPath: string | null;
}

// ---------------------------------------------------------------------------
// Suppressed offer summary
// ---------------------------------------------------------------------------

/**
 * A suppressed offer extracted from the PRICE stage output.
 * Populated when the ComputedPriceState carries suppressedOffers[].
 */
export interface TraceSuppressedOffer {
  offerId: string;
  type: string;
  description: string;
  suppressedBy: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// DecisionTrace — the enriched trace substrate
// ---------------------------------------------------------------------------

/**
 * The full Decision Trace for one offer evaluation.
 *
 * KEY REVIEW NOTE: The owner reviews this schema + sample renderings before
 * specs/0013-intent-capture.md §3 ("Decision Trace") goes live as a public
 * spec. The traceSchema field carries the version for that tracking.
 *
 * @schema-review-required traceSchema '1.0.0' — pending owner sign-off
 */
export interface DecisionTrace {
  /**
   * Schema version for this trace shape.
   * Bump on breaking field changes (additive changes are compatible).
   * **PENDING OWNER REVIEW** before the public spec page ships.
   */
  traceSchema: '1.0.0';

  // ---------------------------------------------------------------------------
  // Core substrate fields (copied from DecisionRecord)
  // ---------------------------------------------------------------------------

  /** Stable hash of all inputs (merchant + variant + qty + context). */
  inputsHash: string;

  /** The injected `now` value at evaluation time (Unix ms). */
  computedAt: number;

  /**
   * All raw reasons from the DecisionRecord, in emission order.
   * This is the authoritative ordered list; all derived fields index into it.
   */
  reasons: AttributedReasonEntry[];

  // ---------------------------------------------------------------------------
  // Derived fields
  // ---------------------------------------------------------------------------

  /** Per-stage verdict summary (all five stages, even if they didn't run). */
  stageVerdicts: StageVerdict[];

  /**
   * The governing reason: first BLOCK in reasons[], else first CONDITION,
   * else null. This is the reason a merchant renderer, buyer renderer, and
   * developer renderer each treat as "the headline".
   */
  governingReason: GoverningReason | null;

  /**
   * Whether this offer is transactable: no BLOCK reasons exist AND
   * the governing reason (if any) is CONDITION or null.
   */
  isTransactable: boolean;

  /**
   * The overall offer status derived from reasons:
   *   - 'BLOCKED':     at least one BLOCK with no resolvable requirements[].
   *   - 'CONDITIONAL': at least one BLOCK|CONDITION with a resolution path.
   *   - 'ELIGIBLE':    no BLOCK/CONDITION (INFO-only or empty).
   */
  offerStatus: 'BLOCKED' | 'CONDITIONAL' | 'ELIGIBLE';

  /**
   * Suppressed offers from the PRICE stage, if present.
   * Empty when no PRICE stage ran or no offers were suppressed.
   */
  suppressedOffers: TraceSuppressedOffer[];

  /**
   * The computed unit price from the PRICE stage, if available.
   * null when the PRICE stage did not run or produced no output.
   */
  unitPrice: number | null;

  /**
   * Trust envelope summary from the DecisionRecord.
   * Always present — even simulated envelopes are recorded.
   */
  envelope: {
    issuer: string;
    keyId: string;
    trustMode: 'asserted' | 'signed';
    computedAt: number;
    ttlSeconds: number;
    /** True when at least one reason has severity === 'CONDITION' and the
     *  TTL has lapsed (DATA_STALE code present). */
    isStale: boolean;
  } | null;
}

// ---------------------------------------------------------------------------
// Renderer output types
// ---------------------------------------------------------------------------

/**
 * A single ops-actionable row in the merchant trace rendering.
 * One row per non-INFO reason in the trace, plus a PASS row if none exist.
 *
 * RAOS-0013 §2.2 — merchant-audience table format:
 *   Stage | Status | Code | Message | Action Hint
 */
export interface MerchantTraceRow {
  /** Pipeline stage that produced this reason (e.g. 'ELIGIBILITY'). */
  stage: string;
  /** Human-readable severity status: 'PASS' | 'BLOCK' | 'CONDITION'. */
  status: string;
  /** The raw reason code (e.g. 'TIER_RESTRICTION'). */
  code: string;
  /** Human-readable reason message. */
  message: string;
  /** Actionable config hint for a merchant ops user. */
  actionHint: string;
}

/**
 * The merchant trace rendering: an array of ops-actionable rows.
 * Ordered: BLOCKs first, then CONDITIONs, then INFOs.
 *
 * @deprecated MerchantTraceRendering — use MerchantTraceRow[] directly (renderMerchantTrace returns MerchantTraceRow[]).
 */
export interface MerchantTraceRendering {
  verdict: 'PASS' | 'BLOCKED' | 'CONDITIONAL';
  rows: MerchantTraceRow[];
}

/**
 * The buyer-facing trace view (RAOS-0013 §2.3).
 *
 * Deny-list enforced: must never expose floor, margin, cost, suppressed*,
 * inputsHash, computedAt, keyId, signature, source, or appliedOffers.
 */
export interface BuyerTraceView {
  /** Whether the buyer can proceed to purchase. */
  canPurchase: boolean;
  /**
   * The headline sentence shown to the buyer.
   * PASS → "Available for purchase"
   * BLOCK/CONDITION → first relevant reason message.
   */
  headline: string;
  /** Optional detail sentence (max 1 sentence from resolution path). */
  detail?: string;
  /** Optional buyer-facing next step derived from governing reason code. */
  nextStep?: string;
}

/**
 * The buyer-facing trace rendering: at most two plain-language sentences.
 * Must not contain any merchant-internal data (enforced by deny-list in render.ts).
 *
 * @deprecated BuyerTraceRendering — use BuyerTraceView directly (renderBuyerTrace returns BuyerTraceView).
 */
export interface BuyerTraceRendering {
  /** One to two sentences of plain language. Never empty. */
  summary: string;
  /**
   * A plain-language resolution hint, if a resolution path exists.
   * null when the offer is already clear or when no path is available.
   */
  resolutionHint: string | null;
}

/**
 * The developer JSON rendering: a stable-key-order snapshot of the full trace.
 * Versioned via traceSchema.
 */
export type DeveloperTraceRendering = DecisionTrace;
