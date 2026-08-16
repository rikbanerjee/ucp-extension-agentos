/**
 * RAOS-0000 §9 — Provenance & Freshness Envelope
 * RAOS-0008 — Trust, Provenance & Freshness (WP-06 depth)
 *
 * Every computed contract MAY carry this envelope so an agent can trust that
 * data is authentic and current. RAOS-0000 fixes the shape; RAOS-0008 makes
 * it load-bearing (signing, key rotation, staleness behavior matrix).
 *
 * DETERMINISM: `computedAt` comes from the injected `now` parameter — never
 * from Date.now() or new Date() inside an evaluator (§7.1).
 */

/**
 * Provenance envelope — who produced this data and how to verify it.
 *
 * While crypto is SIMULATED (B3/D2), `trustMode` must be labeled loudly so
 * no consumer mistakes a simulated signature for real security. The word
 * "asserted" renders in every payload view (RAOS-0008 WP-06 requirement).
 *
 * SIMULATED signatures carry the prefix "sim:" so they are visually distinct
 * from real cryptographic output in payload views.
 */
export interface Provenance {
  /** The URI of the entity that issued this data. */
  issuer: string;

  /** Key identifier used to sign the payload. Must match a key in `UcpManifest.keys[]`. */
  keyId: string;

  /**
   * Base64-encoded / hex signature of the payload (SIMULATED — deterministic fake).
   * While simulated, the value is prefixed with "sim:" (e.g. "sim:4a7f0c2b").
   * RAOS-0008 (WP-06) defines the seam; WP-19 swaps to a real algorithm.
   */
  signature: string;

  /**
   * Labels how this provenance was established. Labeled loudly per B3/D2 so
   * simulated provenance is never mistaken for real cryptographic security.
   *
   * - 'asserted': no crypto verification; always the case while simulated.
   * - 'signed':   signature was verified against the merchant's published key.
   *               Not used in v1 (simulation only); reserved for WP-19.
   */
  trustMode: 'asserted' | 'signed';
}

/**
 * Freshness envelope — when this data was computed and when it expires.
 *
 * RAOS-0008 per-stage TTL defaults (declared in trust.ts):
 *   ELIGIBILITY / VISIBILITY: 3600s
 *   PRICE: 300s
 *   INVENTORY: 60s
 *   QUOTE: 0s (verified at use-time)
 */
export interface Freshness {
  /**
   * Unix epoch milliseconds at which this data was computed.
   * Comes from the injected `now` — never from Date.now() inside an evaluator.
   */
  computedAt: number;

  /**
   * TTL in seconds from `computedAt`. After this, data is stale.
   * Staleness behavior: refuse for QUOTE; degrade+flag for advisory data.
   */
  ttlSeconds: number;
}

/**
 * Combined provenance + freshness envelope.
 * Matches the RAOS-0000 §9 contract shape exactly, extended by RAOS-0008.
 */
export interface ProvenanceEnvelope {
  provenance: Provenance;
  freshness: Freshness;
}

// ---------------------------------------------------------------------------
// RAOS-0008 extensions — key manifest + verification result
// ---------------------------------------------------------------------------

/**
 * A single entry in a merchant's published key set.
 * Carried in `UcpManifest.keys[]`.
 *
 * Key rotation: a merchant carries multiple entries simultaneously.
 * `verifyEnvelope` selects by `keyId`. Expired keys (validTo < now) emit
 * `KEY_EXPIRED` BLOCK.
 */
export interface MerchantKey {
  /** Unique key identifier. Must match `Provenance.keyId` on envelopes signed with this key. */
  keyId: string;
  /** Unix epoch milliseconds — inclusive lower bound of this key's validity window. */
  validFrom: number;
  /**
   * Unix epoch milliseconds — exclusive upper bound.
   * null means the key has no scheduled expiry (valid indefinitely until rotated).
   */
  validTo: number | null;
}

/**
 * The result of verifying a ProvenanceEnvelope against a merchant's key set and now.
 *
 * `valid` = true means no blocking errors were found (the envelope is structurally
 * correct and the key was found and not expired). It does NOT mean the signature is
 * cryptographically sound in v1 (simulated — `TRUST_SIMULATED` is always emitted).
 *
 * `valid` = false means a BLOCK-severity condition was detected (bad key, expired key,
 * or signature mismatch).
 */
export interface TrustVerificationResult {
  /** No blocking trust errors. True even when TRUST_SIMULATED is emitted. */
  valid: boolean;
  /**
   * The primary reason code for this verification outcome.
   * 'TRUST_SIMULATED' for a clean simulated envelope.
   * A BLOCK code if verification failed.
   */
  code: string;
  severity: 'BLOCK' | 'CONDITION' | 'INFO';
  message: string;
  /** Whether the envelope's data has exceeded its TTL at the given now. */
  stale: boolean;
  /** Age of the envelope in whole seconds (floor((now - computedAt) / 1000)). */
  ageSeconds: number;
}

// ---------------------------------------------------------------------------
// RAOS-0008 per-stage TTL defaults
// ---------------------------------------------------------------------------

/**
 * Default TTL in seconds for each pipeline stage.
 * These are the merchant's implicit promise about data freshness.
 * Merchant-overridable per-capability in a future revision.
 *
 * Rationale:
 *   ELIGIBILITY / VISIBILITY: 3600s — eligibility rules are stable within a session
 *   FEASIBILITY:              3600s — mode/region/carrier/lead-time/cutoff config is
 *                                     merchant-declared and as stable as eligibility
 *                                     (RAOS-0003; deliberately NOT the volatile
 *                                     live-capacity signal — that's out of v1 scope,
 *                                     see specs/0003-fulfillment.md §6)
 *   PRICE:                    300s  — promotions can end at any minute
 *   INVENTORY:                60s   — stock is the most volatile signal
 *   QUOTE:                    (owned by the quote token itself — not a pipeline TTL)
 */
export const STAGE_TTL_DEFAULTS: Readonly<Record<string, number>> = {
  VISIBILITY:  3600,
  ELIGIBILITY: 3600,
  FEASIBILITY: 3600,
  PRICE:       300,
  FULFILLMENT: 3600,
  QUOTE:       300,   // fallback; quote tokens own their own TTL
  INVENTORY:   60,    // used by inventory evaluator directly
} as const;
