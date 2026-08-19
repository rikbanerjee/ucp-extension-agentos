/**
 * Resolves store-wide `RetailerRuleDefaults` + per-product `ProductRuleOverride[]`
 * into one "effective rule" per catalog row. This is the layer that Step 5's
 * exception editor and Step 6/7's engine conversion both read from — a single
 * merge function so overrides always behave identically everywhere they're used.
 *
 * Pure, deterministic.
 */

import type { CanonicalCatalogRow, RetailerRuleDefaults, ProductRuleOverride, BuyerEligibilityMode, FulfillmentModeId } from './types';

export interface EffectiveRule {
  eligibilityMode: BuyerEligibilityMode;
  memberPrice?: number;
  wholesalePrice?: number;
  minimumQuantity?: number;
  quantityIncrement?: number;
  availability: 'in_stock' | 'out_of_stock';
  fulfillmentModes: FulfillmentModeId[];
  fulfillmentRegions: string[];
  leadTimeDays?: number;
  cutoffHourLocal?: number;
  callForPrice: boolean;
  /** True when at least one field above came from a product-level override rather than the store default. */
  hasOverride: boolean;
}

function findOverride(
  overrides: ProductRuleOverride[],
  productId: string,
  variantId: string,
): ProductRuleOverride | undefined {
  return (
    overrides.find((o) => o.productId === productId && o.variantId === variantId) ??
    overrides.find((o) => o.productId === productId && !o.variantId)
  );
}

export function resolveEffectiveRule(
  row: CanonicalCatalogRow,
  defaults: RetailerRuleDefaults,
  overrides: ProductRuleOverride[],
): EffectiveRule {
  const override = findOverride(overrides, row.productId, row.variantId);

  const basePrice = row.price;
  const defaultMemberPrice = defaults.pricing.memberDiscountPercent
    ? round2(basePrice * (1 - defaults.pricing.memberDiscountPercent / 100))
    : undefined;
  const defaultWholesalePrice = defaults.pricing.wholesaleDiscountPercent
    ? round2(basePrice * (1 - defaults.pricing.wholesaleDiscountPercent / 100))
    : undefined;

  const importedAvailability: 'in_stock' | 'out_of_stock' | undefined =
    defaults.inventory.useImportedInventory && row.availability
      ? (row.availability.toLowerCase().includes('out') ? 'out_of_stock' : 'in_stock')
      : defaults.inventory.useImportedInventory && row.inventoryQuantity !== undefined
        ? (row.inventoryQuantity > 0 ? 'in_stock' : 'out_of_stock')
        : undefined;

  return {
    eligibilityMode: override?.eligibilityMode ?? defaults.eligibility.mode,
    memberPrice: override?.memberPrice ?? defaultMemberPrice,
    wholesalePrice: override?.wholesalePrice ?? defaultWholesalePrice,
    minimumQuantity: override?.minimumQuantity ?? defaults.pricing.minimumQuantity,
    quantityIncrement: override?.quantityIncrement ?? defaults.pricing.quantityIncrement,
    availability: override?.availability ?? importedAvailability ?? defaults.inventory.defaultAvailability,
    fulfillmentModes: override?.fulfillmentModes ?? defaults.fulfillment.modes,
    fulfillmentRegions: override?.fulfillmentRegions ?? defaults.fulfillment.regions,
    leadTimeDays: override?.leadTimeDays ?? defaults.fulfillment.leadTimeDays,
    cutoffHourLocal: defaults.fulfillment.cutoffHourLocal,
    callForPrice: override?.callForPrice ?? defaults.pricing.callForPrice,
    hasOverride: Boolean(override),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns a fresh override object containing only the fields that differ from the resolved default (no override yet). */
export function emptyOverride(productId: string, variantId: string): ProductRuleOverride {
  return { productId, variantId };
}
