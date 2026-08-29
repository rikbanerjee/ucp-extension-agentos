// Typed data source for /evidence — the public scorecard (SWP-3 / EVIDENCE-PLAN E1).
//
// This is the ONLY place the scorecard's content lives; src/app/evidence/page.tsx renders it.
// Source of truth for the rows themselves: POSITIONING.md Part II (§6, rows a1–i1).
// Source of truth for the numbers: VERIFICATION-NEEDED.md §1.
//
// To refresh: re-read POSITIONING.md's scorecard table and update the objects below — do not
// hand-edit numbers in the page component.
import { VERIFICATION_SNAPSHOT, verificationTestLabel } from '@/lib/content/verificationSnapshot';

export type ScorecardStatus = 'built' | 'partial' | 'designed' | 'planned' | 'non-goal';

export interface StatusMeta {
  status: ScorecardStatus;
  glyph: string;
  label: string;
  description: string;
}

export const STATUS_META: Record<ScorecardStatus, StatusMeta> = {
  built: {
    status: 'built',
    glyph: '✅',
    label: 'Built & tested',
    description: 'Code exists, is exercised by an automated test, and is part of the current verified suite.',
  },
  partial: {
    status: 'partial',
    glyph: '🟡',
    label: 'Partially built',
    description: 'Some of the surface is real and tested; the rest is still a gap called out below.',
  },
  designed: {
    status: 'designed',
    glyph: '📐',
    label: 'Specified / designed only',
    description: 'A spec or interface exists on paper. No implementation code backs it yet.',
  },
  planned: {
    status: 'planned',
    glyph: '⬜',
    label: 'Planned, not designed in depth',
    description: 'On the roadmap. Not yet speced out, let alone built.',
  },
  'non-goal': {
    status: 'non-goal',
    glyph: '🚫',
    label: 'Explicit non-goal (for now)',
    description: 'Deliberately out of scope for the current demo/reference phase — not an oversight.',
  },
};

export interface EvidenceRef {
  /** Monospace file path, relative to the repo root. */
  path: string;
  /** Optional human label for what the path shows, e.g. a test-suite name. */
  label?: string;
}

export interface ScorecardRow {
  id: string;
  requirement: string;
  status: ScorecardStatus;
  /** Short bracketed note shown next to the status badge, e.g. "(was 🟡)" for refreshed rows. */
  statusNote?: string;
  /** The gap/evidence prose from POSITIONING Part II, in plain language. */
  note: string;
  /** Populated for ✅ rows: the file(s)/test(s) that prove the claim. */
  evidence?: EvidenceRef[];
}

export interface ScorecardSection {
  id: string;
  title: string;
  rows: ScorecardRow[];
}

export const SCORECARD_SECTIONS: ScorecardSection[] = [
  {
    id: 'discovery',
    title: 'Discovery & negotiation',
    rows: [
      {
        id: 'a1',
        requirement: 'Discovery manifest (/.well-known/ucp, tier + capabilities[])',
        status: 'built',
        note: 'Real Next.js route handler with tests; locked split-axis tier model. Data behind it is mock.',
        evidence: [
          { path: 'src/app/.well-known/ucp/route.ts' },
          { path: 'src/app/.well-known/ucp/route.test.ts', label: 'route test suite' },
        ],
      },
      {
        id: 'a2',
        requirement: 'Capability negotiation enforced at runtime',
        status: 'built',
        note: 'registry.manifestSubset() is load-bearing: an absent capability produces a documented, tested degraded result — not a crash.',
        evidence: [
          { path: 'src/lib/extensions/registry.ts' },
          { path: 'src/lib/extensions/__tests__/registry.test.ts', label: 'registry test suite' },
        ],
      },
    ],
  },
  {
    id: 'context',
    title: 'Canonical context & identity',
    rows: [
      {
        id: 'b1',
        requirement: 'Canonical buyer context',
        status: 'built',
        note: 'BuyerContext models loyaltyTier, trust.mode, activeExtensions; a prior modeling bug in activeExtensions has been removed.',
        evidence: [{ path: 'src/lib/types/context.ts' }],
      },
      {
        id: 'b2',
        requirement: 'Most-restrictive normalization + trust downgrade',
        status: 'built',
        note: 'Asserted privilege claims are downgraded for transaction-gating stages, per RAOS-0000 §7.2.',
        evidence: [
          { path: 'src/lib/rules/normalizeBuyerContext.ts' },
          { path: 'src/lib/rules/__tests__/normalizeBuyerContext.test.ts', label: 'normalization test suite' },
        ],
      },
      {
        id: 'b3',
        requirement: 'Real identity/consent/PII model (RAOS-0015)',
        status: 'designed',
        note: 'Still spec’d only (WP-15, unstarted); interface designed, nothing built. Buyer token verification is simulated by decision (see f2).',
      },
    ],
  },
  {
    id: 'pipeline',
    title: 'Decision pipeline',
    rows: [
      {
        id: 'c1',
        requirement: 'Extension contract (UcpExtension: namespace@semver, stage, priority, pure evaluate)',
        status: 'built',
        note: 'Matches ARCH-UCP-EXTENSION-MCP.md §3.2.',
        evidence: [{ path: 'src/lib/extensions/contract.ts' }],
      },
      {
        id: 'c2',
        requirement: 'Registry + staged pipeline + fault isolation + now injection',
        status: 'built',
        note: 'A throwing evaluator degrades (BLOCK for safety stages) without crashing the pipeline — tested.',
        evidence: [
          { path: 'src/lib/extensions/registry.ts' },
          { path: 'src/lib/extensions/pipeline.ts' },
          { path: 'src/lib/extensions/__tests__/pipeline.test.ts', label: 'pipeline test suite' },
        ],
      },
      {
        id: 'c3',
        requirement: 'Determinism guarantee',
        status: 'built',
        note: 'Golden fixtures enforce: no Date.now/Math.random/IO in rules code; same inputs → byte-identical DecisionRecord.',
        evidence: [{ path: 'src/lib/rules/__tests__/golden.test.ts', label: 'golden-fixture test suite' }],
      },
    ],
  },
  {
    id: 'vocabulary',
    title: 'Decision vocabulary & explainability',
    rows: [
      {
        id: 'd1',
        requirement: 'Uniform reason vocabulary (ReasonEntry: code, severity, source, requirements)',
        status: 'built',
        note: 'blocking is deprecated with a migration path; status is derived, not authored.',
        evidence: [{ path: 'src/lib/types/reasons.ts' }],
      },
      {
        id: 'd2',
        requirement: 'Decision substrate for explainability (DecisionRecord)',
        status: 'built',
        note: 'Folded by the pipeline: ordered reasons with per-stage attribution.',
        evidence: [{ path: 'src/lib/extensions/pipeline.ts' }],
      },
      {
        id: 'd3',
        requirement: 'Per-audience trace renderings (merchant ops / buyer / developer JSON)',
        status: 'built',
        statusNote: 'REFRESHED — was designed only',
        note: 'WP-08 shipped: renderBuyerTrace / renderMerchantTrace / renderDeveloperTrace all exist, tested, and exported from the engine package.',
        evidence: [
          { path: 'src/lib/trace/derive.ts' },
          { path: 'src/lib/trace/render.ts' },
          { path: 'src/lib/trace/types.ts' },
          { path: 'src/lib/trace/__tests__/trace.test.ts', label: 'trace test suite' },
        ],
      },
    ],
  },
  {
    id: 'domain',
    title: 'Domain semantics',
    rows: [
      {
        id: 'e1',
        requirement: 'Eligibility & visibility semantics (RAOS-0001)',
        status: 'built',
        note: 'Published Draft·RFC v1.1.0 with a reference implementation, a spec page, and every reason code fixture-covered. The flagship spec.',
        evidence: [
          { path: 'specs/0001-eligibility.md' },
          { path: 'src/lib/rules/__tests__/behaviors.test.ts', label: 'behaviors test suite' },
        ],
      },
      {
        id: 'e2',
        requirement: 'Contextual pricing — member/bulk/MOQ (RAOS-0002)',
        status: 'built',
        statusNote: 'REFRESHED — was partial',
        note: 'AppliedOffer / suppressedOffers shape landed and is the frozen contract RAOS-0006/0007 bind to.',
        evidence: [
          { path: 'specs/0002-contextual-pricing.md' },
          { path: 'src/lib/rules/pricing.ts' },
          { path: 'src/lib/rules/__tests__/pricing.test.ts', label: 'pricing test suite' },
        ],
      },
      {
        id: 'e3',
        requirement: 'Promo stacking ladder (RAOS-0006)',
        status: 'designed',
        statusNote: 'corrected downward, not upgraded',
        note: 'Still unbuilt — no promos.ts exists and specs/0006-promo-stacking.md is not written. Fully designed (priority ladder + stackable/exclusive locked), zero code. The single biggest commercial-differentiation gap on this scorecard.',
      },
      {
        id: 'e4',
        requirement: 'Inventory & availability (RAOS-0005)',
        status: 'built',
        statusNote: 'REFRESHED — was designed only',
        note: 'Published Draft·RFC v1.0.0; built and tested, including reservation TTL.',
        evidence: [
          { path: 'specs/0005-inventory.md' },
          { path: 'src/lib/rules/inventory.ts' },
          { path: 'src/lib/extensions/evaluators/inventory.ts' },
          { path: 'src/lib/rules/__tests__/inventory.test.ts', label: 'inventory test suite' },
        ],
      },
      {
        id: 'e5',
        requirement: 'Quote integrity / price lock (RAOS-0007)',
        status: 'built',
        statusNote: 'REFRESHED — was designed only',
        note: 'Published Draft·RFC v1.0.0; built and tested. The retailer-trust unlock is real, not paper.',
        evidence: [
          { path: 'specs/0007-quote-integrity.md' },
          { path: 'src/lib/rules/quote.ts' },
          { path: 'src/lib/extensions/evaluators/quote.ts' },
          { path: 'src/lib/rules/__tests__/quote.test.ts', label: 'quote test suite' },
        ],
      },
      {
        id: 'e6',
        requirement: 'Fulfillment feasibility (RAOS-0003)',
        status: 'partial',
        note: 'Built and tested: mode and region checks, lead time, cutoff, weekly operating hours, order-acceptance buffer and need-by evaluation. Provider-supplied delivery windows, courier capacity, route selection and multi-stop fulfilment remain unsupported.',
      },
      {
        id: 'e7',
        requirement: 'Loyalty, subscriptions, tax/restricted, returns, discovery semantics, cart bridge (0009/0010/0011/0014/0004/0012)',
        status: 'planned',
        note: 'Catalogued with briefs, edge cases, and reason codes; none implemented. Each has a pending-task page under specs/wiki/pending/.',
      },
    ],
  },
  {
    id: 'trust',
    title: 'Trust, provenance & transport',
    rows: [
      {
        id: 'f1',
        requirement: 'Provenance/freshness envelope types',
        status: 'built',
        statusNote: 'REFRESHED — was partial',
        note: 'Published Draft·RFC v1.0.0; sign/verify, TTL matrix, key rotation built and tested; envelope attached centrally in the pipeline.',
        evidence: [
          { path: 'specs/0008-trust-provenance.md' },
          { path: 'src/lib/rules/trust.ts' },
          { path: 'src/lib/rules/__tests__/trust.test.ts', label: 'trust test suite' },
        ],
      },
      {
        id: 'f2',
        requirement: 'Real cryptography',
        status: 'non-goal',
        note: 'Simulated by locked decision; interface designed for a mechanical swap; TRUST_SIMULATED is labeled everywhere it applies.',
      },
      {
        id: 'g1',
        requirement: 'MCP server (tools + resources over the pipeline)',
        status: 'designed',
        note: 'Zero live transport code (WP-19 unstarted). The engine is now packaged (@retailagentos/engine) specifically so a real transport can be built outside this repo — the TheCustomHub pilot is the first concrete attempt, in progress, not shipped.',
      },
    ],
  },
  {
    id: 'conformance',
    title: 'Conformance & production hardening',
    rows: [
      {
        id: 'h1',
        requirement: 'Test harness + golden fixtures + coverage',
        status: 'built',
        note: `Vitest, ${verificationTestLabel} tests passing as verified ${VERIFICATION_SNAPSHOT.verifiedAt}. Coverage is scoped to src/lib/rules, not the whole codebase.`,
        evidence: [
          { path: 'vitest.config.ts', label: 'coverage.include scope' },
        ],
      },
      {
        id: 'h2',
        requirement: 'Public conformance suite third parties can run',
        status: 'planned',
        note: 'Internal only today; no packaged conformance kit. This is EVIDENCE-PLAN’s E4.',
      },
      {
        id: 'i1',
        requirement: 'Persistence, multi-tenant infra, agent auth, rate limiting, real merchant/platform integrations',
        status: 'non-goal',
        note: 'Explicit non-goals of the demo phase. "Real merchant integrations" has moved from hypothetical to in progress — the TheCustomHub pilot is actively targeting this, unshipped.',
      },
    ],
  },
];

export interface SummaryStat {
  value: string;
  label: string;
  detail: string;
}

export const SUMMARY_STATS: SummaryStat[] = [
  {
    value: verificationTestLabel,
    label: 'Automated tests passing',
    detail: `npm test — verified ${VERIFICATION_SNAPSHOT.verifiedAt}.`,
  },
  {
    value: VERIFICATION_SNAPSHOT.typecheckStatus === 'passing' ? 'Passing' : 'Failing',
    label: 'TypeScript',
    detail: 'npx tsc --noEmit after building the engine declarations.',
  },
  {
    value: '93.8%',
    label: 'Line coverage (rules engine scope)',
    detail: 'Statements 92.8% · Branches 89.18% · Functions 82.25% · Lines 93.8% — measured over src/lib/rules only, per vitest.config.ts.',
  },
  {
    value: VERIFICATION_SNAPSHOT.buildStatus === 'passing' ? 'Passing' : 'Failing',
    label: 'Production build',
    detail: 'npm run build (Next.js 16.2.6, Turbopack).',
  },
  {
    value: 'ESM + CJS',
    label: '@retailagentos/engine smoke-tested externally',
    detail: 'Installed as a tarball into a throwaway project outside this repo; both entry points resolve and run.',
  },
];

export interface AvoidedClaim {
  claim: string;
  why: string;
}

export const CLAIMS_WE_DONT_MAKE: AvoidedClaim[] = [
  {
    claim: '"Production-ready"',
    why: 'No persistence, no multi-tenant infra, no agent auth, no rate limiting — all explicit non-goals of the current demo phase (row i1).',
  },
  {
    claim: '"Live MCP server"',
    why: 'Zero live transport code exists yet (row g1). The engine is packaged so one can be built outside this repo; none has shipped.',
  },
  {
    claim: '"Cryptographically signed"',
    why: 'Signing is simulated by locked decision, labeled TRUST_SIMULATED everywhere it appears (row f2). The interface is designed for a mechanical swap to real crypto — it just hasn’t happened.',
  },
  {
    claim: '"Real merchant integrations" (plural)',
    why: 'One pilot (TheCustomHub) is in progress, not shipped. Saying "integrations" before a second one lands overstates the evidence.',
  },
  {
    claim: '"Promo-stacking-aware"',
    why: 'RAOS-0006 is fully designed but zero code exists (row e3) — the single biggest gap this scorecard tracks.',
  },
  {
    claim: '"Loyalty-aware"',
    why: 'RAOS-0009 is catalogued with a brief and reason codes, nothing implemented (row e7).',
  },
];

export const VERIFIED_DATE = VERIFICATION_SNAPSHOT.verifiedAt;
