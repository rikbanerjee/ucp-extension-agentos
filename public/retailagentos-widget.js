/**
 * RetailAgentOS Standalone Audit Widget Module
 * Checks a merchant's UCP discovery configuration against the RetailAgentOS pre-checkout reasoning layer specs.
 */

function auditRetailAgentOS(ucpProfileJson, htmlContent = '') {
  const extensions = ucpProfileJson.extensions || {};
  let score = 0;
  const audits = [];

  // 1. Pricing Context Extension
  const pricingContextVal = extensions['com.ezyupload.shopping.pricing_context'];
  const hasPricingContext = !!pricingContextVal;
  let pricingContextUrl = 'https://api.yourdomain.com/ucp/pricing-context';
  if (hasPricingContext) {
    if (typeof pricingContextVal === 'string') {
      pricingContextUrl = pricingContextVal;
    } else if (pricingContextVal.endpoint) {
      pricingContextUrl = pricingContextVal.endpoint;
    }
    score += 4;
    audits.push({
      category: 'retailagentos',
      status: 'pass',
      name: 'Pricing Context Extension',
      message: `Found active com.ezyupload.shopping.pricing_context extension context at ${pricingContextUrl}. Allows agents to resolve buyer tax, region, and identity states.`,
      fix: null
    });
  } else {
    audits.push({
      category: 'retailagentos',
      status: 'fail',
      name: 'Pricing Context Extension',
      message: `Missing com.ezyupload.shopping.pricing_context extension context (expected: ${pricingContextUrl}).`,
      agentFailureExplanation: 'AI shopping agents will default to general list prices rather than B2B, wholesale, or membership-tier rates, resulting in transaction surprises and price mismatches at checkout.',
      fix: `Add the com.ezyupload.shopping.pricing_context endpoint (${pricingContextUrl}) to your UCP extensions block.`
    });
  }

  // 2. Buyer Eligibility Extension
  const hasEligibility = !!extensions['com.ezyupload.shopping.eligibility'];
  if (hasEligibility) {
    score += 4;
    audits.push({
      category: 'retailagentos',
      status: 'pass',
      name: 'Eligibility Reasoning Extension',
      message: 'Found active com.ezyupload.shopping.eligibility namespace in UCP profile. Enforces membership-gating and credential requirements.',
      fix: null
    });
  } else {
    audits.push({
      category: 'retailagentos',
      status: 'fail',
      name: 'Eligibility Reasoning Extension',
      message: 'Missing namespaced com.ezyupload.shopping.eligibility extension rules.',
      agentFailureExplanation: 'AI shopping agents will fail by recommending products restricted to specific accounts (like B2B inventory or member-exclusive sales) to guest buyers, causing cart checkout crashes.',
      fix: 'Add the com.ezyupload.shopping.eligibility endpoint to handle gated visibility and buyer credentials verification.'
    });
  }

  // 3. Bulk & Tier Pricing Extension
  const hasBulkPricing = !!extensions['com.ezyupload.shopping.bulk_pricing'] || !!extensions['com.ezyupload.shopping.member_pricing'];
  if (hasBulkPricing) {
    score += 4;
    audits.push({
      category: 'retailagentos',
      status: 'pass',
      name: 'Bulk & Quantity Constraints Extension',
      message: 'Found active com.ezyupload.shopping.bulk_pricing (or member_pricing) namespace. Enforces MOQ and step increments.',
      fix: null
    });
  } else {
    audits.push({
      category: 'retailagentos',
      status: 'fail',
      name: 'Bulk & Quantity Constraints Extension',
      message: 'Missing namespaced com.ezyupload.shopping.bulk_pricing extension rules.',
      agentFailureExplanation: 'AI shopping agents will construct carts with quantities below your Minimum Order Quantity (MOQ) or incorrect step increments, leading to transaction rejection at checkout.',
      fix: 'Expose com.ezyupload.shopping.bulk_pricing rules in your UCP extensions to declare your MOQs and packaging increments.'
    });
  }

  // 4. Promo Pricing Extension
  const hasPromoPricing = !!extensions['com.ezyupload.shopping.promo_pricing'];
  if (hasPromoPricing) {
    score += 4;
    audits.push({
      category: 'retailagentos',
      status: 'pass',
      name: 'Promotional Reasoning Extension',
      message: 'Found active com.ezyupload.shopping.promo_pricing namespace. Exposes active mix-and-match sale pricing rules.',
      fix: null
    });
  } else {
    audits.push({
      category: 'retailagentos',
      status: 'fail',
      name: 'Promotional Reasoning Extension',
      message: 'Missing namespaced com.ezyupload.shopping.promo_pricing extension rules.',
      agentFailureExplanation: 'AI shopping agents will fail to apply active promotions (like buy-three-get-one-free or group bundle sales) during cart formulation, making your products look less competitive.',
      fix: 'Define com.ezyupload.shopping.promo_pricing discount endpoints to let agents dynamically apply promotional rules.'
    });
  }

  // 5. Fulfillment Constraints Extension
  const hasFulfillment = !!extensions['com.ezyupload.shopping.fulfillment_constraints'];
  if (hasFulfillment) {
    score += 4;
    audits.push({
      category: 'retailagentos',
      status: 'pass',
      name: 'Fulfillment Constraints Extension',
      message: 'Found active com.ezyupload.shopping.fulfillment_constraints namespace. Prevents delivery to restricted zones.',
      fix: null
    });
  } else {
    audits.push({
      category: 'retailagentos',
      status: 'fail',
      name: 'Fulfillment Constraints Extension',
      message: 'Missing namespaced com.ezyupload.shopping.fulfillment_constraints extension rules.',
      agentFailureExplanation: 'AI shopping agents will attempt to ship bulky, hazardous, or perishable items to Hawaii, Alaska, or outside your shipping zones, causing shipping blocks late at checkout.',
      fix: 'Implement com.ezyupload.shopping.fulfillment_constraints rules in your UCP config to surface shipping zones exclusions early.'
    });
  }

  return {
    score: score, // Max 20 points
    max: 20,
    audits: audits
  };
}

module.exports = {
  auditRetailAgentOS
};
