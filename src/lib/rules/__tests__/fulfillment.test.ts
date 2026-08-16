/**
 * RAOS-0003 · Fulfillment Feasibility — unit + edge-case tests
 *
 * Covers every reason code (including LEAD_TIME_EXCEEDS_NEED_BY and
 * CUTOFF_PASSED, which cannot appear in the static golden fixture grid —
 * see RAOS_0003_SYNTHETIC_ONLY_CODES) and the precedence rule from
 * specs/0003-fulfillment.md §3 ("first-blocking-stage governs").
 *
 * Tests are pure-function: no DOM, no network, no Date.now()/new Date().
 * All timestamps are hardcoded epoch-ms literals computed once and pinned
 * here in a comment, so the test file itself stays determinism-clean.
 */

import { describe, it, expect } from 'vitest';
import { evaluateFulfillmentFeasibility } from '@/lib/rules/fulfillment';
import { evaluateOffer } from '@/lib/extensions/pipeline';
import '@/lib/extensions/index'; // self-register evaluators
import type { Variant, MerchantProfile } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { FulfillmentConstraints } from '@/lib/types/extensions';

// ---------------------------------------------------------------------------
// Fixed timestamps (merchant timezone: America/New_York for all cutoff/
// lead-time cases below)
//
//   NOW_BEFORE_CUTOFF = 1768496400000  → 2026-01-15 12:00 America/New_York
//   NOW_AFTER_CUTOFF  = 1768507200000  → 2026-01-15 15:00 America/New_York
//   NOW_FOR_LEAD_TIME = 1768046400000  → 2026-01-10 07:00 America/New_York
//     (merchant-local CALENDAR DATE is 2026-01-10 regardless of the hour)
// ---------------------------------------------------------------------------

const NOW_BEFORE_CUTOFF = 1768496400000;
const NOW_AFTER_CUTOFF = 1768507200000;
const NOW_FOR_LEAD_TIME = 1768046400000;
const NY_TZ = 'America/New_York';

const baseContext: BuyerContext = {
  customerType: 'guest',
  loyaltyTier: 'guest',
  membershipTier: 'none',
  marketRegion: 'US',
  fulfillmentMode: 'shipping',
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

function makeVariant(fulfillmentConstraints?: FulfillmentConstraints): Variant {
  return {
    id: 'v_test_fulfillment',
    sku: 'TEST-FULFILLMENT',
    title: 'Test Variant',
    basePrice: 20.0,
    currency: 'USD',
    fulfillmentConstraints,
  };
}

describe('evaluateFulfillmentFeasibility — variants without fulfillmentConstraints', () => {
  it('is FEASIBLE with no reasons, preserving pre-RAOS-0003 implicit behavior', () => {
    const result = evaluateFulfillmentFeasibility({
      variant: makeVariant(undefined),
      context: baseContext,
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility).toEqual({ status: 'FEASIBLE', reasons: [] });
    expect(result.reasons).toHaveLength(0);
  });
});

describe('evaluateFulfillmentFeasibility — FULFILLMENT_MODE_UNAVAILABLE', () => {
  it('blocks when the buyer fulfillmentMode is not in availableModes', () => {
    const v = makeVariant({ availableModes: ['pickup', 'local_delivery'] });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'shipping' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['FULFILLMENT_MODE_UNAVAILABLE']);
    expect(result.reasons[0].severity).toBe('BLOCK');
    expect(result.reasons[0].requirements).toBeUndefined();
    expect(result.reasons[0].source).toBe('com.os.retailagent.shopping.fulfillment_constraints');
  });

  it('is FEASIBLE when the buyer fulfillmentMode is in availableModes', () => {
    const v = makeVariant({ availableModes: ['pickup', 'local_delivery'] });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'pickup' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });
});

describe('evaluateFulfillmentFeasibility — REGION_NOT_SERVED', () => {
  it('blocks when the buyer marketRegion is in restrictedRegions', () => {
    const v = makeVariant({ restrictedRegions: ['HI', 'AK'] });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, marketRegion: 'HI' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['REGION_NOT_SERVED']);
    expect(result.reasons[0].message).toContain('HI');
  });

  it('is a distinct code from RAOS-0001 REGION_RESTRICTED — never emits that code', () => {
    const v = makeVariant({ restrictedRegions: ['HI'] });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, marketRegion: 'HI' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.reasons.map(r => r.code)).not.toContain('REGION_RESTRICTED');
  });
});

describe('evaluateFulfillmentFeasibility — HAZMAT_RESTRICTION', () => {
  it('blocks hazmat items when fulfillmentMode is shipping', () => {
    const v = makeVariant({ hazmat: true });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'shipping' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['HAZMAT_RESTRICTION']);
  });

  it('does not block hazmat items for pickup or local_delivery', () => {
    const v = makeVariant({ hazmat: true });
    for (const mode of ['pickup', 'local_delivery'] as const) {
      const result = evaluateFulfillmentFeasibility({
        variant: v,
        context: { ...baseContext, fulfillmentMode: mode },
        now: 0,
        merchantTimezone: 'UTC',
      });
      expect(result.feasibility.status).toBe('FEASIBLE');
    }
  });
});

describe('evaluateFulfillmentFeasibility — OVERSIZE_RESTRICTION', () => {
  it('blocks oversize items when fulfillmentMode is shipping', () => {
    const v = makeVariant({ oversize: true });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'shipping' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['OVERSIZE_RESTRICTION']);
  });

  it('does not block oversize items for pickup', () => {
    const v = makeVariant({ oversize: true });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'pickup' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });
});

describe('evaluateFulfillmentFeasibility — LEAD_TIME_EXCEEDS_NEED_BY (synthetic-only)', () => {
  it('blocks when today + leadTimeDays (merchant-local) is later than needByDate', () => {
    // Merchant-local "today" at NOW_FOR_LEAD_TIME is 2026-01-10; +3 days = 2026-01-13.
    const v = makeVariant({ leadTimeDays: 3 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, needByDate: '2026-01-12' },
      now: NOW_FOR_LEAD_TIME,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['LEAD_TIME_EXCEEDS_NEED_BY']);
  });

  it('does not block when needByDate is on or after the earliest fulfillable date', () => {
    const v = makeVariant({ leadTimeDays: 3 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, needByDate: '2026-01-13' },
      now: NOW_FOR_LEAD_TIME,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });

  it('ABSENT needByDate NEVER blocks — the deliberate exception to most-restrictive defaulting (RAOS-0000 §4.3/§13)', () => {
    const v = makeVariant({ leadTimeDays: 30 }); // a long lead time that would obviously exceed any near-term need-by
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, needByDate: undefined },
      now: NOW_FOR_LEAD_TIME,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('degrades gracefully (no throw, no false block) on an unparseable needByDate', () => {
    const v = makeVariant({ leadTimeDays: 3 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, needByDate: 'not-a-date' },
      now: NOW_FOR_LEAD_TIME,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });
});

describe('evaluateFulfillmentFeasibility — CUTOFF_PASSED (synthetic-only)', () => {
  it('blocks pickup after the merchant-local cutoff hour', () => {
    const v = makeVariant({ cutoffHourLocal: 14 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'pickup' },
      now: NOW_AFTER_CUTOFF, // 15:00 local
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('BLOCKED');
    expect(result.reasons.map(r => r.code)).toEqual(['CUTOFF_PASSED']);
  });

  it('blocks local_delivery after the merchant-local cutoff hour', () => {
    const v = makeVariant({ cutoffHourLocal: 14 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'local_delivery' },
      now: NOW_AFTER_CUTOFF,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('BLOCKED');
  });

  it('does not block before the cutoff hour', () => {
    const v = makeVariant({ cutoffHourLocal: 14 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'pickup' },
      now: NOW_BEFORE_CUTOFF, // 12:00 local
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });

  it('does not apply to shipping — cutoff is a same-day-fulfillment concept only', () => {
    const v = makeVariant({ cutoffHourLocal: 14 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'shipping' },
      now: NOW_AFTER_CUTOFF,
      merchantTimezone: NY_TZ,
    });
    expect(result.feasibility.status).toBe('FEASIBLE');
  });

  it('degrades gracefully (no throw) on an unsupported timezone identifier', () => {
    const v = makeVariant({ cutoffHourLocal: 14 });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'pickup' },
      now: NOW_AFTER_CUTOFF,
      merchantTimezone: 'Not/A_Real_Zone',
    });
    expect(result.feasibility.status).toBe('FEASIBLE'); // omitted, not blocked
  });
});

describe('evaluateFulfillmentFeasibility — multiple reasons accumulate in one pass', () => {
  it('a hazmat + region-restricted variant, shipped to a restricted region, emits BOTH codes', () => {
    const v = makeVariant({ hazmat: true, restrictedRegions: ['HI'] });
    const result = evaluateFulfillmentFeasibility({
      variant: v,
      context: { ...baseContext, fulfillmentMode: 'shipping', marketRegion: 'HI' },
      now: 0,
      merchantTimezone: 'UTC',
    });
    const codes = result.reasons.map(r => r.code).sort();
    expect(codes).toEqual(['HAZMAT_RESTRICTION', 'REGION_NOT_SERVED'].sort());
  });
});

// ---------------------------------------------------------------------------
// Precedence rule (specs/0003-fulfillment.md §3): "first-blocking-stage
// governs." STAGE_ORDER is
// VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE
// (contract.ts — see its doc comment for the full architectural decision):
// FEASIBILITY moved to run BEFORE PRICE (the brief's core complaint — see
// specs/0003-fulfillment.md §2), but AFTER ELIGIBILITY, unchanged from its
// original relative position. So when an item is blocked by BOTH an
// eligibility rule and a fulfillment rule, the ELIGIBILITY reason is the one
// that appears FIRST in DecisionRecord.reasons — which is what
// src/lib/trace/derive.ts's `governingReason` picks (firstBlock in reasons
// order). Both reasons still fire; only which one governs the buyer-facing
// explanation changes. "Who is allowed to buy this at all" governs over
// "can we get it to this specific buyer" when both are true — a defensible,
// documented choice, not an accident of insertion order.
// ---------------------------------------------------------------------------

describe('evaluateOffer — ELIGIBILITY precedence over FEASIBILITY (RAOS-0003 §3)', () => {
  const merchant: MerchantProfile = {
    merchantId: 'm_precedence_test',
    merchantName: 'Precedence Test Merchant',
    protocolVersion: '1.0.0',
    endpoints: { catalog: '', cart: '', checkout: '' },
    servesRegions: ['US'],
    timezone: 'UTC',
    capabilities: [],
    manifest: {
      protocol: '1.0',
      tier: 1,
      capabilities: [
        { id: 'ext.visibility', name: 'v', namespace: 'com.os.retailagent.shopping.visibility', version: '1.0.0', description: '', required: true, tier: 0 },
        { id: 'ext.eligibility', name: 'e', namespace: 'com.os.retailagent.shopping.eligibility', version: '1.0.0', description: '', required: true, tier: 1 },
        { id: 'ext.fulfillment', name: 'f', namespace: 'com.os.retailagent.shopping.fulfillment_constraints', version: '1.0.0', description: '', required: true, tier: 1 },
      ],
    },
  };

  const variant: Variant = {
    id: 'v_precedence',
    sku: 'PRECEDENCE-SKU',
    title: 'Precedence Test Variant',
    basePrice: 50,
    currency: 'USD',
    // Eligibility-BLOCKED: requires a tier the buyer doesn't have AND has no
    // requirements[] path (requireWholesale, unmet). Feasibility-BLOCKED:
    // fulfillment mode mismatch.
    eligibilityRules: { requireWholesale: true },
    fulfillmentConstraints: { availableModes: ['pickup'] },
  };

  it('both stages emit a BLOCK reason, and ELIGIBILITY (earlier in STAGE_ORDER) appears first and governs', () => {
    const record = evaluateOffer({
      merchant,
      variant,
      quantity: 1,
      context: { ...baseContext, customerType: 'guest', fulfillmentMode: 'shipping' },
      now: 0,
    });

    const blockReasons = record.reasons.filter(r => r.severity === 'BLOCK');
    expect(blockReasons.map(r => r.code)).toEqual(
      expect.arrayContaining(['FULFILLMENT_MODE_UNAVAILABLE', 'WHOLESALE_ONLY']),
    );
    // The FIRST block reason overall governs the explanation (trace/derive.ts).
    const firstBlock = record.reasons.find(r => r.severity === 'BLOCK');
    expect(firstBlock?.code).toBe('WHOLESALE_ONLY');
    expect(firstBlock?.source).toBe('com.os.retailagent.shopping.eligibility');
  });
});
