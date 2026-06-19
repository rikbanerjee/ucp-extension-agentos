/**
 * WP-06 / RAOS-0008: Trust, Provenance & Freshness — unit + edge-case tests
 *
 * Covers all six reason codes, including the four synthetic-only codes that
 * cannot appear in the static golden fixture grid. Every edge case bullet
 * from the WP-06 brief is a dedicated test.
 *
 * All tests are pure-function: no DOM, no network, no Date.now().
 * Injected `now` values are used for all time-dependent logic.
 */

import { describe, it, expect } from 'vitest';
import {
  signEnvelope,
  verifyEnvelope,
  buildTrustReasonEntries,
  canonicalizePayload,
  TRUST_REASON_CODES,
  CLOCK_SKEW_TOLERANCE_MS,
} from '@/lib/rules/trust';
import type { MerchantKey, ProvenanceEnvelope } from '@/lib/types/envelope';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_NOW = 1_718_000_000_000; // a realistic Unix ms

const BOUTIQUE_KEYS: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: null },
];

const WHOLESALE_KEYS: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: BASE_NOW + 1_000_000_000 }, // expires far future
  { keyId: 'k2', validFrom: 1_750_000_000_000, validTo: null },
];

const EXPIRED_KEYS: MerchantKey[] = [
  { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: BASE_NOW - 1_000_000 }, // expired 1000s ago
];

const SAMPLE_PAYLOAD = { unitPrice: 45.00, priceSource: 'base', currency: 'USD' };

// ---------------------------------------------------------------------------
// Canonicalization tests
// ---------------------------------------------------------------------------

describe('canonicalizePayload', () => {
  it('produces identical output for objects with different key insertion order', () => {
    const a = canonicalizePayload({ b: 2, a: 1 }, 'k1');
    const b = canonicalizePayload({ a: 1, b: 2 }, 'k1');
    expect(a).toBe(b);
  });

  it('produces different output for different keyIds', () => {
    const a = canonicalizePayload({ price: 10 }, 'k1');
    const b = canonicalizePayload({ price: 10 }, 'k2');
    expect(a).not.toBe(b);
  });

  it('produces different output for different payloads', () => {
    const a = canonicalizePayload({ price: 10 }, 'k1');
    const b = canonicalizePayload({ price: 11 }, 'k1');
    expect(a).not.toBe(b);
  });

  it('handles nested objects with stable key order', () => {
    const a = canonicalizePayload({ z: { b: 2, a: 1 }, y: 0 }, 'k1');
    const b = canonicalizePayload({ y: 0, z: { a: 1, b: 2 } }, 'k1');
    expect(a).toBe(b);
  });

  it('handles arrays element-by-element (no sorting)', () => {
    const a = canonicalizePayload({ items: [1, 2, 3] }, 'k1');
    const b = canonicalizePayload({ items: [3, 2, 1] }, 'k1');
    // Arrays are NOT sorted — order matters for arrays
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// signEnvelope tests
// ---------------------------------------------------------------------------

describe('signEnvelope', () => {
  it('returns a ProvenanceEnvelope with simulated trustMode', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 300);
    expect(env.provenance.trustMode).toBe('asserted');
    expect(env.provenance.keyId).toBe('k1');
    expect(env.provenance.issuer).toBe('https://api.boutique-a.test');
    expect(env.provenance.signature).toMatch(/^sim:[0-9a-f]{8}$/);
  });

  it('sets computedAt from injected now (not Date.now)', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 60);
    expect(env.freshness.computedAt).toBe(BASE_NOW);
  });

  it('sets ttlSeconds from parameter', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 3600);
    expect(env.freshness.ttlSeconds).toBe(3600);
  });

  it('is deterministic: same inputs → same output', () => {
    const env1 = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 300);
    const env2 = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 300);
    expect(env1.provenance.signature).toBe(env2.provenance.signature);
  });

  it('produces different signatures for different payloads', () => {
    const env1 = signEnvelope({ price: 10 }, 'k1', BASE_NOW, 'https://api.test', 300);
    const env2 = signEnvelope({ price: 11 }, 'k1', BASE_NOW, 'https://api.test', 300);
    expect(env1.provenance.signature).not.toBe(env2.provenance.signature);
  });

  it('produces different signatures for different keyIds', () => {
    const env1 = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const env2 = signEnvelope(SAMPLE_PAYLOAD, 'k2', BASE_NOW, 'https://api.test', 300);
    expect(env1.provenance.signature).not.toBe(env2.provenance.signature);
  });
});

// ---------------------------------------------------------------------------
// Edge case: envelope round-trip (sign → verify → valid)
// ---------------------------------------------------------------------------

describe('envelope round-trip: sign → verify → valid', () => {
  it('a freshly signed envelope verifies as TRUST_SIMULATED (INFO)', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
    expect(result.severity).toBe('INFO');
    expect(result.stale).toBe(false);
  });

  it('ageSeconds is 0 when now === computedAt', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.ageSeconds).toBe(0);
  });

  it('ageSeconds reflects elapsed time', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const laterNow = BASE_NOW + 60_000; // 60 seconds later
    const result = verifyEnvelope(env, laterNow, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.ageSeconds).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Edge case: TTL expiry mid-session (same payload, two now values)
// ---------------------------------------------------------------------------

describe('TTL expiry mid-session', () => {
  it('envelope is fresh within TTL', () => {
    const ttl = 300;
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', ttl);
    // 299 seconds later: still fresh
    const result = verifyEnvelope(env, BASE_NOW + 299_000, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.stale).toBe(false);
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
  });

  it('envelope is stale exactly at TTL boundary + 1ms', () => {
    const ttl = 300;
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', ttl);
    // exactly at TTL + 1ms: stale
    const result = verifyEnvelope(env, BASE_NOW + ttl * 1000 + 1, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.stale).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.DATA_STALE);
    expect(result.severity).toBe('CONDITION');
  });

  it('DATA_STALE: valid stays true (caller decides whether to proceed)', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 60);
    const result = verifyEnvelope(env, BASE_NOW + 120_000, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(true); // structurally valid — staleness is CONDITION not BLOCK
    expect(result.stale).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.DATA_STALE);
  });
});

// ---------------------------------------------------------------------------
// Edge case: per-field freshness (price fresh, inventory stale → only inventory degrades)
// ---------------------------------------------------------------------------

describe('per-field freshness: price fresh, inventory stale', () => {
  it('price envelope (TTL 300s) is fresh while inventory envelope (TTL 60s) is stale', () => {
    const priceEnv = signEnvelope({ unitPrice: 45 }, 'k1', BASE_NOW, 'https://api.test', 300);
    const invEnv   = signEnvelope({ state: 'in_stock' }, 'k1', BASE_NOW, 'https://api.test', 60);

    // Evaluate at 120s elapsed (past inv TTL of 60s, within price TTL of 300s)
    const nowAt120s = BASE_NOW + 120_000;
    const priceResult = verifyEnvelope(priceEnv, nowAt120s, BOUTIQUE_KEYS);
    const invResult   = verifyEnvelope(invEnv,   nowAt120s, BOUTIQUE_KEYS);

    expect(priceResult.stale).toBe(false);
    expect(priceResult.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);

    expect(invResult.stale).toBe(true);
    expect(invResult.code).toBe(TRUST_REASON_CODES.DATA_STALE);
  });
});

// ---------------------------------------------------------------------------
// Edge case: signature mismatch → most-restrictive (BLOCK)
// ---------------------------------------------------------------------------

describe('SIGNATURE_INVALID (synthetic)', () => {
  it('signature mismatch → SIGNATURE_INVALID BLOCK', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 300);
    // Tamper with the payload after signing
    const tamperedPayload = { ...SAMPLE_PAYLOAD, unitPrice: 0.01 };
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, tamperedPayload);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(TRUST_REASON_CODES.SIGNATURE_INVALID);
    expect(result.severity).toBe('BLOCK');
  });

  it('SIGNATURE_INVALID is blocking even on fresh envelope', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.boutique-a.test', 3600);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, { different: 'payload' });
    expect(result.valid).toBe(false);
    expect(result.severity).toBe('BLOCK');
  });
});

// ---------------------------------------------------------------------------
// Edge case: ISSUER_UNKNOWN (synthetic)
// ---------------------------------------------------------------------------

describe('ISSUER_UNKNOWN (synthetic)', () => {
  it('keyId not in merchant keys → ISSUER_UNKNOWN BLOCK', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'unknown_key', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(TRUST_REASON_CODES.ISSUER_UNKNOWN);
    expect(result.severity).toBe('BLOCK');
  });

  it('empty merchant keys → ISSUER_UNKNOWN', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, [], SAMPLE_PAYLOAD);
    expect(result.code).toBe(TRUST_REASON_CODES.ISSUER_UNKNOWN);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge case: key rotated between issue and verify (KEY_EXPIRED)
// ---------------------------------------------------------------------------

describe('KEY_EXPIRED (synthetic)', () => {
  it('key rotated — old key expired → KEY_EXPIRED BLOCK', () => {
    // Sign with k1 when it was valid
    const envSignedWithK1 = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    // Now verify after k1 has expired (now is past validTo)
    const result = verifyEnvelope(envSignedWithK1, BASE_NOW + 2_000_000, EXPIRED_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(TRUST_REASON_CODES.KEY_EXPIRED);
    expect(result.severity).toBe('BLOCK');
  });

  it('key with future validTo is NOT expired', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, WHOLESALE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
  });

  it('clock-skew tolerance: key expiry is tested with ±60s tolerance', () => {
    // Key expired 30s ago — within 60s tolerance → should still verify
    const key30sExpired: MerchantKey[] = [
      { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: BASE_NOW - 30_000 },
    ];
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, key30sExpired, SAMPLE_PAYLOAD);
    // Within tolerance: should NOT emit KEY_EXPIRED
    expect(result.code).not.toBe(TRUST_REASON_CODES.KEY_EXPIRED);
  });

  it('key expired 61s ago (beyond tolerance) → KEY_EXPIRED', () => {
    const key61sExpired: MerchantKey[] = [
      { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: BASE_NOW - 61_000 },
    ];
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, key61sExpired, SAMPLE_PAYLOAD);
    expect(result.code).toBe(TRUST_REASON_CODES.KEY_EXPIRED);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge case: clock skew within vs beyond ±60s
// ---------------------------------------------------------------------------

describe('CLOCK_SKEW_SUSPECTED (synthetic)', () => {
  it('computedAt slightly in the future (within ±60s tolerance) → valid', () => {
    // computedAt is 30s in the future from verifier's perspective
    const futureNow = BASE_NOW + 30_000;
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', futureNow, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    // 30s skew within tolerance (ageSeconds = -30, skewMs = 30_000 < 300*1000 + 60_000)
    // Not expected to emit CLOCK_SKEW_SUSPECTED for within-tolerance values
    expect(result.code).not.toBe(TRUST_REASON_CODES.CLOCK_SKEW_SUSPECTED);
  });

  it('computedAt far in the future (beyond TTL + tolerance) → CLOCK_SKEW_SUSPECTED', () => {
    // computedAt is TTL + 61s in the future
    const ttl = 300;
    const farFutureNow = BASE_NOW + ttl * 1000 + CLOCK_SKEW_TOLERANCE_MS + 1_000;
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', farFutureNow, 'https://api.test', ttl);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS, SAMPLE_PAYLOAD);
    expect(result.code).toBe(TRUST_REASON_CODES.CLOCK_SKEW_SUSPECTED);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildTrustReasonEntries
// ---------------------------------------------------------------------------

describe('buildTrustReasonEntries', () => {
  it('clean result → [TRUST_SIMULATED INFO]', () => {
    const result = {
      valid: true,
      code: TRUST_REASON_CODES.TRUST_SIMULATED,
      severity: 'INFO' as const,
      message: 'ok',
      stale: false,
      ageSeconds: 0,
    };
    const entries = buildTrustReasonEntries(result);
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
    expect(entries[0].severity).toBe('INFO');
    expect(entries[0].blocking).toBe(false);
  });

  it('stale result → [TRUST_SIMULATED INFO, DATA_STALE CONDITION]', () => {
    const result = {
      valid: true,
      code: TRUST_REASON_CODES.DATA_STALE,
      severity: 'CONDITION' as const,
      message: 'stale',
      stale: true,
      ageSeconds: 120,
    };
    const entries = buildTrustReasonEntries(result);
    expect(entries).toHaveLength(2);
    expect(entries[0].code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
    expect(entries[1].code).toBe(TRUST_REASON_CODES.DATA_STALE);
    expect(entries[1].severity).toBe('CONDITION');
    expect(entries[1].blocking).toBe(false);
  });

  it('blocking result → only the BLOCK code', () => {
    const result = {
      valid: false,
      code: TRUST_REASON_CODES.SIGNATURE_INVALID,
      severity: 'BLOCK' as const,
      message: 'bad sig',
      stale: false,
      ageSeconds: 0,
    };
    const entries = buildTrustReasonEntries(result);
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe(TRUST_REASON_CODES.SIGNATURE_INVALID);
    expect(entries[0].blocking).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Wholesale key rotation scenario: two keys, one expired
// ---------------------------------------------------------------------------

describe('key rotation: two keys simultaneously valid', () => {
  it('verifies with k1 when k1 is active', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.wholesale-b.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, WHOLESALE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
  });

  it('verifies with k2 when k2 is active', () => {
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k2', BASE_NOW, 'https://api.wholesale-b.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, WHOLESALE_KEYS, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(true);
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
  });

  it('envelope signed with k1 after k1 expires → KEY_EXPIRED even with k2 present', () => {
    const expiredK1Keys: MerchantKey[] = [
      { keyId: 'k1', validFrom: 1_700_000_000_000, validTo: BASE_NOW - 61_000 },
      { keyId: 'k2', validFrom: 1_750_000_000_000, validTo: null },
    ];
    // Envelope still references k1 (old code, not rotated)
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, expiredK1Keys, SAMPLE_PAYLOAD);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(TRUST_REASON_CODES.KEY_EXPIRED);
  });
});

// ---------------------------------------------------------------------------
// Verify without originalPayload (structural check only — no signature check)
// ---------------------------------------------------------------------------

describe('verifyEnvelope without originalPayload', () => {
  it('skips signature check when originalPayload is omitted', () => {
    // Sign one payload, then verify without providing the original → no SIGNATURE_INVALID
    const env = signEnvelope(SAMPLE_PAYLOAD, 'k1', BASE_NOW, 'https://api.test', 300);
    const result = verifyEnvelope(env, BASE_NOW, BOUTIQUE_KEYS); // no originalPayload
    expect(result.code).toBe(TRUST_REASON_CODES.TRUST_SIMULATED);
    expect(result.valid).toBe(true);
  });
});
