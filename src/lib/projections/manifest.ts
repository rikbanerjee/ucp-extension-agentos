/**
 * A4 — Manifest projection
 *
 * Derives the `/.well-known/ucp` manifest payload from a `MerchantProfile`.
 *
 * The manifest is already embedded on the profile (MerchantProfile.manifest),
 * so this function is a deliberate pass-through rather than a re-derivation.
 * Its value is architectural: callers depend on THIS function, not on knowing
 * where the manifest lives inside the profile. If the embedding changes in a
 * future spec version, only this function needs updating — not every handler.
 *
 * DETERMINISM: pure function; no I/O, no Date.now(), no Math.random().
 */

import type { MerchantProfile, UcpManifest } from '@/lib/types/core';

/**
 * Projects a `MerchantProfile` into the `UcpManifest` shape served at
 * `/.well-known/ucp`.
 *
 * The returned object is the profile's embedded manifest. Callers MUST NOT
 * mutate it — clone first if you need to patch fields before serialising.
 *
 * Reuses the existing `UcpManifest` type from `src/lib/types/core.ts`.
 * No parallel type was created.
 *
 * @param profile - The canonical merchant profile returned by an adapter's
 *   `merchantProfile()` method.
 * @returns The `UcpManifest` ready to be serialised as the UCP discovery
 *   response body.
 */
export function buildManifest(profile: MerchantProfile): UcpManifest {
  return profile.manifest;
}
