/**
 * Shared, pure validators for Step 3 (store details) and Step 4 (store-wide
 * rules). Used both to gate wizard progression (`StudioWizard.canContinue`)
 * and to render inline field errors in the step components themselves, so
 * the two never disagree about what counts as valid.
 */

import type { StoreProfile, RetailerRuleDefaults } from './types';

export function isValidStoreDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain.trim());
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true; // optional field — empty is valid, "invalid" only applies to non-empty garbage
  try { new URL(value); return true; } catch { return false; }
}

export interface FieldError {
  field: string;
  message: string;
}

/** Validates Step 3's store profile. Returns field-level errors; empty array means the step may proceed. */
export function validateStoreProfile(profile: StoreProfile | null): FieldError[] {
  if (!profile) return [{ field: 'storeName', message: 'Enter your store name.' }];
  const errors: FieldError[] = [];

  if (!profile.storeName.trim()) {
    errors.push({ field: 'storeName', message: 'Enter your store name.' });
  }
  if (!profile.storeDomain.trim()) {
    errors.push({ field: 'storeDomain', message: 'Enter your store domain.' });
  } else if (!isValidStoreDomain(profile.storeDomain)) {
    errors.push({ field: 'storeDomain', message: 'That doesn’t look like a domain (example: rosemaryandrye.com). Leave off "https://".' });
  }
  if (profile.regions.length === 0) {
    errors.push({ field: 'regions', message: 'Add at least one region you serve.' });
  }
  if (profile.fulfillmentModes.length === 0) {
    errors.push({ field: 'fulfillmentModes', message: 'Select at least one fulfilment mode you support.' });
  }
  (['catalogEndpoint', 'cartEndpoint', 'checkoutEndpoint'] as const).forEach((field) => {
    const value = profile[field];
    if (value && !isValidUrl(value)) {
      errors.push({ field, message: 'That doesn’t look like a valid URL.' });
    }
  });

  return errors;
}

/** Validates Step 4's store-wide rule defaults. Returns field-level errors; empty array means the step may proceed. */
export function validateRuleDefaults(defaults: RetailerRuleDefaults): FieldError[] {
  const errors: FieldError[] = [];
  const { pricing, fulfillment, inventory, quote } = defaults;

  const pct = (value: number | undefined, field: string, label: string) => {
    if (value !== undefined && (Number.isNaN(value) || value < 0 || value > 100)) {
      errors.push({ field, message: `${label} must be between 0 and 100.` });
    }
  };
  const nonNegative = (value: number | undefined, field: string, label: string) => {
    if (value !== undefined && (Number.isNaN(value) || value < 0)) {
      errors.push({ field, message: `${label} cannot be negative.` });
    }
  };

  pct(pricing.memberDiscountPercent, 'memberDiscountPercent', 'Member discount');
  pct(pricing.wholesaleDiscountPercent, 'wholesaleDiscountPercent', 'Wholesale discount');
  if (pricing.minimumQuantity !== undefined && (Number.isNaN(pricing.minimumQuantity) || pricing.minimumQuantity < 1)) {
    errors.push({ field: 'minimumQuantity', message: 'Minimum order quantity must be at least 1.' });
  }
  if (pricing.quantityIncrement !== undefined && (Number.isNaN(pricing.quantityIncrement) || pricing.quantityIncrement < 1)) {
    errors.push({ field: 'quantityIncrement', message: 'Quantity increment must be at least 1.' });
  }

  nonNegative(fulfillment.leadTimeDays, 'leadTimeDays', 'Lead time');
  if (fulfillment.cutoffHourLocal !== undefined && (Number.isNaN(fulfillment.cutoffHourLocal) || fulfillment.cutoffHourLocal < 0 || fulfillment.cutoffHourLocal > 23)) {
    errors.push({ field: 'cutoffHourLocal', message: 'Cutoff hour must be between 0 and 23.' });
  }
  nonNegative(fulfillment.orderAcceptanceBufferMinutes, 'orderAcceptanceBufferMinutes', 'Order-acceptance buffer');
  if (fulfillment.modes.length === 0) {
    errors.push({ field: 'fulfillmentModes', message: 'Select at least one fulfilment mode.' });
  }
  if (fulfillment.regions.length === 0) {
    errors.push({ field: 'fulfillmentRegions', message: 'Add at least one region this applies to.' });
  }

  if (Number.isNaN(inventory.freshnessSeconds) || inventory.freshnessSeconds < 1) {
    errors.push({ field: 'freshnessSeconds', message: 'Inventory freshness must be at least 1 second.' });
  }

  if (Number.isNaN(quote.validitySeconds) || quote.validitySeconds < 1) {
    errors.push({ field: 'validitySeconds', message: 'Quote validity must be at least 1 second.' });
  }

  return errors;
}
