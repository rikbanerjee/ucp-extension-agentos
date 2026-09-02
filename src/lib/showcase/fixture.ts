import type { MerchantProfile, Variant } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { ShowcaseGateway, type ShowcaseStoreId, type ShowcaseStorefront, type ShowcaseStores } from './gateway';
import { CAGE_FREE_EGGS_TITLE, CAGE_FREE_EGGS_UNIT, FARM_EGGS_TITLE, FARM_EGGS_UNIT, SOURDOUGH_TITLE, SOURDOUGH_UNIT } from './productDisplay';

const freshMerchant = mockMerchants.find((candidate) => candidate.merchantId === 'm_grocery_003')!;
const groceryVariants = mockProducts.filter((product) => product.merchantId === freshMerchant.merchantId).flatMap((product) => product.variants);
const byId = (id: string) => groceryVariants.find((variant) => variant.id === id)!;
/**
 * The shared mock catalog's Farm Eggs fixture hardcodes `dataFetchedAt: 1000` (1 second after the
 * Unix epoch) so it is unconditionally stale in any realistic caller. That is fine for the
 * catalog's own golden/unit-test callers, but this showcase injects a real "now" and renders the
 * computed staleness age to a judge — against `now`, epoch-1000 reads back as an absurd ~1.7
 * billion-second-old snapshot. Rebase the controlled fixture's `dataFetchedAt` onto the showcase's
 * injected `now` so the snapshot is deterministically 300 seconds old against the product's
 * documented 60-second freshness TTL — credible, and still always `STOCK_STALE`. This never reads
 * the system clock: `now` is injected by the caller (route/gateway boundary).
 */
const STALE_INVENTORY_AGE_SECONDS = 300;
/**
 * The shared mock catalog stores the product title ("Farm Eggs (Stale Data Demo)") and variant
 * title ("Dozen") separately, meant to be read together elsewhere. Left split, this showcase's own
 * gateway (`searchProducts`'s `quantityUnit` lookup, keyed by canonical title) would silently miss
 * this variant and mislabel its quantity unit as generic "each" instead of a dozen/carton. Overriding
 * `title` here — the single showcase boundary every cart/decision/search response reads `title` from
 * — gives one canonical, self-contained product name, consistent across search, decisions, and carts.
 */
const staleFarmEggs = (now: number): Variant => { const source = byId('v_g_inv_002_1'); return { ...source, title: FARM_EGGS_TITLE, inventory: { ...source.inventory!, dataFetchedAt: now - STALE_INVENTORY_AGE_SECONDS * 1000, dataTtlSeconds: 60 } }; };
/** Same self-contained-title fix as Farm Eggs above, for the shared catalog's split "900g Loaf" variant title. */
const canonicalSourdough = (): Variant => { const source = byId('v_g_inv_001_1'); return { ...source, title: SOURDOUGH_TITLE }; };
const cageFreeEggs = (now: number): Variant => ({ id: 'v_fresh_cagefree_001', sku: 'EGGS-CAGEFREE-FRESH', title: CAGE_FREE_EGGS_TITLE, basePrice: 7.49, currency: 'USD', inventory: { state: 'in_stock', quantityAvailable: 18, reservationPolicy: 'none', dataFetchedAt: now, dataTtlSeconds: 60 } });
/**
 * Canonical per-variant quantity units for the showcase's `searchProducts` results — a single
 * explicit lookup rather than the fragile `variant.title.includes('Egg')` substring heuristic this
 * replaces, which silently produced the wrong unit ("each") whenever a title didn't happen to
 * contain that substring (as the shared catalog's un-overridden "Dozen" variant title did not).
 */
const QUANTITY_UNITS: Record<string, string> = { v_g_inv_002_1: FARM_EGGS_UNIT, v_fresh_cagefree_001: CAGE_FREE_EGGS_UNIT, v_g_inv_001_1: SOURDOUGH_UNIT };
const customMerchant: MerchantProfile = { ...freshMerchant, merchantId: 'fixture_customhub_001', merchantName: 'TheCustomHub (controlled quote fixture)', endpoints: { catalog: 'https://controlled-fixture.invalid/catalog', cart: 'https://controlled-fixture.invalid/cart', checkout: 'https://controlled-fixture.invalid/checkout' }, capabilities: freshMerchant.capabilities.filter((capability) => capability.id !== 'ext.member_pricing'), manifest: { ...freshMerchant.manifest, capabilities: freshMerchant.manifest.capabilities.filter((capability) => capability.id !== 'ext.member_pricing') } };
const customVariant: Variant = { id: 'v_customhub_quote_001', sku: 'CUSTOM-ROBOTICS-TEE', title: 'Custom Robotics Team Shirt', basePrice: 0, currency: 'USD', callForPrice: true };

export const STOREFRONTS: Record<ShowcaseStoreId, ShowcaseStorefront> = {
  'fresh-corner': { id: 'fresh-corner', displayName: 'Fresh Corner Market', fixtureClassification: 'fictional controlled grocery fixture', merchant: freshMerchant, variants: [byId('v_g_inv_002_1'), byId('v_g_inv_001_1')], catalogVersion: 'fresh-corner-catalog-v3', policyVersion: 'fresh-corner-policy-v3', fulfillmentModes: ['local_delivery'], substitutionsSupported: true, quoteSupported: false, memberPricingSupported: false, shopperContext: { marketRegion: 'US', fulfillmentMode: 'local_delivery', contextSource: 'controlled_fixture' }, scenarioExplanation: 'Stale Farm Eggs require explicit shopper approval before the engine-valid Cage-Free Eggs replacement can be prepared for cart review.', quantityUnits: QUANTITY_UNITS, searchAliases: { v_g_inv_002_1: ['farm eggs', 'eggs', 'dozen eggs', 'breakfast', 'brunch'], v_fresh_cagefree_001: ['cage-free eggs', 'eggs', 'dozen eggs', 'breakfast', 'brunch'], v_g_inv_001_1: ['artisan sourdough', 'sourdough', 'bread', 'toast', 'breakfast', 'brunch'] } },
  thecustomhub: { id: 'thecustomhub', displayName: 'TheCustomHub', fixtureClassification: 'authorized controlled quote fixture', merchant: customMerchant, variants: [customVariant], catalogVersion: 'thecustomhub-catalog-v1', policyVersion: 'thecustomhub-policy-v1', fulfillmentModes: ['shipping'], substitutionsSupported: false, quoteSupported: true, memberPricingSupported: false, shopperContext: { marketRegion: 'US', fulfillmentMode: 'shipping', contextSource: 'controlled_fixture' }, scenarioExplanation: 'A controlled custom-merchandise request must go to merchant review; no fixed price, cart, order, payment, or checkout is exposed.', searchAliases: { v_customhub_quote_001: ['robotics', 'robotics shirt', 'team shirt', 'custom shirt', 'personalized apparel', 'custom apparel'] } },
};

const stores: ShowcaseStores = { carts: new Map(), repairs: new Map(), quotes: new Map(), decisions: new Map(), cartsByReference: new Map(), revisions: new Map(), cartsByDecision: new Map() };
export function isStorefrontId(value: string | null | undefined): value is ShowcaseStoreId { return value === 'fresh-corner' || value === 'thecustomhub'; }
export function createShowcaseGateway(now: number, storefrontId: ShowcaseStoreId = 'fresh-corner', storefrontSessionId = 'server-fixture') { const base = STOREFRONTS[storefrontId]; const storefront = storefrontId === 'fresh-corner' ? { ...base, variants: [staleFarmEggs(now), cageFreeEggs(now), canonicalSourdough()] } : base; return new ShowcaseGateway({ storefront, storefrontSessionId, now }, stores); }
