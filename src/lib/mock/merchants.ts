import { MerchantProfile, UcpCapabilityEntry } from '../types/core';
import type { MerchantKey } from '../types/envelope';

const coreCapabilities = [
  {
    id: 'ucp.catalog.discovery',
    name: 'Catalog Discovery',
    version: '1.0.0',
    description: 'Core UCP catalog browsing and search.'
  },
  {
    id: 'ucp.cart.management',
    name: 'Cart Management',
    version: '1.0.0',
    description: 'Core UCP cart lifecycle operations.'
  },
  {
    id: 'ucp.checkout.init',
    name: 'Checkout Initialization',
    version: '1.0.0',
    description: 'Core UCP checkout handoff.'
  }
];

/**
 * The à-la-carte catalog of RAOS capabilities a merchant may declare in its
 * `/.well-known/ucp` manifest (RAOS-0000). Each entry is keyed by `id` for
 * convenient selection; the authoritative negotiation surface is the
 * `{ namespace, version }` pair. `tier` is the conformance tier the capability
 * is *typically* associated with — advisory, not the negotiation key.
 */
const capabilityCatalog: Record<string, UcpCapabilityEntry> = {
  'ext.pricing_context': {
    id: 'ext.pricing_context',
    name: 'Pricing Context',
    version: '1.2.0',
    namespace: 'com.os.retailagent.shopping.pricing_context',
    description: 'Provides customer context to influence catalog visibility and pricing.',
    required: true,
    tier: 0
  },
  'ext.eligibility': {
    id: 'ext.eligibility',
    name: 'Eligibility Rules',
    version: '1.1.0',
    namespace: 'com.os.retailagent.shopping.eligibility',
    description: 'Calculates product and cart-level eligibility reasoning.',
    required: true,
    tier: 1
  },
  'ext.member_pricing': {
    id: 'ext.member_pricing',
    name: 'Member Pricing',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.member_pricing',
    description: 'Supports member-exclusive teasing and locked pricing.',
    required: false,
    tier: 2
  },
  'ext.bulk_pricing': {
    id: 'ext.bulk_pricing',
    name: 'Bulk Pricing & MOQ',
    version: '1.3.0',
    namespace: 'com.os.retailagent.shopping.bulk_pricing',
    description: 'Handles MOQ, quantity increments, and volume-based price tiers.',
    required: false,
    tier: 2
  },
  'ext.promo_pricing': {
    id: 'ext.promo_pricing',
    name: 'Promotional Pricing',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.promo_pricing',
    description: 'Supports sale pricing, mix-and-match, and quantity promo tiers.',
    required: false,
    tier: 2
  },
  'ext.fulfillment_constraints': {
    id: 'ext.fulfillment_constraints',
    name: 'Fulfillment Constraints',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.fulfillment_constraints',
    description: 'Complex constraint solving for shipping/pickup modes and regional availability.',
    required: false,
    tier: 4
  },
  'ext.loyalty': {
    id: 'ext.loyalty',
    name: 'Loyalty Preview',
    version: '0.9.0',
    namespace: 'com.os.retailagent.shopping.loyalty',
    description: 'Preview earn/burn mechanics (Future).',
    required: false,
    tier: 3
  },
  'ext.intent_capture': {
    id: 'ext.intent_capture',
    name: 'Intent Capture',
    version: '0.8.0',
    namespace: 'com.os.retailagent.shopping.intent_capture',
    description: 'Capture intent for out of stock or B2B negotiation (Future).',
    required: false,
    tier: 4
  },
  /**
   * WP-05 (RAOS-0005): Inventory & Availability. Tier 1 — required for all
   * Qualified merchants. All three archetypes declare this.
   */
  'ext.inventory': {
    id: 'ext.inventory',
    name: 'Inventory & Availability',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.inventory',
    description: 'Real-time stock state, per-location quantity, availability TTL, and soft reservation semantics.',
    required: true,
    tier: 1
  },
  /**
   * WP-01: Visibility pipeline evaluator. Wraps calculateVisibility from
   * src/lib/rules/eligibility.ts. Separate namespace from eligibility because
   * the registry is keyed by namespace and VISIBILITY and ELIGIBILITY are
   * distinct pipeline stages.
   */
  'ext.visibility': {
    id: 'ext.visibility',
    name: 'Visibility Rules',
    version: '1.1.0',
    namespace: 'com.os.retailagent.shopping.visibility',
    description: 'Evaluates product visibility (guest gating, region restrictions). WP-01.',
    required: true,
    tier: 0
  },
  /**
   * WP-01: Unified pricing pipeline evaluator. Wraps getApplicablePrice
   * (member→bulk→promo last-wins). WP-04 will decompose this into separate
   * member_pricing/bulk_pricing/promo_pricing evaluators with declared
   * priorities (10/20/30).
   */
  'ext.pricing': {
    id: 'ext.pricing',
    name: 'Pricing',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.pricing',
    description: 'Unified pricing evaluator (member→bulk→promo last-wins). WP-01; decomposed in WP-04.',
    required: true,
    tier: 0
  },
  /**
   * WP-06 (RAOS-0008): Trust, Provenance & Freshness. Tier 0 — required for all
   * Discoverable merchants. All three archetypes declare this.
   */
  'ext.trust': {
    id: 'ext.trust',
    name: 'Trust, Provenance & Freshness',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.trust',
    description: 'Signed payload envelopes, per-contract TTL, and data-staleness behavior (RAOS-0008).',
    required: true,
    tier: 0,
  },
  /**
   * WP-07 (RAOS-0007): Quote Integrity & Price Lock. Tier 2 — Priced merchants.
   * Wholesale B and Grocery C declare this with intentionally DIFFERENT HonorPolicies
   * to demonstrate both honor and requote paths in the Playground:
   *   - Wholesale B: onExpiry=requote, onStockLoss=reject (strict, B2B-oriented)
   *   - Grocery C:   onExpiry=honor_grace(120s), onStockLoss=partial (consumer-friendly)
   * The HonorPolicy is declared per-variant via variant.quoteConfig in the catalog.
   */
  'ext.quote': {
    id: 'ext.quote',
    name: 'Quote Integrity & Price Lock',
    version: '1.0.0',
    namespace: 'com.os.retailagent.shopping.quote',
    description: 'Signed, TTL\'d price commitments. The price the agent quotes is the price charged (RAOS-0007).',
    required: false,
    tier: 2,
  },
};

const pick = (...ids: string[]): UcpCapabilityEntry[] => ids.map(id => capabilityCatalog[id]);

// ---------------------------------------------------------------------------
// Per-merchant signing keys (RAOS-0008 / WP-06)
// Key rotation: multiple keys may overlap; verifyEnvelope picks by keyId.
// ---------------------------------------------------------------------------

/**
 * Boutique A signing keys.
 * k1: primary key, no scheduled expiry.
 * k1_rotated: future key for rotation worked example (validFrom in the future
 * relative to any realistic now value used in tests).
 */
const boutiqueKeys: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1700000000000, validTo: null },
];

/**
 * Wholesale B signing keys.
 * k1: primary key, expires 2033-01-01.
 * k2: rotation key, overlaps with k1 starting earlier to allow gradual migration.
 */
const wholesaleKeys: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1700000000000, validTo: 1988150400000 }, // expires 2033-01-01
  { keyId: 'k2', validFrom: 1750000000000, validTo: null },           // rotation key
];

/**
 * Grocery C signing keys.
 * k1: primary key, no expiry.
 */
const groceryKeys: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1700000000000, validTo: null },
];

export const mockMerchants: MerchantProfile[] = [
  {
    // Sara's Boutique — open DTC. Headline Tier 2 (Priced): supports member_pricing
    // (teaser + member prices, purchase limits) but NOT bulk_pricing.
    // WP-04 (RAOS-0002): boutique lists member_pricing only per the spec.
    // WP-05 (RAOS-0005): boutique lists inventory (Tier 1 required); preorder scenario.
    merchantId: 'm_boutique_001',
    merchantName: 'Boutique A',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.boutique-a.test/ucp/catalog',
      cart: 'https://api.boutique-a.test/ucp/cart',
      checkout: 'https://api.boutique-a.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    manifest: {
      protocol: '1.0',
      tier: 2,
      capabilities: pick(
        'ext.trust',
        'ext.pricing_context',
        'ext.visibility',
        'ext.eligibility',
        'ext.inventory',
        'ext.member_pricing',
        'ext.pricing',
      ),
      keys: boutiqueKeys,
    }
  },
  {
    // Atlas Wholesale — B2B, bulk-priced. Headline Tier 2 (Priced): adds both
    // member_pricing AND bulk_pricing on top of the eligibility floor.
    // WP-04 (RAOS-0002): wholesale lists BOTH namespaces.
    // WP-05 (RAOS-0005): wholesale lists inventory (Tier 1 required); backorder scenario.
    // WP-06 (RAOS-0008): wholesale lists trust + carries two keys (rotation demo).
    merchantId: 'm_wholesale_002',
    merchantName: 'Wholesale B',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.wholesale-b.test/ucp/catalog',
      cart: 'https://api.wholesale-b.test/ucp/cart',
      checkout: 'https://api.wholesale-b.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    manifest: {
      protocol: '1.0',
      tier: 2,
      capabilities: pick(
        'ext.trust',
        'ext.pricing_context',
        'ext.visibility',
        'ext.eligibility',
        'ext.inventory',
        'ext.member_pricing',
        'ext.bulk_pricing',
        'ext.pricing',
        'ext.quote',
      ),
      keys: wholesaleKeys,
    }
  },
  {
    // Fresh Corner Market — offers + fulfillment. Headline Tier 3 (Member-aware):
    // promo pricing + member_pricing + bulk_pricing. WP-04 (RAOS-0002): grocery
    // lists BOTH member_pricing and bulk_pricing namespaces.
    // WP-05 (RAOS-0005): grocery lists inventory (Tier 1 required);
    // per-location BOPIS, two-agents-one-unit race, stock-stale TTL scenarios.
    // WP-06 (RAOS-0008): grocery lists trust.
    merchantId: 'm_grocery_003',
    merchantName: 'Grocery Retail C',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.grocery-c.test/ucp/catalog',
      cart: 'https://api.grocery-c.test/ucp/cart',
      checkout: 'https://api.grocery-c.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    manifest: {
      protocol: '1.0',
      tier: 3,
      capabilities: pick(
        'ext.trust',
        'ext.pricing_context',
        'ext.visibility',
        'ext.eligibility',
        'ext.inventory',
        'ext.member_pricing',
        'ext.bulk_pricing',
        'ext.promo_pricing',
        'ext.fulfillment_constraints',
        'ext.intent_capture',
        'ext.pricing',
        'ext.quote',
      ),
      keys: groceryKeys,
    }
  }
];
