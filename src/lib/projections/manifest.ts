/**
 * A4 — Manifest projection
 *
 * Derives the `/.well-known/ucp` manifest payload from a `MerchantProfile`.
 *
 * OQ-1 fix (2026-08-01): this was previously a bare pass-through
 * (`return profile.manifest`), which silently dropped `MerchantProfile
 * .endpoints` and had nowhere to put `servesRegions` — an agent reading a
 * conformant manifest could not locate the catalog/cart/checkout endpoints
 * or tell which regions the merchant serves. That broke the Tier 0
 * "Discoverable" conformance claim (see
 * `specs/reference-implementation/thecustomhub/04-pilot-evidence.md` §8,
 * OQ-1).
 *
 * `buildManifest` now COMPOSES the profile's embedded manifest with
 * `profile.endpoints` and `profile.servesRegions` into a new object. The
 * embedded `manifest` field on `MerchantProfile` stays the source of truth
 * for `protocol`/`tier`/`capabilities[]`/`keys` — this function's job is to
 * make sure nothing reachable from `MerchantProfile` is lost in the
 * projection. `buildManifest(profile)` is now sufficient on its own: a
 * caller holding only its return value can serve a complete
 * `/.well-known/ucp` response without reaching back into the profile.
 *
 * OQ-2 resolution (2026-08-01, RAOS-0001 §9 — the region-policy fork):
 * `servesRegions` is now REQUIRED on `MerchantProfile` (TypeScript rejects a
 * profile that omits it), so the "undeclared" state can only ever reach this
 * function via a JS/JSON-constructed profile that bypasses that type — a
 * backstop, not the primary path. When it does happen, `buildManifest`
 * attaches ONE `REGION_POLICY_UNDECLARED` (INFO) reason to the manifest's
 * `reasons[]`, computed once here at manifest-build time rather than
 * re-derived on every `evaluateOffer` call — the same trace-noise argument
 * that governs `TRUST_SIMULATED`'s central attachment (RAOS-0008): a fact
 * that never varies per product doesn't belong in a per-product reasons list.
 *
 * DETERMINISM: pure function; no I/O, no Date.now(), no Math.random().
 */

import type { MerchantProfile, UcpManifest } from '@/lib/types/core';
import type { ReasonEntry } from '@/lib/types/reasons';

/** Owning namespace for REGION_POLICY_UNDECLARED — RAOS-0001's eligibility domain. */
const ELIGIBILITY_NAMESPACE = 'com.os.retailagent.shopping.eligibility';

/**
 * Projects a `MerchantProfile` into the `UcpManifest` shape served at
 * `/.well-known/ucp`.
 *
 * Returns a new object (no longer the same reference as
 * `profile.manifest`) composed from the profile's embedded manifest plus
 * `endpoints` and `servesRegions`. Callers MUST NOT rely on reference
 * equality with `profile.manifest`.
 *
 * Reuses the existing `UcpManifest` type from `src/lib/types/core.ts`.
 * No parallel type was created.
 *
 * @param profile - The canonical merchant profile returned by an adapter's
 *   `merchantProfile()` method.
 * @returns The `UcpManifest` ready to be serialised as the UCP discovery
 *   response body. Always includes `endpoints`. `servesRegions` mirrors the
 *   profile's value exactly (including `[]`, the deliberate "serves
 *   nowhere" declaration). `reasons` carries a single `REGION_POLICY_UNDECLARED`
 *   INFO entry only in the runtime-only undeclared-servesRegions case
 *   (unreachable from typed `MerchantProfile` construction — see RAOS-0001 §9).
 */
export function buildManifest(profile: MerchantProfile): UcpManifest {
  const manifest: UcpManifest = {
    ...profile.manifest,
    endpoints: profile.endpoints,
  };

  if (profile.servesRegions !== undefined) {
    manifest.servesRegions = profile.servesRegions;
  } else {
    // Runtime-only backstop (see doc comment above): a JS/JSON caller that
    // bypassed the required TS field. Loud, once, at manifest-build time.
    const undeclaredReason: ReasonEntry = {
      code: 'REGION_POLICY_UNDECLARED',
      message:
        'This merchant has not declared which regions it serves (servesRegions is absent). ' +
        'evaluateOffer will not block on region for this merchant until it is declared.',
      severity: 'INFO',
      blocking: false,
      source: ELIGIBILITY_NAMESPACE,
    };
    manifest.reasons = [...(manifest.reasons ?? []), undeclaredReason];
  }

  return manifest;
}
