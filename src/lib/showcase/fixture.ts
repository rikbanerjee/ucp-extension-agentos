import type { MerchantProfile, Variant } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { ShowcaseGateway, type ShowcaseStoreId, type ShowcaseStorefront, type ShowcaseStores } from './gateway';

const freshMerchant = mockMerchants.find((candidate) => candidate.merchantId === 'm_grocery_003')!;
const groceryVariants = mockProducts.filter((product) => product.merchantId === freshMerchant.merchantId).flatMap((product) => product.variants);
const byId = (id: string) => groceryVariants.find((variant) => variant.id === id)!;
const cageFreeEggs = (now: number): Variant => ({ id: 'v_fresh_cagefree_001', sku: 'EGGS-CAGEFREE-FRESH', title: 'Cage-Free Eggs, 12-pack', basePrice: 7.49, currency: 'USD', inventory: { state: 'in_stock', quantityAvailable: 18, reservationPolicy: 'none', dataFetchedAt: now, dataTtlSeconds: 60 } });
const customMerchant: MerchantProfile = { ...freshMerchant, merchantId: 'fixture_customhub_001', merchantName: 'TheCustomHub (controlled quote fixture)', endpoints: { catalog: 'https://controlled-fixture.invalid/catalog', cart: 'https://controlled-fixture.invalid/cart', checkout: 'https://controlled-fixture.invalid/checkout' }, capabilities: freshMerchant.capabilities.filter((capability) => capability.id !== 'ext.member_pricing'), manifest: { ...freshMerchant.manifest, capabilities: freshMerchant.manifest.capabilities.filter((capability) => capability.id !== 'ext.member_pricing') } };
const customVariant: Variant = { id: 'v_customhub_quote_001', sku: 'CUSTOM-ROBOTICS-TEE', title: 'Custom Robotics Team Shirt', basePrice: 0, currency: 'USD', callForPrice: true };

export const STOREFRONTS: Record<ShowcaseStoreId, ShowcaseStorefront> = {
  'fresh-corner': { id: 'fresh-corner', displayName: 'Fresh Corner Market', fixtureClassification: 'fictional controlled grocery fixture', merchant: freshMerchant, variants: [byId('v_g_inv_002_1'), byId('v_g_inv_001_1')], catalogVersion: 'fresh-corner-catalog-v3', policyVersion: 'fresh-corner-policy-v3', fulfillmentModes: ['local_delivery'], substitutionsSupported: true, quoteSupported: false, memberPricingSupported: false, shopperContext: { marketRegion: 'US', fulfillmentMode: 'local_delivery', contextSource: 'controlled_fixture' }, scenarioExplanation: 'Stale Farm Eggs require explicit shopper approval before the engine-valid Cage-Free Eggs replacement can be prepared for cart review.' },
  thecustomhub: { id: 'thecustomhub', displayName: 'TheCustomHub', fixtureClassification: 'authorized controlled quote fixture', merchant: customMerchant, variants: [customVariant], catalogVersion: 'thecustomhub-catalog-v1', policyVersion: 'thecustomhub-policy-v1', fulfillmentModes: ['shipping'], substitutionsSupported: false, quoteSupported: true, memberPricingSupported: false, shopperContext: { marketRegion: 'US', fulfillmentMode: 'shipping', contextSource: 'controlled_fixture' }, scenarioExplanation: 'A controlled custom-merchandise request must go to merchant review; no fixed price, cart, order, payment, or checkout is exposed.' },
};

const stores: ShowcaseStores = { carts: new Map(), repairs: new Map(), quotes: new Map(), decisions: new Map(), cartsByReference: new Map(), revisions: new Map() };
export function isStorefrontId(value: string | null | undefined): value is ShowcaseStoreId { return value === 'fresh-corner' || value === 'thecustomhub'; }
export function createShowcaseGateway(now: number, storefrontId: ShowcaseStoreId = 'fresh-corner', storefrontSessionId = 'server-fixture') { const base = STOREFRONTS[storefrontId]; const storefront = storefrontId === 'fresh-corner' ? { ...base, variants: [byId('v_g_inv_002_1'), cageFreeEggs(now), byId('v_g_inv_001_1')] } : base; return new ShowcaseGateway({ storefront, storefrontSessionId, now }, stores); }
