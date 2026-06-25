/**
 * @retailagentos/engine — public API entrypoint
 *
 * Importing this package self-registers all evaluators (visibility, eligibility,
 * pricing, inventory, quote) into the registry. Consumers call `evaluateOffer`
 * and never touch the registry directly.
 *
 * PUBLIC API SURFACE (the only supported surface — everything else is internal):
 *   evaluateOffer, issueQuote, validateQuote,
 *   buildDecisionTrace, renderBuyerTrace, renderMerchantTrace, renderDeveloperTrace,
 *   + all referenced types listed below.
 *
 * DETERMINISM INVARIANT: no Date.now(), Math.random(), or fetch() in the
 * rule/extension code that powers this package. `now` is always injected.
 *
 * Source of truth: src/lib/ in the RetailAgentOS repo. This package is a
 * re-export layer — it has no logic of its own.
 *
 * Import paths use the `@/` alias (tsconfig paths: "@/*" → "src/*") so this
 * file resolves correctly whether imported directly or via the workspace symlink.
 */

// ---------------------------------------------------------------------------
// Side-effect import: self-registers all evaluators
// (mirrors what src/lib/extensions/index.ts does)
// ---------------------------------------------------------------------------

import '@/lib/extensions/index';

// ---------------------------------------------------------------------------
// Evaluation + evaluator configuration helpers
// ---------------------------------------------------------------------------

export { evaluateOffer } from '@/lib/extensions/pipeline';
// Evaluator-level configuration hooks used by callers before invoking evaluateOffer.
export { setInventoryHolds } from '@/lib/extensions/evaluators/inventory';
export { setQuoteMeta } from '@/lib/extensions/evaluators/quote';
export type {
  DecisionRecord,
  EvaluateOfferInput,
  AttributedReasonEntry,
} from '@/lib/extensions/pipeline';

// ---------------------------------------------------------------------------
// Quote lifecycle
// ---------------------------------------------------------------------------

export { issueQuote, validateQuote } from '@/lib/rules/quote';
export type { QuoteToken, QuoteValidationResult } from '@/lib/types/quote';

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

export { buildDecisionTrace } from '@/lib/trace/derive';
export {
  renderBuyerTrace,
  renderMerchantTrace,
  renderDeveloperTrace,
} from '@/lib/trace/render';
export type {
  DecisionTrace,
  BuyerTraceView,
  MerchantTraceRow,
} from '@/lib/trace/types';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type {
  Variant,
  MerchantProfile,
  UcpManifest,
} from '@/lib/types/core';

export type {
  BuyerContext,
  PartialBuyerContext,
} from '@/lib/types/context';

export type {
  EligibilityRules,
  FulfillmentConstraints,
} from '@/lib/types/extensions';

export type { InventoryConfig } from '@/lib/types/inventory';
export type { QuoteConfig } from '@/lib/types/quote';

// ---------------------------------------------------------------------------
// Adapter interfaces (A2)
// Every merchant implements these two contracts to make their catalog
// agent-compliant. Kit helpers (manifest, schema.org, MCP) derive everything
// else from their output.
// ---------------------------------------------------------------------------

export type {
  MerchantCatalogAdapter,
  BuyerContextResolver,
} from '@/lib/adapters/index';

// ---------------------------------------------------------------------------
// Region allowlist helper (A3)
// Adapters call checkServesRegion before forwarding to evaluateOffer when they
// model region eligibility as an allowlist ("serves exactly these countries")
// rather than the spec's current blocklist (fulfillmentConstraints.restrictedRegions).
// Emits REGION_RESTRICTED (BLOCK) when context.marketRegion ∉ servesRegions.
// See: case-studies/thecustomhub/02-spine-design.md §4
// ---------------------------------------------------------------------------

export { checkServesRegion } from '@/lib/rules/regionAllowlist';

// ---------------------------------------------------------------------------
// Projection helpers (A4)
// Pure functions that derive every agent-facing surface — the /.well-known/ucp
// manifest, schema.org Product+Offer JSON-LD, and Google-format product feed —
// from canonical RAOS objects (MerchantProfile, Variant). Deterministic: no
// I/O, no Date.now(), no Math.random().
// ---------------------------------------------------------------------------

export { buildManifest, toSchemaOrgProduct, toProductFeedRow, toProductFeed } from '@/lib/projections/index';
export type {
  SchemaOrgProduct,
  SchemaOrgOffer,
  SchemaOrgAvailability,
  ProductFeedRow,
  FeedAvailability,
} from '@/lib/projections/index';
