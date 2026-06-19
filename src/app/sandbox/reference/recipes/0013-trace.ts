/**
 * Recipe 0013 — Decision Trace
 *
 * Demonstrates RAOS-0013 audience renderers: takes a DecisionRecord from a
 * real evaluateOffer call and renders it for three audiences via the real
 * trace renderers:
 *   - developer: full JSON (renderDeveloperTrace)
 *   - merchant: ops-actionable row table (renderMerchantTrace)
 *   - buyer: plain-language 1-2 sentence view (renderBuyerTrace)
 *
 * The `audience` toggle switches which renderer's output is shown.
 * The `scenario` control picks different evaluateOffer outcomes to feed in.
 *
 * Real lib calls: evaluateOffer, buildDecisionTrace, renderDeveloperTrace,
 *   renderMerchantTrace, renderBuyerTrace
 */

import '@/lib/extensions';
import { evaluateOffer, setQuoteMeta } from '@/lib/extensions';
import { buildDecisionTrace } from '@/lib/trace/derive';
import {
  renderDeveloperTrace,
  renderMerchantTrace,
  renderBuyerTrace,
} from '@/lib/trace/render';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  MERCHANT_B,
  VARIANT_OPEN,
  VARIANT_TIER_RESTRICTED,
  VARIANT_OUT_OF_STOCK,
  VARIANT_MEMBER_PRICED,
  VARIANT_QUOTABLE,
  REFERENCE_NOW,
} from '../fixtures';
import type { PartialBuyerContext, MembershipTier } from '@/lib/types/context';

const shownSource = `// RAOS-0013: Decision Trace — three-audience renderers
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';
import { buildDecisionTrace } from '@/lib/trace/derive';
import {
  renderDeveloperTrace,
  renderMerchantTrace,
  renderBuyerTrace,
} from '@/lib/trace/render';

// Step 1: Get a DecisionRecord from the real pipeline
const record = evaluateOffer({ merchant, variant, quantity, context, now });

// Step 2: Derive the enriched trace (adds stageVerdicts, governingReason, etc.)
const trace = buildDecisionTrace(record);

// Step 3: Render for your target audience

// Developer — full stable JSON (alphabetically sorted keys):
const devJson: string = renderDeveloperTrace(trace);

// Merchant ops — array of actionable rows (only BLOCK/CONDITION reasons):
const merchantRows: MerchantTraceRow[] = renderMerchantTrace(trace);
// Each row: { stage, status, code, message, actionHint }

// Buyer — 1-2 plain-language sentences (deny-list enforced):
const buyerView: BuyerTraceView = renderBuyerTrace(trace);
// buyerView: { canPurchase, headline, detail?, nextStep? }
// NEVER contains: floor, margin, cost, keyId, signature, appliedOffers, ...
`;

type Scenario = 'eligible' | 'tier_blocked' | 'oos_blocked' | 'member_priced' | 'quoted';
type Audience = 'developer' | 'merchant' | 'buyer';

const scenarioLabels: Record<Scenario, string> = {
  eligible: 'Eligible — open product, all clear',
  tier_blocked: 'Blocked — TIER_RESTRICTION (need gold)',
  oos_blocked: 'Blocked — OUT_OF_STOCK',
  member_priced: 'Eligible — member price applied',
  quoted: 'Quoted — QuoteToken issued in QUOTE stage',
};

export const recipe: Recipe = {
  id: '0013-trace',
  specRef: 'RAOS-0013',
  title: 'Decision Trace — Audience Renderers',
  specPageHref: '/specs/0013-intent-capture',
  whatThisProves:
    'The three trace renderers transform one DecisionRecord into three audience-appropriate views without reimplementing spec logic. The developer view is full JSON; the merchant view is an ops-actionable table; the buyer view is 1-2 plain sentences with a strict deny-list. Toggle between them to see the same data presented differently. For the member_priced and quoted scenarios, privilege claims like membershipTier only take effect when trust.mode === \'signed\'; with \'asserted\', the tier is downgraded and member pricing is suppressed (§7.2).',
  shownSource,

  controls: [
    {
      id: 'scenario',
      label: 'Pipeline scenario',
      type: 'select',
      options: (Object.keys(scenarioLabels) as Scenario[]).map(k => ({
        value: k,
        label: scenarioLabels[k],
      })),
      defaultValue: 'tier_blocked',
    },
    {
      id: 'audience',
      label: 'Renderer audience',
      type: 'select',
      options: [
        { value: 'developer', label: 'Developer — full JSON' },
        { value: 'merchant', label: 'Merchant — ops-actionable rows' },
        { value: 'buyer', label: 'Buyer — plain language' },
      ],
      defaultValue: 'developer',
    },
    {
      id: 'trustMode',
      label: 'trust.mode (§7.2) — affects member_priced / quoted scenarios',
      type: 'select',
      options: [
        { value: 'signed', label: 'signed — membershipTier respected' },
        { value: 'asserted', label: 'asserted — membershipTier downgraded to none' },
      ],
      defaultValue: 'signed',
    },
    {
      id: 'membershipTier',
      label: 'membershipTier (for priced/quoted scenarios)',
      type: 'select',
      options: [
        { value: 'none', label: 'none' },
        { value: 'gold', label: 'gold' },
      ],
      defaultValue: 'gold',
    },
  ],

  run(controlValues): RecipeResult {
    const scenario = controlValues['scenario'] as Scenario;
    const audience = controlValues['audience'] as Audience;
    const trustMode = (controlValues['trustMode'] as string ?? 'signed') as 'asserted' | 'signed';
    const membershipTier = controlValues['membershipTier'] as MembershipTier;

    // Build scenario-appropriate inputs
    type ScenarioConfig = {
      variant: typeof VARIANT_OPEN;
      merchant: typeof MERCHANT_A;
      context: PartialBuyerContext;
      preSetup?: () => void;
    };

    // For scenarios that don't use membershipTier as a privilege claim (eligible,
    // tier_blocked, oos_blocked), trust.mode doesn't affect the outcome — 'asserted'
    // is fine because no privilege claim is in play.
    // For member_priced and quoted, trustMode is wired in so the membershipTier
    // control actually moves the output (§7.2 downgrade applies with 'asserted').
    const scenarioConfigs: Record<Scenario, ScenarioConfig> = {
      eligible: {
        merchant: MERCHANT_A,
        variant: VARIANT_OPEN,
        context: {
          customerType: 'member',
          membershipTier: 'none',
          marketRegion: 'US',
          fulfillmentMode: 'shipping',
          accountLinked: true,
          taxExempt: false,
          resaleCertificateOnFile: false,
          trust: { mode: 'asserted' },
        },
      },
      tier_blocked: {
        merchant: MERCHANT_A,
        variant: VARIANT_TIER_RESTRICTED,
        context: {
          customerType: 'member',
          membershipTier: 'none', // deliberately 'none' — this scenario demonstrates the block
          marketRegion: 'US',
          fulfillmentMode: 'shipping',
          accountLinked: true,
          taxExempt: false,
          resaleCertificateOnFile: false,
          trust: { mode: 'asserted' },
        },
      },
      oos_blocked: {
        merchant: MERCHANT_A,
        variant: VARIANT_OUT_OF_STOCK,
        context: {
          customerType: 'member',
          membershipTier: 'none',
          marketRegion: 'US',
          fulfillmentMode: 'shipping',
          accountLinked: true,
          taxExempt: false,
          resaleCertificateOnFile: false,
          trust: { mode: 'asserted' },
        },
      },
      member_priced: {
        merchant: MERCHANT_A,
        variant: VARIANT_MEMBER_PRICED,
        context: {
          customerType: 'member',
          membershipTier,
          marketRegion: 'US',
          fulfillmentMode: 'shipping',
          accountLinked: membershipTier !== 'none',
          taxExempt: false,
          resaleCertificateOnFile: false,
          // trustMode wired in: 'signed' → membershipTier respected → MEMBER_PRICE_APPLIED;
          // 'asserted' → downgraded to 'none' → member pricing suppressed.
          trust: { mode: trustMode },
        },
      },
      quoted: {
        merchant: MERCHANT_B,
        variant: VARIANT_QUOTABLE,
        context: {
          customerType: 'member',
          membershipTier,
          marketRegion: 'US',
          fulfillmentMode: 'shipping',
          accountLinked: membershipTier !== 'none',
          taxExempt: false,
          resaleCertificateOnFile: false,
          // trustMode wired in: affects whether token is issued at member or base price.
          trust: { mode: trustMode },
        },
        preSetup() {
          setQuoteMeta({ merchantId: MERCHANT_B.merchantId });
        },
      },
    };

    const config = scenarioConfigs[scenario] ?? scenarioConfigs.eligible;
    config.preSetup?.();

    const record = evaluateOffer({
      merchant: config.merchant,
      variant: config.variant,
      quantity: 1,
      context: config.context,
      now: REFERENCE_NOW,
      trustEnforcement: 'enforce',
    });

    // Derive the enriched trace
    const trace = buildDecisionTrace(record);

    // Render for the selected audience
    const developerTrace = renderDeveloperTrace(trace);
    const merchantTrace = renderMerchantTrace(trace);
    const buyerTrace = renderBuyerTrace(trace);

    const selectedAudienceDesc =
      audience === 'developer'
        ? `Developer JSON (${developerTrace.length} chars)`
        : audience === 'merchant'
        ? `Merchant rows: ${merchantTrace.map(r => r.code).join(', ') || 'PASS'}`
        : `Buyer: "${buyerTrace.headline}"${buyerTrace.nextStep ? ` → ${buyerTrace.nextStep}` : ''}`;

    return {
      decisionRecord: record,
      // Pass requestedContext so NormalizedContextCard can highlight downgrades
      // for member_priced/quoted when trustMode='asserted'.
      requestedContext: config.context,
      merchantTrace,
      buyerTrace,
      developerTrace,
      summary:
        `Scenario: ${scenarioLabels[scenario]}. ` +
        `Offer status: ${trace.offerStatus}. ` +
        `Active audience: ${audience}. ` +
        selectedAudienceDesc,
    };
  },
};
