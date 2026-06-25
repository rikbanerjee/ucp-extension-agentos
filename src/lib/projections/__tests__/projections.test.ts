/**
 * A4 — Snapshot tests for projection helpers
 *
 * Three snapshots:
 *  1. buildManifest — projects a MerchantProfile into UcpManifest
 *  2. toSchemaOrgProduct — projects a Variant into schema.org Product+Offer JSON-LD
 *  3. toProductFeed — projects a Variant[] into Google-format feed rows
 *
 * Fixtures are minimal but exercise all meaningful branches:
 *  - Standard in-stock, priced variant (the happy path)
 *  - Low-stock variant → LimitedAvailability in schema.org, "in stock" in feed
 *  - Out-of-stock variant
 *  - callForPrice variant → empty price string in feed; priceSpecification in schema.org
 *
 * Snapshot hygiene: snapshots are committed alongside source. To regenerate:
 *   npx vitest run --update-snapshots
 * Review the diff before committing — a snapshot change IS a semantic change.
 */

import { describe, it, expect } from 'vitest';
import { buildManifest } from '../manifest';
import { toSchemaOrgProduct } from '../schemaOrg';
import { toProductFeed } from '../feed';
import type { MerchantProfile, Variant } from '@/lib/types/core';

// ---------------------------------------------------------------------------
// Sample fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal MerchantProfile covering the fields buildManifest cares about.
 * Uses the same shape as FAKE_PROFILE in the A2 fixture, extended with a
 * realistic capabilities array to make the manifest snapshot meaningful.
 */
const SAMPLE_PROFILE: MerchantProfile = {
  merchantId: 'thecustomhub-001',
  merchantName: 'TheCustomHub',
  protocolVersion: '1.0.0-draft',
  endpoints: {
    catalog: 'https://thecustomhub.com/ucp/catalog',
    cart: 'https://thecustomhub.com/ucp/cart',
    checkout: 'https://thecustomhub.com/ucp/checkout',
  },
  capabilities: [],
  manifest: {
    protocol: '1.0',
    tier: 2,
    capabilities: [
      {
        id: 'ext.eligibility',
        name: 'Eligibility Rules',
        namespace: 'com.os.retailagent.shopping.eligibility',
        version: '1.1.0',
        description: 'Calculates product and cart-level eligibility reasoning.',
        required: true,
        tier: 1,
      },
      {
        id: 'ext.inventory',
        name: 'Inventory & Availability',
        namespace: 'com.os.retailagent.shopping.inventory',
        version: '1.0.0',
        description: 'Real-time stock state.',
        required: true,
        tier: 1,
      },
      {
        id: 'ext.quote',
        name: 'Quote Integrity & Price Lock',
        namespace: 'com.os.retailagent.shopping.quote',
        version: '1.0.0',
        description: 'Signed, TTL\'d price commitments.',
        required: false,
        tier: 2,
      },
    ],
    keys: [
      { keyId: 'k1', validFrom: 1700000000000, validTo: null },
    ],
  },
};

/**
 * Four sample variants exercising every meaningful branch in all three helpers:
 *  v1: in_stock, normal price
 *  v2: low_stock (→ LimitedAvailability in schema.org; "in stock" in feed)
 *  v3: out_of_stock
 *  v4: callForPrice (→ empty price in feed; priceSpecification in schema.org)
 */
const VARIANT_IN_STOCK: Variant = {
  id: 'v-robotics-shirt-sm-black',
  sku: 'RBT-SM-BLK',
  title: 'Robotics Team Shirt — Small / Black',
  basePrice: 29.99,
  currency: 'USD',
  inventory: {
    state: 'in_stock',
    quantityAvailable: 50,
    reservationPolicy: 'none',
  },
};

const VARIANT_LOW_STOCK: Variant = {
  id: 'v-robotics-shirt-lg-red',
  sku: 'RBT-LG-RED',
  title: 'Robotics Team Shirt — Large / Red',
  basePrice: 29.99,
  currency: 'USD',
  inventory: {
    state: 'low_stock',
    quantityAvailable: 3,
    lowStockThreshold: 5,
    reservationPolicy: 'soft_hold',
    reservationTtlSeconds: 900,
  },
};

const VARIANT_OUT_OF_STOCK: Variant = {
  id: 'v-robotics-hat-os',
  sku: 'RBT-HAT-OS',
  title: 'Robotics Team Cap — One Size',
  basePrice: 19.99,
  currency: 'USD',
  inventory: {
    state: 'out_of_stock',
    quantityAvailable: 0,
    reservationPolicy: 'none',
  },
};

const VARIANT_CALL_FOR_PRICE: Variant = {
  id: 'v-bulk-custom-jersey',
  sku: 'BULK-CUST-JRS',
  title: 'Custom Bulk Jersey — Group Order',
  basePrice: 0,
  currency: 'USD',
  callForPrice: true,
  inventory: {
    state: 'in_stock',
    reservationPolicy: 'none',
  },
};

const ALL_SAMPLE_VARIANTS: Variant[] = [
  VARIANT_IN_STOCK,
  VARIANT_LOW_STOCK,
  VARIANT_OUT_OF_STOCK,
  VARIANT_CALL_FOR_PRICE,
];

// ---------------------------------------------------------------------------
// Snapshot 1 — buildManifest
// ---------------------------------------------------------------------------

describe('buildManifest', () => {
  it('snapshot: projects MerchantProfile into UcpManifest', () => {
    const manifest = buildManifest(SAMPLE_PROFILE);
    expect(manifest).toMatchSnapshot();
  });

  it('returns the manifest embedded on the profile (reference equality)', () => {
    // buildManifest is a deliberate pass-through; no cloning. Callers who need
    // to mutate must clone first — this test guards the contract.
    const manifest = buildManifest(SAMPLE_PROFILE);
    expect(manifest).toBe(SAMPLE_PROFILE.manifest);
  });

  it('manifest protocol field matches profile protocolVersion prefix', () => {
    const manifest = buildManifest(SAMPLE_PROFILE);
    expect(manifest.protocol).toBe('1.0');
  });
});

// ---------------------------------------------------------------------------
// Snapshot 2 — toSchemaOrgProduct
// ---------------------------------------------------------------------------

describe('toSchemaOrgProduct', () => {
  it('snapshot: in-stock variant', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK)).toMatchSnapshot();
  });

  it('snapshot: low-stock variant → LimitedAvailability', () => {
    expect(toSchemaOrgProduct(VARIANT_LOW_STOCK)).toMatchSnapshot();
  });

  it('snapshot: out-of-stock variant', () => {
    expect(toSchemaOrgProduct(VARIANT_OUT_OF_STOCK)).toMatchSnapshot();
  });

  it('snapshot: callForPrice variant → priceSpecification present', () => {
    expect(toSchemaOrgProduct(VARIANT_CALL_FOR_PRICE)).toMatchSnapshot();
  });

  it('@context is always "https://schema.org"', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK)['@context']).toBe('https://schema.org');
  });

  it('@type is always "Product"', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK)['@type']).toBe('Product');
  });

  it('offer @type is always "Offer"', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK).offers['@type']).toBe('Offer');
  });

  it('includes shippingDetails for both US and CA', () => {
    const product = toSchemaOrgProduct(VARIANT_IN_STOCK);
    const countries = product.offers.shippingDetails.map(
      (s) => s.shippingDestination.addressCountry,
    );
    expect(countries).toContain('US');
    expect(countries).toContain('CA');
    expect(countries).toHaveLength(2);
  });

  it('in_stock → InStock availability', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK).offers.availability).toBe(
      'https://schema.org/InStock',
    );
  });

  it('low_stock → LimitedAvailability', () => {
    expect(toSchemaOrgProduct(VARIANT_LOW_STOCK).offers.availability).toBe(
      'https://schema.org/LimitedAvailability',
    );
  });

  it('out_of_stock → OutOfStock', () => {
    expect(toSchemaOrgProduct(VARIANT_OUT_OF_STOCK).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('callForPrice → priceSpecification with null price', () => {
    const product = toSchemaOrgProduct(VARIANT_CALL_FOR_PRICE);
    expect(product.offers.priceSpecification).toBeDefined();
    expect(product.offers.priceSpecification!.price).toBeNull();
    expect(product.offers.priceSpecification!.description).toBe('Call for price');
  });

  it('non-callForPrice variant → no priceSpecification', () => {
    expect(toSchemaOrgProduct(VARIANT_IN_STOCK).offers.priceSpecification).toBeUndefined();
  });

  it('variant with no inventory config defaults to InStock', () => {
    const noInventory: Variant = {
      id: 'v-no-inv',
      sku: 'NO-INV-001',
      title: 'No Inventory Config',
      basePrice: 10.00,
      currency: 'USD',
    };
    expect(toSchemaOrgProduct(noInventory).offers.availability).toBe(
      'https://schema.org/InStock',
    );
  });
});

// ---------------------------------------------------------------------------
// Snapshot 3 — toProductFeed
// ---------------------------------------------------------------------------

describe('toProductFeed', () => {
  it('snapshot: all sample variants → feed rows', () => {
    expect(toProductFeed(ALL_SAMPLE_VARIANTS)).toMatchSnapshot();
  });

  it('returns one row per variant in input order', () => {
    const rows = toProductFeed(ALL_SAMPLE_VARIANTS);
    expect(rows).toHaveLength(ALL_SAMPLE_VARIANTS.length);
    rows.forEach((row, i) => {
      expect(row.id).toBe(ALL_SAMPLE_VARIANTS[i].id);
    });
  });

  it('in_stock → "in stock" availability', () => {
    const [row] = toProductFeed([VARIANT_IN_STOCK]);
    expect(row.availability).toBe('in stock');
  });

  it('low_stock → "in stock" availability (Google feed has no limited-availability)', () => {
    const [row] = toProductFeed([VARIANT_LOW_STOCK]);
    expect(row.availability).toBe('in stock');
  });

  it('out_of_stock → "out of stock" availability', () => {
    const [row] = toProductFeed([VARIANT_OUT_OF_STOCK]);
    expect(row.availability).toBe('out of stock');
  });

  it('callForPrice → price is empty string, call_for_price is true', () => {
    const [row] = toProductFeed([VARIANT_CALL_FOR_PRICE]);
    expect(row.price).toBe('');
    expect(row.call_for_price).toBe(true);
  });

  it('normal priced variant → price string is "amount currency"', () => {
    const [row] = toProductFeed([VARIANT_IN_STOCK]);
    expect(row.price).toBe('29.99 USD');
  });

  it('ships_to contains US and CA', () => {
    const [row] = toProductFeed([VARIANT_IN_STOCK]);
    expect(row.ships_to).toContain('US');
    expect(row.ships_to).toContain('CA');
  });

  it('empty input → empty output', () => {
    expect(toProductFeed([])).toEqual([]);
  });

  it('variant with no inventory config defaults to "in stock"', () => {
    const noInventory: Variant = {
      id: 'v-no-inv-2',
      sku: 'NO-INV-002',
      title: 'No Inventory Config 2',
      basePrice: 15.00,
      currency: 'USD',
    };
    const [row] = toProductFeed([noInventory]);
    expect(row.availability).toBe('in stock');
  });
});
