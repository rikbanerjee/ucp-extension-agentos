/**
 * Recipe 0002 — Contextual Pricing
 *
 * Demonstrates RAOS-0002 pricing evaluation: member pricing vs bulk tier
 * discounts, MOQ enforcement, and suppressed offers. Shows reason codes:
 * MEMBER_PRICE_APPLIED, BULK_TIER_APPLIED, BELOW_MOQ, TEASER_LOCKED.
 *
 * Real lib call: evaluateOffer (pricing evaluator in PRICE stage)
 */

import { evaluateOffer } from '@retailagentos/engine';
import type { PartialBuyerContext } from '@retailagentos/engine';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  VARIANT_MEMBER_PRICED,
  VARIANT_BULK_PRICED,
  REFERENCE_NOW,
} from '../fixtures';
import type { MembershipTier } from '@/lib/types/context';
import type { ComputedPriceState } from '@/lib/types/extensions';

const shownSource = `// RAOS-0002: Contextual Pricing
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';

// Variant declares pricing tiers:
const variant: Variant = {
  id: 'v_bulk_001',
  basePrice: 2.50,
  bulkPricing: {
    available: true,
    moq: 10,
    tiers: [
      { minQuantity: 10,  maxQuantity: 49,  price: 2.00 },
      { minQuantity: 50,  maxQuantity: 499, price: 1.60 },
      { minQuantity: 500, price: 1.20 },
    ],
  },
  memberPricing: {
    available: true,
    memberPrice: 18.99,
    teaserPrice: 22.99,
    requiredTier: 'gold',
  },
};

// KEY INSIGHT (§7.2): membershipTier is a privilege claim.
// trust.mode='asserted' + trustEnforcement='enforce' downgrades membershipTier
// to 'none', so member pricing never applies no matter what the context says.
// Set trust.mode='signed' for the membershipTier control to take effect.
const record = evaluateOffer({
  merchant,
  variant,
  quantity: 50,     // hits the 1.60/unit tier
  context: {
    customerType: 'member',
    membershipTier: 'gold',  // only unlocks member pricing when trust.mode='signed'
    trust: { mode: 'signed' }, // 'signed' → tier respected; 'asserted' → TEASER_LOCKED
  },
  now,
  trustEnforcement: 'enforce',
});

// PRICE stage output carries the final ComputedPriceState:
const priceResult = record.stages['PRICE']?.[
  'com.os.retailagent.shopping.pricing'
];
const priceState = priceResult?.output as ComputedPriceState;
// priceState.unitPrice → final price
// priceState.priceSource → 'base' | 'member' | 'bulk_tier'
// priceState.appliedOffers → [{ type, offerId, unitPriceAfter, ... }]
// priceState.suppressedOffers → offers evaluated but not applied
// record.normalizedContext.membershipTier → shows post-downgrade value
`;

export const recipe: Recipe = {
  id: '0002-pricing',
  specRef: 'RAOS-0002',
  title: 'Contextual Pricing — Member & Bulk Tiers',
  specPageHref: '/specs/0002-contextual-pricing',
  whatThisProves:
    'The pricing evaluator resolves the final unit price from base, member, and bulk tier paths. Changing membershipTier and quantity reveals MEMBER_PRICE_APPLIED, BULK_TIER_APPLIED, BELOW_MOQ, and suppressed offer tracking — proving that price attribution is auditable, not opaque. Privilege claims like membershipTier only take effect when trust.mode === \'signed\'; with \'asserted\', they are downgraded to most-restrictive (§7.2), so the gold tier never unlocks member pricing.',
  shownSource,

  controls: [
    {
      id: 'scenario',
      label: 'Pricing variant',
      type: 'select',
      options: [
        { value: 'member', label: 'Member pricing (gold unlocks discount)' },
        { value: 'bulk', label: 'Bulk pricing (quantity tiers + MOQ)' },
      ],
      defaultValue: 'member',
    },
    {
      id: 'trustMode',
      label: 'trust.mode (§7.2)',
      type: 'select',
      options: [
        { value: 'signed', label: 'signed — privilege claims respected' },
        { value: 'asserted', label: 'asserted — membershipTier downgraded to none' },
      ],
      defaultValue: 'signed',
    },
    {
      id: 'membershipTier',
      label: 'membershipTier',
      type: 'select',
      options: [
        { value: 'none', label: 'none (guest — sees teaser)' },
        { value: 'gold', label: 'gold (member price unlocked)' },
      ],
      defaultValue: 'gold',
    },
    {
      id: 'quantity',
      label: 'Quantity',
      type: 'number',
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 5,
    },
  ],

  run(controlValues): RecipeResult {
    const scenario = controlValues['scenario'] as string;
    const trustMode = (controlValues['trustMode'] as string ?? 'signed') as 'asserted' | 'signed';
    const variant = scenario === 'bulk' ? VARIANT_BULK_PRICED : VARIANT_MEMBER_PRICED;
    const membershipTier = controlValues['membershipTier'] as MembershipTier;
    const quantity = Number(controlValues['quantity'] ?? 5);

    const context: PartialBuyerContext = {
      customerType: membershipTier === 'none' ? 'guest' : 'member',
      membershipTier,
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: membershipTier !== 'none',
      taxExempt: false,
      resaleCertificateOnFile: false,
      // trust.mode controls §7.2 downgrade: 'signed' → tier respected;
      // 'asserted' → membershipTier silently reset to 'none', member pricing
      // is never applied regardless of what membershipTier says.
      trust: { mode: trustMode },
    };

    const record = evaluateOffer({
      merchant: MERCHANT_A,
      variant,
      quantity,
      context,
      now: REFERENCE_NOW,
      trustEnforcement: 'enforce',
    });

    const priceStage = record.stages['PRICE'];
    const priceResult = priceStage?.['com.os.retailagent.shopping.pricing'];
    const priceState = priceResult?.output as ComputedPriceState | null;

    const pricingReasonCodes = record.reasons
      .filter(r => r.source === 'com.os.retailagent.shopping.pricing')
      .map(r => r.code);

    const appliedDesc = priceState?.appliedOffers.map(o => o.description).join('; ') ?? 'none';
    const suppressedDesc = priceState?.suppressedOffers.map(o => `${o.offerId} (${o.reason})`).join('; ') ?? 'none';

    const downgradeNote =
      trustMode === 'asserted' && membershipTier !== 'none'
        ? ` (trust=asserted: membershipTier downgraded from '${membershipTier}' to 'none' per §7.2 — member pricing suppressed)`
        : '';

    return {
      decisionRecord: record,
      // Pass requestedContext so NormalizedContextCard can highlight downgrades.
      requestedContext: context,
      summary:
        `Unit price: $${priceState?.unitPrice?.toFixed(2) ?? 'N/A'} ` +
        `(source: ${priceState?.priceSource ?? 'N/A'}). ` +
        `Applied: [${appliedDesc}]. ` +
        `Suppressed: [${suppressedDesc || 'none'}]. ` +
        `Reason codes: [${pricingReasonCodes.join(', ') || 'none'}].` +
        downgradeNote,
    };
  },
};
