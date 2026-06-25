/**
 * RAOS Adapter Contracts
 *
 * Every merchant that integrates with the RetailAgentOS engine implements
 * exactly these two interfaces. Everything downstream — the `/.well-known/ucp`
 * manifest, schema.org JSON-LD, product feeds, MCP tools — is derived from
 * their output by kit helpers. Merchants never touch the registry, evaluators,
 * or trace renderers directly.
 *
 * DETERMINISM NOTE: implementations MUST NOT call Date.now(), Math.random(),
 * or fetch(). Inject `now` from the caller when time is needed.
 */

import type { MerchantProfile, Variant } from '@/lib/types/core';
import type { PartialBuyerContext } from '@/lib/types/context';

/**
 * The single contract every merchant implements to make their catalog
 * agent-compliant. Parameterised on `TSource` — the merchant's own
 * product/variant shape (e.g. a Shopify product, a JSON record, an ORM entity).
 *
 * The adapter's job is purely mechanical mapping: it normalises one merchant
 * catalog format into the canonical RAOS objects the engine understands. No
 * business logic lives here — eligibility, pricing, inventory, and quote rules
 * are declared on the returned `Variant` objects and evaluated by `evaluateOffer`.
 */
export interface MerchantCatalogAdapter<TSource> {
  /**
   * Returns the merchant manifest: tier + capabilities[] + endpoints + keys.
   *
   * This is the authoritative source that `buildManifest` projects into the
   * `/.well-known/ucp` response. Capabilities listed here determine which
   * RAOS evaluator stages run during `evaluateOffer`. Must be pure and
   * idempotent — called once per session, not per variant.
   */
  merchantProfile(): MerchantProfile;

  /**
   * Maps one merchant product (in the merchant's native shape) to one or more
   * buyable RAOS Variants.
   *
   * Returns an array because a single source product often expands into
   * multiple purchasable SKUs (size × colour matrices, option permutations, etc.).
   * Null-padding rows — e.g. Shopify phantom variants — must be filtered out
   * here, not propagated into the catalog.
   *
   * @param source - A single product in the merchant's native format.
   * @returns One or more normalised Variants ready for `evaluateOffer`.
   */
  toVariants(source: TSource): Variant[];

  /**
   * Returns the entire normalised catalog as a flat list of Variants.
   *
   * Convenience method for bulk operations (feed generation, MCP catalog
   * resources, snapshot tests). Implementations typically iterate their
   * full product list and delegate to `toVariants` per product.
   */
  listVariants(): Variant[];
}

/**
 * Maps an agent or session's inbound claims (region, fulfilment preference,
 * etc.) to a `PartialBuyerContext` the engine can normalise and evaluate.
 *
 * This is where the merchant decides how to translate agent-supplied claims
 * into the canonical context shape. Missing fields are filled by
 * `normalizeBuyerContext` with most-restrictive defaults (RAOS-0000 §4.3).
 *
 * Region gating (e.g. "ships to US and CA only") is implemented by setting
 * `marketRegion` here and declaring the allowlist on the merchant's
 * `EligibilityRules` — the eligibility evaluator then emits `REGION_RESTRICTED`
 * automatically for out-of-allowlist regions.
 */
export interface BuyerContextResolver {
  /**
   * Translates raw agent / session claims into a PartialBuyerContext.
   *
   * @param input.region - ISO 3166-1 alpha-2 country code supplied by the
   *   agent or inferred from the session (e.g. 'US', 'CA', 'GB').
   * @param input.fulfillmentMode - Agent-requested delivery mode
   *   ('shipping' | 'pickup' | 'local_delivery'). Defaults to 'shipping'
   *   when absent (handled by normalizeBuyerContext).
   * @returns A partial context; unset fields default to most-restrictive
   *   values at the pipeline boundary.
   */
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}
