/**
 * WP-02: Tests for normalizeBuyerContext
 *
 * Three suites:
 *   1. Normalization matrix — every missing/unknown field → most-restrictive default
 *   2. Trust downgrade — asserted-vs-signed per privilege claim
 *   3. Status derivation truth table — deriveEligibilityStatus per RAOS-0000 §8.1
 */

import { describe, it, expect } from 'vitest';
import { normalizeBuyerContext } from '@/lib/rules/normalizeBuyerContext';
import { deriveEligibilityStatus } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Suite 1: Normalization matrix
// ---------------------------------------------------------------------------

describe('normalizeBuyerContext: missing/unknown fields → most-restrictive defaults', () => {
  it('empty object → all most-restrictive defaults', () => {
    const result = normalizeBuyerContext({});
    expect(result.customerType).toBe('guest');
    expect(result.loyaltyTier).toBe('guest');
    expect(result.membershipTier).toBe('none');
    expect(result.marketRegion).toBe('UNKNOWN');
    expect(result.fulfillmentMode).toBe('shipping');
    expect(result.accountLinked).toBe(false);
    expect(result.taxExempt).toBe(false);
    expect(result.resaleCertificateOnFile).toBe(false);
    expect(result.trust.mode).toBe('asserted');
  });

  it('unknown customerType value → guest', () => {
    const result = normalizeBuyerContext({ customerType: 'robot' as unknown as 'guest' });
    expect(result.customerType).toBe('guest');
  });

  it('unknown loyaltyTier value → guest', () => {
    const result = normalizeBuyerContext({ loyaltyTier: 'platinum' as unknown as 'gold', trust: { mode: 'signed' } });
    expect(result.loyaltyTier).toBe('guest');
  });

  it('unknown membershipTier value → none', () => {
    const result = normalizeBuyerContext({ membershipTier: 'elite' as unknown as 'gold', trust: { mode: 'signed' } });
    expect(result.membershipTier).toBe('none');
  });

  it('missing marketRegion → UNKNOWN (most-restrictive: treat as restricted)', () => {
    const result = normalizeBuyerContext({});
    expect(result.marketRegion).toBe('UNKNOWN');
  });

  it('empty string marketRegion → UNKNOWN', () => {
    const result = normalizeBuyerContext({ marketRegion: '' });
    expect(result.marketRegion).toBe('UNKNOWN');
  });

  it('whitespace-only marketRegion → UNKNOWN', () => {
    const result = normalizeBuyerContext({ marketRegion: '   ' });
    expect(result.marketRegion).toBe('UNKNOWN');
  });

  it('unknown fulfillmentMode → shipping', () => {
    const result = normalizeBuyerContext({ fulfillmentMode: 'drone' as unknown as 'shipping' });
    expect(result.fulfillmentMode).toBe('shipping');
  });

  it('missing trust → defaults to asserted mode', () => {
    const result = normalizeBuyerContext({ customerType: 'member' });
    expect(result.trust.mode).toBe('asserted');
    expect(result.trust.issuer).toBeUndefined();
  });

  it('valid signed trust is preserved', () => {
    const result = normalizeBuyerContext({
      trust: { mode: 'signed', issuer: 'https://id.test', keyId: 'k1', signature: 'abc123' },
    });
    expect(result.trust.mode).toBe('signed');
    expect(result.trust.issuer).toBe('https://id.test');
    expect(result.trust.keyId).toBe('k1');
    expect(result.trust.signature).toBe('abc123');
  });

  it('accountLinked defaults to false when missing', () => {
    const result = normalizeBuyerContext({});
    expect(result.accountLinked).toBe(false);
  });

  it('accountLinked:true is preserved when signed', () => {
    const result = normalizeBuyerContext({ accountLinked: true, trust: { mode: 'signed' } });
    expect(result.accountLinked).toBe(true);
  });

  it('all valid fields → preserved when trust is signed', () => {
    const result = normalizeBuyerContext({
      customerType: 'wholesale',
      loyaltyTier: 'gold',
      membershipTier: 'distributor',
      marketRegion: 'CA',
      fulfillmentMode: 'pickup',
      accountLinked: true,
      taxExempt: true,
      resaleCertificateOnFile: true,
      trust: { mode: 'signed', issuer: 'https://id.test', keyId: 'k1' },
    });
    expect(result.customerType).toBe('wholesale');
    expect(result.loyaltyTier).toBe('gold');
    expect(result.membershipTier).toBe('distributor');
    expect(result.marketRegion).toBe('CA');
    expect(result.fulfillmentMode).toBe('pickup');
    expect(result.accountLinked).toBe(true);
    expect(result.taxExempt).toBe(true);
    expect(result.resaleCertificateOnFile).toBe(true);
    expect(result.trust.mode).toBe('signed');
  });
});

// ---------------------------------------------------------------------------
// Suite 2: Trust downgrade — asserted-vs-signed per privilege claim
// ---------------------------------------------------------------------------

describe('normalizeBuyerContext: trust downgrade (trustEnforcement=enforce)', () => {
  it('asserted + gold loyaltyTier → downgraded to guest', () => {
    const result = normalizeBuyerContext(
      { loyaltyTier: 'gold', trust: { mode: 'asserted' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.loyaltyTier).toBe('guest');
  });

  it('asserted + distributor membershipTier → downgraded to none', () => {
    const result = normalizeBuyerContext(
      { membershipTier: 'distributor', trust: { mode: 'asserted' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.membershipTier).toBe('none');
  });

  it('asserted + taxExempt:true → downgraded to false', () => {
    const result = normalizeBuyerContext(
      { taxExempt: true, trust: { mode: 'asserted' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.taxExempt).toBe(false);
  });

  it('asserted + resaleCertificateOnFile:true → downgraded to false', () => {
    const result = normalizeBuyerContext(
      { resaleCertificateOnFile: true, trust: { mode: 'asserted' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.resaleCertificateOnFile).toBe(false);
  });

  it('signed + gold loyaltyTier → preserved', () => {
    const result = normalizeBuyerContext(
      { loyaltyTier: 'gold', trust: { mode: 'signed' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.loyaltyTier).toBe('gold');
  });

  it('signed + distributor membershipTier → preserved', () => {
    const result = normalizeBuyerContext(
      { membershipTier: 'distributor', trust: { mode: 'signed' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.membershipTier).toBe('distributor');
  });

  it('signed + taxExempt:true → preserved', () => {
    const result = normalizeBuyerContext(
      { taxExempt: true, trust: { mode: 'signed' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.taxExempt).toBe(true);
  });

  it('signed + resaleCertificateOnFile:true → preserved', () => {
    const result = normalizeBuyerContext(
      { resaleCertificateOnFile: true, trust: { mode: 'signed' } },
      { trustEnforcement: 'enforce' },
    );
    expect(result.resaleCertificateOnFile).toBe(true);
  });

  it('legacy mode: asserted privilege claims NOT downgraded', () => {
    const result = normalizeBuyerContext(
      { loyaltyTier: 'gold', membershipTier: 'distributor', taxExempt: true, trust: { mode: 'asserted' } },
      { trustEnforcement: 'legacy' },
    );
    expect(result.loyaltyTier).toBe('gold');
    expect(result.membershipTier).toBe('distributor');
    expect(result.taxExempt).toBe(true);
  });

  it('legacy mode: missing trust treated as signed (backward compat)', () => {
    // No trust field → default mode is asserted, but legacy mode skips downgrade.
    const result = normalizeBuyerContext(
      { membershipTier: 'reseller_plus' },
      { trustEnforcement: 'legacy' },
    );
    expect(result.membershipTier).toBe('reseller_plus');
  });

  it('non-privilege fields (customerType, marketRegion) are NOT downgraded by asserted mode', () => {
    const result = normalizeBuyerContext(
      { customerType: 'wholesale', marketRegion: 'CA', trust: { mode: 'asserted' } },
      { trustEnforcement: 'enforce' },
    );
    // customerType and marketRegion are not privilege-granting claims — not downgraded
    expect(result.customerType).toBe('wholesale');
    expect(result.marketRegion).toBe('CA');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: Status derivation truth table (deriveEligibilityStatus)
// ---------------------------------------------------------------------------

describe('deriveEligibilityStatus: truth table per RAOS-0000 §8.1', () => {
  it('no reasons → ELIGIBLE', () => {
    expect(deriveEligibilityStatus([])).toBe('ELIGIBLE');
  });

  it('INFO only → ELIGIBLE (advisory, never gates)', () => {
    expect(
      deriveEligibilityStatus([{ severity: 'INFO', requirements: [] }]),
    ).toBe('ELIGIBLE');
  });

  it('BLOCK with no requirements → BLOCKED', () => {
    expect(
      deriveEligibilityStatus([{ severity: 'BLOCK' }]),
    ).toBe('BLOCKED');
  });

  it('BLOCK with empty requirements array → BLOCKED (no resolution path)', () => {
    expect(
      deriveEligibilityStatus([{ severity: 'BLOCK', requirements: [] }]),
    ).toBe('BLOCKED');
  });

  it('BLOCK with requirements → CONDITIONAL (resolution path exists)', () => {
    expect(
      deriveEligibilityStatus([{
        severity: 'BLOCK',
        requirements: [{ type: 'membership_tier', value: 'gold' }],
      }]),
    ).toBe('CONDITIONAL');
  });

  it('CONDITION with requirements → CONDITIONAL', () => {
    expect(
      deriveEligibilityStatus([{
        severity: 'CONDITION',
        requirements: [{ type: 'customer_type', value: 'wholesale' }],
      }]),
    ).toBe('CONDITIONAL');
  });

  it('CONDITION without requirements → CONDITIONAL (CONDITION is always resolvable)', () => {
    expect(
      deriveEligibilityStatus([{ severity: 'CONDITION' }]),
    ).toBe('CONDITIONAL');
  });

  it('BLOCK (no path) + INFO → BLOCKED (BLOCKED takes precedence)', () => {
    expect(
      deriveEligibilityStatus([
        { severity: 'BLOCK' },
        { severity: 'INFO' },
      ]),
    ).toBe('BLOCKED');
  });

  it('BLOCK (no path) + CONDITIONAL → BLOCKED (BLOCKED takes precedence over CONDITIONAL)', () => {
    expect(
      deriveEligibilityStatus([
        { severity: 'BLOCK' },
        { severity: 'CONDITION', requirements: [{ type: 'customer_type', value: 'wholesale' }] },
      ]),
    ).toBe('BLOCKED');
  });

  it('BLOCK with path + BLOCK without path → BLOCKED (dead-end BLOCK wins)', () => {
    expect(
      deriveEligibilityStatus([
        { severity: 'BLOCK', requirements: [{ type: 'membership_tier', value: 'gold' }] },
        { severity: 'BLOCK' },
      ]),
    ).toBe('BLOCKED');
  });

  it('TIER_RESTRICTION pattern: BLOCK + requirements → CONDITIONAL (the §8.1 incoherence fix)', () => {
    // The original TIER_RESTRICTION emitted blocking:true + CONDITIONAL status.
    // Under severity model: BLOCK + requirements[] = CONDITIONAL. Same outcome.
    expect(
      deriveEligibilityStatus([{
        severity: 'BLOCK',
        requirements: [{ type: 'membership_tier', value: 'gold' }],
      }]),
    ).toBe('CONDITIONAL');
  });

  it('HIDDEN_PRODUCT pattern: BLOCK + no requirements → BLOCKED (no resolution for hidden)', () => {
    expect(
      deriveEligibilityStatus([{ severity: 'BLOCK' }]),
    ).toBe('BLOCKED');
  });
});
