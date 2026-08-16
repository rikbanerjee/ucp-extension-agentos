/**
 * reasonCodeCoverage
 *
 * Given a registry of known reason codes and a set of golden fixture entries,
 * asserts that every code in the registry appears in at least one fixture
 * output. Wire this test after golden fixtures are committed so new codes
 * added to the registry never silently lack test coverage.
 *
 * Usage:
 *   import { assertReasonCodeCoverage } from './helpers/reasonCodeCoverage';
 *   import goldenFixtures from './__fixtures__/golden.json';
 *   assertReasonCodeCoverage(RAOS_0001_REASON_CODES, goldenFixtures);
 */

import { expect } from 'vitest';
import type { GoldenFixtures } from '../golden.types';

/**
 * Collect every reason code that appears anywhere in the fixture set —
 * eligibility.reasons[*].code, price reasons from cartLine priceReasons,
 * and the eligibility embedded in cartLine results.
 */
export function collectCodesFromFixtures(fixtures: GoldenFixtures): Set<string> {
  const codes = new Set<string>();

  for (const entry of fixtures.entries) {
    // From calculateEligibility output
    for (const reason of entry.eligibility.reasons) {
      codes.add(reason.code);
    }
    // From price output reasons
    if (entry.price.reasons) {
      for (const reason of entry.price.reasons) {
        codes.add(reason.code);
      }
    }
    // WP-05: from inventory availability reasons
    if (entry.availabilityReasons) {
      for (const reason of entry.availabilityReasons) {
        codes.add(reason.code);
      }
    }
    // RAOS-0003: from fulfillment feasibility reasons
    if (entry.feasibilityReasons) {
      for (const reason of entry.feasibilityReasons) {
        codes.add(reason.code);
      }
    }
    // From validateCart → embedded eligibility
    for (const line of entry.cartValidation.lines) {
      for (const reason of line.eligibility.reasons) {
        codes.add(reason.code);
      }
      // From validateCart → price reasons lifted to reason codes
      if (line.priceReasons) {
        for (const reason of line.priceReasons) {
          codes.add(reason.code);
        }
      }
    }
  }

  return codes;
}

/**
 * Assert that every code in `registry` appears in at least one fixture entry.
 * Throws (via expect) if any code is uncovered.
 */
export function assertReasonCodeCoverage(
  registry: readonly string[],
  fixtures: GoldenFixtures,
): void {
  const coveredCodes = collectCodesFromFixtures(fixtures);
  const uncovered = registry.filter(code => !coveredCodes.has(code));

  expect(uncovered, `The following reason codes have no fixture coverage: ${uncovered.join(', ')}`).toHaveLength(0);
}

/**
 * Collect reason codes from the DecisionRecord's top-level reasons array
 * (which includes TRUST_SIMULATED from RAOS-0008 central attachment).
 * This supplements collectCodesFromFixtures for trust-domain codes.
 */
export function collectCodesFromDecisionReasons(
  reasons: Array<{ code: string }>,
): Set<string> {
  const codes = new Set<string>();
  for (const r of reasons) {
    codes.add(r.code);
  }
  return codes;
}

/**
 * The canonical RAOS-0001 reason code registry.
 * Source of truth: specs/0001-eligibility.md
 *
 * REGION_POLICY_UNDECLARED (added 2026-08-01, OQ-2 resolution — §9): INFO
 * severity, additive. NOT emitted by calculateEligibility or the eligibility
 * evaluator — it is emitted by buildManifest() at manifest-build time (see
 * RAOS_0001_MANIFEST_ONLY_CODES below), so it can never appear in golden
 * fixtures, which only ever call calculateEligibility/evaluateOffer directly.
 */
/**
 * RAOS-0003 migration (2026-08-12, engine 0.3.0, BREAKING): FULFILLMENT_
 * UNAVAILABLE removed from this list — renamed FULFILLMENT_MODE_UNAVAILABLE
 * and re-sourced under RAOS_0003_REASON_CODES below (see
 * specs/0001-eligibility.md §11 changelog). No dual-emit: 0001's evaluator
 * no longer produces this code at all.
 */
export const RAOS_0001_REASON_CODES = [
  'HIDDEN_PRODUCT',
  'REGION_RESTRICTED',
  'WHOLESALE_ONLY',
  'RESALE_CERTIFICATE_REQUIRED',
  'TIER_RESTRICTION',
  'REGION_POLICY_UNDECLARED',
] as const;

/**
 * RAOS-0001 codes that are emitted by `buildManifest()` (manifest-build
 * time — RAOS-0000's projection layer) rather than by the eligibility
 * evaluator or `calculateEligibility` directly. Structurally the same
 * "can't appear in the golden fixture grid" situation as
 * `CATALOG_UNREACHABLE_REASON_CODES` and the various `*_SYNTHETIC_ONLY_CODES`
 * lists below, but for a different reason: golden.test.ts never calls
 * buildManifest. Covered instead by
 * src/lib/projections/__tests__/projections.test.ts.
 */
export const RAOS_0001_MANIFEST_ONLY_CODES = ['REGION_POLICY_UNDECLARED'] as const;

/**
 * RAOS-0001 codes only reachable via `evaluateOffer`'s merchant-level
 * short-circuit (`checkServesRegion` / `servesRegions`, RAOS-0001 §9.6), not
 * via `calculateEligibility` called directly.
 *
 * REGION_RESTRICTED (2026-08-12, RAOS-0003 migration): before this
 * migration it was ALSO reachable through the (now removed)
 * variant-level `fulfillmentConstraints.restrictedRegions` check inside
 * `calculateEligibility`, which is how it appeared in the golden fixture
 * grid. That check has moved to RAOS-0003 (REGION_NOT_SERVED — a
 * deliberately distinct code, see specs/0001-eligibility.md §11). The
 * merchant-level servesRegions path was, and remains, untouched — but
 * golden.test.ts calls calculateEligibility directly and never
 * evaluateOffer, so it is the ONLY path left and this test file can't
 * observe it. Covered instead by
 * src/lib/extensions/__tests__/pipeline.test.ts
 * ("pipeline: region allowlist (RAOS-0001 OQ-2)").
 */
export const RAOS_0001_PIPELINE_ONLY_CODES = ['REGION_RESTRICTED'] as const;

/**
 * The canonical RAOS-0002 reason code registry.
 * Source of truth: specs/0002-contextual-pricing.md
 *
 * Synthetic-only exceptions (codes that cannot appear in golden fixtures but
 * ARE exercised in dedicated unit tests):
 *   - PURCHASE_LIMIT_EXCEEDED: requires a quantity > purchaseLimit to trigger;
 *     the golden fixture grid only exercises representative quantities. The
 *     dedicated unit test in pricing.test.ts covers it synthetically.
 *     NOTE: We DO include it in fixtures via the new mock variants, so it
 *     appears in the golden when the test grid hits v_b_006_1 at qty=3.
 */
export const RAOS_0002_REASON_CODES = [
  'MEMBER_PRICE_APPLIED',
  'TEASER_LOCKED',
  'BULK_TIER_APPLIED',
  'BELOW_MOQ',
  'QUANTITY_INCREMENT_MISMATCH',
  'PURCHASE_LIMIT_EXCEEDED',
  'CALL_FOR_PRICE',
] as const;

/**
 * The canonical RAOS-0005 reason code registry.
 * Source of truth: specs/0005-inventory.md
 *
 * Synthetic-only exceptions (codes that cannot appear in golden fixtures
 * but ARE exercised in dedicated unit tests):
 *   - RESERVATION_EXPIRED: requires injecting an expired hold via
 *     setInventoryHolds() — not achievable via the catalog-only fixture grid.
 *     Covered in a dedicated inventory.test.ts with synthetic hold state.
 *     Documented as a synthetic exception below.
 *
 * STOCK_STALE is covered by the 'v_g_inv_002_1' variant which has
 * dataFetchedAt=1000 (1s after Unix epoch), making it stale for any
 * realistic now value.
 */
export const RAOS_0005_REASON_CODES = [
  'OUT_OF_STOCK',
  'LOW_STOCK',
  'BACKORDER_AVAILABLE',
  'PREORDER_NOT_YET_BUYABLE',
  'STOCK_STALE',
  'LOCATION_OUT_OF_STOCK',
] as const;

/**
 * RAOS-0005 reason codes that require synthetic injection (cannot appear
 * in the static catalog-based golden fixture grid).
 *
 * RESERVATION_EXPIRED requires an expired InventoryHold passed via
 * setInventoryHolds(). The golden fixture grid does not inject holds.
 * Covered in src/lib/rules/__tests__/inventory.test.ts.
 */
export const RAOS_0005_SYNTHETIC_ONLY_CODES = ['RESERVATION_EXPIRED'] as const;

export type Raos0005ReasonCode = typeof RAOS_0005_REASON_CODES[number];

/**
 * RESOLVED (2026-08-12, RAOS-0003 migration, engine 0.3.0): this list used
 * to pin FULFILLMENT_UNAVAILABLE as permanently unreachable from the mock
 * catalog (a WP-00 dead-path bug in the old `calculateEligibility`'s
 * `eligibilityRules`-gated early return). The fix was to MOVE the check
 * (renamed FULFILLMENT_MODE_UNAVAILABLE) into evaluateFulfillmentFeasibility,
 * which has no such early return — see specs/0001-eligibility.md §11 and
 * specs/0003-fulfillment.md §3. There is no longer a dead-code path to pin;
 * kept as an empty tuple (not deleted) so any future reintroduction of a
 * catalog-unreachable code has an obvious place to land, and so the export
 * name stays stable for existing importers.
 */
export const CATALOG_UNREACHABLE_REASON_CODES = [] as const;

export type Raos0001ReasonCode = typeof RAOS_0001_REASON_CODES[number];
export type Raos0002ReasonCode = typeof RAOS_0002_REASON_CODES[number];

/**
 * The canonical RAOS-0003 reason code registry.
 * Source of truth: specs/0003-fulfillment.md
 *
 * Fixture-reachable (from the static catalog grid, via the mode/region
 * banana variant and the hazmat/oversize wholesale variants):
 *   FULFILLMENT_MODE_UNAVAILABLE, REGION_NOT_SERVED, HAZMAT_RESTRICTION,
 *   OVERSIZE_RESTRICTION
 *
 * Synthetic-only (require BuyerContext.needByDate or a specific injected
 * `now` relative to the merchant's local cutoff hour — not naturally
 * produced by the static CONTEXT_GRID, which has neither):
 *   LEAD_TIME_EXCEEDS_NEED_BY, CUTOFF_PASSED
 * Both are exercised in src/lib/rules/__tests__/fulfillment.test.ts.
 */
export const RAOS_0003_REASON_CODES = [
  'FULFILLMENT_MODE_UNAVAILABLE',
  'REGION_NOT_SERVED',
  'HAZMAT_RESTRICTION',
  'OVERSIZE_RESTRICTION',
  'LEAD_TIME_EXCEEDS_NEED_BY',
  'CUTOFF_PASSED',
] as const;

export const RAOS_0003_SYNTHETIC_ONLY_CODES = [
  'LEAD_TIME_EXCEEDS_NEED_BY',
  'CUTOFF_PASSED',
] as const;

export type Raos0003ReasonCode = typeof RAOS_0003_REASON_CODES[number];

/**
 * The canonical RAOS-0008 reason code registry.
 * Source of truth: specs/0008-trust-provenance.md
 *
 * Fixture-reachable codes:
 *   - TRUST_SIMULATED: always emitted — appears in every golden entry
 *     (central attachment in pipeline.ts prepends it to every DecisionRecord).
 *   - DATA_STALE: reachable via the stale-data offset in the golden generation
 *     or via the dedicated trust.test.ts.
 *
 * Synthetic-only codes (cannot be produced from the static catalog fixture grid):
 *   - SIGNATURE_INVALID: requires injecting a mismatched payload to verifyEnvelope.
 *   - ISSUER_UNKNOWN:    requires a keyId not present in merchant.manifest.keys[].
 *   - KEY_EXPIRED:       requires a key with validTo < now.
 *   - CLOCK_SKEW_SUSPECTED: requires computedAt > now + tolerance.
 *
 * All synthetic-only codes have dedicated tests in trust.test.ts.
 */
export const RAOS_0008_REASON_CODES = [
  'TRUST_SIMULATED',
  'DATA_STALE',
  'SIGNATURE_INVALID',
  'ISSUER_UNKNOWN',
  'KEY_EXPIRED',
  'CLOCK_SKEW_SUSPECTED',
] as const;

/**
 * RAOS-0008 codes that require synthetic injection (cannot appear in the
 * static catalog-based golden fixture grid). Each has dedicated unit tests
 * in src/lib/rules/__tests__/trust.test.ts.
 *
 * DATA_STALE: requires a now value past (computedAt + ttlSeconds*1000). The
 *   golden fixture grid uses GOLDEN_NOW=100_000 and a 300s TTL, so data would
 *   be stale only at now > 400_000ms — the grid doesn't have a stale fixture
 *   for the outer pipeline envelope. The inventory-level STOCK_STALE is tested
 *   in the fixture grid (v_g_inv_002_1). DATA_STALE (trust-domain) is tested
 *   synthetically in trust.test.ts.
 * SIGNATURE_INVALID: requires injecting a mismatched payload to verifyEnvelope.
 * ISSUER_UNKNOWN:    requires a keyId not present in merchant.manifest.keys[].
 * KEY_EXPIRED:       requires a key with validTo < now.
 * CLOCK_SKEW_SUSPECTED: requires computedAt > now + tolerance.
 */
export const RAOS_0008_SYNTHETIC_ONLY_CODES = [
  'DATA_STALE',
  'SIGNATURE_INVALID',
  'ISSUER_UNKNOWN',
  'KEY_EXPIRED',
  'CLOCK_SKEW_SUSPECTED',
] as const;

export type Raos0008ReasonCode = typeof RAOS_0008_REASON_CODES[number];

/**
 * The canonical RAOS-0007 reason code registry.
 * Source of truth: specs/0007-quote-integrity.md
 *
 * Synthetic-only note:
 *   ALL codes (including QUOTE_ISSUED) are synthetic-only. The golden test
 *   calls rule functions directly (calculateEligibility, computePrice,
 *   evaluateInventory) and never invokes evaluateOffer, so the QUOTE-stage
 *   evaluator never runs and QUOTE_ISSUED never appears in static fixtures.
 *   All 7 codes are exercised in quote.test.ts via issueQuote/validateQuote
 *   with explicit `now` injection.
 *
 * Synthetic-only codes (no golden fixture coverage):
 *   QUOTE_ISSUED, QUOTE_EXPIRED, QUOTE_CONTEXT_CHANGED, QUOTE_STOCK_LOST,
 *   QUOTE_PARTIALLY_HONORED, QUOTE_FORGED, QUOTE_HONORED_GRACE
 */
export const RAOS_0007_REASON_CODES = [
  'QUOTE_ISSUED',
  'QUOTE_EXPIRED',
  'QUOTE_CONTEXT_CHANGED',
  'QUOTE_STOCK_LOST',
  'QUOTE_PARTIALLY_HONORED',
  'QUOTE_FORGED',
  'QUOTE_HONORED_GRACE',
] as const;

/**
 * RAOS-0007 codes that require synthetic injection.
 * ALL codes are synthetic-only because the golden test calls rule functions
 * directly and never invokes the QUOTE-stage evaluator (evaluateOffer).
 * Every code is exercised in src/lib/rules/__tests__/quote.test.ts.
 */
export const RAOS_0007_SYNTHETIC_ONLY_CODES = [
  'QUOTE_ISSUED',
  'QUOTE_EXPIRED',
  'QUOTE_CONTEXT_CHANGED',
  'QUOTE_STOCK_LOST',
  'QUOTE_PARTIALLY_HONORED',
  'QUOTE_FORGED',
  'QUOTE_HONORED_GRACE',
] as const;

export type Raos0007ReasonCode = typeof RAOS_0007_REASON_CODES[number];
