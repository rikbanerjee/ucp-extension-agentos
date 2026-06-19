/**
 * WP-04: Pricing Evaluator (RAOS-0002)
 *
 * Upgraded from the WP-01 thin wrapper to emit structured reason codes and
 * the v2 ComputedPriceState shape (appliedOffers[], suppressedOffers[]).
 *
 * The rule logic lives in src/lib/rules/pricing.ts (the pure-function home).
 * This file wires it as a UcpExtension so the pipeline can invoke it as a
 * registered, ordered evaluator.
 *
 * PRIORITY: 10 (single evaluator in PRICE stage — WP-09 / RAOS-0006 will
 * decompose into member(10)/bulk(20)/promo(30) evaluators with declared
 * stacking ladder priorities when it owns the promo path).
 *
 * NAMESPACE: com.os.retailagent.shopping.pricing (unified in WP-01/WP-04;
 * decomposed into member_pricing / bulk_pricing namespaces in the reason
 * codes, matching the emitter namespace in pricing.ts).
 */

import { computePrice, RAOS_0002_REASON_CODES } from '@/lib/rules/pricing';
import type {
  ComputedPriceState,
  MemberPricing,
  BulkPricing,
  PromoPricing,
} from '@/lib/types/extensions';
import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { UcpExtension, ExtensionResult } from '../contract';

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------

export const PRICING_NAMESPACE = 'com.os.retailagent.shopping.pricing';

// Sub-priority annotations (for documentation / WP-09 decomposition)
export const PRICING_SUB_PRIORITIES = { member: 10, bulk: 20, promo: 30 } as const;

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

export interface PricingConfig {
  variant: Variant;
  memberPricing?: MemberPricing;
  bulkPricing?: BulkPricing;
  promoPricing?: PromoPricing;
  /** Cart-line quantity — injected by the pipeline before evaluate(). */
  quantity: number;
}

export function withQuantity(config: PricingConfig, quantity: number): PricingConfig {
  return { ...config, quantity };
}

// ---------------------------------------------------------------------------
// Pricing evaluator
// ---------------------------------------------------------------------------

export const pricingEvaluator: UcpExtension<PricingConfig, ComputedPriceState> = {
  namespace: PRICING_NAMESPACE,
  version: '2.0.0',
  stage: 'PRICE',
  priority: 10,

  /**
   * All reason codes this evaluator may emit (RAOS-0002 registry).
   * Used by the reason-code coverage test helper.
   */
  reasonCodes: RAOS_0002_REASON_CODES as unknown as readonly string[],

  readConfig(variant: Variant): PricingConfig {
    return {
      variant,
      memberPricing: variant.memberPricing,
      bulkPricing: variant.bulkPricing,
      promoPricing: variant.promoPricing,
      quantity: 1,
    };
  },

  evaluate({
    config,
    context,
  }: {
    config: PricingConfig;
    context: BuyerContext;
    priorResults: unknown;
    now: number;
  }): ExtensionResult<ComputedPriceState> {
    const { priceState, reasons } = computePrice(
      config.variant,
      config.quantity,
      context,
    );

    return {
      namespace: PRICING_NAMESPACE,
      reasons,
      output: priceState,
    };
  },
};
