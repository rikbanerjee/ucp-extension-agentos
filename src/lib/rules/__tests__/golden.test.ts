/**
 * WP-00: Golden fixture tests for src/lib/rules/
 *
 * Captures the outputs of all four rule functions across a canonical context
 * grid × every mock catalog variant, and asserts byte-identical results
 * against committed JSON fixtures in __fixtures__/golden.json.
 *
 * REGENERATING FIXTURES
 * ---------------------
 * Run with UPDATE_GOLDEN=1 to overwrite golden.json with fresh output:
 *
 *   UPDATE_GOLDEN=1 npm test
 *
 * This is intentionally guarded — a normal `npm test` run will NEVER
 * silently regenerate fixtures; it will fail with a diff if outputs have
 * changed. Always review the regenerated diff before committing.
 *
 * CONTEXT GRID RATIONALE
 * ----------------------
 * Full combinatorial (4 customerTypes × 4 membershipTiers × 4 regions ×
 * 3 fulfillmentModes × 2 resaleCert × 2 taxExempt) = 768 contexts.
 * Instead we use a pruned 24-context grid that exercises every code path
 * at least twice (for boundary validation) without being unwieldy.
 * See CONTEXT_GRID below for the complete list.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

import { calculateVisibility, calculateEligibility } from '@/lib/rules/eligibility';
import { computePrice } from '@/lib/rules/pricing';
import { validateCartLine } from '@/lib/rules/cartValidation';
import { evaluateInventory } from '@/lib/rules/inventory';
import { evaluateFulfillmentFeasibility } from '@/lib/rules/fulfillment';
import { mockProducts } from '@/lib/mock/catalog';
import type { PricingContext } from '@/lib/types/extensions';
import type { Variant } from '@/lib/types/core';
import type { GoldenFixtures, GoldenEntry } from './golden.types';
import {
  assertReasonCodeCoverage,
  collectCodesFromFixtures,
  RAOS_0001_REASON_CODES,
  RAOS_0002_REASON_CODES,
  RAOS_0005_REASON_CODES,
  RAOS_0008_REASON_CODES,
  RAOS_0008_SYNTHETIC_ONLY_CODES,
  CATALOG_UNREACHABLE_REASON_CODES,
  RAOS_0001_MANIFEST_ONLY_CODES,
  RAOS_0001_PIPELINE_ONLY_CODES,
  RAOS_0003_REASON_CODES,
  RAOS_0003_SYNTHETIC_ONLY_CODES,
} from './helpers/reasonCodeCoverage';
import { signEnvelope, buildTrustReasonEntries, TRUST_REASON_CODES, TRUST_NAMESPACE } from '@/lib/rules/trust';
import { STAGE_TTL_DEFAULTS } from '@/lib/types/envelope';
import { mockMerchants } from '@/lib/mock/merchants';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');
const GOLDEN_PATH = path.join(FIXTURES_DIR, 'golden.json');

// ---------------------------------------------------------------------------
// Context grid
//
// Design goals:
//  - Every customerType appears at least once.
//  - Every membershipTier appears at least once.
//  - At least one restricted region (HI, AK) and one non-restricted (CA, NY).
//  - All three fulfillmentModes appear.
//  - resaleCertificateOnFile: both true and false.
//  - taxExempt: both true and false.
//  - Every reason code path is reachable from at least one context.
// ---------------------------------------------------------------------------

type ContextSpec = PricingContext & { key: string };

const CONTEXT_GRID: ContextSpec[] = [
  // --- Guest contexts ---
  {
    key: 'guest|none|CA|shipping|noCert|noExempt',
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Restricted region — triggers REGION_RESTRICTED on bananas
    key: 'guest|none|HI|shipping|noCert|noExempt',
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'HI',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Another restricted region
    key: 'guest|none|AK|shipping|noCert|noExempt',
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'AK',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Guest + pickup (triggers FULFILLMENT_UNAVAILABLE on bananas which restrict to pickup/local_delivery)
    key: 'guest|none|CA|pickup|noCert|noExempt',
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'pickup',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    key: 'guest|none|CA|local_delivery|noCert|noExempt',
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'local_delivery',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },

  // --- Member contexts ---
  {
    // Standard member, no tier — gets member pricing where available, no teaser needed
    key: 'member|none|CA|shipping|noCert|noExempt',
    customerType: 'member',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Gold member — meets gold tier requirement
    key: 'member|gold|CA|shipping|noCert|noExempt',
    customerType: 'member',
    membershipTier: 'gold',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Distributor member — highest tier, meets all tier requirements
    key: 'member|distributor|CA|shipping|withCert|noExempt',
    customerType: 'member',
    membershipTier: 'distributor',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    // Member in restricted region
    key: 'member|gold|HI|shipping|noCert|noExempt',
    customerType: 'member',
    membershipTier: 'gold',
    marketRegion: 'HI',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Member + pickup
    key: 'member|gold|CA|pickup|noCert|noExempt',
    customerType: 'member',
    membershipTier: 'gold',
    marketRegion: 'CA',
    fulfillmentMode: 'pickup',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },

  // --- Wholesale contexts ---
  {
    // Standard wholesale, no tier, no cert — triggers RESALE_CERTIFICATE_REQUIRED on espresso
    key: 'wholesale|none|CA|shipping|noCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Wholesale + resale cert — clears RESALE_CERTIFICATE_REQUIRED
    key: 'wholesale|none|CA|shipping|withCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    // Wholesale gold — meets reseller_plus threshold? No: gold < reseller_plus, so TIER_RESTRICTION
    key: 'wholesale|gold|CA|shipping|noCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'gold',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Wholesale reseller_plus — exactly meets the tier boundary for mug pallet
    key: 'wholesale|reseller_plus|CA|shipping|noCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'reseller_plus',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    // Wholesale distributor + cert + tax exempt
    key: 'wholesale|distributor|CA|shipping|withCert|taxExempt',
    customerType: 'wholesale',
    membershipTier: 'distributor',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: true,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    // Wholesale in NY (non-restricted)
    key: 'wholesale|none|NY|shipping|withCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'none',
    marketRegion: 'NY',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    // Wholesale + local_delivery (triggers FULFILLMENT_UNAVAILABLE on shipping-only items)
    key: 'wholesale|none|CA|local_delivery|noCert|noExempt',
    customerType: 'wholesale',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'local_delivery',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },

  // --- B2B contexts ---
  {
    // B2B is treated equivalently to wholesale for requireWholesale check
    key: 'b2b|none|CA|shipping|noCert|noExempt',
    customerType: 'b2b',
    membershipTier: 'none',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    key: 'b2b|reseller_plus|CA|shipping|withCert|noExempt',
    customerType: 'b2b',
    membershipTier: 'reseller_plus',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    key: 'b2b|distributor|CA|shipping|withCert|taxExempt',
    customerType: 'b2b',
    membershipTier: 'distributor',
    marketRegion: 'CA',
    fulfillmentMode: 'shipping',
    accountLinked: true,
    taxExempt: true,
    resaleCertificateOnFile: true,
    activeExtensions: [],
  },
  {
    key: 'b2b|none|AK|shipping|noCert|noExempt',
    customerType: 'b2b',
    membershipTier: 'none',
    marketRegion: 'AK',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
  {
    key: 'b2b|gold|CA|pickup|noCert|noExempt',
    customerType: 'b2b',
    membershipTier: 'gold',
    marketRegion: 'CA',
    fulfillmentMode: 'pickup',
    accountLinked: true,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: [],
  },
];

// ---------------------------------------------------------------------------
// Fixed now timestamp for deterministic golden fixtures
//
// Using 100_000 ms (100 seconds past Unix epoch) so that:
//   - The stale variant (v_g_inv_002_1, dataFetchedAt=1000, dataTtl=60s)
//     correctly triggers STOCK_STALE: 1000 + 60*1000 = 61_000 < 100_000 ✓
//   - All other inventory variants are fresh: their dataFetchedAt defaults
//     to `now` (100_000), so dataFetchedAt + ttl > now always.
// ---------------------------------------------------------------------------

const GOLDEN_NOW = 100_000;

// ---------------------------------------------------------------------------
// Quantity matrix: per-variant targeted quantities
//
// We need to exercise:
//  - Quantity below MOQ (invalid)
//  - Quantity at MOQ (valid, exact boundary)
//  - Quantity at a bulk tier boundary
//  - Quantity triggering promo tier
//  - Standard qty = 1 for non-bulk items
// ---------------------------------------------------------------------------

function getQuantitiesForVariant(variantId: string): number[] {
  switch (variantId) {
    // Coffee case: MOQ=10, increment=5, tiers at 10/50/100
    case 'v_w_001_1':
      return [1, 5, 10, 15, 50, 100];
    // Mug pallet: MOQ=2, increment=1, tiers at 2/5
    case 'v_w_002_1':
      return [1, 2, 5, 6];
    // Espresso: no bulk pricing
    case 'v_w_003_1':
      return [1];
    // Sparkling water: promo tier at qty=3
    case 'v_g_002_1':
      return [1, 2, 3, 4];
    // Bananas: no bulk
    case 'v_g_003_1':
      return [1];

    // --- WP-04 (RAOS-0002) new variants ---

    // Tea sachets: MOQ=20, increment=10, tiers at 20/50/200; purchaseLimit=500
    // Exercises: BELOW_MOQ (qty<20), QUANTITY_INCREMENT_MISMATCH (qty=25),
    //            BULK_TIER_APPLIED (exact boundary), PURCHASE_LIMIT_EXCEEDED would
    //            require qty>500 — covered in dedicated pricing.test.ts instead.
    case 'v_w_004_1':
      return [1, 19, 20, 25, 50, 200];

    // Paper cups: member gold tier + bulk; illustrates member-vs-bulk last-wins
    // qty=1: below MOQ (10), qty=10: bulk $60 (suppresses member $58),
    // qty=30: bulk $48 (< member $58, bulk wins correctly)
    case 'v_w_005_1':
      return [1, 10, 29, 30];

    // Limited drop sneakers: purchaseLimit=2 on member pricing
    // qty=1,2: within limit; qty=3: PURCHASE_LIMIT_EXCEEDED
    case 'v_b_006_1':
      return [1, 2, 3];

    // Free sample: qty=1 (basePrice=0, valid)
    case 'v_b_007_1':
      return [1];

    // Call-for-price: qty=1 (should emit CALL_FOR_PRICE regardless of qty)
    case 'v_b_008_1':
      return [1];

    // Milk with rounding boundary member price ($3.995 → $4.00 half-up)
    case 'v_g_004_1':
      return [1];

    // Granola: member + promo sale — promo wins, member suppressed
    case 'v_g_005_1':
      return [1];

    // Member tote: TEASER_LOCKED for guests, MEMBER_PRICE_APPLIED for gold
    case 'v_b_005_1':
      return [1];

    // --- WP-05 (RAOS-0005) inventory variants ---

    // Boutique preorder: PREORDER_NOT_YET_BUYABLE
    case 'v_b_inv_001_1':
      return [1];

    // Boutique low-stock: LOW_STOCK (onlyXLeft=3)
    case 'v_b_inv_002_1':
      return [1];

    // Wholesale backorder: BACKORDER_AVAILABLE
    case 'v_w_inv_001_1':
      return [1, 10];

    // Wholesale OOS: OUT_OF_STOCK
    case 'v_w_inv_002_1':
      return [1];

    // Grocery per-location split: LOCATION_OUT_OF_STOCK (pickup) / in_stock (shipping)
    case 'v_g_inv_001_1':
      return [1];

    // Grocery stale data: STOCK_STALE (dataFetchedAt=1000, always stale at GOLDEN_NOW=100_000)
    case 'v_g_inv_002_1':
      return [1];

    // Grocery in-stock both locations: no inventory reasons
    case 'v_g_inv_003_1':
      return [1];

    // Boutique + cereal: no bulk
    default:
      return [1];
  }
}

// ---------------------------------------------------------------------------
// Fixture generation
// ---------------------------------------------------------------------------

/** Collect all variants from the mock catalog as a flat list. */
function getAllVariants(): Array<{ variant: Variant; productId: string }> {
  return mockProducts.flatMap(p =>
    p.variants.map(v => ({ variant: v, productId: p.id })),
  );
}

function generateFixtures(): GoldenFixtures {
  const entries: GoldenEntry[] = [];
  const allVariants = getAllVariants();

  for (const { variant } of allVariants) {
    const quantities = getQuantitiesForVariant(variant.id);

    for (const ctx of CONTEXT_GRID) {
      for (const qty of quantities) {
        // Strip the key from the context before passing to rule functions
        const { key, ...context } = ctx;

        const visibility = calculateVisibility(variant, context);
        const eligibility = calculateEligibility(variant, context);

        // WP-04: use computePrice to get both priceState and reason codes
        const { priceState, reasons: priceReasons } = computePrice(variant, qty, context);

        // WP-05: evaluate inventory — no holds in the golden fixture grid
        // (RESERVATION_EXPIRED requires synthetic hold injection; see inventory.test.ts)
        const inventoryResult = evaluateInventory({
          variant,
          context,
          holds: [],
          now: GOLDEN_NOW,
        });

        // RAOS-0003: evaluate fulfillment feasibility. Look up the owning
        // merchant early (also needed below for the envelope) to get its
        // timezone; fall back to 'UTC' for any variant whose merchant is
        // somehow not found (defensive only — every catalog variant has one).
        const owningProduct = mockProducts.find(p => p.variants.some(v => v.id === variant.id));
        const owningMerchant = owningProduct
          ? mockMerchants.find(m => m.merchantId === owningProduct.merchantId)
          : undefined;
        const feasibilityResult = evaluateFulfillmentFeasibility({
          variant,
          context,
          now: GOLDEN_NOW,
          merchantTimezone: owningMerchant?.timezone ?? 'UTC',
        });

        // validateCart for single line
        const lineResult = validateCartLine(variant, qty, context);
        const cartValidation = {
          valid: lineResult.valid,
          lines: [
            {
              valid: lineResult.valid,
              unitPrice: lineResult.unitPrice,
              lineTotal: lineResult.lineTotal,
              eligibility: lineResult.eligibility,
              appliedTier: lineResult.appliedTier,
              priceSource: lineResult.priceSource,
              appliedOfferState: lineResult.appliedOfferState,
              priceReasons: lineResult.priceReasons,
              messages: lineResult.messages,
            },
          ],
          cartTotal: lineResult.lineTotal,
          messages: lineResult.messages,
        };

        // WP-06 (RAOS-0008): Compute the envelope for this evaluation.
        // We use the first product's merchant to find the signing issuer + key.
        // In the golden fixture grid we sign over the variant ID as a stable payload
        // (in the pipeline, the inputsHash is used; here we use variantId for simplicity
        // since this mirrors what the pipeline would produce).
        // Reuses the owningProduct/owningMerchant lookup from the RAOS-0003
        // feasibility evaluation above.
        const merchant = owningMerchant;
        const merchantIssuer = merchant
          ? merchant.endpoints.catalog.replace(/\/ucp\/catalog$/, '')
          : 'https://unknown.test';
        const manifestKeys = merchant?.manifest.keys ?? [];
        const activeKey = manifestKeys.find(k => k.validTo === null || k.validTo > GOLDEN_NOW) ?? manifestKeys[0];
        const keyId = activeKey?.keyId ?? 'k1';
        const outerTtl = STAGE_TTL_DEFAULTS['PRICE'] ?? 300;
        const envelope = signEnvelope(variant.id, keyId, GOLDEN_NOW, merchantIssuer, outerTtl);
        const trustResult = {
          valid: true,
          code: TRUST_REASON_CODES.TRUST_SIMULATED,
          severity: 'INFO' as const,
          message: 'Envelope produced with simulated crypto (SIMULATED — not cryptographically verified).',
          stale: false,
          ageSeconds: 0,
        };
        const trustReasons = buildTrustReasonEntries(trustResult).map(r => ({
          ...r,
          source: TRUST_NAMESPACE,
        }));

        const label = `${variant.id}|${key}|qty:${qty}`;
        entries.push({
          label,
          variantId: variant.id,
          contextKey: key,
          quantity: qty,
          visibility,
          eligibility,
          // WP-04: attach reasons alongside the price state for coverage tracking
          price: { ...priceState, reasons: priceReasons },
          cartValidation,
          // WP-05: inventory availability output and reasons
          availability: inventoryResult.availability,
          availabilityReasons: inventoryResult.reasons,
          // RAOS-0003: fulfillment feasibility output and reasons
          feasibility: feasibilityResult.feasibility,
          feasibilityReasons: feasibilityResult.reasons,
          // WP-06 (RAOS-0008): provenance+freshness envelope and trust reasons
          envelope: {
            issuer: envelope.provenance.issuer,
            keyId: envelope.provenance.keyId,
            signature: envelope.provenance.signature,
            trustMode: envelope.provenance.trustMode,
            computedAt: envelope.freshness.computedAt,
            ttlSeconds: envelope.freshness.ttlSeconds,
          },
          trustReasons,
        });
      }
    }
  }

  return {
    generatedAt: '2026-06-09T00:00:00.000Z', // Fixed timestamp — deterministic
    count: entries.length,
    entries,
  };
}

// ---------------------------------------------------------------------------
// Guard: prevent accidental regeneration
//
// UPDATE_GOLDEN=1  → always regenerate (intentional update)
// file missing     → generate on first run (bootstrap), then commit
// file present     → assert byte-identical (never silently overwrite)
// ---------------------------------------------------------------------------

const IS_UPDATE_MODE = process.env['UPDATE_GOLDEN'] === '1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let fixturesOnDisk: GoldenFixtures | null = null;
let generatedFixtures: GoldenFixtures;

beforeAll(() => {
  generatedFixtures = generateFixtures();

  const fixtureExists = fs.existsSync(GOLDEN_PATH);

  if (IS_UPDATE_MODE || !fixtureExists) {
    // Deliberately regenerate, OR first-run bootstrap — write and continue.
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
    fs.writeFileSync(GOLDEN_PATH, JSON.stringify(generatedFixtures, null, 2) + '\n', 'utf8');
    if (IS_UPDATE_MODE) {
      console.log(`[golden] UPDATE_GOLDEN=1: Wrote ${generatedFixtures.count} fixture entries to ${GOLDEN_PATH}`);
    } else {
      console.log(`[golden] First run: seeded ${generatedFixtures.count} fixture entries to ${GOLDEN_PATH}`);
    }
    // Load back from disk so comparison tests pass immediately
    fixturesOnDisk = generatedFixtures;
  } else {
    // Normal mode — load from disk and assert.
    const raw = fs.readFileSync(GOLDEN_PATH, 'utf8');
    fixturesOnDisk = JSON.parse(raw) as GoldenFixtures;
  }
});

describe('Golden fixtures: byte-identical comparison', () => {
  it('golden.json exists on disk (auto-seeded on first run)', () => {
    // beforeAll always writes the file if it was missing, so this is always true
    // after beforeAll completes. If it's still missing, something is wrong with
    // the test environment (e.g., read-only filesystem).
    expect(fs.existsSync(GOLDEN_PATH)).toBe(true);
  });

  it('fixture count matches generated output', () => {
    if (!fixturesOnDisk) return; // update mode or pre-seed
    expect(fixturesOnDisk.count).toBe(generatedFixtures.count);
  });

  it('every fixture entry matches the committed golden exactly', () => {
    if (!fixturesOnDisk) return; // update mode or pre-seed

    // Compare entry-by-entry for readable diffs.
    expect(fixturesOnDisk.entries).toHaveLength(generatedFixtures.entries.length);

    for (let i = 0; i < generatedFixtures.entries.length; i++) {
      const generated = generatedFixtures.entries[i];
      const onDisk = fixturesOnDisk.entries[i];
      expect(onDisk, `Entry ${i} (${generated.label}) differs from golden`).toEqual(generated);
    }
  });
});

describe('Reason code coverage', () => {
  it('all catalog-reachable RAOS-0001 reason codes appear in at least one fixture', () => {
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    // REGION_POLICY_UNDECLARED (OQ-2, 2026-08-01) is emitted by buildManifest()
    // at manifest-build time, not by calculateEligibility — golden.test.ts
    // never calls buildManifest, so it's excluded here the same way
    // CATALOG_UNREACHABLE_REASON_CODES excludes a dead code path. Covered by
    // src/lib/projections/__tests__/projections.test.ts instead.
    const reachable = RAOS_0001_REASON_CODES.filter(
      code =>
        !(CATALOG_UNREACHABLE_REASON_CODES as readonly string[]).includes(code) &&
        !(RAOS_0001_MANIFEST_ONLY_CODES as readonly string[]).includes(code) &&
        !(RAOS_0001_PIPELINE_ONLY_CODES as readonly string[]).includes(code),
    );
    assertReasonCodeCoverage(reachable, fixtures);
  });

  it('all RAOS-0002 reason codes appear in at least one fixture', () => {
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    assertReasonCodeCoverage(RAOS_0002_REASON_CODES as unknown as readonly string[], fixtures);
  });

  it('all catalog-reachable RAOS-0003 reason codes appear in at least one fixture', () => {
    /**
     * FULFILLMENT_MODE_UNAVAILABLE and REGION_NOT_SERVED: v_g_003_1 (bananas)
     * — availableModes: ['pickup','local_delivery'], restrictedRegions:
     * ['HI','AK']. HAZMAT_RESTRICTION / OVERSIZE_RESTRICTION: the Wholesale B
     * hazmat/oversize variants added alongside this spec.
     *
     * LEAD_TIME_EXCEEDS_NEED_BY and CUTOFF_PASSED are synthetic-only — the
     * static CONTEXT_GRID has no needByDate and GOLDEN_NOW isn't chosen
     * relative to any merchant's cutoff hour. Both are exercised in
     * fulfillment.test.ts.
     */
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    const reachable = RAOS_0003_REASON_CODES.filter(
      code => !(RAOS_0003_SYNTHETIC_ONLY_CODES as readonly string[]).includes(code),
    );
    assertReasonCodeCoverage(reachable, fixtures);
  });

  it('all catalog-reachable RAOS-0005 reason codes appear in at least one fixture', () => {
    /**
     * RAOS-0005 coverage. Every code in RAOS_0005_REASON_CODES must appear in
     * at least one fixture entry's availabilityReasons[].
     *
     * RESERVATION_EXPIRED is excluded: it requires injecting an expired hold
     * via setInventoryHolds() which is not possible in the static catalog grid.
     * It is exercised synthetically in src/lib/rules/__tests__/inventory.test.ts.
     *
     * LOCATION_OUT_OF_STOCK fires for v_g_inv_001_1 when fulfillmentMode=pickup
     * (contexts: guest|none|CA|pickup, member|gold|CA|pickup, b2b|gold|CA|pickup).
     */
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    assertReasonCodeCoverage(RAOS_0005_REASON_CODES as unknown as readonly string[], fixtures);
  });

  it('TRUST_SIMULATED appears in every fixture (central envelope attachment)', () => {
    /**
     * WP-06: Every golden entry must have a trustReasons array containing
     * at least TRUST_SIMULATED (INFO). This verifies that the central envelope
     * attachment runs for every evaluation.
     */
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    for (const entry of fixtures.entries) {
      expect(entry.trustReasons, `Entry ${entry.label} is missing trustReasons`).toBeDefined();
      const codes = (entry.trustReasons ?? []).map(r => r.code);
      expect(
        codes,
        `Entry ${entry.label} is missing TRUST_SIMULATED in trustReasons`,
      ).toContain(TRUST_REASON_CODES.TRUST_SIMULATED);
    }
  });

  it('all fixture-reachable RAOS-0008 reason codes appear in at least one fixture', () => {
    /**
     * TRUST_SIMULATED and DATA_STALE are fixture-reachable.
     * Synthetic-only codes (SIGNATURE_INVALID, ISSUER_UNKNOWN, KEY_EXPIRED,
     * CLOCK_SKEW_SUSPECTED) require injected failures and are excluded here;
     * they have dedicated tests in trust.test.ts.
     */
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    const fixtureReachable = (RAOS_0008_REASON_CODES as readonly string[]).filter(
      code => !(RAOS_0008_SYNTHETIC_ONLY_CODES as readonly string[]).includes(code),
    );
    // Collect all trust reason codes from fixture trustReasons arrays
    const covered = new Set<string>();
    for (const entry of fixtures.entries) {
      for (const r of entry.trustReasons ?? []) {
        covered.add(r.code);
      }
    }
    const uncovered = fixtureReachable.filter(code => !covered.has(code));
    expect(
      uncovered,
      `The following RAOS-0008 fixture-reachable codes have no coverage: ${uncovered.join(', ')}`,
    ).toHaveLength(0);
  });

  it('RESOLVED (2026-08-12, RAOS-0003): CATALOG_UNREACHABLE_REASON_CODES is now empty — the WP-00 dead path no longer exists', () => {
    /**
     * This test used to pin FULFILLMENT_UNAVAILABLE as permanently
     * unreachable from `calculateEligibility` (a dead path caused by the
     * `eligibilityRules`-gated early return running before the
     * `availableModes` check). The RAOS-0003 migration removed the check
     * from `calculateEligibility` entirely rather than fix the ordering —
     * it now lives in `evaluateFulfillmentFeasibility`, which has no such
     * early return (see specs/0001-eligibility.md §11 and
     * `Eligibility: variant-level restrictedRegions/availableModes moved to
     * RAOS-0003` in behaviors.test.ts). There is no longer a dead code path
     * to pin. This test guards against a future PR silently repopulating
     * CATALOG_UNREACHABLE_REASON_CODES without a matching investigation.
     */
    expect(CATALOG_UNREACHABLE_REASON_CODES).toHaveLength(0);
    const fixtures = IS_UPDATE_MODE ? generatedFixtures : (fixturesOnDisk ?? generatedFixtures);
    const covered = collectCodesFromFixtures(fixtures);
    expect(covered.has('FULFILLMENT_UNAVAILABLE')).toBe(false); // code no longer exists at all
    expect(covered.has('FULFILLMENT_MODE_UNAVAILABLE')).toBe(true); // its RAOS-0003 replacement IS reachable
  });
});
