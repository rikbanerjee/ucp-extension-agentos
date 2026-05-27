import { PricingContext, ComputedEligibility, ComputedVisibility, EligibilityReason } from '../types/extensions';
import { Variant } from '../types/core';

export function calculateVisibility(variant: Variant, context: PricingContext): ComputedVisibility {
  const rules = variant.eligibilityRules;
  if (!rules) return { status: 'VISIBLE' };

  if (rules.hideFromGuests && context.customerType === 'guest') {
    return {
      status: 'HIDDEN',
      reason: 'This product is not visible to guests.'
    };
  }

  // Fulfillment Constraints mapping to Visibility
  const fulfillment = variant.fulfillmentConstraints;
  if (fulfillment?.restrictedRegions && fulfillment.restrictedRegions.includes(context.marketRegion)) {
    return {
      status: 'HIDDEN',
      reason: `This product is not available in ${context.marketRegion}.`
    };
  }

  // Add more visibility rules here if needed

  return { status: 'VISIBLE' };
}

export function calculateEligibility(variant: Variant, context: PricingContext): ComputedEligibility {
  const reasons: EligibilityReason[] = [];
  let status: ComputedEligibility['status'] = 'ELIGIBLE';

  const visibility = calculateVisibility(variant, context);
  if (visibility.status === 'HIDDEN') {
    return {
      status: 'BLOCKED',
      reasons: [{
        code: 'HIDDEN_PRODUCT',
        message: visibility.reason || 'Product is hidden.',
        blocking: true
      }]
    };
  }

  const rules = variant.eligibilityRules;
  if (!rules) return { status, reasons };

  if (rules.requireWholesale && context.customerType !== 'wholesale' && context.customerType !== 'b2b') {
    status = 'BLOCKED';
    reasons.push({
      code: 'WHOLESALE_ONLY',
      message: 'This product requires a wholesale account.',
      blocking: true,
      requirements: [{ type: 'customer_type', value: 'wholesale' }]
    });
  }

  if (rules.requireResaleCertificate && !context.resaleCertificateOnFile) {
    status = 'BLOCKED';
    reasons.push({
      code: 'RESALE_CERTIFICATE_REQUIRED',
      message: 'A resale certificate on file is required to purchase this product.',
      blocking: true,
      requirements: [{ type: 'resale_certificate', value: true }]
    });
  }

  if (rules.requiredTier) {
    const tierHierarchy = ['none', 'gold', 'reseller_plus', 'distributor'];
    const currentTierIdx = tierHierarchy.indexOf(context.membershipTier);
    const requiredTierIdx = tierHierarchy.indexOf(rules.requiredTier);
    
    if (currentTierIdx < requiredTierIdx) {
      status = status === 'BLOCKED' ? status : 'CONDITIONAL';
      reasons.push({
        code: 'TIER_RESTRICTION',
        message: `Requires ${rules.requiredTier} membership tier.`,
        blocking: true,
        requirements: [{ type: 'membership_tier', value: rules.requiredTier }]
      });
    }
  }

  const fulfillment = variant.fulfillmentConstraints;
  if (fulfillment?.availableModes && !fulfillment.availableModes.includes(context.fulfillmentMode)) {
    status = 'BLOCKED';
    reasons.push({
      code: 'FULFILLMENT_UNAVAILABLE',
      message: `This product is not available for ${context.fulfillmentMode.replace('_', ' ')}.`,
      blocking: true
    });
  }

  if (status !== 'BLOCKED' && reasons.length > 0) {
    status = 'CONDITIONAL';
  }

  return { status, reasons };
}
