/**
 * Recipe 0008 — Trust, Provenance & Freshness
 *
 * Demonstrates RAOS-0008 trust envelope behavior:
 *   1. TRUST_SIMULATED always prepended (crypto is simulated in v1)
 *   2. DATA_STALE when the evaluation envelope exceeds its TTL
 *   3. The envelope fields (issuer, keyId, signature, trustMode) are
 *      visible on the DecisionRecord for audit/debug purposes
 *
 * The `nowOffset` control moves time past the PRICE stage TTL (300s) to
 * trigger DATA_STALE. The `keyScenario` control switches between a valid key,
 * an expired key (showing KEY_EXPIRED path in validateQuote), and a rotated
 * key (showing key selection from merchant.manifest.keys[]).
 *
 * Real lib call: evaluateOffer (trust envelope is signed centrally by pipeline)
 *
 * NOTE: DATA_STALE in the DecisionRecord is currently only emitted by the
 * inventory evaluator (STOCK_STALE). The outer pipeline envelope TTL drives
 * the DecisionTrace.envelope.isStale flag — visible in the 0013 trace recipe.
 * This recipe focuses on the envelope field values and TRUST_SIMULATED reason.
 */

import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  MERCHANT_B,
  MERCHANT_B_EXPIRED_KEY,
  VARIANT_QUOTABLE,
  REFERENCE_NOW,
} from '../fixtures';
import type { PartialBuyerContext } from '@/lib/types/context';

const shownSource = `// RAOS-0008: Trust, Provenance & Freshness
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';

// The pipeline signs a provenance envelope centrally over the inputsHash.
// Each evaluator result also gets its own stage-TTL envelope.
const record = evaluateOffer({
  merchant, // manifest.keys[] provides keyId pool for signing
  variant,
  quantity: 1,
  context: { trust: { mode: 'asserted' } }, // 'asserted' | 'signed'
  now,
});

// Top-level envelope on the DecisionRecord:
// record.envelope = {
//   issuer: 'https://api.merchant.test',  // derived from merchant.endpoints.catalog
//   keyId: 'k1',                           // selected from manifest.keys[]
//   signature: 'sim:a1b2c3d4',             // SIMULATED — prefix 'sim:' marks this
//   trustMode: 'asserted',                 // always 'asserted' while crypto is simulated
//   computedAt: now,                       // Unix ms from injected now
//   ttlSeconds: 300,                       // PRICE stage TTL (most sensitive)
// }

// TRUST_SIMULATED is always prepended to record.reasons[]:
// { code: 'TRUST_SIMULATED', severity: 'INFO', source: 'com.os.retailagent.shopping.trust' }

// Key rotation: pipeline selects the first key in manifest.keys[]
// with validTo === null OR validTo > now.
// An expired key (validTo < now) produces KEY_EXPIRED in validateQuote.
`;

export const recipe: Recipe = {
  id: '0008-trust',
  specRef: 'RAOS-0008',
  title: 'Trust, Provenance & Freshness',
  specPageHref: '/specs/0008-trust-provenance',
  whatThisProves:
    'Every DecisionRecord carries a RAOS-0008 provenance envelope (issuer, keyId, simulated signature) and TRUST_SIMULATED is always emitted as an INFO reason. The envelope TTL and key rotation mechanics are visible in the output — the SIMULATED label prominently marks that crypto is not yet production-grade.',
  shownSource,

  controls: [
    {
      id: 'keyScenario',
      label: 'Key scenario',
      type: 'select',
      options: [
        { value: 'active', label: 'Active key (k1, no expiry) — normal path' },
        { value: 'rotated', label: 'Rotated keys (k1+k2) — k2 selected' },
        { value: 'expired', label: 'Expired key only — KEY_EXPIRED in validation' },
      ],
      defaultValue: 'active',
    },
    {
      id: 'trustMode',
      label: 'trust.mode on context',
      type: 'select',
      options: [
        { value: 'asserted', label: 'asserted — claims unverified' },
        { value: 'signed', label: 'signed — claims trusted' },
      ],
      defaultValue: 'asserted',
    },
    {
      id: 'nowOffsetSeconds',
      label: 'Time offset (seconds) — to test envelope age',
      type: 'number',
      min: 0,
      max: 600,
      step: 60,
      defaultValue: 0,
    },
  ],

  run(controlValues): RecipeResult {
    const keyScenario = controlValues['keyScenario'] as string;
    const trustMode = (controlValues['trustMode'] as string) as 'asserted' | 'signed';
    const nowOffsetSeconds = Number(controlValues['nowOffsetSeconds'] ?? 0);
    const now = REFERENCE_NOW + nowOffsetSeconds * 1000;

    // Select merchant based on key scenario
    const merchantMap = {
      active: MERCHANT_A,
      rotated: MERCHANT_B,         // has k1 + k2, k2 is active
      expired: MERCHANT_B_EXPIRED_KEY, // has only expired k_expired
    };
    const merchant = merchantMap[keyScenario as keyof typeof merchantMap] ?? MERCHANT_A;

    const context: PartialBuyerContext = {
      customerType: 'member',
      membershipTier: 'gold',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: trustMode },
    };

    const record = evaluateOffer({
      merchant,
      variant: VARIANT_QUOTABLE,
      quantity: 1,
      context,
      now,
      trustEnforcement: 'enforce',
    });

    const envelope = record.envelope;
    const trustSimulated = record.reasons.find(r => r.code === 'TRUST_SIMULATED');
    const envelopeAgeSeconds = envelope
      ? Math.floor((now - envelope.computedAt) / 1000)
      : null;
    const isStale = envelope
      ? envelopeAgeSeconds !== null && envelopeAgeSeconds > envelope.ttlSeconds
      : false;

    return {
      decisionRecord: record,
      summary:
        `Envelope: issuer=${envelope?.issuer ?? 'N/A'}, keyId=${envelope?.keyId ?? 'N/A'}, ` +
        `trustMode=${envelope?.trustMode ?? 'N/A'}, ttlSeconds=${envelope?.ttlSeconds ?? 'N/A'}. ` +
        `Signature prefix: ${envelope?.signature?.substring(0, 8) ?? 'N/A'}... ` +
        `(${envelope?.signature?.startsWith('sim:') ? 'SIMULATED' : 'real'}). ` +
        `TRUST_SIMULATED emitted: ${trustSimulated ? 'yes (INFO)' : 'no'}. ` +
        `Envelope age: ${envelopeAgeSeconds ?? 'N/A'}s, stale: ${isStale}.`,
    };
  },
};
