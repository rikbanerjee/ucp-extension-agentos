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

  // NOTE (2026-08-12, RAOS-0003 migration, engine 0.3.0 — BREAKING): the
  // fulfillmentConstraints.restrictedRegions → HIDDEN mapping that used to
  // live here has been REMOVED, not relocated 1:1. RAOS-0003 owns
  // restrictedRegions now and evaluates it in the new FEASIBILITY stage as
  // a BLOCKED (not HIDDEN) reason — the agent sees the item and can explain
  // why it can't be fulfilled there, rather than the item silently
  // disappearing. See specs/0001-eligibility.md §11 changelog and
  // specs/0003-fulfillment.md §3/§8 for the full write-up, and RAOS-0001
  // OQ#3 (§9) for the underlying HIDDEN-vs-BLOCKED debate this migration
  // takes a side on for the variant-level case specifically.

  return { status: 'VISIBLE' };
}

export function calculateEligibility(variant: Variant, context: BuyerContext): ComputedEligibility {
  const rules = variant.eligibilityRules;

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

  // NOTE (2026-08-12, RAOS-0003 migration): the fulfillmentConstraints.
  // restrictedRegions → REGION_RESTRICTED check that used to run here
  // (unconditionally, before the `!rules` early return below) has been
  // REMOVED — this is also the fix for the pinned WP-00 asymmetry
  // (specs/0001-eligibility.md §7 "Known reference-implementation
  // asymmetry"): FULFILLMENT_UNAVAILABLE was unreachable for a variant with
  // no eligibilityRules because this function early-returned before the
  // availableModes check. Both restrictedRegions and availableModes now
  // live exclusively in RAOS-0003's evaluateFulfillmentFeasibility
  // (src/lib/rules/fulfillment.ts), which has NO such early-return — every
  // variant with fulfillmentConstraints is checked regardless of whether it
  // also carries eligibilityRules. The bug is resolved by the checks no
  // longer sharing a function with the early-return that caused it.

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

  // NOTE (2026-08-12, RAOS-0003 migration): the availableModes check that
  // used to run here has MOVED to evaluateFulfillmentFeasibility
  // (src/lib/rules/fulfillment.ts), emitting FULFILLMENT_MODE_UNAVAILABLE
  // (renamed from FULFILLMENT_UNAVAILABLE) under the fulfillment_constraints
  // namespace. See specs/0001-eligibility.md §11 changelog.

  return {
    status: deriveEligibilityStatus(reasons),
    reasons,
  };
}
