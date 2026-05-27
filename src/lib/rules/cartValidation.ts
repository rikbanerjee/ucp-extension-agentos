import { PricingContext } from '../types/extensions';
import { Variant } from '../types/core';
import { calculateEligibility } from './eligibility';
import { getApplicablePrice } from './pricing';

export function validateCartLine(variant: Variant, quantity: number, context: PricingContext) {
  const eligibility = calculateEligibility(variant, context);
  const messages: string[] = [];
  let valid = eligibility.status === 'ELIGIBLE';

  if (eligibility.status !== 'ELIGIBLE') {
    messages.push(...eligibility.reasons.map(r => r.message));
  }

  if (variant.bulkPricing?.available) {
    if (variant.bulkPricing.moq && quantity < variant.bulkPricing.moq) {
      valid = false;
      messages.push(`Minimum order quantity is ${variant.bulkPricing.moq}.`);
    }
    if (variant.bulkPricing.quantityIncrement && (quantity % variant.bulkPricing.quantityIncrement) !== 0) {
      valid = false;
      messages.push(`Quantity must be in increments of ${variant.bulkPricing.quantityIncrement}.`);
    }
  }

  const priceState = getApplicablePrice(variant, quantity, context);
  const priceSource = priceState.priceSource;

  return {
    valid,
    unitPrice: priceState.unitPrice,
    lineTotal: priceState.unitPrice * quantity,
    eligibility,
    appliedTier: priceState.appliedTier,
    priceSource,
    appliedOfferState: priceState.appliedOfferState,
    messages
  };
}
