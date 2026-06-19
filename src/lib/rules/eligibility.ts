import type { BuyerContext } from '../types/context';
import type { ComputedEligibility, ComputedVisibility, EligibilityReason } from '../types/extensions';
import type { Variant } from '../types/core';
import { deriveEligibilityStatus } from '../types/reasons';

// The owning namespace for all RAOS-0001 reason codes.
const ELIGIBILITY_NAMESPACE = 'com.os.retailagent.shopping.eligibility';

export function calculateVisibility(variant: Variant, context: BuyerContext): ComputedVisibility {
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

  return { status: 'VISIBLE' };
}

export function calculateEligibility(variant: Variant, context: BuyerContext): ComputedEligibility {
  const rules = variant.eligibilityRules;
  const fulfillment = variant.fulfillmentConstraints;

  // Guest visibility gate → item is hidden entirely
  if (rules?.hideFromGuests && context.customerType === 'guest') {
    const reason: EligibilityReason = {
      code: 'HIDDEN_PRODUCT',
      message: 'This product is not visible to guests.',
      severity: 'BLOCK',
      blocking: true,
      source: ELIGIBILITY_NAMESPACE,
    };
    return {
      status: deriveEligibilityStatus([reason]),
      reasons: [reason],
    };
  }

  // Region restriction → distinct code so agents can explain it
  if (fulfillment?.restrictedRegions?.includes(context.marketRegion)) {
    const reason: EligibilityReason = {
      code: 'REGION_RESTRICTED',
      message: `This product is not available in ${context.marketRegion}.`,
      severity: 'BLOCK',
      blocking: true,
      source: ELIGIBILITY_NAMESPACE,
    };
    return {
      status: deriveEligibilityStatus([reason]),
      reasons: [reason],
    };
  }

  const reasons: EligibilityReason[] = [];

  if (!rules) {
    return { status: 'ELIGIBLE', reasons };
  }

  if (rules.requireWholesale && context.customerType !== 'wholesale' && context.customerType !== 'b2b') {
    reasons.push({
      code: 'WHOLESALE_ONLY',
      message: 'This product requires a wholesale account.',
      severity: 'BLOCK',
      blocking: true,
      requirements: [{ type: 'customer_type', value: 'wholesale' }],
      source: ELIGIBILITY_NAMESPACE,
    });
  }

  if (rules.requireResaleCertificate && !context.resaleCertificateOnFile) {
    reasons.push({
      code: 'RESALE_CERTIFICATE_REQUIRED',
      message: 'A resale certificate on file is required to purchase this product.',
      severity: 'BLOCK',
      blocking: true,
      requirements: [{ type: 'resale_certificate', value: true }],
      source: ELIGIBILITY_NAMESPACE,
    });
  }

  if (rules.requiredTier) {
    const tierHierarchy = ['none', 'gold', 'reseller_plus', 'distributor'];
    const currentTierIdx = tierHierarchy.indexOf(context.membershipTier);
    const requiredTierIdx = tierHierarchy.indexOf(rules.requiredTier);

    if (currentTierIdx < requiredTierIdx) {
      reasons.push({
        code: 'TIER_RESTRICTION',
        message: `Requires ${rules.requiredTier} membership tier.`,
        // BLOCK severity + requirements[] → derives to CONDITIONAL status (§8.1).
        // This resolves the OQ#1/#2 incoherence: old code had blocking:true + CONDITIONAL status.
        // New model: BLOCK severity + resolution path → CONDITIONAL. Behavior preserved.
        severity: 'BLOCK',
        blocking: true,
        requirements: [{ type: 'membership_tier', value: rules.requiredTier }],
        source: ELIGIBILITY_NAMESPACE,
      });
    }
  }

  if (fulfillment?.availableModes && !fulfillment.availableModes.includes(context.fulfillmentMode)) {
    reasons.push({
      code: 'FULFILLMENT_UNAVAILABLE',
      message: `This product is not available for ${context.fulfillmentMode.replace('_', ' ')}.`,
      severity: 'BLOCK',
      blocking: true,
      source: ELIGIBILITY_NAMESPACE,
    });
  }

  return {
    status: deriveEligibilityStatus(reasons),
    reasons,
  };
}
