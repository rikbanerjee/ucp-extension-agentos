/**
 * WP-01 / WP-02: UCP Extension Contract
 *
 * WP-02 update: `context` type upgraded from `PricingContext` to `BuyerContext`;
 * `ExtensionReasonEntry` upgraded to the full `ReasonEntry` from RAOS-0000 §8.
 * The `blocking` field is still present on `ReasonEntry` (deprecated) for
 * backward compat with evaluators that read it.
 *
 * DETERMINISM CONTRACT (RAOS-0000 / MASTER-BUILD-PLAN §1.3):
 *   - No Date.now(), Math.random(), fetch(), or new Date() anywhere in
 *     src/lib/extensions/**. Time is always the injected `now` parameter.
 */

import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { ReasonEntry } from '@/lib/types/reasons';
import type { Provenance, Freshness } from '@/lib/types/envelope';

// Re-export for backward compat with evaluators importing ExtensionReasonEntry.
export type { ReasonEntry as ExtensionReasonEntry };

// ---------------------------------------------------------------------------
// Pipeline stages (fixed evaluation order)
// ---------------------------------------------------------------------------

/**
 * The six pipeline stages in their fixed evaluation order.
 * An extension belongs to exactly one stage.
 *
 * RAOS-0003 (2026-08-12, engine 0.3.0, BREAKING): added `FEASIBILITY`,
 * reordering the pipeline. See STAGE_ORDER doc comment below for the
 * architectural call and its justification — recorded here, not only in
 * the spec, because this is a shared contract every stage depends on.
 */
export type PipelineStage =
  | 'VISIBILITY'
  | 'ELIGIBILITY'
  | 'FEASIBILITY'
  | 'PRICE'
  | 'FULFILLMENT'
  | 'QUOTE';

/**
 * Fixed evaluation order — no extension may change this.
 *
 * RAOS-0003 (2026-08-12, engine 0.3.0, BREAKING): was
 * `VISIBILITY → ELIGIBILITY → PRICE → FULFILLMENT → QUOTE`. `FULFILLMENT`
 * (mode/region/carrier/lead-time/cutoff feasibility) ran AFTER `PRICE`,
 * which meant computing a price for an item that cannot reach the buyer at
 * all — wasted work, and a confusing trace where a price sits next to a
 * hard, unconditional block. Every RAOS-0003 v1 reason code is `BLOCK`
 * severity with no resolution path (dead-end-cart, same class as
 * `ELIGIBILITY`), so it belongs where `ELIGIBILITY` belongs: before `PRICE`.
 *
 * THE CALL: a new `FEASIBILITY` stage is inserted between `ELIGIBILITY` and
 * `PRICE`, carrying deterministic "can this reach this buyer at all" checks
 * (mode, region, hazmat/oversize, lead-time-vs-need-by, cutoff — RAOS-0003
 * §6). The renamed-in-place old `FULFILLMENT` stage is KEPT, empty for now,
 * in its original position after `PRICE` — reserved for a future concern
 * that genuinely depends on price and weight and therefore cannot run
 * earlier: shipping-COST computation. Splitting "can we ship it" (early,
 * feasibility) from "what does shipping it cost" (late, depends on price)
 * is the future-proof shape: a stage-per-concern model rather than two
 * unrelated things sharing one stage by the accident of a shared word
 * ("fulfillment"). See `specs/0003-fulfillment.md` §2 for the full
 * write-up and the alternative considered (folding feasibility into
 * `ELIGIBILITY`) and rejected.
 */
export const STAGE_ORDER: readonly PipelineStage[] = [
  'VISIBILITY',
  'ELIGIBILITY',
  'FEASIBILITY',
  'PRICE',
  'FULFILLMENT',
  'QUOTE',
] as const;

// ---------------------------------------------------------------------------
// Extension result envelope
// ---------------------------------------------------------------------------

/**
 * The uniform output envelope every evaluator returns.
 * `output` carries the typed domain result (ComputedEligibility,
 * ComputedPriceState, etc.) so the pipeline can recover structured data
 * without re-running evaluators.
 *
 * WP-02: `reasons` now carries full `ReasonEntry` (with severity + source).
 * Provenance and freshness fields are typed (stubs until WP-06 / RAOS-0008).
 */
export interface ExtensionResult<TOutput = unknown> {
  namespace: string;
  /** Structured reason codes emitted by this evaluator (RAOS-0000 §8). */
  reasons: ReasonEntry[];
  /**
   * Typed domain output — the Computed* contract for this evaluator.
   * Callers downcast to the expected type via the evaluator's declared output.
   */
  output: TOutput;
  /** RAOS-0008 / WP-06 — populated by the trust/freshness WP. */
  provenance?: Provenance;
  freshness?: Freshness;
}

// ---------------------------------------------------------------------------
// Stage results accumulator
// ---------------------------------------------------------------------------

/**
 * A read-only view of all evaluator results produced so far.
 * Keyed by stage → namespace → result. The pipeline passes this to each
 * evaluator so later stages can read earlier decisions (e.g. Price stage
 * can see Eligibility to skip pricing a blocked item).
 *
 * Using `unknown` output type here because the map is heterogeneous; callers
 * that need typed output must downcast through the evaluator's known type.
 */
export type StageResults = Readonly<
  Partial<Record<PipelineStage, Readonly<Record<string, ExtensionResult<unknown>>>>>
>;

// ---------------------------------------------------------------------------
// The extension interface
// ---------------------------------------------------------------------------

/**
 * The contract every UCP extension evaluator implements.
 *
 * WP-02: `context` type is now `BuyerContext` (was `PricingContext`).
 * The pipeline calls `normalizeBuyerContext` at the boundary before passing
 * context to evaluators, so evaluators always receive a fully normalized
 * `BuyerContext`.
 *
 * @typeParam TConfig  - The input config type read from a Variant.
 * @typeParam TOutput  - The domain output type this evaluator computes.
 */
export interface UcpExtension<TConfig, TOutput> {
  /** Authoritative namespace. Must be unique across the registry. */
  readonly namespace: string;

  /** semver string per RAOS-0000 versioning policy. */
  readonly version: string;

  /** The pipeline stage this evaluator belongs to. */
  readonly stage: PipelineStage;

  /**
   * Evaluation order within this stage. Lower number = earlier execution.
   * Ties are broken by namespace (lexicographic ascending) for determinism.
   */
  readonly priority: number;

  /**
   * The complete set of reason codes this evaluator may emit.
   * Used by the registry to assemble the reason-code registry resource and
   * by the reasonCodeCoverage test helper.
   */
  readonly reasonCodes: readonly string[];

  /**
   * Read this evaluator's input config from a variant.
   * Returns undefined when the variant has no config for this extension,
   * which signals the pipeline to skip evaluation gracefully.
   */
  readConfig(variant: Variant): TConfig | undefined;

  /**
   * Pure evaluation function.
   *
   * Invariants:
   *  - Must be deterministic given the same inputs.
   *  - Must not call Date.now(), Math.random(), fetch(), or new Date().
   *  - Time-dependent logic must use the injected `now` (Unix ms).
   *  - Must not throw; callers guard with try/catch for fault isolation.
   */
  evaluate(input: {
    config: TConfig;
    /** Fully normalized BuyerContext — already passed through normalizeBuyerContext. */
    context: BuyerContext;
    priorResults: StageResults;
    /** Injected Unix epoch milliseconds — never call Date.now() inside. */
    now: number;
  }): ExtensionResult<TOutput>;
}
