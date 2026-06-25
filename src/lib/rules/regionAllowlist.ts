/**
 * RAOS A3 — Region allowlist helper
 *
 * The existing spec (RAOS-0001) models region restrictions as a BLOCKLIST on
 * `fulfillmentConstraints.restrictedRegions`. For merchants that serve a small,
 * explicit set of countries ("US and CA only"), an ALLOWLIST is cleaner: declare
 * the countries you DO serve rather than every country you don't.
 *
 * This helper bridges the gap at the adapter layer without touching the blocklist
 * path in `calculateEligibility`. Adapters call `checkServesRegion` themselves —
 * typically inside `BuyerContextResolver.resolve` or as a pre-check before
 * forwarding to `evaluateOffer`.
 *
 * The canonical spec fold (adding allowlist semantics to RAOS-0001) is deferred;
 * TheCustomHub is the forcing case. See `case-studies/thecustomhub/02-spine-design.md §4`.
 *
 * DETERMINISM: no Date.now() / Math.random() / fetch() — pure function.
 */

import type { ComputedEligibility, EligibilityReason } from '../types/extensions';
import { deriveEligibilityStatus } from '../types/reasons';

/** The owning namespace — must match the namespace used in src/lib/rules/eligibility.ts */
const ELIGIBILITY_NAMESPACE = 'com.os.retailagent.shopping.eligibility';

/**
 * Check whether a buyer's market region is within a merchant's served-regions
 * allowlist.
 *
 * @param servesRegions - The exhaustive list of ISO 3166-1 alpha-2 country codes
 *   the merchant ships to (e.g. `['US', 'CA']`). An empty array is treated as
 *   "serves nobody" — every region is blocked. Comparisons are case-sensitive;
 *   normalise to uppercase at the call site (adapter or resolver).
 * @param marketRegion - The buyer's market region from `BuyerContext.marketRegion`
 *   (e.g. `'US'`, `'CA'`, `'GB'`).
 * @returns `ComputedEligibility`:
 *   - `{ status: 'ELIGIBLE', reasons: [] }` when `marketRegion` is in the allowlist.
 *   - `{ status: 'BLOCKED', reasons: [REGION_RESTRICTED] }` otherwise.
 *
 * @example
 * ```ts
 * const result = checkServesRegion(['US', 'CA'], context.marketRegion);
 * if (result.status === 'BLOCKED') return result; // short-circuit before evaluateOffer
 * ```
 */
export function checkServesRegion(
  servesRegions: ReadonlyArray<string>,
  marketRegion: string,
): ComputedEligibility {
  if (servesRegions.includes(marketRegion)) {
    return { status: 'ELIGIBLE', reasons: [] };
  }

  const reason: EligibilityReason = {
    code: 'REGION_RESTRICTED',
    message: `This merchant does not ship to ${marketRegion}.`,
    severity: 'BLOCK',
    // No requirements[]: there is no buyer-side action that resolves a
    // merchant-level shipping restriction. The buyer cannot "upgrade" to a
    // served region — they must shop from a supported location.
    blocking: true, // deprecated compat field; derived from severity !== 'INFO'
    source: ELIGIBILITY_NAMESPACE,
  };

  return {
    status: deriveEligibilityStatus([reason]),
    reasons: [reason],
  };
}
