/**
 * A3 — Region allowlist helper unit tests
 *
 * Covers `checkServesRegion` from `src/lib/rules/regionAllowlist.ts`.
 *
 * Acceptance criteria (from case-studies/thecustomhub/03-implementation-plan.md §A3):
 *   - Region US and CA → ELIGIBLE (passes)
 *   - Region GB → REGION_RESTRICTED (blocked)
 */

import { describe, it, expect } from 'vitest';
import { checkServesRegion } from '@/lib/rules/regionAllowlist';

/** The served-regions allowlist matching TheCustomHub's pilot config (US + CA). */
const TCH_SERVES: ReadonlyArray<string> = ['US', 'CA'];

describe('checkServesRegion: allowlist — US + CA pilot config', () => {
  it('US is in the allowlist → ELIGIBLE with no reasons', () => {
    const result = checkServesRegion(TCH_SERVES, 'US');
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('CA is in the allowlist → ELIGIBLE with no reasons', () => {
    const result = checkServesRegion(TCH_SERVES, 'CA');
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('GB is not in the allowlist → BLOCKED with REGION_RESTRICTED', () => {
    const result = checkServesRegion(TCH_SERVES, 'GB');
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('REGION_RESTRICTED');
    expect(result.reasons[0].severity).toBe('BLOCK');
    expect(result.reasons[0].blocking).toBe(true); // deprecated compat field
    expect(result.reasons[0].message).toContain('GB');
    expect(result.reasons[0].source).toBe('com.os.retailagent.shopping.eligibility');
  });
});

describe('checkServesRegion: edge cases', () => {
  it('empty allowlist blocks every region', () => {
    const result = checkServesRegion([], 'US');
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons[0].code).toBe('REGION_RESTRICTED');
  });

  it('comparison is case-sensitive: lowercase "us" is not the same as "US"', () => {
    // Callers must normalise to uppercase; this documents the contract explicitly.
    const result = checkServesRegion(TCH_SERVES, 'us');
    expect(result.status).toBe('BLOCKED');
  });

  it('single-country allowlist: matching country is ELIGIBLE', () => {
    const result = checkServesRegion(['AU'], 'AU');
    expect(result.status).toBe('ELIGIBLE');
  });

  it('single-country allowlist: non-matching country is BLOCKED', () => {
    const result = checkServesRegion(['AU'], 'NZ');
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons[0].message).toContain('NZ');
  });

  it('REGION_RESTRICTED has no requirements (no buyer-side resolution path)', () => {
    const result = checkServesRegion(TCH_SERVES, 'MX');
    expect(result.reasons[0].requirements).toBeUndefined();
  });
});
