/**
 * RAOS-0003 · Fulfillment Feasibility Evaluator
 *
 * Thin wrapper around the pure function in src/lib/rules/fulfillment.ts.
 * Registered in the new FEASIBILITY stage (contract.ts STAGE_ORDER — see
 * that file's doc comment for the reordering decision and its justification).
 *
 * MERCHANT TIMEZONE THREADING: `UcpExtension.evaluate` only receives
 * `{ config, context, priorResults, now }` — it has no access to the
 * `MerchantProfile` the pipeline is evaluating against, only the `Variant`
 * `readConfig` was given. `merchantTimezone` (a merchant-level invariant,
 * RAOS-0003 §4) therefore cannot flow through the per-variant config the
 * same way `restrictedRegions`/`availableModes` do.
 *
 * This module uses the SAME module-level-slot pattern RAOS-0005's inventory
 * evaluator already established for exactly this class of problem (see the
 * doc comment on `setInventoryHolds` in evaluators/inventory.ts): the caller
 * sets the slot immediately before invoking `evaluateOffer`, the evaluator
 * consumes-and-resets it during `evaluate()`. Acceptable because (a) it is
 * per-evaluation-call, set immediately before evaluateOffer, (b) it is pure
 * data with no side effects, (c) this is the minimal shim until the pipeline
 * grows a proper "pre-evaluation merchant context" slot (a future RAOS-0000
 * extension point — not built here, see specs/0003-fulfillment.md §9).
 *
 * Callers that don't set it get 'UTC' — a safe, inert default: it means
 * CUTOFF_PASSED/LEAD_TIME_EXCEEDS_NEED_BY are evaluated against UTC rather
 * than omitted, which is a best-effort degradation, not a crash (RAOS-0000
 * §7.3). Production call sites (Playground, pipeline consumers) MUST set the
 * real merchant timezone before evaluating.
 */

import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { UcpExtension, ExtensionResult } from '../contract';
import type { ComputedFulfillmentFeasibility } from '@/lib/types/extensions';
import { evaluateFulfillmentFeasibility, FULFILLMENT_NAMESPACE } from '@/lib/rules/fulfillment';

export { FULFILLMENT_NAMESPACE };

type FeasibilityConfig = { variant: Variant };

let _merchantTimezone = 'UTC';

/**
 * Set the merchant timezone to be used by the next FEASIBILITY evaluation.
 * Callers (Playground, tests, adapters) set this immediately before calling
 * `evaluateOffer`. Automatically reset to 'UTC' after use — mirrors
 * `setInventoryHolds`'s reset-after-consume discipline so timezone state
 * never leaks across unrelated evaluations.
 */
export function setFulfillmentMerchantTimezone(timezone: string): void {
  _merchantTimezone = timezone;
}

function consumeMerchantTimezone(): string {
  const tz = _merchantTimezone;
  _merchantTimezone = 'UTC';
  return tz;
}

export const fulfillmentEvaluator: UcpExtension<FeasibilityConfig, ComputedFulfillmentFeasibility> = {
  namespace: FULFILLMENT_NAMESPACE,
  version: '1.0.0',
  stage: 'FEASIBILITY',
  priority: 10,
  reasonCodes: [
    'FULFILLMENT_MODE_UNAVAILABLE',
    'REGION_NOT_SERVED',
    'HAZMAT_RESTRICTION',
    'OVERSIZE_RESTRICTION',
    'LEAD_TIME_EXCEEDS_NEED_BY',
    'CUTOFF_PASSED',
  ] as const,

  readConfig(variant: Variant): FeasibilityConfig | undefined {
    if (!variant.fulfillmentConstraints) return undefined;
    return { variant };
  },

  evaluate({
    config,
    context,
    now,
  }: {
    config: FeasibilityConfig;
    context: BuyerContext;
    priorResults: unknown;
    now: number;
  }): ExtensionResult<ComputedFulfillmentFeasibility> {
    const merchantTimezone = consumeMerchantTimezone();
    const { feasibility, reasons } = evaluateFulfillmentFeasibility({
      variant: config.variant,
      context,
      now,
      merchantTimezone,
    });

    return {
      namespace: FULFILLMENT_NAMESPACE,
      reasons,
      output: feasibility,
    };
  },
};
