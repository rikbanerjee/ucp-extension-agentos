/**
 * RAOS-0008 · Trust, Provenance & Freshness — reference implementation
 *
 * `signEnvelope(payload, keyId, now, issuer, ttlSeconds)` and
 * `verifyEnvelope(envelope, now, merchantKeys)` form the signing seam.
 *
 * SIMULATED CRYPTO (B3/D2 LOCKED)
 * --------------------------------
 * The cryptographic implementation is INTENTIONALLY simulated. The interface
 * is real; the signature is a deterministic djb2 hash of the canonicalized
 * payload + keyId. Every simulated envelope carries:
 *   - trustMode: 'asserted'  (never 'signed' until WP-19)
 *   - signature prefix 'sim:'  (visually distinct in payload views)
 *
 * THE SWAP SEAM (for WP-19 real crypto):
 *   - Replace `simulatedSign(canonical)` with a real HMAC-SHA256 or ECDSA call.
 *   - Change `trustMode` to `'signed'` when signature is real.
 *   - No caller contract changes — the interface is identical.
 *
 * DETERMINISM CONTRACT (RAOS-0000 §7.1 / MASTER-BUILD-PLAN §1.3):
 *   - No Date.now(), Math.random(), fetch(), or new Date() anywhere in
 *     this module.
 *   - Time is always the injected `now` parameter (Unix epoch ms).
 *   - Canonicalization is deterministic (stable key sort + JSON.stringify).
 */

import type { ProvenanceEnvelope, Freshness, MerchantKey, TrustVerificationResult } from '@/lib/types/envelope';

// ---------------------------------------------------------------------------
// RAOS-0008 reason codes
// ---------------------------------------------------------------------------

/** Namespace for all RAOS-0008 trust reason codes. */
export const TRUST_NAMESPACE = 'com.os.retailagent.shopping.trust';

export const TRUST_REASON_CODES = {
  TRUST_SIMULATED:       'TRUST_SIMULATED',
  DATA_STALE:            'DATA_STALE',
  SIGNATURE_INVALID:     'SIGNATURE_INVALID',
  ISSUER_UNKNOWN:        'ISSUER_UNKNOWN',
  KEY_EXPIRED:           'KEY_EXPIRED',
  CLOCK_SKEW_SUSPECTED:  'CLOCK_SKEW_SUSPECTED',
} as const;

export type TrustReasonCode = typeof TRUST_REASON_CODES[keyof typeof TRUST_REASON_CODES];

// ---------------------------------------------------------------------------
// Clock-skew tolerance (RAOS-0008 §7.3)
// ---------------------------------------------------------------------------

/**
 * Maximum tolerated clock skew in milliseconds (±60s).
 * An envelope's computedAt may differ from now by up to this amount before
 * CLOCK_SKEW_SUSPECTED is emitted.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 60_000;

// ---------------------------------------------------------------------------
// Canonicalization — deterministic stable-key-sort JSON
// ---------------------------------------------------------------------------

/**
 * Recursively sort an object's keys in lexicographic order, producing a
 * structurally equivalent object with deterministic key order.
 * Arrays are traversed element-by-element; primitive values are returned as-is.
 *
 * This ensures that `canonicalize({ b: 2, a: 1 })` === `canonicalize({ a: 1, b: 2 })`.
 */
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Produce the canonical string for a payload + keyId pair.
 * - Deep-sorts all object keys lexicographically.
 * - Serializes with JSON.stringify (no whitespace).
 * - Appends `|${keyId}` as a suffix so two identical payloads signed with
 *   different keys produce different canonical strings.
 *
 * DETERMINISM: same (payload, keyId) → same canonical string, always.
 */
export function canonicalizePayload(payload: unknown, keyId: string): string {
  const sorted = sortKeys(payload);
  return `${JSON.stringify(sorted)}|${keyId}`;
}

// ---------------------------------------------------------------------------
// Deterministic hash (djb2) — the SIMULATED signing primitive
// ---------------------------------------------------------------------------

/**
 * djb2-style hash. Deterministic, no I/O, no randomness.
 * Used as the SIMULATED signing primitive.
 *
 * NOTE: This is NOT cryptographically secure. It is a placeholder that makes
 * test outputs stable and makes the seam obvious. WP-19 replaces this with
 * a real HMAC-SHA256 or ECDSA call without changing the caller interface.
 */
function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Produce a SIMULATED signature string.
 * Format: "sim:<8-hex-chars>" — the prefix makes it visually distinct from
 * real base64 signatures in payload views.
 */
function simulatedSign(canonical: string): string {
  return 'sim:' + djb2Hash(canonical).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// signEnvelope — the signing half of the seam
// ---------------------------------------------------------------------------

/**
 * Produce a ProvenanceEnvelope for the given payload.
 *
 * In v1, this produces a SIMULATED envelope:
 *   - trustMode: 'asserted' (never 'signed' until real crypto is wired in WP-19)
 *   - signature: 'sim:<hash>' — deterministic, not cryptographically secure
 *
 * THE SEAM: to ship real crypto, replace the body of `simulatedSign` with a
 * real HMAC-SHA256 call and change `trustMode` to 'signed'. No other caller
 * changes are required.
 *
 * @param payload     - The data being signed. Any serializable object.
 * @param keyId       - The key identifier to embed in the envelope.
 * @param now         - Injected Unix epoch milliseconds (never call Date.now() here).
 * @param issuer      - The issuer URI (e.g. "https://api.boutique-a.test").
 * @param ttlSeconds  - How long this envelope is considered fresh.
 */
export function signEnvelope(
  payload: unknown,
  keyId: string,
  now: number,
  issuer: string,
  ttlSeconds: number,
): ProvenanceEnvelope {
  const canonical = canonicalizePayload(payload, keyId);
  const signature = simulatedSign(canonical);

  return {
    provenance: {
      issuer,
      keyId,
      signature,
      trustMode: 'asserted', // always 'asserted' until WP-19 real crypto
    },
    freshness: {
      computedAt: now,
      ttlSeconds,
    },
  };
}

// ---------------------------------------------------------------------------
// verifyEnvelope — the verification half of the seam
// ---------------------------------------------------------------------------

/**
 * Verify a ProvenanceEnvelope against the merchant's published keys and now.
 *
 * Returns a TrustVerificationResult describing the trust posture:
 *   - valid=true + code='TRUST_SIMULATED' + severity='INFO' → clean simulated envelope
 *   - valid=false + a BLOCK code → a blocking trust failure
 *   - stale=true → DATA_STALE CONDITION is included (not necessarily blocking)
 *
 * @param envelope      - The envelope to verify.
 * @param now           - Injected Unix epoch milliseconds.
 * @param merchantKeys  - The merchant's published key set from UcpManifest.keys[].
 * @param originalPayload - When provided, re-signs the payload and checks signature match.
 *                          When omitted, signature check is skipped (structural check only).
 */
export function verifyEnvelope(
  envelope: ProvenanceEnvelope,
  now: number,
  merchantKeys: MerchantKey[],
  originalPayload?: unknown,
): TrustVerificationResult {
  const { provenance, freshness } = envelope;

  // Step 1: Compute age and staleness.
  const ageMs = now - freshness.computedAt;
  const ageSeconds = Math.floor(ageMs / 1000);
  const stale = ageMs > freshness.ttlSeconds * 1000;

  // Step 2: Key lookup.
  const key = merchantKeys.find(k => k.keyId === provenance.keyId);
  if (!key) {
    return {
      valid: false,
      code: TRUST_REASON_CODES.ISSUER_UNKNOWN,
      severity: 'BLOCK',
      message: `No key with id '${provenance.keyId}' found in merchant manifest. Cannot verify provenance.`,
      stale,
      ageSeconds,
    };
  }

  // Step 3: Key expiry check (with clock-skew tolerance).
  if (key.validTo !== null && key.validTo < now - CLOCK_SKEW_TOLERANCE_MS) {
    return {
      valid: false,
      code: TRUST_REASON_CODES.KEY_EXPIRED,
      severity: 'BLOCK',
      message: `Signing key '${provenance.keyId}' expired at ${key.validTo}. Re-issue envelope with a valid key.`,
      stale,
      ageSeconds,
    };
  }

  // Step 4: Clock-skew detection.
  // The envelope's computedAt should not be far in the future (clock skew).
  // We check if the absolute difference exceeds the TTL + tolerance window.
  const skewMs = Math.abs(ageMs);
  if (skewMs > (freshness.ttlSeconds * 1000 + CLOCK_SKEW_TOLERANCE_MS) && ageMs < 0) {
    // computedAt is in the future — suspicious
    return {
      valid: false,
      code: TRUST_REASON_CODES.CLOCK_SKEW_SUSPECTED,
      severity: 'CONDITION',
      message: `Envelope computedAt is ${Math.abs(ageSeconds)}s in the future. Clock skew suspected (tolerance ±60s).`,
      stale,
      ageSeconds,
    };
  }

  // Step 5: Signature verification (only when originalPayload is provided).
  if (originalPayload !== undefined) {
    const expectedCanonical = canonicalizePayload(originalPayload, provenance.keyId);
    const expectedSignature = simulatedSign(expectedCanonical);
    if (provenance.signature !== expectedSignature) {
      return {
        valid: false,
        code: TRUST_REASON_CODES.SIGNATURE_INVALID,
        severity: 'BLOCK',
        message: `Signature mismatch for key '${provenance.keyId}'. Payload may have been tampered with.`,
        stale,
        ageSeconds,
      };
    }
  }

  // Step 6: DATA_STALE (non-blocking unless caller is at QUOTE stage).
  if (stale) {
    return {
      valid: true,  // structurally valid — caller decides whether to proceed
      code: TRUST_REASON_CODES.DATA_STALE,
      severity: 'CONDITION',
      message: `Data is ${ageSeconds}s old (TTL ${freshness.ttlSeconds}s). Re-fetch before acting on this result.`,
      stale,
      ageSeconds,
    };
  }

  // Step 7: Clean simulated envelope.
  return {
    valid: true,
    code: TRUST_REASON_CODES.TRUST_SIMULATED,
    severity: 'INFO',
    message: 'Envelope verified (crypto simulated — not cryptographically secure; SIMULATED label is intentional).',
    stale: false,
    ageSeconds,
  };
}

// ---------------------------------------------------------------------------
// buildTrustReasonEntries — produces ReasonEntry[] for the DecisionRecord
// ---------------------------------------------------------------------------

import type { ReasonEntry } from '@/lib/types/reasons';

/**
 * Convert a TrustVerificationResult into a ReasonEntry array suitable for
 * inclusion in the pipeline's `DecisionRecord.reasons[]`.
 *
 * Always emits at least one entry (TRUST_SIMULATED INFO while crypto is fake).
 * Emits TRUST_SIMULATED + DATA_STALE when stale.
 * Emits only the blocking code on blocking failures.
 */
export function buildTrustReasonEntries(result: TrustVerificationResult): ReasonEntry[] {
  const entries: ReasonEntry[] = [];

  // Blocking failure — emit only the BLOCK code.
  if (!result.valid) {
    entries.push({
      code: result.code,
      message: result.message,
      severity: result.severity,
      blocking: result.severity === 'BLOCK',
      source: TRUST_NAMESPACE,
    });
    return entries;
  }

  // Always emit TRUST_SIMULATED while crypto is fake (INFO — advisory only).
  entries.push({
    code: TRUST_REASON_CODES.TRUST_SIMULATED,
    message: 'Envelope produced with simulated crypto (SIMULATED — not cryptographically verified).',
    severity: 'INFO',
    blocking: false,
    source: TRUST_NAMESPACE,
  });

  // Additionally emit DATA_STALE when the result is stale (CONDITION).
  if (result.stale) {
    entries.push({
      code: TRUST_REASON_CODES.DATA_STALE,
      message: result.message,
      severity: 'CONDITION',
      blocking: false,
      source: TRUST_NAMESPACE,
    });
  }

  return entries;
}
