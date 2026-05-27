import { PricingContext, ComputedPriceState } from '../types/extensions';
import { Variant } from '../types/core';

export function getApplicablePrice(variant: Variant, quantity: number, context: PricingContext): ComputedPriceState {
  let unitPrice = variant.basePrice;
  let appliedTier = undefined;
  let isMemberPrice = false;
  let priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier' = 'base';
  let teaser = undefined;
  let appliedOfferState = undefined;

  // Check member pricing first
  if (variant.memberPricing?.available) {
    const rules = variant.memberPricing;
    const tierHierarchy = ['none', 'gold', 'reseller_plus', 'distributor'];
    const currentTierIdx = tierHierarchy.indexOf(context.membershipTier);
    const requiredTierIdx = rules.requiredTier ? tierHierarchy.indexOf(rules.requiredTier) : 0;

    if (context.customerType !== 'guest' && currentTierIdx >= requiredTierIdx) {
      if (rules.memberPrice !== undefined) {
        unitPrice = rules.memberPrice;
        isMemberPrice = true;
        priceSource = 'member';
      }
    } else if (rules.teaserPrice !== undefined && rules.requiredTier) {
      teaser = {
        message: `Join ${rules.requiredTier} for $${rules.teaserPrice.toFixed(2)}`,
        price: rules.teaserPrice
      };
    }
  }

  // Check bulk pricing (overrides member price if applicable)
  if (variant.bulkPricing?.available && variant.bulkPricing.tiers && variant.bulkPricing.tiers.length > 0) {
    // Find highest applicable tier based on quantity
    const applicableTiers = variant.bulkPricing.tiers
      .filter(t => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity))
      .sort((a, b) => b.minQuantity - a.minQuantity);

    if (applicableTiers.length > 0) {
      appliedTier = applicableTiers[0];
      unitPrice = appliedTier.price;
      isMemberPrice = false; // bulk overrides member base
      priceSource = 'bulk_tier';
    }
  }

  // Check promo pricing (overrides all if applicable)
  if (variant.promoPricing?.available) {
    const promo = variant.promoPricing;
    
    // First apply base sale price if exists
    if (promo.salePrice !== undefined) {
      unitPrice = promo.salePrice;
      priceSource = 'promo_sale';
      isMemberPrice = false;
      appliedOfferState = promo.description || 'Sale Price';
    }

    // Then check if quantity threshold met for tier
    if (promo.tiers && promo.tiers.length > 0) {
      const applicableTiers = promo.tiers
        .filter(t => quantity >= t.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity);

      if (applicableTiers.length > 0) {
        appliedTier = applicableTiers[0];
        unitPrice = applicableTiers[0].promoPrice;
        priceSource = 'promo_tier';
        isMemberPrice = false;
        appliedOfferState = applicableTiers[0].description || promo.description || 'Promotional Offer';
      }
    }
  }

  return { unitPrice, isMemberPrice, appliedTier, priceSource, teaser, appliedOfferState };
}
