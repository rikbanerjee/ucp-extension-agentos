/**
 * WP-01 / WP-02: UCP Extension Pipeline
 *
 * `evaluateOffer` runs all enabled stage evaluators in the fixed order
 * (VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE —
 * reordered 2026-08-12 by RAOS-0003, engine 0.3.0; see STAGE_ORDER's doc
 * comment in contract.ts for the full justification), guards each
 * evaluator with try/catch per RAOS-0000 §7.3 degradation semantics, and
 * folds everything into a `DecisionRecord` — the trace substrate for WP-08.
 *
 * WP-02 update:
 *   - `context` type changed from `PricingContext` to `BuyerContext`.
 *   - Pipeline calls `normalizeBuyerContext` at the boundary before handing
 *     context to evaluators. This enforces §4.3 defaults and §7.2 trust
 *     downgrade in one place.
 *   - `trustEnforcement` option added: 'enforce' (default) or 'legacy'.
 *     See normalizeBuyerContext.ts for the compat decision.
 *   - `AttributedReasonEntry` now carries full `ReasonEntry` (severity + source).
 *
 * DEGRADATION SEMANTICS (RAOS-0000 §7.3 / MASTER-BUILD-PLAN §1.3):
 *   - Safety-critical stages (ELIGIBILITY, QUOTE): a throwing evaluator
 *     produces a BLOCK-style ExtensionResult with a PIPELINE_EVALUATOR_ERROR
 *     reason. The sale is blocked, not crashed.
 *   - Advisory stages (VISIBILITY, PRICE, FULFILLMENT): a throwing evaluator
 *     is omitted from the DecisionRecord with a logged warning. The sale
 *     proceeds without that evaluator's output.
 *
 * OQ-2 (2026-08-01, RAOS-0001 §9): `evaluateOffer` now enforces the merchant
 * region allowlist (`MerchantProfile.servesRegions`) itself, as a short-
 * circuit before the per-variant evaluator chain — see the comment at that
 * check for why it lives here rather than inside `calculateEligibility`.
 * Previously this was enforced only by adapter-side pre-checks calling
 * `checkServesRegion` manually (`src/lib/rules/regionAllowlist.ts`), which
 * the TheCustomHub pilot audit found meant `evaluateOffer` alone did not
 * block an unserved region (`04-pilot-evidence.md` §8 OQ-2).
 *
 * DETERMINISM: `now` is always injected. This module never calls Date.now().
 */

import type { MerchantProfile, Variant } from '@/lib/types/core';
import type { BuyerContext, NormalizedBuyerContext } from '@/lib/types/context';
import type { PartialBuyerContext } from '@/lib/types/context';
import type { ReasonEntry } from '@/lib/types/reasons';
import { normalizeBuyerContext, type TrustEnforcement } from '@/lib/rules/normalizeBuyerContext';
import {
  type PipelineStage,
  type StageResults,
  type ExtensionResult,
  STAGE_ORDER,
} from './contract';
import { byStage, manifestSubset } from './registry';
import { signEnvelope, buildTrustReasonEntries, TRUST_REASON_CODES, TRUST_NAMESPACE } from '@/lib/rules/trust';
import { STAGE_TTL_DEFAULTS } from '@/lib/types/envelope';
import type { ReasonEntry as TrustReasonEntry } from '@/lib/types/reasons';
import { checkServesRegion } from '@/lib/rules/regionAllowlist';
import { setFulfillmentMerchantTimezone, setFulfillmentMerchantSchedule } from './evaluators/fulfillment';

// ---------------------------------------------------------------------------
// DecisionRecord — the trace substrate (WP-08 will render it)
// ---------------------------------------------------------------------------

/**
 * A reason entry attributed to a specific evaluator namespace.
 * These are the ordered, source-tagged reasons in the DecisionRecord.
 * WP-02: carries full ReasonEntry (severity + source + blocking deprecated).
 */
export interface AttributedReasonEntry extends ReasonEntry {
  /** The namespace of the evaluator that emitted this reason (same as source). */
  source: string;
}

/**
 * A record of all evaluator results for a single offer evaluation.
 * This is the trace substrate: ordered, with per-stage attribution,
 * but it renders nothing — rendering is WP-08's job.
 *
 * `computedAt` is the injected `now` value, not a wall-clock read.
 */
export interface DecisionRecord {
  /**
   * A hash of the inputs (merchant + variant + quantity + context).
   * Deterministic given the same inputs. Used for cache-key / idempotency.
   * WP-07 (QuoteToken) binds this hash.
   */
  inputsHash: string;

  /**
   * All evaluator results, keyed by stage → namespace.
   * Only stages/evaluators that ran appear here.
   */
  stages: Partial<Record<PipelineStage, Record<string, ExtensionResult<unknown>>>>;

  /**
   * Flat, ordered list of all reason entries across all stages,
   * each tagged with the emitting evaluator's namespace.
   * Order: stage order → priority order within stage → reasons order within result.
   * WP-06: TRUST_SIMULATED (and DATA_STALE when applicable) are prepended.
   */
  reasons: AttributedReasonEntry[];

  /** The injected `now` value at evaluation time (Unix ms). */
  computedAt: number;

  /**
   * The normalized BuyerContext that was used for evaluation.
   * Reflects any trust-downgrade applied at the boundary.
   * Always has loyaltyTier and trust present.
   */
  normalizedContext: NormalizedBuyerContext;

  /**
   * WP-06 / RAOS-0008: The provenance + freshness envelope for this evaluation.
   * Signed centrally by the pipeline (not per-evaluator). The envelope covers
   * the entire evaluation — a single trust posture per DecisionRecord.
   * trustMode is always 'asserted' while crypto is simulated (B3/D2).
   */
  envelope?: {
    issuer: string;
    keyId: string;
    signature: string;
    trustMode: 'asserted' | 'signed';
    computedAt: number;
    ttlSeconds: number;
  };
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface EvaluateOfferInput {
  merchant: MerchantProfile;
  variant: Variant;
  quantity: number;
  /**
   * BuyerContext (or legacy PartialBuyerContext). The pipeline normalizes
   * this at the boundary via `normalizeBuyerContext` before passing it to
   * evaluators. You may pass a partial or old-style context here.
   */
  context: PartialBuyerContext | BuyerContext;
  /**
   * Injected Unix epoch milliseconds. Pass a fixed value (e.g. 0) for
   * call sites that have no time semantics yet. Never pass Date.now() here
   * from inside src/lib/extensions/** or src/lib/rules/**.
   */
  now: number;
  /**
   * Trust enforcement mode (default 'enforce'):
   *   - 'enforce': asserted contexts have privilege claims downgraded.
   *   - 'legacy': privilege claims respected regardless of trust mode.
   *
   * Use 'legacy' when the caller is passing old PricingContext-shaped input
   * without a trust field (backward compat). The demo uses 'enforce' to
   * demonstrate the trust.mode toggle.
   */
  trustEnforcement?: TrustEnforcement;
}

// ---------------------------------------------------------------------------
// Stage class → degradation behavior
// ---------------------------------------------------------------------------

type StageClass = 'SAFETY_CRITICAL' | 'ADVISORY';

const STAGE_CLASS: Record<PipelineStage, StageClass> = {
  VISIBILITY: 'ADVISORY',
  ELIGIBILITY: 'SAFETY_CRITICAL',
  // RAOS-0003: every v1 reason code is BLOCK + dead-end-cart, same class as
  // ELIGIBILITY — an evaluator that throws must degrade to BLOCK, not be
  // silently omitted (which would let an infeasible item look feasible).
  FEASIBILITY: 'SAFETY_CRITICAL',
  PRICE: 'ADVISORY',
  FULFILLMENT: 'ADVISORY',
  QUOTE: 'SAFETY_CRITICAL',
};

// ---------------------------------------------------------------------------
// Deterministic input hash
// ---------------------------------------------------------------------------

/**
 * Produce a stable string hash of the evaluation inputs.
 * No crypto — this is a cheap structural fingerprint for WP-01.
 * WP-07 (QuoteToken) may upgrade to a cryptographic hash.
 *
 * Deterministic: same inputs → same hash. No Date.now() or Math.random().
 */
function hashInputs(
  merchantId: string,
  variantId: string,
  quantity: number,
  context: BuyerContext,
): string {
  const canonical = JSON.stringify({
    m: merchantId,
    v: variantId,
    q: quantity,
    c: {
      customerType: context.customerType,
      loyaltyTier: context.loyaltyTier,
      membershipTier: context.membershipTier,
      marketRegion: context.marketRegion,
      fulfillmentMode: context.fulfillmentMode,
      accountLinked: context.accountLinked,
      taxExempt: context.taxExempt,
      resaleCertificateOnFile: context.resaleCertificateOnFile,
      trustMode: context.trust?.mode ?? 'asserted',
    },
  });
  // djb2-style hash — stable, no I/O, no randomness.
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) {
    h = ((h << 5) + h + canonical.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Degraded result factory (safety-critical stages)
// ---------------------------------------------------------------------------

function makeDegradedResult(
  namespace: string,
  stage: PipelineStage,
  error: unknown,
): ExtensionResult<null> {
  const message =
    error instanceof Error ? error.message : 'Unknown evaluator error';
  return {
    namespace,
    reasons: [
      {
        code: 'PIPELINE_EVALUATOR_ERROR',
        message: `[${stage}] Evaluator ${namespace} failed: ${message}. Defaulting to BLOCK (most-restrictive).`,
        severity: 'BLOCK',
        blocking: true,
        source: namespace,
      },
    ],
    output: null,
  };
}

// ---------------------------------------------------------------------------
// Quantity injection for PRICE-stage evaluators
// ---------------------------------------------------------------------------

/**
 * If the config object has a `quantity` property (duck-typed PricingConfig),
 * overwrite it with the actual cart-line quantity before calling evaluate().
 */
function injectQuantityIfNeeded(
  config: unknown,
  quantity: number,
): unknown {
  if (
    config !== null &&
    typeof config === 'object' &&
    'quantity' in config
  ) {
    return { ...(config as Record<string, unknown>), quantity };
  }
  return config;
}

// ---------------------------------------------------------------------------
// evaluateOffer — the pipeline entry point
// ---------------------------------------------------------------------------

/**
 * Run the enabled extension evaluators for this merchant × variant × context,
 * fold results into a `DecisionRecord`.
 *
 * "Enabled" = registered evaluators whose namespace appears in
 * `merchant.manifest.capabilities[]` (negotiation enforcement).
 *
 * The context is normalized at the boundary (most-restrictive defaults +
 * optional trust downgrade) before being passed to evaluators.
 */
export function evaluateOffer(input: EvaluateOfferInput): DecisionRecord {
  const { merchant, variant, quantity, now } = input;
  const trustEnforcement = input.trustEnforcement ?? 'enforce';

  // RAOS-0003: thread the merchant-level timezone invariant to the
  // FEASIBILITY-stage evaluator via the module-level slot (see
  // evaluators/fulfillment.ts doc comment — same pattern as
  // setInventoryHolds). Set unconditionally, every call, so no timezone
  // value from a prior evaluation can leak into this one.
  setFulfillmentMerchantTimezone(merchant.timezone);
  // RAOS-0003 v1.1: thread the optional merchant operating schedule the same
  // way. `undefined` for merchants that haven't declared one — the
  // FEASIBILITY evaluator OMITS the schedule/acceptance/preparation checks
  // in that case, never fabricates them.
  setFulfillmentMerchantSchedule(merchant.serviceSchedule);

  // Normalize context at the pipeline boundary (RAOS-0000 §4.3 + §7.2).
  const normalizedContext = normalizeBuyerContext(
    input.context as PartialBuyerContext,
    { trustEnforcement },
  );

  const inputsHash = hashInputs(merchant.merchantId, variant.id, quantity, normalizedContext);

  // ---------------------------------------------------------------------------
  // WP-06 / RAOS-0008: Central envelope + trust reasons.
  //
  // Hoisted above the per-variant evaluator chain (rather than computed only
  // after it, as before OQ-2) because the region-allowlist short-circuit
  // immediately below needs a fully-formed envelope too — a merchant-level
  // BLOCK is still a real DecisionRecord, not a bare error.
  // ---------------------------------------------------------------------------

  const merchantIssuer = merchant.endpoints.catalog.replace(/\/ucp\/catalog$/, '');
  // Pick the first valid key from the merchant manifest (or fall back to 'k1').
  const manifestKeys = merchant.manifest.keys ?? [];
  const activeKey = manifestKeys.find(k => k.validTo === null || k.validTo > now) ?? manifestKeys[0];
  const keyId = activeKey?.keyId ?? 'k1';

  // Sign the evaluation using the PRICE stage TTL as a reasonable outer default
  // (covers the most time-sensitive non-inventory data).
  const outerTtlSeconds = STAGE_TTL_DEFAULTS['PRICE'] ?? 300;
  const signedEnvelope = signEnvelope(inputsHash, keyId, now, merchantIssuer, outerTtlSeconds);

  const trustReasons = buildTrustReasonEntries({
    valid: true,
    code: TRUST_REASON_CODES.TRUST_SIMULATED,
    severity: 'INFO',
    message: 'Envelope produced with simulated crypto (SIMULATED — not cryptographically verified).',
    stale: false,
    ageSeconds: 0,
  });

  const trustAttributedReasons: AttributedReasonEntry[] = trustReasons.map(r => ({
    ...r,
    source: TRUST_NAMESPACE,
  }));

  // Suppress unused variable warning — TrustReasonEntry is used for type checking.
  void (undefined as unknown as TrustReasonEntry);

  const envelope = {
    issuer: signedEnvelope.provenance.issuer,
    keyId: signedEnvelope.provenance.keyId,
    signature: signedEnvelope.provenance.signature,
    trustMode: signedEnvelope.provenance.trustMode,
    computedAt: signedEnvelope.freshness.computedAt,
    ttlSeconds: signedEnvelope.freshness.ttlSeconds,
  };

  // ---------------------------------------------------------------------------
  // OQ-2 (RAOS-0001 §9): merchant-level region allowlist short-circuit.
  //
  // servesRegions is a MERCHANT-level invariant (does this merchant serve
  // this buyer's region AT ALL?), not a per-variant rule — unlike
  // fulfillmentConstraints.restrictedRegions, which stays exactly where it
  // was, evaluated per-variant inside calculateEligibility. Re-deriving a
  // merchant-level fact once per registered evaluator (or worse, once per
  // SKU in a cart) would be the same wasted-recomputation mistake the
  // TRUST_SIMULATED central-attachment pattern above already avoids — so it
  // runs ONCE here, before the per-variant evaluator chain, and short-
  // circuits the whole chain when it fails. This is also exactly where the
  // pilot's own server.js pre-check ran; the defect audited in
  // 04-pilot-evidence.md OQ-2 was that it ran OUTSIDE the engine, not that
  // it ran early.
  //
  // Three-state (RAOS-0001 §9 / core.ts MerchantProfile.servesRegions):
  //   - non-empty array → enforce via checkServesRegion (reuses REGION_RESTRICTED).
  //   - `[]` → checkServesRegion already treats empty-array as "serves
  //     nobody" by contract, so this falls out of the same call for free.
  //   - `undefined` at runtime (JS/JSON callers only — TS requires the field)
  //     → do not block. The manifest-build-time REGION_POLICY_UNDECLARED
  //     INFO reason (buildManifest) is the loud signal for this case, not a
  //     per-evaluation one.
  //
  // checkServesRegion remains exported for adapters that want a cheap
  // pre-check before ever constructing an EvaluateOfferInput — it is no
  // longer the ONLY enforcement point, but it may remain AN enforcement point.
  // ---------------------------------------------------------------------------

  if (merchant.servesRegions !== undefined) {
    const regionCheck = checkServesRegion(merchant.servesRegions, normalizedContext.marketRegion);
    if (regionCheck.status === 'BLOCKED') {
      // EligibilityReason already carries { code, message, severity, source,
      // blocking } — the same shape AttributedReasonEntry requires.
      const regionAttributedReasons: AttributedReasonEntry[] = regionCheck.reasons;
      return {
        inputsHash,
        stages: {},
        reasons: [...trustAttributedReasons, ...regionAttributedReasons],
        computedAt: now,
        normalizedContext,
        envelope,
      };
    }
  }

  // Resolve the enabled evaluators for this merchant's manifest.
  const enabled = manifestSubset(merchant.manifest);
  const enabledByNamespace = new Set(enabled.map(e => e.namespace));

  // Get all registered evaluators, grouped and ordered by stage.
  const allByStage = byStage();

  // Accumulate results.
  const stages: Partial<Record<PipelineStage, Record<string, ExtensionResult<unknown>>>> = {};
  const reasons: AttributedReasonEntry[] = [];

  // Mutable prior-results view — updated after each stage completes.
  let priorResults: StageResults = {};

  for (const stage of STAGE_ORDER) {
    const evaluators = allByStage.get(stage) ?? [];
    const stageResults: Record<string, ExtensionResult<unknown>> = {};

    for (const evaluator of evaluators) {
      // Skip evaluators not in the merchant's manifest.
      if (!enabledByNamespace.has(evaluator.namespace)) {
        continue;
      }

      // Read the evaluator's input config from the variant.
      let config = evaluator.readConfig(variant);
      if (config === undefined) {
        // No config for this extension on this variant — skip gracefully.
        continue;
      }

      // Inject quantity for PRICE-stage evaluators that need it.
      config = injectQuantityIfNeeded(config, quantity);

      let result: ExtensionResult<unknown>;

      try {
        result = evaluator.evaluate({ config, context: normalizedContext, priorResults, now });
      } catch (err) {
        const stageClass = STAGE_CLASS[stage];
        if (stageClass === 'SAFETY_CRITICAL') {
          // Degrade to BLOCK — never crash the pipeline.
          result = makeDegradedResult(evaluator.namespace, stage, err);
        } else {
          // Advisory stage: omit this evaluator's result, warn, continue.
          console.warn(
            `[pipeline] Advisory evaluator ${evaluator.namespace} in stage ${stage} threw an error — omitting result.`,
            err,
          );
          continue;
        }
      }

      stageResults[evaluator.namespace] = result;

      // Attribute and collect reasons in order.
      for (const reason of result.reasons) {
        reasons.push({
          ...reason,
          source: evaluator.namespace,
        });
      }
    }

    if (Object.keys(stageResults).length > 0) {
      stages[stage] = stageResults;
    }

    // Expose this stage's results to subsequent stages (read-only view).
    priorResults = Object.freeze({ ...priorResults, [stage]: Object.freeze(stageResults) });
  }

  // ---------------------------------------------------------------------------
  // WP-06 / RAOS-0008: Central envelope attachment
  //
  // The envelope (signed above, before the region short-circuit) covers the
  // entire DecisionRecord without requiring each evaluator to produce its
  // own. Per-stage envelopes are still signed individually below (different
  // TTLs per stage) and attached to each ExtensionResult.
  //
  // Reconciliation with WP-05 (inventory): ComputedAvailability.freshness
  // (per-item, from the inventory evaluator) is preserved as-is — it represents
  // the staleness of the item data source. This outer envelope represents the
  // freshness of the pipeline evaluation itself. Both are meaningful; neither
  // supersedes the other.
  //
  // The TRUST_SIMULATED reason is prepended to the reasons list so it appears
  // first — it is always emitted while crypto is simulated (INFO, non-blocking).
  // ---------------------------------------------------------------------------

  // Attach envelope to every ExtensionResult in stages.
  // Note: stageResultMap values may be frozen (priorResults uses Object.freeze),
  // so we rebuild each stage map rather than mutating in place.
  for (const stageKey of Object.keys(stages) as PipelineStage[]) {
    const stageResultMap = stages[stageKey];
    if (!stageResultMap) continue;
    const stageTtl = STAGE_TTL_DEFAULTS[stageKey] ?? outerTtlSeconds;
    const augmented: Record<string, ExtensionResult<unknown>> = {};
    for (const ns of Object.keys(stageResultMap)) {
      const stageSignedEnvelope = signEnvelope(inputsHash, keyId, now, merchantIssuer, stageTtl);
      augmented[ns] = {
        ...stageResultMap[ns],
        provenance: stageSignedEnvelope.provenance,
        freshness: stageSignedEnvelope.freshness,
      };
    }
    stages[stageKey] = augmented;
  }

  return {
    inputsHash,
    stages,
    reasons: [...trustAttributedReasons, ...reasons],
    computedAt: now,
    normalizedContext,
    envelope,
  };
}
