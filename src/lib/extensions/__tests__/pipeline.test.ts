/**
 * WP-01: Pipeline tests
 *
 * 1. A deliberately-throwing ELIGIBILITY evaluator degrades to a BLOCK-style
 *    result without crashing the pipeline.
 * 2. A deliberately-throwing PRICE (advisory) evaluator is omitted from
 *    results without crashing the pipeline.
 * 3. manifestSubset exclusion: if a capability is absent from the merchant's
 *    manifest, the pipeline skips that evaluator and documents the degraded
 *    result (the stage result simply won't contain that namespace's entry).
 * 4. A basic end-to-end smoke test using the registered WP-01 evaluators
 *    to verify the pipeline produces a DecisionRecord with correct shape.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  register,
  _clearRegistry,
} from '../registry';
import { evaluateOffer } from '../pipeline';
import type { UcpExtension, ExtensionResult } from '../contract';
import type { MerchantProfile, Variant } from '@/lib/types/core';
import type { PricingContext } from '@/lib/types/extensions';
import type { ReasonEntry } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_VARIANT: Variant = {
  id: 'v_test_001',
  sku: 'TEST-001',
  title: 'Test Variant',
  basePrice: 10.00,
  currency: 'USD',
};

const BASE_CONTEXT: PricingContext = {
  customerType: 'member',
  membershipTier: 'none',
  marketRegion: 'CA',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  activeExtensions: [],
};

const BASE_MERCHANT: MerchantProfile = {
  merchantId: 'm_test_001',
  merchantName: 'Test Merchant',
  protocolVersion: '1.0.0',
  endpoints: { catalog: '', cart: '', checkout: '' },
  // RAOS-0001 OQ-2 (2026-08-01): required field. Matches BASE_CONTEXT.marketRegion.
  servesRegions: ['CA'],
  // RAOS-0003 (2026-08-12): required field.
  timezone: 'UTC',
  capabilities: [],
  manifest: {
    protocol: '1.0',
    tier: 1,
    capabilities: [
      {
        id: 'ext.test.safety',
        name: 'Test Safety',
        namespace: 'com.ns.test.safety',
        version: '1.0.0',
        description: '',
        required: false,
        tier: 1,
      },
      {
        id: 'ext.test.advisory',
        name: 'Test Advisory',
        namespace: 'com.ns.test.advisory',
        version: '1.0.0',
        description: '',
        required: false,
        tier: 1,
      },
    ],
  },
};

/** Evaluator that always throws when evaluate() is called. */
function makeFakeThrowingEvaluator(
  namespace: string,
  stage: 'VISIBILITY' | 'ELIGIBILITY' | 'PRICE' | 'FULFILLMENT' | 'QUOTE',
  priority: number,
): UcpExtension<Record<string, never>, null> {
  return {
    namespace,
    version: '1.0.0',
    stage,
    priority,
    reasonCodes: [],
    readConfig(_variant: Variant) {
      // Always returns a config so evaluate() is called
      return {};
    },
    evaluate(): ExtensionResult<null> {
      throw new Error(`Deliberate test failure in ${namespace}`);
    },
  };
}

/** Evaluator that succeeds and returns a dummy result. */
function makeFakeSuccessEvaluator(
  namespace: string,
  stage: 'VISIBILITY' | 'ELIGIBILITY' | 'PRICE' | 'FULFILLMENT' | 'QUOTE',
  priority: number,
): UcpExtension<Record<string, never>, null> {
  return {
    namespace,
    version: '1.0.0',
    stage,
    priority,
    reasonCodes: [],
    readConfig(_variant: Variant) {
      return {};
    },
    evaluate(): ExtensionResult<null> {
      return {
        namespace,
        reasons: [
          {
            code: 'TEST_OK',
            message: `${namespace} ran successfully`,
            severity: 'INFO',
            blocking: false,
            source: namespace,
          },
        ],
        output: null,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  _clearRegistry();
});

afterEach(() => {
  _clearRegistry();
});

// ---------------------------------------------------------------------------
// 1. Safety-critical stage degradation (ELIGIBILITY throws)
// ---------------------------------------------------------------------------

describe('pipeline: safety-critical evaluator degradation', () => {
  it('a throwing ELIGIBILITY evaluator produces a BLOCK-style result, not a crash', () => {
    /**
     * Degrades per RAOS-0000 §7.3: ELIGIBILITY failures degrade to BLOCK.
     * The pipeline must NOT throw; it MUST include a PIPELINE_EVALUATOR_ERROR
     * reason with blocking=true in the DecisionRecord.
     */
    const throwingEvaluator = makeFakeThrowingEvaluator(
      'com.ns.test.safety',
      'ELIGIBILITY',
      10,
    );
    register(throwingEvaluator);

    // evaluateOffer must not throw
    let record;
    expect(() => {
      record = evaluateOffer({
        merchant: BASE_MERCHANT,
        variant: BASE_VARIANT,
        quantity: 1,
        context: BASE_CONTEXT,
        now: 0,
      });
    }).not.toThrow();

    // The record should have an ELIGIBILITY stage entry for the throwing evaluator
    const eligibilityStage = record!.stages['ELIGIBILITY'];
    expect(eligibilityStage).toBeDefined();

    const throwingResult = eligibilityStage!['com.ns.test.safety'];
    expect(throwingResult).toBeDefined();
    expect(throwingResult.reasons).toHaveLength(1);
    expect(throwingResult.reasons[0].code).toBe('PIPELINE_EVALUATOR_ERROR');
    expect(throwingResult.reasons[0].blocking).toBe(true);
    expect(throwingResult.reasons[0].message).toContain('Deliberate test failure');
  });

  it('PIPELINE_EVALUATOR_ERROR reason appears in the flat reasons list', () => {
    register(makeFakeThrowingEvaluator('com.ns.test.safety', 'ELIGIBILITY', 10));

    const record = evaluateOffer({
      merchant: BASE_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: BASE_CONTEXT,
      now: 0,
    });

    const errorReason = record.reasons.find(r => r.code === 'PIPELINE_EVALUATOR_ERROR');
    expect(errorReason).toBeDefined();
    expect(errorReason!.blocking).toBe(true);
    expect(errorReason!.source).toBe('com.ns.test.safety');
  });

  it('a throwing QUOTE evaluator also degrades to BLOCK', () => {
    const merchantWithQuote: MerchantProfile = {
      ...BASE_MERCHANT,
      manifest: {
        ...BASE_MERCHANT.manifest,
        capabilities: [
          ...BASE_MERCHANT.manifest.capabilities,
          {
            id: 'ext.test.quote',
            name: 'Test Quote',
            namespace: 'com.ns.test.quote',
            version: '1.0.0',
            description: '',
            required: false,
            tier: 2,
          },
        ],
      },
    };

    register(makeFakeThrowingEvaluator('com.ns.test.quote', 'QUOTE', 10));

    let record;
    expect(() => {
      record = evaluateOffer({
        merchant: merchantWithQuote,
        variant: BASE_VARIANT,
        quantity: 1,
        context: BASE_CONTEXT,
        now: 0,
      });
    }).not.toThrow();

    const quoteStage = record!.stages['QUOTE'];
    expect(quoteStage?.['com.ns.test.quote']?.reasons[0]?.code).toBe('PIPELINE_EVALUATOR_ERROR');
  });
});

// ---------------------------------------------------------------------------
// 2. Advisory stage degradation (PRICE throws)
// ---------------------------------------------------------------------------

describe('pipeline: advisory evaluator degradation', () => {
  it('a throwing PRICE evaluator is omitted without crashing', () => {
    /**
     * PRICE is an advisory stage. A throwing PRICE evaluator is omitted from
     * the DecisionRecord — the stage may have no entry for that namespace.
     * The pipeline must NOT throw.
     */
    const merchantWithAdvisory: MerchantProfile = {
      ...BASE_MERCHANT,
      manifest: {
        ...BASE_MERCHANT.manifest,
        capabilities: [
          {
            id: 'ext.test.advisory',
            name: 'Test Advisory',
            namespace: 'com.ns.test.advisory',
            version: '1.0.0',
            description: '',
            required: false,
            tier: 1,
          },
        ],
      },
    };

    register(makeFakeThrowingEvaluator('com.ns.test.advisory', 'PRICE', 10));

    let record;
    expect(() => {
      record = evaluateOffer({
        merchant: merchantWithAdvisory,
        variant: BASE_VARIANT,
        quantity: 1,
        context: BASE_CONTEXT,
        now: 0,
      });
    }).not.toThrow();

    // The throwing PRICE evaluator should NOT appear in stages (omitted, not degraded)
    const priceStage = record!.stages['PRICE'];
    // Either the stage is undefined (no results) or the throwing evaluator is absent
    if (priceStage) {
      expect(priceStage['com.ns.test.advisory']).toBeUndefined();
    }

    // No PIPELINE_EVALUATOR_ERROR in the reasons list (advisory → omit, not BLOCK)
    const errorReason = record!.reasons.find((r: ReasonEntry) => r.code === 'PIPELINE_EVALUATOR_ERROR');
    expect(errorReason).toBeUndefined();
  });

  it('a throwing VISIBILITY evaluator is omitted without crashing', () => {
    const merchantWithVisibility: MerchantProfile = {
      ...BASE_MERCHANT,
      manifest: {
        ...BASE_MERCHANT.manifest,
        capabilities: [
          {
            id: 'ext.test.safety',
            name: 'Test Safety Vis',
            namespace: 'com.ns.test.safety',
            version: '1.0.0',
            description: '',
            required: false,
            tier: 1,
          },
        ],
      },
    };

    register(makeFakeThrowingEvaluator('com.ns.test.safety', 'VISIBILITY', 10));

    expect(() => {
      evaluateOffer({
        merchant: merchantWithVisibility,
        variant: BASE_VARIANT,
        quantity: 1,
        context: BASE_CONTEXT,
        now: 0,
      });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3. manifestSubset exclusion
// ---------------------------------------------------------------------------

describe('pipeline: manifestSubset exclusion', () => {
  it('an evaluator not in the merchant manifest is not run', () => {
    /**
     * Registered globally, but NOT in this merchant's manifest.capabilities[].
     * The pipeline must skip it — the stage result will not contain its namespace.
     */
    const NOT_IN_MANIFEST_NS = 'com.ns.not_in_manifest';
    register(makeFakeSuccessEvaluator(NOT_IN_MANIFEST_NS, 'ELIGIBILITY', 10));

    // Merchant manifest does NOT list NOT_IN_MANIFEST_NS
    const merchantNoMatch: MerchantProfile = {
      ...BASE_MERCHANT,
      manifest: {
        protocol: '1.0',
        tier: 1,
        capabilities: [], // empty — no evaluators enabled
      },
    };

    const record = evaluateOffer({
      merchant: merchantNoMatch,
      variant: BASE_VARIANT,
      quantity: 1,
      context: BASE_CONTEXT,
      now: 0,
    });

    // The excluded evaluator must not appear in any stage result
    for (const stageResult of Object.values(record.stages)) {
      if (stageResult) {
        expect(Object.keys(stageResult)).not.toContain(NOT_IN_MANIFEST_NS);
      }
    }

    // No reasons from the excluded evaluator
    const excludedReasons = record.reasons.filter(r => r.source === NOT_IN_MANIFEST_NS);
    expect(excludedReasons).toHaveLength(0);
  });

  it('skipping an excluded capability is documented by its absence in stages (degraded but not crashing)', () => {
    /**
     * This is the "documented degraded result" acceptance criterion from WP-01:
     * "manifestSubset excludes a capability → pipeline skips that evaluator
     * with a documented degraded result."
     *
     * The "documentation" is structural: the stage map simply does not contain
     * an entry for the excluded evaluator's namespace. There is no
     * CAPABILITY_EXCLUDED reason code (that would change the output). The
     * absence is the contract.
     */
    const INCLUDED_NS = 'com.ns.included';
    const EXCLUDED_NS = 'com.ns.excluded';

    register(makeFakeSuccessEvaluator(INCLUDED_NS, 'ELIGIBILITY', 10));
    register(makeFakeSuccessEvaluator(EXCLUDED_NS, 'ELIGIBILITY', 20));

    const merchantIncludeOnly: MerchantProfile = {
      ...BASE_MERCHANT,
      manifest: {
        protocol: '1.0',
        tier: 1,
        capabilities: [
          {
            id: 'ext.included',
            name: 'Included',
            namespace: INCLUDED_NS,
            version: '1.0.0',
            description: '',
            required: false,
            tier: 1,
          },
          // EXCLUDED_NS is NOT listed
        ],
      },
    };

    const record = evaluateOffer({
      merchant: merchantIncludeOnly,
      variant: BASE_VARIANT,
      quantity: 1,
      context: BASE_CONTEXT,
      now: 0,
    });

    const eligibilityStage = record.stages['ELIGIBILITY'];
    expect(eligibilityStage).toBeDefined();
    // Included evaluator ran
    expect(eligibilityStage![INCLUDED_NS]).toBeDefined();
    // Excluded evaluator did NOT run
    expect(eligibilityStage![EXCLUDED_NS]).toBeUndefined();

    // Reasons only from included evaluator
    const reasons = record.reasons.map(r => r.source);
    expect(reasons).toContain(INCLUDED_NS);
    expect(reasons).not.toContain(EXCLUDED_NS);
  });
});

// ---------------------------------------------------------------------------
// 4. DecisionRecord shape
// ---------------------------------------------------------------------------

describe('pipeline: DecisionRecord shape', () => {
  it('DecisionRecord has the required fields', () => {
    register(makeFakeSuccessEvaluator('com.ns.test.safety', 'ELIGIBILITY', 10));

    const record = evaluateOffer({
      merchant: BASE_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: BASE_CONTEXT,
      now: 42,
    });

    expect(record).toHaveProperty('inputsHash');
    expect(typeof record.inputsHash).toBe('string');
    expect(record.inputsHash.length).toBeGreaterThan(0);

    expect(record).toHaveProperty('stages');
    expect(record).toHaveProperty('reasons');
    expect(Array.isArray(record.reasons)).toBe(true);

    expect(record).toHaveProperty('computedAt');
    expect(record.computedAt).toBe(42);
  });

  it('computedAt reflects the injected now, not wall-clock time', () => {
    register(makeFakeSuccessEvaluator('com.ns.test.safety', 'ELIGIBILITY', 10));

    const now = 1_700_000_000_000;
    const record = evaluateOffer({
      merchant: BASE_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: BASE_CONTEXT,
      now,
    });

    expect(record.computedAt).toBe(now);
  });

  it('same inputs → same inputsHash (determinism)', () => {
    register(makeFakeSuccessEvaluator('com.ns.test.safety', 'ELIGIBILITY', 10));

    const args = {
      merchant: BASE_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 5,
      context: BASE_CONTEXT,
      now: 0,
    };

    const hash1 = evaluateOffer(args).inputsHash;
    const hash2 = evaluateOffer(args).inputsHash;

    expect(hash1).toBe(hash2);
  });

  it('different quantity → different inputsHash', () => {
    register(makeFakeSuccessEvaluator('com.ns.test.safety', 'ELIGIBILITY', 10));

    const base = {
      merchant: BASE_MERCHANT,
      variant: BASE_VARIANT,
      context: BASE_CONTEXT,
      now: 0,
    };

    const hash1 = evaluateOffer({ ...base, quantity: 1 }).inputsHash;
    const hash2 = evaluateOffer({ ...base, quantity: 2 }).inputsHash;

    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// RAOS-0001 OQ-2 (2026-08-01): merchant region allowlist short-circuit.
//
// Asserted against evaluateOffer directly — NOT against checkServesRegion in
// isolation. Isolation testing (calling checkServesRegion but never
// evaluateOffer) is exactly what let the original defect hide for a month:
// the audit proved evaluateOffer alone did not block a GB buyer even though
// checkServesRegion, called in isolation, worked correctly the whole time.
// See specs/reference-implementation/thecustomhub/04-pilot-evidence.md §8 OQ-2.
// ---------------------------------------------------------------------------

describe('pipeline: region allowlist (RAOS-0001 OQ-2)', () => {
  const REGION_MERCHANT: MerchantProfile = {
    ...BASE_MERCHANT,
    servesRegions: ['US', 'CA'],
  };

  function regionContext(marketRegion: string) {
    return { ...BASE_CONTEXT, marketRegion };
  }

  it('guest/US is eligible — no REGION_RESTRICTED reason from the allowlist gate', () => {
    const record = evaluateOffer({
      merchant: REGION_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: regionContext('US'),
      now: 0,
    });

    expect(record.reasons.map(r => r.code)).not.toContain('REGION_RESTRICTED');
  });

  it('guest/CA is eligible — no REGION_RESTRICTED reason from the allowlist gate', () => {
    const record = evaluateOffer({
      merchant: REGION_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: regionContext('CA'),
      now: 0,
    });

    expect(record.reasons.map(r => r.code)).not.toContain('REGION_RESTRICTED');
  });

  it('guest/GB is blocked — evaluateOffer alone emits REGION_RESTRICTED, no per-variant stages run', () => {
    const record = evaluateOffer({
      merchant: REGION_MERCHANT,
      variant: BASE_VARIANT,
      quantity: 1,
      context: regionContext('GB'),
      now: 0,
    });

    const regionReason = record.reasons.find(r => r.code === 'REGION_RESTRICTED');
    expect(regionReason).toBeDefined();
    expect(regionReason?.severity).toBe('BLOCK');
    expect(regionReason?.source).toBe('com.os.retailagent.shopping.eligibility');
    // Short-circuit before the per-variant evaluator chain: no stage ran.
    expect(record.stages).toEqual({});
  });

  it('a declared-empty servesRegions ([]) blocks every region, including one that would otherwise be served', () => {
    const record = evaluateOffer({
      merchant: { ...BASE_MERCHANT, servesRegions: [] },
      variant: BASE_VARIANT,
      quantity: 1,
      context: regionContext('CA'),
      now: 0,
    });

    expect(record.reasons.map(r => r.code)).toContain('REGION_RESTRICTED');
    expect(record.stages).toEqual({});
  });

  it('an undeclared servesRegions (JS/JSON backstop path) does not block', () => {
    const { servesRegions: _omit, ...merchantWithoutServesRegions } = BASE_MERCHANT;
    const record = evaluateOffer({
      merchant: merchantWithoutServesRegions as MerchantProfile,
      variant: BASE_VARIANT,
      quantity: 1,
      context: regionContext('GB'),
      now: 0,
    });

    expect(record.reasons.map(r => r.code)).not.toContain('REGION_RESTRICTED');
  });
});
