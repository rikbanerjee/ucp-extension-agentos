/**
 * Recipe 0007 — Quote Integrity & Price Lock
 *
 * Demonstrates RAOS-0007: issue a QuoteToken for a priced, eligible offer,
 * then validate it under three scenarios:
 *   1. Token valid — HONORED
 *   2. Token expired past grace — REQUOTE_REQUIRED
 *   3. Buyer context changed — REQUOTE_REQUIRED (QUOTE_CONTEXT_CHANGED)
 *
 * The `nowOffset` control slides time past the token's TTL (600s) and
 * grace window (120s) to demonstrate the honor_grace policy in action.
 *
 * Real lib calls: evaluateOffer (issues token via QUOTE stage), validateQuote
 *
 * NOTE: setQuoteMeta must be called before evaluateOffer to inject merchantId
 * for the QUOTE-stage evaluator. This is the pattern documented in evaluators/quote.ts.
 */

import { evaluateOffer, setQuoteMeta, validateQuote } from '@retailagentos/engine';
import type { PartialBuyerContext, QuoteToken } from '@retailagentos/engine';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_B,
  VARIANT_QUOTABLE,
  REFERENCE_NOW,
} from '../fixtures';
import type { BuyerContext, MembershipTier } from '@/lib/types/context';

const shownSource = `// RAOS-0007: Quote Integrity & Price Lock
import '@/lib/extensions';
import { evaluateOffer, setQuoteMeta } from '@/lib/extensions';
import { validateQuote } from '@/lib/rules/quote';

// Variant must declare quoteConfig for the QUOTE-stage evaluator to run:
const variant: Variant = {
  id: 'v_quote_001',
  basePrice: 149.99,
  memberPricing: { available: true, memberPrice: 129.99, requiredTier: 'gold' },
  inventory: { state: 'in_stock', quantityAvailable: 25, ... },
  quoteConfig: {
    ttlSeconds: 600, // 10-minute price lock
    honorPolicy: {
      onExpiry: 'honor_grace',
      graceSeconds: 120,
      onStockLoss: 'partial',
      onContextChange: 'requote',
    },
  },
};

// STEP 1: Issue a QuoteToken
// setQuoteMeta injects merchantId into the QUOTE-stage evaluator module slot.
const issueNow = Date.now();
setQuoteMeta({ merchantId: merchant.merchantId });

const issuedRecord = evaluateOffer({
  merchant, // must declare 'com.os.retailagent.shopping.quote' in manifest
  variant,
  quantity: 2,
  context: { customerType: 'member', membershipTier: 'gold', ... },
  now: issueNow,
});

// Extract the token from the QUOTE stage output:
const quoteResult = issuedRecord.stages['QUOTE']?.[
  'com.os.retailagent.shopping.quote'
];
const token = quoteResult?.output as QuoteToken | null;

// STEP 2: Validate the token at checkout time
const validationResult = validateQuote(
  { token, context, variant, merchant },
  checkoutNow, // inject — may be > issuedAt + ttlSeconds
);
// validationResult.outcome → 'HONORED' | 'REQUOTE_REQUIRED' | 'REJECTED'
// validationResult.reasons → ReasonEntry[] with QUOTE_EXPIRED, QUOTE_HONORED_GRACE, etc.
`;

export const recipe: Recipe = {
  id: '0007-quote',
  specRef: 'RAOS-0007',
  title: 'Quote Integrity — Price Lock & Validation',
  specPageHref: '/specs/0007-quote-integrity',
  whatThisProves:
    'A QuoteToken binds price, buyer context, and variant to a TTL. The `now` offset shows the 3-zone behavior: HONORED (within TTL), QUOTE_HONORED_GRACE (within grace window), and REQUOTE_REQUIRED (past grace). Changing membershipTier after issue triggers QUOTE_CONTEXT_CHANGED — proving context hash binding. Privilege claims like membershipTier only take effect when trust.mode === \'signed\'; with \'asserted\', the tier is downgraded and member pricing never appears in the token (§7.2).',
  shownSource,

  controls: [
    {
      id: 'trustMode',
      label: 'trust.mode at issue time (§7.2)',
      type: 'select',
      options: [
        { value: 'signed', label: 'signed — membershipTier respected in token price' },
        { value: 'asserted', label: 'asserted — membershipTier downgraded, base price only' },
      ],
      defaultValue: 'signed',
    },
    {
      id: 'membershipTier',
      label: 'membershipTier at issue time',
      type: 'select',
      options: [
        { value: 'none', label: 'none (base price $149.99)' },
        { value: 'gold', label: 'gold (member price $129.99 when trust=signed)' },
      ],
      defaultValue: 'gold',
    },
    {
      id: 'nowOffsetSeconds',
      label: 'Time since issue (seconds)',
      type: 'number',
      min: 0,
      max: 900,
      step: 30,
      defaultValue: 0,
    },
    {
      id: 'changeContext',
      label: 'Change buyer context at validation',
      type: 'toggle',
      defaultValue: false,
    },
  ],

  run(controlValues): RecipeResult {
    const trustMode = (controlValues['trustMode'] as string ?? 'signed') as 'asserted' | 'signed';
    const membershipTier = controlValues['membershipTier'] as MembershipTier;
    const nowOffsetSeconds = Number(controlValues['nowOffsetSeconds'] ?? 0);
    const changeContext = Boolean(controlValues['changeContext']);

    const issueNow = REFERENCE_NOW;
    const validateNow = REFERENCE_NOW + nowOffsetSeconds * 1000;

    // Build issue context.
    // trust.mode controls §7.2 downgrade: 'signed' → membershipTier respected
    // and member price ($129.99) appears in token; 'asserted' → downgraded to
    // 'none' so only base price ($149.99) is ever locked in the token.
    const issueContext: PartialBuyerContext = {
      customerType: 'member',
      membershipTier,
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: trustMode },
    };

    // STEP 1: Issue the quote via evaluateOffer
    setQuoteMeta({ merchantId: MERCHANT_B.merchantId });

    const issuedRecord = evaluateOffer({
      merchant: MERCHANT_B,
      variant: VARIANT_QUOTABLE,
      quantity: 2,
      context: issueContext,
      now: issueNow,
      trustEnforcement: 'enforce',
    });

    const quoteStage = issuedRecord.stages['QUOTE'];
    const quoteResult = quoteStage?.['com.os.retailagent.shopping.quote'];
    const token = quoteResult?.output as QuoteToken | null;

    if (!token) {
      return {
        decisionRecord: issuedRecord,
        requestedContext: issueContext,
        summary: 'No QuoteToken issued — eligibility or pricing block prevented issue.',
      };
    }

    // STEP 2: Build validation context (optionally changed)
    const validateContext: PartialBuyerContext = changeContext
      ? {
          ...issueContext,
          membershipTier: membershipTier === 'gold' ? 'none' : 'gold', // flip tier
        }
      : issueContext;

    // STEP 3: Validate at checkout time
    const validation = validateQuote(
      {
        token,
        // validateContext is fully populated — cast to BuyerContext
        context: validateContext as BuyerContext,
        variant: VARIANT_QUOTABLE,
        merchant: MERCHANT_B,
      },
      validateNow,
    );

    const elapsedSeconds = nowOffsetSeconds;
    const zone =
      elapsedSeconds <= token.ttlSeconds
        ? 'within TTL'
        : elapsedSeconds <= token.ttlSeconds + (token.honorPolicy.graceSeconds ?? 0)
        ? 'in grace window'
        : 'past grace';

    const downgradeNote =
      trustMode === 'asserted' && membershipTier !== 'none'
        ? ` (trust=asserted: membershipTier downgraded to 'none' per §7.2 — token locked at base price)`
        : '';

    return {
      decisionRecord: issuedRecord,
      requestedContext: issueContext,
      quote: token,
      validation,
      summary:
        `Token issued at ${new Date(issueNow).toISOString()} for $${token.unitPrice.toFixed(2)}/unit. ` +
        `Validating ${elapsedSeconds}s later (${zone}). ` +
        `Context changed: ${changeContext}. ` +
        `Outcome: ${validation.outcome}. ` +
        `Reasons: [${validation.reasons.map(r => r.code).join(', ') || 'none'}].` +
        downgradeNote,
    };
  },
};
