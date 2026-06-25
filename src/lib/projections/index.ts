/**
 * A4 — Generic projection helpers
 *
 * Pure functions that derive every agent-facing surface from canonical RAOS
 * objects (Variant, MerchantProfile). Importing from this barrel gives you
 * all three projections without binding to individual module paths.
 *
 * All exports are deterministic — no I/O, no Date.now(), no Math.random().
 */

export { buildManifest } from './manifest';
export { toSchemaOrgProduct } from './schemaOrg';
export type { SchemaOrgProduct, SchemaOrgOffer, SchemaOrgAvailability } from './schemaOrg';
export { toProductFeedRow, toProductFeed } from './feed';
export type { ProductFeedRow, FeedAvailability } from './feed';
