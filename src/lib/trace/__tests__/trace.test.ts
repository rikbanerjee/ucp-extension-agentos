/**
 * RAOS-0013 (part 1) · Decision Trace — unit tests
 *
 * Uses synthetic DecisionRecord-shaped objects. Does NOT invoke evaluateOffer
 * so these tests stay isolated from the pipeline (fast, no registry side effects).
 *
 * Test plan:
 *  1. buildDecisionTrace: overallStatus derivation for BLOCK / CONDITION / PASS
 *  2. buildDecisionTrace: governingReason selects first BLOCK, not first reason
 *  3. renderDeveloperTrace: round-trips (parse → re-render === original)
 *  4. renderDeveloperTrace: keys are alphabetically stable at top level + nested
 *  5. renderMerchantTrace: only BLOCK/CONDITION reasons, no INFO
 *  6. renderMerchantTrace: does not leak internal fields
 *  7. renderBuyerTrace: deny-list — no forbidden fields in output
 *  8. renderBuyerTrace: PASS trace → canPurchase:true, headline "Available for purchase"
 *  9. renderBuyerTrace: BLOCK trace → canPurchase:false
 * 10. renderMerchantTrace: actionHint for every RAOS-0001 and RAOS-0002 reason code
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../derive';
import {
  renderDeveloperTrace,
  renderMerchantTrace,
  renderBuyerTrace,
  BUYER_DENY_LIST,
} from '../render';
import type { DecisionRecord } from '@/lib/extensions/pipeline';
import type { PipelineStage } from '@/lib/extensions/contract';
import {
  RAOS_0001_REASON_CODES,
  RAOS_0002_REASON_CODES,
} from '@/lib/rules/__tests__/helpers/reasonCodeCoverage';
import type { AttributedReasonEntry } from '@/lib/extensions/pipeline';

// ---------------------------------------------------------------------------
// Synthetic DecisionRecord factory
// ---------------------------------------------------------------------------

type SyntheticReason = {
  code: string;
  message: string;
  severity: 'BLOCK' | 'CONDITION' | 'INFO';
  blocking: boolean;
  source: string;
  requirements?: Array<{
    type: 'customer_type' | 'membership_tier' | 'tax_exempt' | 'resale_certificate' | 'moq' | 'quantity_increment';
    value: string;
    message?: string;
  }>;
};

function makeSyntheticRecord(
  reasons: SyntheticReason[],
  opts: {
    inputsHash?: string;
    computedAt?: number;
  } = {},
): DecisionRecord {
  const inputsHash = opts.inputsHash ?? 'aabbccdd';
  const computedAt = opts.computedAt ?? 0;

  // Build a minimal stages map — put reasons into the ELIGIBILITY stage
  const stages: DecisionRecord['stages'] = {};
  if (reasons.length > 0) {
    stages['ELIGIBILITY'] = {
      'com.os.retailagent.shopping.eligibility': {
        namespace: 'com.os.retailagent.shopping.eligibility',
        reasons: reasons as unknown as AttributedReasonEntry[],
        output: null,
      },
    };
  }

  return {
    inputsHash,
    computedAt,
    stages,
    reasons: reasons as AttributedReasonEntry[],
    normalizedContext: {
      customerType: 'guest',
      loyaltyTier: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    },
    envelope: {
      issuer: 'https://test.merchant.example',
      keyId: 'k1',
      signature: 'sim:00000001',
      trustMode: 'asserted',
      computedAt,
      ttlSeconds: 300,
    },
  };
}

// ---------------------------------------------------------------------------
// Synthetic reasons
// ---------------------------------------------------------------------------

const BLOCK_REASON: SyntheticReason = {
  code: 'TIER_RESTRICTION',
  message: 'This item requires gold membership tier.',
  severity: 'BLOCK',
  blocking: true,
  source: 'com.os.retailagent.shopping.eligibility',
  requirements: [{ type: 'membership_tier', value: 'gold' }],
};

const CONDITION_REASON: SyntheticReason = {
  code: 'RESALE_CERTIFICATE_REQUIRED',
  message: 'Resale certificate is required.',
  severity: 'CONDITION',
  blocking: true,
  source: 'com.os.retailagent.shopping.eligibility',
  requirements: [{ type: 'resale_certificate', value: 'true' }],
};

const INFO_REASON: SyntheticReason = {
  code: 'TRUST_SIMULATED',
  message: 'Simulated trust envelope.',
  severity: 'INFO',
  blocking: false,
  source: 'com.os.retailagent.shopping.trust',
};

const SECOND_BLOCK_REASON: SyntheticReason = {
  code: 'WHOLESALE_ONLY',
  message: 'Only available to wholesale customers.',
  severity: 'BLOCK',
  blocking: true,
  source: 'com.os.retailagent.shopping.eligibility',
};

// ---------------------------------------------------------------------------
// 1. buildDecisionTrace: overallStatus derivation
// ---------------------------------------------------------------------------

describe('buildDecisionTrace — offerStatus derivation', () => {
  it('derives BLOCKED when there is a BLOCK reason without resolution', () => {
    const record = makeSyntheticRecord([SECOND_BLOCK_REASON, INFO_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.offerStatus).toBe('BLOCKED');
    expect(trace.isTransactable).toBe(false);
  });

  it('derives CONDITIONAL when there is a BLOCK reason with a resolution path', () => {
    // BLOCK + requirements[] = CONDITIONAL per RAOS-0000 §8.1
    const record = makeSyntheticRecord([BLOCK_REASON, INFO_REASON]);
    const trace = buildDecisionTrace(record);
    // BLOCK with requirements[] → CONDITIONAL
    expect(trace.offerStatus).toBe('CONDITIONAL');
    expect(trace.isTransactable).toBe(true);
  });

  it('derives ELIGIBLE when all reasons are INFO', () => {
    const record = makeSyntheticRecord([INFO_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.offerStatus).toBe('ELIGIBLE');
    expect(trace.isTransactable).toBe(true);
  });

  it('derives ELIGIBLE when reasons list is empty', () => {
    const record = makeSyntheticRecord([]);
    const trace = buildDecisionTrace(record);
    expect(trace.offerStatus).toBe('ELIGIBLE');
    expect(trace.isTransactable).toBe(true);
  });

  it('derives CONDITIONAL when there is only a CONDITION reason', () => {
    const record = makeSyntheticRecord([CONDITION_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.offerStatus).toBe('CONDITIONAL');
  });
});

// ---------------------------------------------------------------------------
// 2. buildDecisionTrace: governingReason selects first BLOCK, not first reason
// ---------------------------------------------------------------------------

describe('buildDecisionTrace — governingReason selection', () => {
  it('selects first BLOCK even when preceded by INFO', () => {
    // INFO appears first in reasons array, then BLOCK
    const record = makeSyntheticRecord([INFO_REASON, SECOND_BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.governingReason).not.toBeNull();
    expect(trace.governingReason?.reason.code).toBe('WHOLESALE_ONLY');
    expect(trace.governingReason?.reason.severity).toBe('BLOCK');
  });

  it('selects first BLOCK, not second BLOCK', () => {
    const record = makeSyntheticRecord([SECOND_BLOCK_REASON, BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.governingReason?.reason.code).toBe('WHOLESALE_ONLY');
  });

  it('falls back to first CONDITION when no BLOCK exists', () => {
    const record = makeSyntheticRecord([INFO_REASON, CONDITION_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.governingReason?.reason.code).toBe('RESALE_CERTIFICATE_REQUIRED');
    expect(trace.governingReason?.reason.severity).toBe('CONDITION');
  });

  it('returns null governingReason when only INFO reasons exist', () => {
    const record = makeSyntheticRecord([INFO_REASON]);
    const trace = buildDecisionTrace(record);
    expect(trace.governingReason).toBeNull();
  });

  it('includes resolutionPath from requirements', () => {
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    // BLOCK_REASON has requirements[type='membership_tier', value='gold']
    expect(trace.governingReason?.resolutionPath).toBeTruthy();
    expect(trace.governingReason?.resolutionPath).toContain('gold');
  });
});

// ---------------------------------------------------------------------------
// 3 & 4. renderDeveloperTrace: round-trip and key stability
// ---------------------------------------------------------------------------

describe('renderDeveloperTrace', () => {
  it('round-trips: parse → re-render produces identical output', () => {
    const record = makeSyntheticRecord([BLOCK_REASON, INFO_REASON]);
    const trace = buildDecisionTrace(record);
    const rendered = renderDeveloperTrace(trace);
    // Parse the JSON and re-render — must be identical
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reparsed = JSON.parse(rendered) as any;
    const rerendered = renderDeveloperTrace(reparsed);
    expect(rerendered).toBe(rendered);
  });

  it('top-level keys are in alphabetical order', () => {
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const rendered = renderDeveloperTrace(trace);
    const parsed = JSON.parse(rendered) as Record<string, unknown>;
    const keys = Object.keys(parsed);
    const sortedCopy = [...keys].sort();
    expect(keys).toEqual(sortedCopy);
  });

  it('nested object keys are in alphabetical order', () => {
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const rendered = renderDeveloperTrace(trace);
    const parsed = JSON.parse(rendered) as {
      governingReason?: Record<string, unknown>;
    };
    if (parsed.governingReason && typeof parsed.governingReason === 'object') {
      const nestedKeys = Object.keys(parsed.governingReason);
      expect(nestedKeys).toEqual([...nestedKeys].sort());
    }
  });

  it('includes traceSchema field', () => {
    const record = makeSyntheticRecord([]);
    const trace = buildDecisionTrace(record);
    const parsed = JSON.parse(renderDeveloperTrace(trace)) as { traceSchema?: string };
    expect(parsed.traceSchema).toBe('1.0.0');
  });

  it('includes inputsHash field', () => {
    const record = makeSyntheticRecord([], { inputsHash: 'deadbeef' });
    const trace = buildDecisionTrace(record);
    const parsed = JSON.parse(renderDeveloperTrace(trace)) as { inputsHash?: string };
    expect(parsed.inputsHash).toBe('deadbeef');
  });
});

// ---------------------------------------------------------------------------
// 5 & 6. renderMerchantTrace: filtering + no internal fields leaked
// ---------------------------------------------------------------------------

describe('renderMerchantTrace', () => {
  it('only includes BLOCK and CONDITION reasons, not INFO', () => {
    const record = makeSyntheticRecord([
      BLOCK_REASON,
      INFO_REASON,
      CONDITION_REASON,
    ]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    // Should have exactly 2 rows (BLOCK + CONDITION), not INFO
    // (unless the PASS row is returned — but there are actionable reasons here)
    const codes = rows.map(r => r.code);
    expect(codes).not.toContain('TRUST_SIMULATED');
    expect(codes).toContain('TIER_RESTRICTION');
    expect(codes).toContain('RESALE_CERTIFICATE_REQUIRED');
  });

  it('returns a PASS row when there are no actionable reasons', () => {
    const record = makeSyntheticRecord([INFO_REASON]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PASS');
    expect(rows[0].code).toBe('NO_ISSUES');
  });

  it('does not leak floor, margin, inputsHash, signature, or keyId', () => {
    const record = makeSyntheticRecord([BLOCK_REASON, CONDITION_REASON]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    const output = JSON.stringify(rows);
    const forbidden = ['floor', 'margin', 'inputsHash', 'signature', 'keyId'];
    for (const field of forbidden) {
      expect(output, `renderMerchantTrace leaked '${field}'`).not.toContain(`"${field}"`);
    }
  });

  it('does not expose cost field', () => {
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    const output = JSON.stringify(rows);
    expect(output).not.toContain('"cost"');
  });

  it('each row has stage, status, code, message, actionHint fields', () => {
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    for (const row of rows) {
      expect(row).toHaveProperty('stage');
      expect(row).toHaveProperty('status');
      expect(row).toHaveProperty('code');
      expect(row).toHaveProperty('message');
      expect(row).toHaveProperty('actionHint');
    }
  });
});

// ---------------------------------------------------------------------------
// 7. renderBuyerTrace: deny-list enforcement
// ---------------------------------------------------------------------------

describe('renderBuyerTrace — deny-list', () => {
  it('output does not contain any deny-list field names as JSON keys', () => {
    const record = makeSyntheticRecord([BLOCK_REASON, CONDITION_REASON, INFO_REASON]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    const output = JSON.stringify(result);
    for (const field of BUYER_DENY_LIST) {
      // Check that none of the deny-list strings appear as JSON object keys
      expect(
        output,
        `renderBuyerTrace leaked deny-list field: "${field}"`,
      ).not.toContain(`"${field}"`);
    }
  });

  it('deny-list check holds for a PASS trace too', () => {
    const record = makeSyntheticRecord([INFO_REASON]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    const output = JSON.stringify(result);
    for (const field of BUYER_DENY_LIST) {
      expect(output, `renderBuyerTrace leaked "${field}" on PASS trace`).not.toContain(`"${field}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. renderBuyerTrace: PASS trace
// ---------------------------------------------------------------------------

describe('renderBuyerTrace — PASS trace', () => {
  it('returns canPurchase:true and headline "Available for purchase"', () => {
    const record = makeSyntheticRecord([INFO_REASON]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    expect(result.canPurchase).toBe(true);
    expect(result.headline).toBe('Available for purchase');
  });

  it('returns canPurchase:true for empty reasons', () => {
    const record = makeSyntheticRecord([]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    expect(result.canPurchase).toBe(true);
    expect(result.headline).toBe('Available for purchase');
  });
});

// ---------------------------------------------------------------------------
// 9. renderBuyerTrace: BLOCK trace
// ---------------------------------------------------------------------------

describe('renderBuyerTrace — BLOCK trace', () => {
  it('returns canPurchase:false for a BLOCK reason without resolution', () => {
    const record = makeSyntheticRecord([SECOND_BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    expect(result.canPurchase).toBe(false);
    expect(result.headline).toContain('wholesale');
  });

  it('returns canPurchase:true for a BLOCK with a resolution path (CONDITIONAL)', () => {
    // BLOCK_REASON has requirements[] → CONDITIONAL → isTransactable = true
    const record = makeSyntheticRecord([BLOCK_REASON]);
    const trace = buildDecisionTrace(record);
    const result = renderBuyerTrace(trace);
    // CONDITIONAL → isTransactable = true → canPurchase = true
    expect(result.canPurchase).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. renderMerchantTrace: actionHint coverage for all RAOS-0001 + RAOS-0002 codes
// ---------------------------------------------------------------------------

describe('renderMerchantTrace — actionHint coverage', () => {
  const allCodes = [
    ...RAOS_0001_REASON_CODES,
    ...RAOS_0002_REASON_CODES,
  ];

  it.each(allCodes)('produces a non-default actionHint for reason code %s', (code) => {
    const reason: SyntheticReason = {
      code,
      message: `Test message for ${code}`,
      severity: 'BLOCK',
      blocking: true,
      source: 'com.os.retailagent.shopping.eligibility',
    };
    const record = makeSyntheticRecord([reason]);
    const trace = buildDecisionTrace(record);
    const rows = renderMerchantTrace(trace);
    const row = rows.find(r => r.code === code);
    expect(row, `No row found for code ${code}`).toBeDefined();
    expect(row!.actionHint, `actionHint is empty for code ${code}`).toBeTruthy();
    // The default fallback always says "Review merchant configuration for X"
    // A good actionHint should be more specific for known codes
    // (this verifies the switch table has an entry for each code)
    expect(
      row!.actionHint,
      `actionHint for ${code} looks like a default fallback`,
    ).not.toBe('Review merchant configuration for ' + code);
  });
});
