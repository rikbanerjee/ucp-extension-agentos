/**
 * Recipe 0001 — Eligibility
 *
 * Demonstrates RAOS-0001 eligibility gate: buyer context attributes (customerType,
 * membershipTier, marketRegion) control BLOCK vs PASS. Shows reason codes:
 * TIER_RESTRICTION, WHOLESALE_ONLY, REGION_RESTRICTED.
 *
 * Real lib call: evaluateOffer (eligibility evaluator in ELIGIBILITY stage)
 */

import { evaluateOffer } from '@retailagentos/engine';
import type { PartialBuyerContext } from '@retailagentos/engine';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  VARIANT_TIER_RESTRICTED,
  VARIANT_WHOLESALE_ONLY,
  VARIANT_REGION_RESTRICTED,
  VARIANT_OPEN,
  REFERENCE_NOW,
} from '../fixtures';
import type { CustomerType, MembershipTier } from '@/lib/types/context';

const shownSource = `// RAOS-0001: Eligibility gate
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';

// Variant declares who may buy via eligibilityRules:
const variant: Variant = {
  id: 'v_tier_001',
  basePrice: 49.99,
  eligibilityRules: {
    requiredTier: 'gold',      // → TIER_RESTRICTION for non-gold buyers
    // requireWholesale: true  // → WHOLESALE_ONLY for non-wholesale buyers
    // requireResaleCertificate: true // → RESALE_CERTIFICATE_REQUIRED
  },
  // fulfillmentConstraints: {
  //   restrictedRegions: ['HI', 'AK'] // → REGION_RESTRICTED
  // }
};

// KEY INSIGHT (§7.2): membershipTier is a privilege claim.
// With trust.mode='asserted' + trustEnforcement='enforce', the pipeline
// downgrades membershipTier to 'none' regardless of what the context says.
// Set trust.mode='signed' so the tier control actually takes effect.
const context: PartialBuyerContext = {
  customerType: 'member', // 'guest' | 'member' | 'wholesale' | 'b2b'
  membershipTier: 'gold', // 'none' | 'gold' | 'reseller_plus' | 'distributor'
  marketRegion: 'US',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'signed' }, // 'signed' → tier respected; 'asserted' → downgraded to 'none'
};

const record = evaluateOffer({
  merchant,    // must declare 'com.os.retailagent.shopping.eligibility' in manifest
  variant,
  quantity: 1,
  context,
  now,
  trustEnforcement: 'enforce',
});

// Check eligibility outcome from the ELIGIBILITY stage:
const eligResult = record.stages['ELIGIBILITY']?.[
  'com.os.retailagent.shopping.eligibility'
];
// eligResult.output.status → 'ELIGIBLE' | 'CONDITIONAL' | 'BLOCKED'
// record.reasons → AttributedReasonEntry[] with TIER_RESTRICTION etc.
// record.normalizedContext.membershipTier shows the post-downgrade value.
`;

export const recipe: Recipe = {
  id: '0001-eligibility',
  specRef: 'RAOS-0001',
  title: 'Eligibility — Who May Buy',
  specPageHref: '/specs/0001-eligibility',
  whatThisProves:
    'The eligibility evaluator gates purchases based on buyer context fields. Changing customerType, membershipTier, or marketRegion produces TIER_RESTRICTION, WHOLESALE_ONLY, or REGION_RESTRICTED reason codes with BLOCK severity — proving the pipeline gates transactions, not just annotates them. Privilege claims like membershipTier only take effect when trust.mode === \'signed\'; with \'asserted\', they are downgraded to most-restrictive (§7.2) — making the tier control visibly dead.',
  shownSource,

  controls: [
    {
      id: 'scenario',
      label: 'Variant restriction',
      type: 'select',
      options: [
        { value: 'open', label: 'No restriction (open product)' },
        { value: 'tier', label: 'Gold membership required' },
        { value: 'wholesale', label: 'Wholesale only' },
        { value: 'region', label: 'Region restricted (HI, AK, CA)' },
      ],
      defaultValue: 'tier',
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
      id: 'customerType',
      label: 'customerType',
      type: 'select',
      options: [
        { value: 'guest', label: 'guest' },
        { value: 'member', label: 'member' },
        { value: 'wholesale', label: 'wholesale' },
        { value: 'b2b', label: 'b2b' },
      ],
      defaultValue: 'member',
    },
    {
      id: 'membershipTier',
      label: 'membershipTier',
      type: 'select',
      options: [
        { value: 'none', label: 'none' },
        { value: 'gold', label: 'gold' },
        { value: 'reseller_plus', label: 'reseller_plus' },
        { value: 'distributor', label: 'distributor' },
      ],
      defaultValue: 'gold',
    },
    {
      id: 'marketRegion',
      label: 'marketRegion',
      type: 'select',
      options: [
        { value: 'US', label: 'US (continental)' },
        { value: 'HI', label: 'HI (Hawaii — restricted)' },
        { value: 'AK', label: 'AK (Alaska — restricted)' },
        { value: 'CA', label: 'CA (California — restricted)' },
        { value: 'NY', label: 'NY (New York)' },
      ],
      defaultValue: 'US',
    },
  ],

  run(controlValues): RecipeResult {
    const scenario = controlValues['scenario'] as string;
    const trustMode = (controlValues['trustMode'] as string ?? 'signed') as 'asserted' | 'signed';
    const variantMap = {
      open: VARIANT_OPEN,
      tier: VARIANT_TIER_RESTRICTED,
      wholesale: VARIANT_WHOLESALE_ONLY,
      region: VARIANT_REGION_RESTRICTED,
    };
    const variant = variantMap[scenario as keyof typeof variantMap] ?? VARIANT_OPEN;

    const context: PartialBuyerContext = {
      customerType: controlValues['customerType'] as CustomerType,
      membershipTier: controlValues['membershipTier'] as MembershipTier,
      marketRegion: controlValues['marketRegion'] as string,
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: false,
      // trust.mode controls §7.2 downgrade: 'signed' → tier respected;
      // 'asserted' → membershipTier silently reset to 'none' in normalizedContext.
      trust: { mode: trustMode },
    };

    const record = evaluateOffer({
      merchant: MERCHANT_A,
      variant,
      quantity: 1,
      context,
      now: REFERENCE_NOW,
      trustEnforcement: 'enforce',
    });

    const eligStage = record.stages['ELIGIBILITY'];
    const eligResult = eligStage?.['com.os.retailagent.shopping.eligibility'];
    const status = (eligResult?.output as { status?: string } | null)?.status ?? 'N/A';

    const blockReasons = record.reasons
      .filter(r => r.severity === 'BLOCK')
      .map(r => r.code);

    const downgradeNote =
      trustMode === 'asserted' && context.membershipTier !== 'none'
        ? ` (trust=asserted: membershipTier downgraded from '${context.membershipTier}' to 'none' per §7.2)`
        : '';

    return {
      decisionRecord: record,
      // Pass requestedContext so NormalizedContextCard can highlight downgrades.
      requestedContext: context,
      summary:
        `Eligibility status: ${status}. ` +
        (blockReasons.length > 0
          ? `BLOCK reasons: [${blockReasons.join(', ')}].`
          : 'No BLOCK reasons — buyer is ELIGIBLE.') +
        downgradeNote,
    };
  },
};
