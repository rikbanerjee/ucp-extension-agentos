// Typed, GENERATED data source for /evidence/conformance (SWP-5 / EVIDENCE-PLAN E4).
//
// Nothing in this file is hand-asserted. Every row is derived, at import time
// (build time for the static page/route), from the same modules the test
// suite imports:
//   - Reason-code inventory: src/lib/extensions/registry.ts `byStage()` — the
//     registered evaluators' own `reasonCodes` declarations (RAOS-0001/0002/
//     0005/0007) plus the RAOS-0008 trust codes, which are centrally attached
//     by the pipeline rather than registry-evaluated (src/lib/rules/trust.ts).
//   - Fixture coverage: the committed golden fixture JSON
//     (src/lib/rules/__tests__/__fixtures__/golden.json) — the exact file
//     src/lib/rules/__tests__/golden.test.ts asserts byte-identical output
//     against. A code is "fixture covered" iff it appears in at least one
//     golden entry's reasons.
//   - Archetype grid: src/lib/mock/merchants.ts `mockMerchants[].manifest.
//     capabilities[]` — the same manifest data the Playground and
//     `/.well-known/ucp` route serve.
//
// DETERMINISM: no fetch(), no Date.now(), no Math.random(). Pure imports.
//
// SYNTHETIC-ONLY EXCEPTIONS: a handful of reason codes cannot appear in the
// static catalog-based golden fixture grid (they require injected failure
// state — an expired hold, a forged signature, an issued quote). These are
// documented, individually named exceptions with a pointer to the dedicated
// unit test that exercises them — mirroring the exact exception lists golden
// tests use in src/lib/rules/__tests__/helpers/reasonCodeCoverage.ts
// (CATALOG_UNREACHABLE_REASON_CODES, RAOS_0005_SYNTHETIC_ONLY_CODES,
// RAOS_0007_SYNTHETIC_ONLY_CODES, RAOS_0008_SYNTHETIC_ONLY_CODES) and the
// filters golden.test.ts applies before calling assertReasonCodeCoverage.
// Duplicated here (not imported) to keep test-only helpers (which import
// `vitest`) out of the app bundle — this file is a plain data module.
// If those lists ever change, this page's numbers can drift; `npx vitest run`
// stays the enforcement mechanism for the underlying claim, this page is the
// public rendering of it.
//
// A reason code that is neither fixture-covered NOR a documented synthetic
// exception renders red/uncovered — that's the acceptance test: add a new
// evaluator reason code without adding fixture coverage (or a documented
// exception here) and it visibly breaks the scoreboard.

import { byStage } from '@/lib/extensions';
import { TRUST_NAMESPACE, TRUST_REASON_CODES } from '@/lib/rules/trust';
import { mockMerchants } from '@/lib/mock/merchants';
import type { GoldenFixtures } from '@/lib/rules/__tests__/golden.types';

import goldenFixturesRaw from '@/lib/rules/__tests__/__fixtures__/golden.json';

const goldenFixtures = goldenFixturesRaw as unknown as GoldenFixtures;

// ---------------------------------------------------------------------------
// Published spec identity (built specs only — per SITE-PLAN §1 claim
// discipline. Planned specs 0004/0006/0009/0010/0011/0012/0013pt2/0014+
// are never listed here as covered. 0003 shipped 2026-08-12 — RAOS-0003,
// promoted Tier 4 → Tier 1.)
// ---------------------------------------------------------------------------

export type PublishedSpecId = '0000' | '0001' | '0002' | '0003' | '0005' | '0007' | '0008' | '0013pt1';

export const PUBLISHED_SPECS: Record<
  PublishedSpecId,
  { title: string; namespace: string; specFile: string }
> = {
  '0000': { title: 'Protocol Foundations, Context & Conformance', namespace: '…core', specFile: 'specs/0000-foundations.md' },
  '0001': { title: 'Eligibility & Visibility Semantics', namespace: '…eligibility / …visibility', specFile: 'specs/0001-eligibility.md' },
  '0002': { title: 'Contextual Pricing (Member + Bulk)', namespace: '…member_pricing / …bulk_pricing', specFile: 'specs/0002-contextual-pricing.md' },
  '0003': { title: 'Fulfillment Feasibility', namespace: '…fulfillment_constraints', specFile: 'specs/0003-fulfillment.md' },
  '0005': { title: 'Inventory & Availability', namespace: '…inventory', specFile: 'specs/0005-inventory.md' },
  '0007': { title: 'Quote Integrity & Price Lock', namespace: '…quote', specFile: 'specs/0007-quote-integrity.md' },
  '0008': { title: 'Trust, Provenance & Freshness', namespace: '…trust', specFile: 'specs/0008-trust-provenance.md' },
  '0013pt1': { title: 'Decision Trace (three audiences)', namespace: '…trace', specFile: 'specs/0013-intent-capture.md' },
};

// Namespace -> spec, for registry evaluators (RAOS-0001/0002/0003/0005/0007).
const NAMESPACE_TO_SPEC: Record<string, PublishedSpecId> = {
  'com.os.retailagent.shopping.visibility': '0001',
  'com.os.retailagent.shopping.eligibility': '0001',
  'com.os.retailagent.shopping.fulfillment_constraints': '0003',
  'com.os.retailagent.shopping.pricing': '0002',
  'com.os.retailagent.shopping.inventory': '0005',
  'com.os.retailagent.shopping.quote': '0007',
};

// ---------------------------------------------------------------------------
// Documented synthetic-only exceptions (code -> why it can't be fixture-
// covered + which dedicated unit test exercises it instead).
// ---------------------------------------------------------------------------

interface SyntheticException {
  testFile: string;
  reason: string;
}

const SYNTHETIC_ONLY_EXCEPTIONS: Record<string, SyntheticException> = {
  // RAOS-0003 — RAOS_0003_SYNTHETIC_ONLY_CODES (2026-08-12). FULFILLMENT_UNAVAILABLE
  // (formerly listed here as a CATALOG_UNREACHABLE_REASON_CODES pin) no longer
  // exists — deprecated, renamed FULFILLMENT_MODE_UNAVAILABLE, and now reachable
  // from the catalog grid. See specs/0001-eligibility.md §11 v2.0.0.
  LEAD_TIME_EXCEEDS_NEED_BY: {
    testFile: 'src/lib/rules/__tests__/fulfillment.test.ts',
    reason: 'Requires an asserted BuyerContext.needByDate — the static golden CONTEXT_GRID has none, so this can never appear in the fixture grid.',
  },
  CUTOFF_PASSED: {
    testFile: 'src/lib/rules/__tests__/fulfillment.test.ts',
    reason: "Requires an injected `now` past the merchant-local cutoff hour — GOLDEN_NOW isn't chosen relative to any merchant's cutoffHourLocal, so this can never appear in the fixture grid.",
  },
  // RAOS-0005 — RAOS_0005_SYNTHETIC_ONLY_CODES
  RESERVATION_EXPIRED: {
    testFile: 'src/lib/rules/__tests__/inventory.test.ts',
    reason: 'Requires an injected expired InventoryHold via setInventoryHolds() — not reachable from the static catalog fixture grid.',
  },
  // RAOS-0007 — RAOS_0007_SYNTHETIC_ONLY_CODES (ALL codes; golden.test.ts never
  // invokes the QUOTE-stage evaluator — it calls rule functions directly)
  QUOTE_ISSUED: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Golden fixtures call rule functions directly and never invoke evaluateOffer/the QUOTE stage.' },
  QUOTE_EXPIRED: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Requires issueQuote + validateQuote with an injected expired `now` — not produced by the fixture grid.' },
  QUOTE_CONTEXT_CHANGED: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Requires re-validating a quote against a changed BuyerContext — not produced by the fixture grid.' },
  QUOTE_STOCK_LOST: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Requires stock to change between quote issuance and validation — not produced by the fixture grid.' },
  QUOTE_PARTIALLY_HONORED: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: "Requires a partial-honor HonorPolicy (Grocery C) exercised at validate time — not produced by the fixture grid." },
  QUOTE_FORGED: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Requires an injected mismatched/forged quote payload — not produced by the fixture grid.' },
  QUOTE_HONORED_GRACE: { testFile: 'src/lib/rules/__tests__/quote.test.ts', reason: 'Requires validating a quote inside its honor-grace window after nominal expiry — not produced by the fixture grid.' },
  // RAOS-0008 — RAOS_0008_SYNTHETIC_ONLY_CODES
  DATA_STALE: { testFile: 'src/lib/rules/__tests__/trust.test.ts', reason: 'Requires a `now` past (computedAt + ttlSeconds*1000) for the outer trust envelope — the golden grid’s GOLDEN_NOW/TTL combination never crosses that boundary.' },
  SIGNATURE_INVALID: { testFile: 'src/lib/rules/__tests__/trust.test.ts', reason: 'Requires injecting a mismatched payload into verifyEnvelope.' },
  ISSUER_UNKNOWN: { testFile: 'src/lib/rules/__tests__/trust.test.ts', reason: "Requires a keyId not present in the merchant manifest's keys[]." },
  KEY_EXPIRED: { testFile: 'src/lib/rules/__tests__/trust.test.ts', reason: 'Requires a signing key with validTo < now.' },
  CLOCK_SKEW_SUSPECTED: { testFile: 'src/lib/rules/__tests__/trust.test.ts', reason: 'Requires computedAt > now + tolerance.' },
  // RAOS-0001 — manifest-build attachment, not registry-evaluated (added
  // 2026-08-01, OQ-2 resolution — see the REGION_POLICY_UNDECLARED note
  // below and specs/0001-eligibility.md §9).
  REGION_POLICY_UNDECLARED: {
    testFile: 'src/lib/projections/__tests__/projections.test.ts',
    reason: 'Emitted by buildManifest() at manifest-build time when MerchantProfile.servesRegions is undefined — a state the required TS field prevents for typed profiles; only reachable via JS/JSON-constructed profiles. golden.test.ts never calls buildManifest, so this can never appear in the fixture grid.',
  },
};

// ---------------------------------------------------------------------------
// Fixture coverage — collected directly from the committed golden.json,
// the same file golden.test.ts diffs byte-for-byte.
// ---------------------------------------------------------------------------

function collectCodesFromFixtures(fixtures: GoldenFixtures): Set<string> {
  const codes = new Set<string>();
  for (const entry of fixtures.entries) {
    for (const reason of entry.eligibility.reasons) codes.add(reason.code);
    if (entry.price.reasons) for (const reason of entry.price.reasons) codes.add(reason.code);
    if (entry.availabilityReasons) for (const reason of entry.availabilityReasons) codes.add(reason.code);
    if (entry.feasibilityReasons) for (const reason of entry.feasibilityReasons) codes.add(reason.code);
    if (entry.trustReasons) for (const reason of entry.trustReasons) codes.add(reason.code);
    for (const line of entry.cartValidation.lines) {
      for (const reason of line.eligibility.reasons) codes.add(reason.code);
      if (line.priceReasons) for (const reason of line.priceReasons) codes.add(reason.code);
    }
  }
  return codes;
}

const fixtureCoveredCodes = collectCodesFromFixtures(goldenFixtures);

// ---------------------------------------------------------------------------
// Reason-code inventory — one row per (spec, code), generated from the
// registry (RAOS-0001/0002/0005/0007) + the trust module's centrally
// attached codes (RAOS-0008). RAOS-0000 and RAOS-0013pt1 emit no reason
// codes of their own (structural / rendering specs) and are intentionally
// absent from this table.
// ---------------------------------------------------------------------------

export interface ReasonCodeRow {
  code: string;
  specId: PublishedSpecId;
  /** Evaluator namespace(s) that declare this code. */
  sources: string[];
  fixtureCovered: boolean;
  syntheticException?: SyntheticException;
  /** fixtureCovered || a documented synthetic exception. */
  covered: boolean;
}

function buildReasonCodeInventory(): ReasonCodeRow[] {
  // rows[code] accumulates sources across evaluators that share a code
  // (HIDDEN_PRODUCT / REGION_RESTRICTED are declared by both the visibility
  // and eligibility evaluators).
  const rows = new Map<string, ReasonCodeRow>();

  const stageMap = byStage();
  for (const evaluators of stageMap.values()) {
    for (const ext of evaluators) {
      const specId = NAMESPACE_TO_SPEC[ext.namespace];
      if (!specId) continue; // not one of the published specs this scoreboard covers
      for (const code of ext.reasonCodes) {
        const existing = rows.get(code);
        if (existing) {
          existing.sources.push(ext.namespace);
          continue;
        }
        rows.set(code, {
          code,
          specId,
          sources: [ext.namespace],
          fixtureCovered: fixtureCoveredCodes.has(code),
          syntheticException: SYNTHETIC_ONLY_EXCEPTIONS[code],
          covered: fixtureCoveredCodes.has(code) || Boolean(SYNTHETIC_ONLY_EXCEPTIONS[code]),
        });
      }
    }
  }

  // RAOS-0008 — central attachment, not registry-evaluated.
  for (const code of Object.values(TRUST_REASON_CODES)) {
    rows.set(code, {
      code,
      specId: '0008',
      sources: [TRUST_NAMESPACE],
      fixtureCovered: fixtureCoveredCodes.has(code),
      syntheticException: SYNTHETIC_ONLY_EXCEPTIONS[code],
      covered: fixtureCoveredCodes.has(code) || Boolean(SYNTHETIC_ONLY_EXCEPTIONS[code]),
    });
  }

  // RAOS-0001 — REGION_POLICY_UNDECLARED (added 2026-08-01, OQ-2 resolution):
  // manifest-build attachment (buildManifest), not registry-evaluated —
  // mirrors the RAOS-0008 central-attachment pattern immediately above.
  // Not declared on the eligibility evaluator's reasonCodes[] because the
  // evaluator never emits it; buildManifest does. See
  // specs/0001-eligibility.md §9 for the full resolution.
  rows.set('REGION_POLICY_UNDECLARED', {
    code: 'REGION_POLICY_UNDECLARED',
    specId: '0001',
    sources: ['com.os.retailagent.shopping.eligibility (buildManifest — manifest-build time, not a registered evaluator)'],
    fixtureCovered: fixtureCoveredCodes.has('REGION_POLICY_UNDECLARED'),
    syntheticException: SYNTHETIC_ONLY_EXCEPTIONS['REGION_POLICY_UNDECLARED'],
    covered:
      fixtureCoveredCodes.has('REGION_POLICY_UNDECLARED') ||
      Boolean(SYNTHETIC_ONLY_EXCEPTIONS['REGION_POLICY_UNDECLARED']),
  });

  return Array.from(rows.values()).sort((a, b) => {
    if (a.specId !== b.specId) return a.specId.localeCompare(b.specId);
    return a.code.localeCompare(b.code);
  });
}

export const REASON_CODE_INVENTORY: ReasonCodeRow[] = buildReasonCodeInventory();

export const REASON_CODE_SUMMARY = {
  total: REASON_CODE_INVENTORY.length,
  covered: REASON_CODE_INVENTORY.filter(r => r.covered).length,
  uncovered: REASON_CODE_INVENTORY.filter(r => !r.covered).length,
  fixtureCoveredDirectly: REASON_CODE_INVENTORY.filter(r => r.fixtureCovered).length,
  syntheticExceptionOnly: REASON_CODE_INVENTORY.filter(r => !r.fixtureCovered && r.covered).length,
};

// ---------------------------------------------------------------------------
// Archetype × spec coverage grid — derived from mockMerchants[].manifest.
// capabilities[].namespace. A cell is "exercised" iff at least one capability
// with a namespace mapped to that spec is present in the merchant's manifest.
// ---------------------------------------------------------------------------

// Namespace -> spec, for the capability catalog (broader than the registry
// map above: includes pricing sub-namespaces that all roll up to RAOS-0002).
const CAPABILITY_NAMESPACE_TO_SPEC: Record<string, PublishedSpecId> = {
  'com.os.retailagent.shopping.visibility': '0001',
  'com.os.retailagent.shopping.eligibility': '0001',
  'com.os.retailagent.shopping.member_pricing': '0002',
  'com.os.retailagent.shopping.bulk_pricing': '0002',
  'com.os.retailagent.shopping.promo_pricing': '0002',
  'com.os.retailagent.shopping.pricing': '0002',
  'com.os.retailagent.shopping.fulfillment_constraints': '0003',
  'com.os.retailagent.shopping.inventory': '0005',
  'com.os.retailagent.shopping.quote': '0007',
  'com.os.retailagent.shopping.trust': '0008',
};

export interface ArchetypeCell {
  specId: PublishedSpecId;
  /** null = not derivable from mock data (no capability toggle exists for this spec). */
  exercised: boolean | null;
  /** Capability namespaces on this merchant that back the cell (empty if not exercised/derivable). */
  namespaces: string[];
  /**
   * RAOS-0001 OQ-2 (2026-08-01, §9): Tier 1 "Qualified" conformance now
   * requires a merchant to have DECLARED its region-serving policy
   * (`MerchantProfile.servesRegions !== undefined` — `[]` counts as
   * declared, "serves nowhere"). Only meaningful on the '0001' cell; `null`
   * for every other spec. This is the scoreboard-side half of OQ-2's
   * loud-not-silent design: `buildManifest` makes the undeclared state
   * visible on the wire (`REGION_POLICY_UNDECLARED`), and this flags it
   * against the Tier 1 requirement for whoever is checking a merchant's
   * conformance, not just an agent reading one manifest at a time.
   */
  regionPolicyDeclared: boolean | null;
}

export interface ArchetypeRow {
  merchantId: string;
  merchantName: string;
  headlineTier: number;
  cells: Record<PublishedSpecId, ArchetypeCell>;
}

const ARCHETYPE_SPEC_ORDER: PublishedSpecId[] = ['0000', '0001', '0002', '0003', '0005', '0007', '0008', '0013pt1'];

function buildArchetypeGrid(): ArchetypeRow[] {
  return mockMerchants.map(merchant => {
    const namespaces = merchant.manifest.capabilities.map(c => c.namespace);

    const cells = {} as Record<PublishedSpecId, ArchetypeCell>;
    for (const specId of ARCHETYPE_SPEC_ORDER) {
      if (specId === '0000') {
        // RAOS-0000 (foundations): every merchant with a declared protocol +
        // tier + non-empty capabilities[] is exercising the negotiation
        // surface RAOS-0000 defines. No dedicated capability id exists for
        // "foundations" itself — this is the closest programmatic proxy.
        const exercised = Boolean(merchant.manifest.protocol) && typeof merchant.manifest.tier === 'number' && merchant.manifest.capabilities.length > 0;
        cells[specId] = { specId, exercised, namespaces: [], regionPolicyDeclared: null };
        continue;
      }
      if (specId === '0013pt1') {
        // Decision Trace is a rendering layer over DecisionRecord, not a
        // negotiated capability — there is no capability id to check against
        // per-merchant mock data. Honest answer: not derivable this way.
        cells[specId] = { specId, exercised: null, namespaces: [], regionPolicyDeclared: null };
        continue;
      }
      const matches = namespaces.filter(ns => CAPABILITY_NAMESPACE_TO_SPEC[ns] === specId);
      cells[specId] = {
        specId,
        exercised: matches.length > 0,
        namespaces: Array.from(new Set(matches)),
        regionPolicyDeclared: specId === '0001' ? merchant.servesRegions !== undefined : null,
      };
    }

    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      headlineTier: merchant.manifest.tier,
      cells,
    };
  });
}

export const ARCHETYPE_GRID: ArchetypeRow[] = buildArchetypeGrid();
export { ARCHETYPE_SPEC_ORDER };

// ---------------------------------------------------------------------------
// Full payload shared by the page and the JSON route — one source, two
// renderers.
// ---------------------------------------------------------------------------

export interface ConformancePayload {
  generatedFrom: {
    reasonCodeInventory: string[];
    fixtures: string;
    archetypeGrid: string;
  };
  goldenFixtureGeneratedAt: string;
  summary: typeof REASON_CODE_SUMMARY;
  reasonCodes: ReasonCodeRow[];
  archetypes: ArchetypeRow[];
  specOrder: PublishedSpecId[];
  publishedSpecs: typeof PUBLISHED_SPECS;
}

export function getConformancePayload(): ConformancePayload {
  return {
    generatedFrom: {
      reasonCodeInventory: [
        'src/lib/extensions/registry.ts (byStage() -> evaluator.reasonCodes)',
        'src/lib/rules/trust.ts (TRUST_REASON_CODES, centrally attached)',
      ],
      fixtures: 'src/lib/rules/__tests__/__fixtures__/golden.json',
      archetypeGrid: 'src/lib/mock/merchants.ts (mockMerchants[].manifest.capabilities[].namespace)',
    },
    goldenFixtureGeneratedAt: goldenFixtures.generatedAt,
    summary: REASON_CODE_SUMMARY,
    reasonCodes: REASON_CODE_INVENTORY,
    archetypes: ARCHETYPE_GRID,
    specOrder: ARCHETYPE_SPEC_ORDER,
    publishedSpecs: PUBLISHED_SPECS,
  };
}
