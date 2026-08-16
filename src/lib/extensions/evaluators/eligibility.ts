/**
 * WP-01 / WP-02: Eligibility + Visibility Evaluator
 *
 * Thin wrapper around the pure functions in src/lib/rules/eligibility.ts.
 * WP-02: updated to use BuyerContext and emit full ReasonEntry (with severity).
 */

import { calculateVisibility, calculateEligibility } from '@/lib/rules/eligibility';
import type {
  EligibilityRules,
  ComputedVisibility,
  ComputedEligibility,
} from '@/lib/types/extensions';
import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { UcpExtension, ExtensionResult } from '../contract';

// ---------------------------------------------------------------------------
// Namespaces
// ---------------------------------------------------------------------------

const VISIBILITY_NAMESPACE = 'com.os.retailagent.shopping.visibility';
const ELIGIBILITY_NAMESPACE = 'com.os.retailagent.shopping.eligibility';

// ---------------------------------------------------------------------------
// VISIBILITY stage evaluator
// ---------------------------------------------------------------------------

type VisibilityConfig = { variant: Variant };

export const visibilityEvaluator: UcpExtension<VisibilityConfig, ComputedVisibility> = {
  namespace: VISIBILITY_NAMESPACE,
  version: '1.1.0',
  stage: 'VISIBILITY',
  priority: 10,
  reasonCodes: ['HIDDEN_PRODUCT', 'REGION_RESTRICTED'] as const,

  readConfig(variant: Variant): VisibilityConfig | undefined {
    if (!variant.eligibilityRules) return undefined;
    return { variant };
  },

  evaluate({ config, context }: { config: VisibilityConfig; context: BuyerContext; priorResults: unknown; now: number }): ExtensionResult<ComputedVisibility> {
    const output = calculateVisibility(config.variant, context);
    return {
      namespace: VISIBILITY_NAMESPACE,
      reasons:
        output.status === 'HIDDEN'
          ? [
              {
                code: 'HIDDEN_PRODUCT',
                message: output.reason ?? 'This product is not visible in this context.',
                severity: 'BLOCK',
                blocking: true,
                source: VISIBILITY_NAMESPACE,
              },
            ]
          : [],
      output,
    };
  },
};

// ---------------------------------------------------------------------------
// ELIGIBILITY stage evaluator
// ---------------------------------------------------------------------------

type EligibilityConfig = {
  eligibilityRules: EligibilityRules | undefined;
  variant: Variant;
};

export const eligibilityEvaluator: UcpExtension<EligibilityConfig, ComputedEligibility> = {
  namespace: ELIGIBILITY_NAMESPACE,
  version: '1.1.0',
  stage: 'ELIGIBILITY',
  priority: 10,
  // RAOS-0003 migration (2026-08-12, engine 0.3.0): FULFILLMENT_UNAVAILABLE
  // removed from this list — it is renamed FULFILLMENT_MODE_UNAVAILABLE and
  // owned by the FEASIBILITY-stage evaluator now (evaluators/fulfillment.ts).
  // REGION_RESTRICTED is KEPT: it is still emitted, unchanged, by the
  // merchant-level servesRegions short-circuit in pipeline.ts
  // (checkServesRegion) — see specs/0001-eligibility.md §9.6. Only the
  // variant-level restrictedRegions emission (a different code, REGION_NOT_
  // SERVED, RAOS-0003) has moved.
  reasonCodes: [
    'HIDDEN_PRODUCT',
    'REGION_RESTRICTED',
    'WHOLESALE_ONLY',
    'RESALE_CERTIFICATE_REQUIRED',
    'TIER_RESTRICTION',
  ] as const,

  readConfig(variant: Variant): EligibilityConfig | undefined {
    if (!variant.eligibilityRules) return undefined;
    return { eligibilityRules: variant.eligibilityRules, variant };
  },

  evaluate({ config, context }: { config: EligibilityConfig; context: BuyerContext; priorResults: unknown; now: number }): ExtensionResult<ComputedEligibility> {
    const output = calculateEligibility(config.variant, context);

    // EligibilityReason already has severity + source (updated in WP-02).
    // Pass through directly — no mapping needed.
    const reasons = output.reasons.map(r => ({
      code: r.code,
      message: r.message,
      severity: r.severity,
      blocking: r.blocking,
      requirements: r.requirements,
      source: ELIGIBILITY_NAMESPACE,
    }));

    return {
      namespace: ELIGIBILITY_NAMESPACE,
      reasons,
      output,
    };
  },
};
