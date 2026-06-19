/**
 * WP-01: Extension registry boot file.
 *
 * Import this module to register all WP-01 evaluators into the registry.
 * The pipeline reads from the registry at call time, so this must be imported
 * before any call to evaluateOffer().
 *
 * Import order does not affect pipeline order — pipeline order is determined
 * by stage + priority, not registration order.
 */

export { evaluateOffer } from './pipeline';
export type { DecisionRecord, EvaluateOfferInput, AttributedReasonEntry } from './pipeline';
export { register, byStage, manifestSubset } from './registry';
export type { UcpExtension, ExtensionResult, PipelineStage, StageResults } from './contract';
export { setInventoryHolds } from './evaluators/inventory';
export { setQuoteMeta } from './evaluators/quote';

// ---------------------------------------------------------------------------
// Register evaluators (WP-01 through WP-07)
// ---------------------------------------------------------------------------

import { register } from './registry';
import { visibilityEvaluator, eligibilityEvaluator } from './evaluators/eligibility';
import { pricingEvaluator } from './evaluators/pricing';
import { inventoryEvaluator } from './evaluators/inventory';
import { quoteEvaluator } from './evaluators/quote';

register(visibilityEvaluator);
register(eligibilityEvaluator);
register(pricingEvaluator);
register(inventoryEvaluator);
register(quoteEvaluator);
