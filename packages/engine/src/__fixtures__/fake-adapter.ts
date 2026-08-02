/**
 * Fake adapter fixture — A2 typecheck proof
 *
 * This file's only job is to prove that `MerchantCatalogAdapter` and
 * `BuyerContextResolver` are implementable against the real engine types.
 * It is NOT a runnable demo — values are illustrative minimums.
 *
 * Keep this file. It serves as a compile-time regression: if the adapter
 * interfaces ever drift from the engine's real types, this file fails tsc.
 */

import type {
  MerchantCatalogAdapter,
  BuyerContextResolver,
  MerchantProfile,
  Variant,
  PartialBuyerContext,
} from '../index';

// ---------------------------------------------------------------------------
// Toy source type — the "merchant's native product shape"
// ---------------------------------------------------------------------------

interface ToyProduct {
  id: string;
  name: string;
  priceUsd: number;
}

// ---------------------------------------------------------------------------
// Fake MerchantCatalogAdapter<ToyProduct>
// ---------------------------------------------------------------------------

const FAKE_PROFILE: MerchantProfile = {
  merchantId: 'fake-merchant-001',
  merchantName: 'Fake Merchant (fixture)',
  protocolVersion: '0.1.0',
  endpoints: {
    catalog: 'https://fake.example.com/catalog',
    cart: 'https://fake.example.com/cart',
    checkout: 'https://fake.example.com/checkout',
  },
  // RAOS-0001 OQ-2 (2026-08-01): required field on MerchantProfile.
  servesRegions: ['US'],
  capabilities: [],
  manifest: {
    protocol: '0.1.0',
    tier: 1,
    capabilities: [],
  },
};

const TOY_PRODUCTS: ToyProduct[] = [
  { id: 'toy-001', name: 'Toy Widget', priceUsd: 9.99 },
];

const fakeAdapter: MerchantCatalogAdapter<ToyProduct> = {
  merchantProfile(): MerchantProfile {
    return FAKE_PROFILE;
  },

  toVariants(source: ToyProduct): Variant[] {
    return [
      {
        id: `variant-${source.id}`,
        sku: `SKU-${source.id}`,
        title: source.name,
        basePrice: source.priceUsd,
        currency: 'USD',
      },
    ];
  },

  listVariants(): Variant[] {
    return TOY_PRODUCTS.flatMap((p) => fakeAdapter.toVariants(p));
  },
};

// ---------------------------------------------------------------------------
// Fake BuyerContextResolver
// ---------------------------------------------------------------------------

const fakeResolver: BuyerContextResolver = {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext {
    return {
      marketRegion: input.region,
      // fulfillmentMode is typed as FulfillmentMode on BuyerContext;
      // we only set it when the value is one we recognise, so that the
      // partial stays valid without a cast.
      ...(input.fulfillmentMode === 'shipping' ||
      input.fulfillmentMode === 'pickup' ||
      input.fulfillmentMode === 'local_delivery'
        ? { fulfillmentMode: input.fulfillmentMode }
        : {}),
    };
  },
};

// Prevent "unused variable" errors while keeping this a pure type-check file.
export { fakeAdapter, fakeResolver };
