import { describe, it, expect } from 'vitest';
import { evaluateOffer } from '@retailagentos/engine';
import { resolveEffectiveRule } from '../rules';
import { toMerchantProfile, toVariant, toBuyerContext, runPreview, deriveOrderNow, summarizeDecision } from '../engineConversion';
import { DEFAULT_RULE_DEFAULTS, DEFAULT_STORE_PROFILE } from '../types';
import type { CanonicalCatalogRow, ProductRuleOverride, StoreProfile, ShopperScenario, RetailerRuleDefaults } from '../types';

const row: CanonicalCatalogRow = {
  productId: 'p1', variantId: 'v1', sku: 'SKU-1', title: 'Widget',
  price: 100, currency: 'USD', inventoryQuantity: 10, sourceRowNumber: 1,
};

const store: StoreProfile = { ...DEFAULT_STORE_PROFILE, storeName: 'Test Store', storeDomain: 'test.example' };

function baseScenario(overrides: Partial<ShopperScenario> = {}): ShopperScenario {
  return {
    productVariantKey: 'p1::v1', customerType: 'guest', marketRegion: 'US',
    quantity: 1, fulfillmentMode: 'shipping', orderDate: '2026-08-17', orderTime: '10:00',
    ...overrides,
  };
}

describe('resolveEffectiveRule', () => {
  it('applies store defaults to all products when no override exists', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, pricing: { ...DEFAULT_RULE_DEFAULTS.pricing, memberDiscountPercent: 10 } };
    const rule = resolveEffectiveRule(row, defaults, []);
    expect(rule.memberPrice).toBe(90);
    expect(rule.hasOverride).toBe(false);
  });

  it('overrides only the specified fields', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, pricing: { ...DEFAULT_RULE_DEFAULTS.pricing, memberDiscountPercent: 10 } };
    const override: ProductRuleOverride = { productId: 'p1', variantId: 'v1', minimumQuantity: 5 };
    const rule = resolveEffectiveRule(row, defaults, [override]);
    expect(rule.minimumQuantity).toBe(5);
    expect(rule.memberPrice).toBe(90); // unaffected field still comes from default
    expect(rule.hasOverride).toBe(true);
  });

  it('resetting an exception (removing it) returns to the store default', () => {
    const override: ProductRuleOverride = { productId: 'p1', variantId: 'v1', minimumQuantity: 5 };
    const withOverride = resolveEffectiveRule(row, DEFAULT_RULE_DEFAULTS, [override]);
    const withoutOverride = resolveEffectiveRule(row, DEFAULT_RULE_DEFAULTS, []);
    expect(withOverride.minimumQuantity).toBe(5);
    expect(withoutOverride.minimumQuantity).toBe(DEFAULT_RULE_DEFAULTS.pricing.minimumQuantity);
  });
});

describe('engine conversion + preview parity', () => {
  it('guest/member/wholesale scenarios produce expected eligibility', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, eligibility: { mode: 'wholesale' as const, restrictToServedRegions: true } };
    const scenario = baseScenario();
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.severity === 'BLOCK')).toBe(true);
  });

  it('a wholesale scenario with default (untiered) wholesale eligibility is allowed', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, eligibility: { mode: 'wholesale' as const, restrictToServedRegions: true } };
    const scenario = baseScenario({ customerType: 'wholesale' });
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.severity === 'BLOCK')).toBe(false);
  });

  it('region restrictions are respected', () => {
    const restrictedStore: StoreProfile = { ...store, regions: ['US'] };
    const scenario = baseScenario({ marketRegion: 'CA' });
    const record = runPreview({ store: restrictedStore, defaults: DEFAULT_RULE_DEFAULTS, overrides: [], row, scenario, now: deriveOrderNow(scenario, restrictedStore.timezone) });
    expect(record.reasons.some((r) => r.code === 'REGION_RESTRICTED')).toBe(true);
  });

  it('unchecking "only sell to regions I serve" removes the region restriction', () => {
    const restrictedStore: StoreProfile = { ...store, regions: ['US'] };
    const defaults: RetailerRuleDefaults = { ...DEFAULT_RULE_DEFAULTS, eligibility: { mode: 'everyone', restrictToServedRegions: false } };
    const scenario = baseScenario({ marketRegion: 'CA' });
    const record = runPreview({ store: restrictedStore, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, restrictedStore.timezone) });
    expect(record.reasons.some((r) => r.code === 'REGION_RESTRICTED')).toBe(false);
  });

  it('studio preview equals calling evaluateOffer directly with the same normalized inputs', () => {
    const scenario = baseScenario({ customerType: 'member', quantity: 2 });
    const now = deriveOrderNow(scenario, store.timezone);
    const merchant = toMerchantProfile(store, DEFAULT_RULE_DEFAULTS);
    const variant = toVariant(row, store, DEFAULT_RULE_DEFAULTS, []);
    const context = toBuyerContext(scenario, store.timezone);
    const direct = evaluateOffer({ merchant, variant, quantity: 2, context, now });
    const preview = runPreview({ store, defaults: DEFAULT_RULE_DEFAULTS, overrides: [], row, scenario, now });
    expect(preview).toEqual(direct);
  });

  it('inventory and need-by inputs reach the real engine', () => {
    const outOfStockRow: CanonicalCatalogRow = { ...row, availability: 'out_of_stock' };
    const scenario = baseScenario();
    const record = runPreview({ store, defaults: DEFAULT_RULE_DEFAULTS, overrides: [], row: outOfStockRow, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.source.includes('inventory'))).toBe(true);
  });

  it('inventory freshness expectation (Step 4) reaches the Variant.inventory.dataTtlSeconds field', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, inventory: { ...DEFAULT_RULE_DEFAULTS.inventory, freshnessSeconds: 120 } };
    const variant = toVariant(row, store, defaults, []);
    expect(variant.inventory?.dataTtlSeconds).toBe(120);
  });

  it('member/wholesale trust: a "signed" (not asserted) scenario context lets a tiered requiredTier gate resolve', () => {
    // Regression: previously scenarios used trust.mode 'asserted', which the
    // pipeline's default 'enforce' trustEnforcement downgrades membershipTier
    // to 'none' for every evaluation — so a wholesale scenario could never
    // satisfy a tiered `requiredTier` gate above the default tier.
    const context = toBuyerContext(baseScenario({ customerType: 'wholesale' }), store.timezone);
    expect(context.trust?.mode).toBe('signed');
    expect(context.membershipTier).toBe('gold');
  });
});

describe('bulk pricing MOQ / quantity increment wiring (without a distinct wholesale price)', () => {
  it('enforces a minimum-quantity-only override (no wholesale price) via BELOW_MOQ', () => {
    const override: ProductRuleOverride = { productId: 'p1', variantId: 'v1', minimumQuantity: 4 };
    const scenario = baseScenario({ quantity: 1 });
    const record = runPreview({ store, defaults: DEFAULT_RULE_DEFAULTS, overrides: [override], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'BELOW_MOQ')).toBe(true);
  });

  it('enforces a quantity-increment-only override (no wholesale price) via QUANTITY_INCREMENT_MISMATCH', () => {
    const override: ProductRuleOverride = { productId: 'p1', variantId: 'v1', quantityIncrement: 3 };
    const scenario = baseScenario({ quantity: 2 });
    const record = runPreview({ store, defaults: DEFAULT_RULE_DEFAULTS, overrides: [override], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'QUANTITY_INCREMENT_MISMATCH')).toBe(true);
  });
});

describe('product-level fulfilment-region exceptions', () => {
  it('a product whose exception narrows regions is blocked (REGION_NOT_SERVED) outside that narrower set', () => {
    const wideStore: StoreProfile = { ...store, regions: ['US', 'CA'] };
    const override: ProductRuleOverride = { productId: 'p1', variantId: 'v1', fulfillmentRegions: ['US'] };
    const scenario = baseScenario({ marketRegion: 'CA' });
    const record = runPreview({ store: wideStore, defaults: DEFAULT_RULE_DEFAULTS, overrides: [override], row, scenario, now: deriveOrderNow(scenario, wideStore.timezone) });
    expect(record.reasons.some((r) => r.code === 'REGION_NOT_SERVED')).toBe(true);
  });

  it('a product with no exception reaches every region the store-wide fulfilment default covers', () => {
    const wideStore: StoreProfile = { ...store, regions: ['US', 'CA'] };
    const defaults = { ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, regions: ['US', 'CA'] } };
    const scenario = baseScenario({ marketRegion: 'CA' });
    const record = runPreview({ store: wideStore, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, wideStore.timezone) });
    expect(record.reasons.some((r) => r.code === 'REGION_NOT_SERVED')).toBe(false);
  });
});

describe('fulfilment feasibility scenarios (explicit order date/time — RAOS-corrective-pass)', () => {
  const orderDate = '2026-08-17';
  const orderWeekday = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date(`${orderDate}T12:00:00Z`).getUTCDay()];
  const otherWeekday = orderWeekday === 'mon' ? 'tue' : 'mon';

  it('feasible: no constraints beyond store defaults', () => {
    const scenario = baseScenario({ orderDate, orderTime: '10:00' });
    const record = runPreview({ store, defaults: DEFAULT_RULE_DEFAULTS, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    const summary = summarizeDecision(record, 1);
    expect(summary.fulfillmentStatus).toBe('FEASIBLE');
    expect(summary.allowed).toBe(true);
  });

  it('lead-time failure: LEAD_TIME_EXCEEDS_NEED_BY when the need-by date is sooner than the lead time allows', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, leadTimeDays: 5 } };
    const scenario = baseScenario({ orderDate, orderTime: '10:00', needByDate: orderDate });
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'LEAD_TIME_EXCEEDS_NEED_BY')).toBe(true);
  });

  it('cutoff passed: CUTOFF_PASSED for a same-day mode ordered after the local cutoff hour', () => {
    const defaults = { ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, cutoffHourLocal: 14, modes: ['pickup' as const] } };
    const scenario = baseScenario({ orderDate, orderTime: '15:00', fulfillmentMode: 'pickup' });
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'CUTOFF_PASSED')).toBe(true);
  });

  it('store closed: STORE_CLOSED when the weekly schedule doesn\'t cover the order\'s weekday', () => {
    const defaults: RetailerRuleDefaults = {
      ...DEFAULT_RULE_DEFAULTS,
      fulfillment: {
        ...DEFAULT_RULE_DEFAULTS.fulfillment,
        modes: ['pickup'],
        weeklySchedule: [{ day: otherWeekday, opensAt: '09:00', closesAt: '17:00' }],
      },
    };
    const scenario = baseScenario({ orderDate, orderTime: '10:00', fulfillmentMode: 'pickup' });
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'STORE_CLOSED')).toBe(true);
  });

  it('order acceptance ended: ORDER_ACCEPTANCE_ENDED when ordering within the pre-close buffer window', () => {
    const defaults: RetailerRuleDefaults = {
      ...DEFAULT_RULE_DEFAULTS,
      fulfillment: {
        ...DEFAULT_RULE_DEFAULTS.fulfillment,
        modes: ['pickup'],
        weeklySchedule: [{ day: orderWeekday, opensAt: '09:00', closesAt: '17:00' }],
        orderAcceptanceBufferMinutes: 60,
      },
    };
    const scenario = baseScenario({ orderDate, orderTime: '16:30', fulfillmentMode: 'pickup' });
    const record = runPreview({ store, defaults, overrides: [], row, scenario, now: deriveOrderNow(scenario, store.timezone) });
    expect(record.reasons.some((r) => r.code === 'ORDER_ACCEPTANCE_ENDED')).toBe(true);
  });
});
