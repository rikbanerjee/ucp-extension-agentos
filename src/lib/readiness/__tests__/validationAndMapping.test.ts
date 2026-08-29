import { describe, it, expect } from 'vitest';
import { validateStoreProfile, validateRuleDefaults } from '../validation';
import { detectColumnMapping, isMappingIncomplete, applyColumnMapping } from '../normalize';
import { DEFAULT_STORE_PROFILE, DEFAULT_RULE_DEFAULTS } from '../types';
import type { StoreProfile } from '../types';

describe('validateStoreProfile — progression gating (item 5)', () => {
  const valid: StoreProfile = { ...DEFAULT_STORE_PROFILE, storeName: 'Rosemary & Rye', storeDomain: 'rosemaryandrye.com' };

  it('a complete, valid profile has no errors', () => {
    expect(validateStoreProfile(valid)).toEqual([]);
  });

  it('rejects a null profile', () => {
    expect(validateStoreProfile(null).length).toBeGreaterThan(0);
  });

  it('rejects an invalid domain', () => {
    const errors = validateStoreProfile({ ...valid, storeDomain: 'not a domain' });
    expect(errors.some((e) => e.field === 'storeDomain')).toBe(true);
  });

  it('rejects empty regions', () => {
    const errors = validateStoreProfile({ ...valid, regions: [] });
    expect(errors.some((e) => e.field === 'regions')).toBe(true);
  });

  it('rejects empty fulfilment modes', () => {
    const errors = validateStoreProfile({ ...valid, fulfillmentModes: [] });
    expect(errors.some((e) => e.field === 'fulfillmentModes')).toBe(true);
  });

  it('rejects a malformed candidate endpoint URL', () => {
    const errors = validateStoreProfile({ ...valid, checkoutEndpoint: 'not a url' });
    expect(errors.some((e) => e.field === 'checkoutEndpoint')).toBe(true);
  });

  it('accepts an empty (unset) candidate endpoint', () => {
    const errors = validateStoreProfile({ ...valid, checkoutEndpoint: undefined });
    expect(errors.some((e) => e.field === 'checkoutEndpoint')).toBe(false);
  });

  it('accepts a valid candidate endpoint URL', () => {
    const errors = validateStoreProfile({ ...valid, checkoutEndpoint: 'https://rosemaryandrye.com/ucp/checkout' });
    expect(errors.some((e) => e.field === 'checkoutEndpoint')).toBe(false);
  });
});

describe('validateRuleDefaults — progression gating (item 5)', () => {
  it('the shipped defaults have no errors', () => {
    expect(validateRuleDefaults(DEFAULT_RULE_DEFAULTS)).toEqual([]);
  });

  it('rejects a member discount over 100%', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, pricing: { ...DEFAULT_RULE_DEFAULTS.pricing, memberDiscountPercent: 150 } });
    expect(errors.some((e) => e.field === 'memberDiscountPercent')).toBe(true);
  });

  it('rejects a negative minimum quantity', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, pricing: { ...DEFAULT_RULE_DEFAULTS.pricing, minimumQuantity: -1 } });
    expect(errors.some((e) => e.field === 'minimumQuantity')).toBe(true);
  });

  it('rejects a cutoff hour outside 0–23', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, cutoffHourLocal: 25 } });
    expect(errors.some((e) => e.field === 'cutoffHourLocal')).toBe(true);
  });

  it('rejects zero fulfilment modes', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, modes: [] } });
    expect(errors.some((e) => e.field === 'fulfillmentModes')).toBe(true);
  });

  it('rejects zero fulfilment regions', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, fulfillment: { ...DEFAULT_RULE_DEFAULTS.fulfillment, regions: [] } });
    expect(errors.some((e) => e.field === 'fulfillmentRegions')).toBe(true);
  });

  it('rejects a quote validity of zero', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, quote: { validitySeconds: 0 } });
    expect(errors.some((e) => e.field === 'validitySeconds')).toBe(true);
  });

  it('rejects an inventory freshness of zero', () => {
    const errors = validateRuleDefaults({ ...DEFAULT_RULE_DEFAULTS, inventory: { ...DEFAULT_RULE_DEFAULTS.inventory, freshnessSeconds: 0 } });
    expect(errors.some((e) => e.field === 'freshnessSeconds')).toBe(true);
  });
});

describe('generic CSV/JSON column mapping (item 4)', () => {
  it('detects a complete mapping for well-named headers as NOT incomplete', () => {
    const mapping = detectColumnMapping(['Title', 'Price', 'SKU']);
    expect(isMappingIncomplete(mapping)).toBe(false);
  });

  it('flags an ambiguous/incomplete mapping when title or price cannot be auto-detected', () => {
    const mapping = detectColumnMapping(['Product Name Field', 'Cost']);
    expect(isMappingIncomplete(mapping)).toBe(true);
  });

  it('applyColumnMapping maps a raw record through a confirmed mapping', () => {
    const mapping = { title: 'Item Name', price: 'Cost', sku: null };
    const record = applyColumnMapping({ 'Item Name': 'Candle', Cost: '24.00' }, mapping);
    expect(record).toEqual({ title: 'Candle', price: '24.00' });
  });
});
