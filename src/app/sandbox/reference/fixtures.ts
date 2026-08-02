/**
 * Reference Cookbook Fixtures
 *
 * Minimal, self-contained MerchantProfile + Variant set for the cookbook
 * recipes. These are NOT the full mock catalog — they are purpose-built to
 * exercise exactly one scenario each, annotated with spec section references.
 *
 * IMPORTANT: namespace strings must match the registered evaluator namespaces
 * exactly, or the pipeline's manifestSubset() will skip the evaluator.
 * Copied verbatim from src/lib/mock/merchants.ts capabilityCatalog.
 *
 * DETERMINISM: no Date.now() here. Use REFERENCE_NOW for a fixed baseline.
 */

import type { MerchantProfile, UcpCapabilityEntry, Variant } from '@/lib/types/core';
import type { MerchantKey } from '@/lib/types/envelope';

// ---------------------------------------------------------------------------
// Fixed time anchor — all recipes using time should start here
// ---------------------------------------------------------------------------

/**
 * A fixed Unix epoch ms used as `now` for reproducible recipe output.
 * 2026-01-15 12:00:00 UTC. Recipes that need time-travel expose `now` as a
 * control offset from this value.
 */
export const REFERENCE_NOW = 1768564800000; // 2026-01-15 12:00:00 UTC

// ---------------------------------------------------------------------------
// Shared capability entries (exact namespace strings from mock/merchants.ts)
// ---------------------------------------------------------------------------

const CAP_TRUST: UcpCapabilityEntry = {
  id: 'ext.trust',
  name: 'Trust, Provenance & Freshness',
  namespace: 'com.os.retailagent.shopping.trust',
  version: '1.0.0',
  description: 'RAOS-0008 signed envelopes',
  required: true,
  tier: 0,
};

const CAP_VISIBILITY: UcpCapabilityEntry = {
  id: 'ext.visibility',
  name: 'Visibility Rules',
  namespace: 'com.os.retailagent.shopping.visibility',
  version: '1.1.0',
  description: 'RAOS-0001 guest gating, region restrictions',
  required: true,
  tier: 0,
};

const CAP_ELIGIBILITY: UcpCapabilityEntry = {
  id: 'ext.eligibility',
  name: 'Eligibility Rules',
  namespace: 'com.os.retailagent.shopping.eligibility',
  version: '1.1.0',
  description: 'RAOS-0001 who may buy',
  required: true,
  tier: 1,
};

const CAP_PRICING: UcpCapabilityEntry = {
  id: 'ext.pricing',
  name: 'Pricing',
  namespace: 'com.os.retailagent.shopping.pricing',
  version: '1.0.0',
  description: 'RAOS-0002 member/bulk/promo pricing',
  required: true,
  tier: 0,
};

const CAP_INVENTORY: UcpCapabilityEntry = {
  id: 'ext.inventory',
  name: 'Inventory & Availability',
  namespace: 'com.os.retailagent.shopping.inventory',
  version: '1.0.0',
  description: 'RAOS-0005 stock state, soft holds, freshness',
  required: true,
  tier: 1,
};

const CAP_QUOTE: UcpCapabilityEntry = {
  id: 'ext.quote',
  name: 'Quote Integrity & Price Lock',
  namespace: 'com.os.retailagent.shopping.quote',
  version: '1.0.0',
  description: 'RAOS-0007 signed TTL price commitments',
  required: false,
  tier: 2,
};

// ---------------------------------------------------------------------------
// Signing keys
// ---------------------------------------------------------------------------

const STANDARD_KEY: MerchantKey = {
  keyId: 'k1',
  validFrom: 1700000000000,
  validTo: null, // no expiry
};

/**
 * An expired key — used by 0008-trust to demonstrate KEY_EXPIRED path.
 * validTo = 2025-01-01 (before REFERENCE_NOW).
 */
const EXPIRED_KEY: MerchantKey = {
  keyId: 'k_expired',
  validFrom: 1700000000000,
  validTo: 1735689600000, // 2025-01-01 00:00:00 UTC — before REFERENCE_NOW
};

const ACTIVE_KEY_AFTER_ROTATION: MerchantKey = {
  keyId: 'k2',
  validFrom: 1750000000000, // 2025-06-16 — before REFERENCE_NOW
  validTo: null,
};

// ---------------------------------------------------------------------------
// MERCHANT A — Minimal DTC boutique
// Capabilities: trust + visibility + eligibility + pricing + inventory
// Used by: 0000-foundations (merchant A), 0001-eligibility, 0002-pricing, 0013-trace
// ---------------------------------------------------------------------------

export const MERCHANT_A: MerchantProfile = {
  merchantId: 'ref_merchant_a',
  merchantName: 'Ref Boutique A',
  protocolVersion: '1.0.0-draft',
  endpoints: {
    catalog: 'https://api.ref-boutique-a.test/ucp/catalog',
    cart: 'https://api.ref-boutique-a.test/ucp/cart',
    checkout: 'https://api.ref-boutique-a.test/ucp/checkout',
  },
  // RAOS-0001 OQ-2 (2026-08-01): required field. Covers every marketRegion
  // value the 0001/0002/0013 recipes exercise against this fixture (the
  // 0001-eligibility recipe's region control includes HI/AK/CA/NY to
  // demonstrate the per-variant restrictedRegions blocklist path — this
  // merchant-level allowlist must not collide with that demo).
  servesRegions: ['US', 'CA', 'HI', 'AK', 'NY'],
  capabilities: [],
  manifest: {
    protocol: '1.0',
    tier: 2,
    capabilities: [
      CAP_TRUST,
      CAP_VISIBILITY,
      CAP_ELIGIBILITY,
      CAP_PRICING,
      CAP_INVENTORY,
    ],
    keys: [STANDARD_KEY],
  },
};

// ---------------------------------------------------------------------------
// MERCHANT B — Wholesale-only, bulk-priced, with quote support
// Capabilities: trust + visibility + eligibility + pricing + inventory + quote
// Used by: 0000-foundations (merchant B), 0007-quote, 0008-trust
// ---------------------------------------------------------------------------

export const MERCHANT_B: MerchantProfile = {
  merchantId: 'ref_merchant_b',
  merchantName: 'Ref Wholesale B',
  protocolVersion: '1.0.0-draft',
  endpoints: {
    catalog: 'https://api.ref-wholesale-b.test/ucp/catalog',
    cart: 'https://api.ref-wholesale-b.test/ucp/cart',
    checkout: 'https://api.ref-wholesale-b.test/ucp/checkout',
  },
  // RAOS-0001 OQ-2 (2026-08-01): required field. Every recipe that uses this
  // fixture (0007-quote, 0008-trust) exercises marketRegion: 'US' only.
  servesRegions: ['US'],
  capabilities: [],
  manifest: {
    protocol: '1.0',
    tier: 2,
    capabilities: [
      CAP_TRUST,
      CAP_VISIBILITY,
      CAP_ELIGIBILITY,
      CAP_PRICING,
      CAP_INVENTORY,
      CAP_QUOTE,
    ],
    keys: [STANDARD_KEY, ACTIVE_KEY_AFTER_ROTATION],
  },
};

/**
 * MERCHANT B (trust variant) — same as B but with only an expired key,
 * to demonstrate the KEY_EXPIRED trust path in 0008-trust.
 * RAOS-0008 §4: verifyEnvelope emits KEY_EXPIRED when the selected key's
 * validTo < now.
 */
export const MERCHANT_B_EXPIRED_KEY: MerchantProfile = {
  ...MERCHANT_B,
  merchantId: 'ref_merchant_b_exp',
  merchantName: 'Ref Wholesale B (expired key)',
  manifest: {
    ...MERCHANT_B.manifest,
    keys: [EXPIRED_KEY], // only expired key — triggers KEY_EXPIRED in validateQuote
  },
};

// ---------------------------------------------------------------------------
// VARIANTS
// ---------------------------------------------------------------------------

/**
 * VARIANT: Open product — no eligibility restrictions, no member pricing.
 * Exercises the ELIGIBLE happy path in 0001 and 0000-foundations baseline.
 *
 * Spec: RAOS-0001 §3 "default: allow"
 */
export const VARIANT_OPEN: Variant = {
  id: 'v_open_001',
  sku: 'REF-OPEN-001',
  title: 'Open Access Widget',
  basePrice: 29.99,
  currency: 'USD',
  // No eligibilityRules → ELIGIBLE for all buyer types
  inventory: {
    state: 'in_stock',
    quantityAvailable: 50,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000, // 30s ago — within 60s TTL
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Tier-restricted — requires membershipTier=gold.
 * Exercises TIER_RESTRICTION reason in 0001-eligibility.
 *
 * Spec: RAOS-0001 §4.1 "requiredTier gate"
 */
export const VARIANT_TIER_RESTRICTED: Variant = {
  id: 'v_tier_001',
  sku: 'REF-TIER-001',
  title: 'Gold Member Widget',
  basePrice: 49.99,
  currency: 'USD',
  eligibilityRules: {
    requiredTier: 'gold', // RAOS-0001 §4.1
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 20,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Wholesale-only — requires customerType=wholesale.
 * Exercises WHOLESALE_ONLY reason in 0001-eligibility.
 *
 * Spec: RAOS-0001 §4.2 "requireWholesale gate"
 */
export const VARIANT_WHOLESALE_ONLY: Variant = {
  id: 'v_wholesale_001',
  sku: 'REF-WHOLESALE-001',
  title: 'Wholesale Bulk Item',
  basePrice: 15.00,
  currency: 'USD',
  eligibilityRules: {
    requireWholesale: true, // RAOS-0001 §4.2
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 500,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Region-restricted — not available in regions HI, AK.
 * Exercises REGION_RESTRICTED reason in 0001-eligibility.
 *
 * Spec: RAOS-0001 §4.3 "restrictedRegions gate"
 */
export const VARIANT_REGION_RESTRICTED: Variant = {
  id: 'v_region_001',
  sku: 'REF-REGION-001',
  title: 'Continental US Only Item',
  basePrice: 39.99,
  currency: 'USD',
  fulfillmentConstraints: {
    restrictedRegions: ['HI', 'AK', 'CA'],
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 100,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Member-priced — lower price for gold membershipTier.
 * Exercises MEMBER_PRICE_APPLIED / TEASER_LOCKED in 0002-pricing.
 *
 * Spec: RAOS-0002 §3 "member price path"
 */
export const VARIANT_MEMBER_PRICED: Variant = {
  id: 'v_member_001',
  sku: 'REF-MEMBER-001',
  title: 'Member-Priced Coffee Blend',
  basePrice: 24.99,
  currency: 'USD',
  memberPricing: {
    available: true,
    memberPrice: 18.99,        // RAOS-0002: applied for gold tier
    teaserPrice: 22.99,        // shown to non-members (non-addable)
    requiredTier: 'gold',
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 80,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Bulk-priced — MOQ 10, with tier discounts.
 * Exercises BULK_TIER_APPLIED / BELOW_MOQ in 0002-pricing.
 *
 * Spec: RAOS-0002 §4 "bulk tier path"
 */
export const VARIANT_BULK_PRICED: Variant = {
  id: 'v_bulk_001',
  sku: 'REF-BULK-001',
  title: 'Bulk Industrial Fastener',
  basePrice: 2.50,
  currency: 'USD',
  bulkPricing: {
    available: true,
    moq: 10,                  // RAOS-0002: minimum order quantity
    tiers: [
      { minQuantity: 10,  maxQuantity: 49,  price: 2.00 },
      { minQuantity: 50,  maxQuantity: 499, price: 1.60 },
      { minQuantity: 500, price: 1.20 },
    ],
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 1000,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Out-of-stock. Exercises OUT_OF_STOCK in 0005-inventory.
 * Spec: RAOS-0005 §3 "out_of_stock state"
 */
export const VARIANT_OUT_OF_STOCK: Variant = {
  id: 'v_oos_001',
  sku: 'REF-OOS-001',
  title: 'Sold-Out Seasonal Item',
  basePrice: 34.99,
  currency: 'USD',
  inventory: {
    state: 'out_of_stock',    // RAOS-0005: hard OOS
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Low-stock. Exercises LOW_STOCK in 0005-inventory.
 * Spec: RAOS-0005 §3.2 "low_stock threshold"
 */
export const VARIANT_LOW_STOCK: Variant = {
  id: 'v_low_001',
  sku: 'REF-LOW-001',
  title: 'Limited-Stock Collectible',
  basePrice: 79.99,
  currency: 'USD',
  inventory: {
    state: 'low_stock',       // RAOS-0005: advisory LOW_STOCK
    quantityAvailable: 3,
    lowStockThreshold: 5,
    reservationPolicy: 'soft_hold',
    reservationTtlSeconds: 900,
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Backorder. Exercises BACKORDER_AVAILABLE in 0005-inventory.
 * Spec: RAOS-0005 §3.3 "backorder state"
 */
export const VARIANT_BACKORDER: Variant = {
  id: 'v_back_001',
  sku: 'REF-BACK-001',
  title: 'Industrial Pump (Backordered)',
  basePrice: 299.00,
  currency: 'USD',
  inventory: {
    state: 'backorder',
    backorderEta: '2026-03-01',  // RAOS-0005: shown in BACKORDER_AVAILABLE requirements
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Stale inventory data. Exercises STOCK_STALE in 0005-inventory.
 * dataFetchedAt is intentionally old (> dataTtlSeconds ago).
 * Spec: RAOS-0005 §5 "staleness detection"
 */
export const VARIANT_STALE: Variant = {
  id: 'v_stale_001',
  sku: 'REF-STALE-001',
  title: 'Widget With Stale Inventory',
  basePrice: 19.99,
  currency: 'USD',
  inventory: {
    state: 'in_stock',
    quantityAvailable: 100,
    reservationPolicy: 'none',
    dataFetchedAt: REFERENCE_NOW - 120_000, // 120s ago — > 60s TTL → STOCK_STALE
    dataTtlSeconds: 60,
  },
};

/**
 * VARIANT: Quotable product with grace-window honor policy.
 * Used by 0007-quote to issue a QuoteToken and then validate under
 * TTL expiry and context-change scenarios.
 *
 * HonorPolicy: onExpiry=honor_grace(120s), onStockLoss=partial
 * Spec: RAOS-0007 §3 "HonorPolicy declaration"
 */
export const VARIANT_QUOTABLE: Variant = {
  id: 'v_quote_001',
  sku: 'REF-QUOTE-001',
  title: 'Quoted Industrial Component',
  basePrice: 149.99,
  currency: 'USD',
  memberPricing: {
    available: true,
    memberPrice: 129.99,
    requiredTier: 'gold',
  },
  inventory: {
    state: 'in_stock',
    quantityAvailable: 25,
    reservationPolicy: 'soft_hold',
    reservationTtlSeconds: 900,
    dataFetchedAt: REFERENCE_NOW - 30_000,
    dataTtlSeconds: 60,
  },
  // RAOS-0007: quoteConfig enables the QUOTE-stage evaluator for this variant
  quoteConfig: {
    ttlSeconds: 600,  // 10 minute price lock
    honorPolicy: {
      onExpiry: 'honor_grace',
      graceSeconds: 120,       // 2-minute grace window
      onStockLoss: 'partial',  // fulfill available quantity if short
      onContextChange: 'requote',
    },
  },
};
