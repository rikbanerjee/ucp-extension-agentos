/**
 * Recipe 0000 — Foundations
 *
 * Demonstrates:
 *   1. Manifest negotiation: two merchants with different capabilities[] →
 *      same agent call → different active evaluators.
 *   2. Trust downgrade: asserted vs signed mode → privilege claims respected
 *      differently on member/tax-exempt fields.
 *   3. BuyerContext normalization: normalizedContext in the DecisionRecord
 *      shows most-restrictive defaults filled in.
 *
 * Real lib calls: evaluateOffer (from @/lib/extensions/pipeline)
 */

// Must import the registration side-effect so evaluators are in the registry.
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  MERCHANT_B,
  VARIANT_OPEN,
  REFERENCE_NOW,
} from '../fixtures';
import type { PartialBuyerContext } from '@/lib/types/context';

const shownSource = `// RAOS-0000: Manifest negotiation + trust downgrade
// Step 1 — Import the pipeline (evaluators self-register at boot)
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';

// Step 2 — Minimal MerchantProfile with capabilities[]
// The namespace strings MUST match registered evaluator namespaces.
const merchantA: MerchantProfile = {
  merchantId: 'ref_merchant_a',
  manifest: {
    protocol: '1.0',
    tier: 2,
    capabilities: [
      { namespace: 'com.os.retailagent.shopping.visibility', ... },
      { namespace: 'com.os.retailagent.shopping.eligibility', ... },
      { namespace: 'com.os.retailagent.shopping.pricing', ... },
      { namespace: 'com.os.retailagent.shopping.inventory', ... },
      // No 'com.os.retailagent.shopping.quote' → QUOTE stage is skipped
    ],
    keys: [{ keyId: 'k1', validFrom: ..., validTo: null }],
  },
  endpoints: { ... },
};

// Step 3 — BuyerContext with trust mode toggle
const context: PartialBuyerContext = {
  customerType: 'member',
  membershipTier: 'gold',  // asserted claim — downgraded when trust.mode='asserted'
  taxExempt: true,          // asserted claim — ignored in eligibility gate
  trust: { mode: 'asserted' }, // or 'signed'
};

// Step 4 — evaluateOffer returns a DecisionRecord
const record = evaluateOffer({
  merchant: merchantA,
  variant,
  quantity: 1,
  context,
  now: Date.now(), // inject externally; never called inside src/lib
  trustEnforcement: 'enforce', // downgrade asserted privilege claims
});

// record.normalizedContext shows the most-restrictive defaults applied.
// record.stages shows which evaluators actually ran (merchant A vs B differ).
`;

export const recipe: Recipe = {
  id: '0000-foundations',
  specRef: 'RAOS-0000',
  title: 'Protocol Foundations — Manifest Negotiation & Trust',
  specPageHref: '/specs/0000-foundations',
  whatThisProves:
    'Two merchants with different capability manifests receive identical agent calls but produce different stage evaluator sets — proving negotiation is manifest-driven, not agent-driven. Trust mode toggle shows privilege claims downgraded for asserted contexts.',
  shownSource,

  controls: [
    {
      id: 'merchant',
      label: 'Merchant',
      type: 'select',
      options: [
        { value: 'a', label: 'Merchant A (no quote capability)' },
        { value: 'b', label: 'Merchant B (with quote capability)' },
      ],
      defaultValue: 'a',
    },
    {
      id: 'trustMode',
      label: 'trust.mode',
      type: 'select',
      options: [
        { value: 'asserted', label: 'asserted — downgrade privilege claims' },
        { value: 'signed', label: 'signed — trust privilege claims' },
      ],
      defaultValue: 'asserted',
    },
    {
      id: 'membershipTier',
      label: 'membershipTier',
      type: 'select',
      options: [
        { value: 'none', label: 'none (guest)' },
        { value: 'gold', label: 'gold (B2B member)' },
        { value: 'distributor', label: 'distributor' },
      ],
      defaultValue: 'gold',
    },
  ],

  run(controlValues): RecipeResult {
    const merchantKey = controlValues['merchant'] as string;
    const merchant = merchantKey === 'b' ? MERCHANT_B : MERCHANT_A;
    const trustMode = (controlValues['trustMode'] as string) as 'asserted' | 'signed';
    const membershipTier = controlValues['membershipTier'] as 'none' | 'gold' | 'distributor';

    const context: PartialBuyerContext = {
      customerType: 'member',
      membershipTier,
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: true,       // asserted claim — will be downgraded if trust=asserted
      resaleCertificateOnFile: false,
      trust: { mode: trustMode },
    };

    const record = evaluateOffer({
      merchant,
      variant: VARIANT_OPEN,
      quantity: 1,
      context,
      now: REFERENCE_NOW,
      trustEnforcement: 'enforce',
    });

    // Describe which stages ran
    const ranStages = Object.keys(record.stages).join(', ');
    const quoteRan = 'QUOTE' in record.stages;
    const normalizedTaxExempt = record.normalizedContext.taxExempt;

    return {
      decisionRecord: record,
      // Pass requestedContext so NormalizedContextCard highlights taxExempt downgrade.
      requestedContext: context,
      summary:
        `Merchant ${merchant.merchantName} ran stages: [${ranStages}]. ` +
        `Quote stage: ${quoteRan ? 'YES (manifest declares ext.quote)' : 'NO (not in manifest)'}. ` +
        `taxExempt after normalization: ${normalizedTaxExempt} ` +
        `(trust=${trustMode} → ${trustMode === 'asserted' ? 'downgraded to false' : 'preserved'}).`,
    };
  },
};
