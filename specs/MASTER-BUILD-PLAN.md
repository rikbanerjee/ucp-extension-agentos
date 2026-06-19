# RetailAgentOS — Master Build Plan

**Owner:** Rik Banerjee · **Role of this doc:** the *executable engineering plan*
**Status:** Active · supersedes the execution sections (§7–§8) of `PROGRAM-PLAN.md`; the spec catalog, conformance model, and locked decisions there remain authoritative.
**Date:** 2026-06-09
**Companions:** [`PROGRAM-PLAN.md`](./PROGRAM-PLAN.md) (spec catalog + locked decisions) · [`ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md) (extension contract, pipeline, MCP shape) · [`PRODUCT-BACKLOG.md`](./PRODUCT-BACKLOG.md) (market rationale) · [`0000-foundations.md`](./0000-foundations.md) (the substrate spec) · [`../questions.md`](../questions.md) (locked answers)

> **Who this is for:** coding agents (Sonnet/Opus) executing one Work Package (WP)
> at a time, and the architect sequencing them. Every WP below is written to be
> independently executable: it names its dependencies, the exact files to touch,
> the contracts to produce, the mock-data and test obligations, and its
> acceptance criteria. If a WP brief and a spec disagree, **the spec wins**; if a
> spec and RAOS-0000 disagree, **RAOS-0000 wins**.

---

## 1. Architect's assessment & plan adjustments

### 1.1 Where we actually are (verified against code, 2026-06-09)

| Layer | State |
|---|---|
| Specs published | RAOS-0000 (Draft·RFC), RAOS-0001 (Draft·RFC). All others not started. |
| Types | `src/lib/types/core.ts` has the locked `UcpManifest { tier, capabilities[] }` shape ✅, but `extensions.ts` still carries `PricingContext` (with the misplaced `activeExtensions`), `EligibilityReason.blocking`, and free-form `appliedOfferState` strings — i.e. the **0000 contract is specified but not landed in code**. |
| Rule engine | Three hard-coded pure modules: `eligibility.ts`, `pricing.ts` (member→bulk→promo, last-wins), `cartValidation.ts`. No registry, no pipeline, no `now` injection. |
| Extension seam | Designed in ARCH doc §3–5; **not built**. |
| Tests | **None.** No test runner is configured. This is the single biggest execution risk: every refactor below is flying blind without it. |
| Playground | `/demo` renders the three rule modules; `/specs` site pages exist for 0000/0001. |
| MCP | Simulated-only by decision D2; no `route.ts` endpoints exist yet. |
| Trace | Audiences + format **DECIDED** (merchant ops-actionable view · buyer simplified view · developer JSON log). Schema design + build are open work — no longer gated on a decision, but the schema gets a user review before it ships publicly. |

### 1.2 Adjustments this plan makes (the deltas — everything else stands)

1. **Tests-first is now WP-00.** The ARCH doc's "behavior-preserving refactor"
   (registry + pipeline) is only safe with golden-fixture tests asserting
   identical outputs before/after. No WP merges without its tests.
2. **The pre-1.0 breaking batch is one WP, done early.** `PricingContext →
   BuyerContext`, `blocking → severity`, `activeExtensions` → session manifest —
   batched into WP-02 immediately after the seam refactor, while consumer count
   is ~zero. Dragging these out would force every later spec to be written twice.
3. **The trace is promoted from "gated" to scheduled work (WP-08).** Memory +
   D1 record the format decision (three audiences, per-audience rendering, one
   shared substrate). The remaining control: the concrete schema in WP-08 is
   reviewed by the owner before the public spec page ships.
4. **RAOS-0006 (promo stacking) moves up to "v1.5 fast-follow", and its output
   shape lands in v1.** The locked v1 cut line (A2 six specs) stands, but
   RAOS-0007's quote token must bind `appliedOffers[]`. To avoid re-cutting the
   quote contract when 0006 lands, the **`AppliedOffer` shape is defined in
   WP-04 (0002)** with the priority-ladder fields (`priority`, `stackable`,
   `exclusive`) present from day one; 0006 then populates it rather than
   reshaping it. PRODUCT-BACKLOG is right that stacking is the #1
   differentiation — it is the first thing after the v1 six.
5. **A read-only `/.well-known/ucp` route handler ships in v1 (WP-02).** D2
   keeps *MCP* simulated, but serving the manifest as a real Next.js 16
   `route.ts` GET is cheap, proves the discovery story end-to-end, and is the
   anchor for the eventual MCP server. This does not violate D2 (no MCP
   transport, no tools, no crypto).
6. **Inventory race + oversell becomes a first-class Playground scenario**
   (WP-05): a "two agents, one unit" simulator. It is the most persuasive
   demo of why TTL + reservation semantics matter.
7. **New horizon specs reserved (§6):** RAOS-0016 Agent Identity, Reputation &
   Rate Limiting · RAOS-0017 Merchant Observability & Catalog Change Feed ·
   RAOS-0018 Negotiation & Dynamic Offers · RAOS-0019 Payment Constraints &
   Stored Value. These cover the problems that appear *only once agents are
   actually shopping at scale*. Numbered and scoped now so namespaces and plane
   assignments don't collide later; built post-v1.5.

### 1.3 Invariants no WP may violate (from 0000 / ARCH — restated for agents)

- **Determinism:** same `(BuyerContext, manifest, catalog, now)` → identical
  output. No `Date.now()`, `Math.random()`, I/O, or model calls inside
  `src/lib/rules/**` or `src/lib/extensions/**`. Time is always an injected
  `now: number`.
- **Most-restrictive default** for transaction-gating stages on
  unknown/missing/untrusted context. Untrusted privilege claims → guest.
- **Fail-degraded, never crash:** safety-critical stages degrade to `BLOCK`;
  advisory stages degrade to omit/`INFO`; unknown blocking code → `BLOCK`.
- **Additive-only reason codes**, semver per namespace, deprecation via
  `supersededBy` for ≥1 major.
- **One source of truth:** the Playground, the spec pages, and any future MCP
  tool all call the *same* pipeline. No surface re-implements a decision.
- **Namespace:** `com.os.retailagent.shopping.*` everywhere. Vendor-neutral
  prose (upstream-candidate, A1).
- **Single-currency USD** with `currency` carried as a seam; no conversion/i18n
  (V2). Single-merchant cart only (V2: marketplace).
- **Next.js 16:** read `node_modules/next/dist/docs/` before touching
  routing/pages (AGENTS.md). `npm run build` must pass on every WP.

---

## 2. Target end-state (one screen)

```
 Agent (simulated · MCP later, WP-18)
   │  BuyerContext (trust: asserted|signed) + merchant manifest
   ▼
 /.well-known/ucp  →  negotiation on capabilities[]  (WP-02)
   ▼
 UCP EXTENSION PIPELINE  (WP-01)            src/lib/extensions/
   VISIBILITY ▸ ELIGIBILITY ▸ PRICE ▸ FULFILLMENT ▸ QUOTE
   each stage = registered UcpExtension evaluators (pure, now-injected)
   folds → ReasonEntry[] + Computed* contracts + provenance/freshness
   ▼
 DecisionRecord (the substrate)  ──►  three trace renderings (WP-08)
   merchant ops view · buyer simplified view · developer JSON
   ▼
 Surfaces: /demo Playground · /specs pages · cart validation · (MCP tools later)
```

Conformance tiers (merchant maturity, B1 split-axis — locked):
`0 Discoverable · 1 Qualified · 2 Priced · 3 Member-aware · 4 Assisted`,
manifest = headline `tier` + authoritative `capabilities[]`. Buyer loyalty
(gold/silver/guest) and B2B `membershipTier` are orthogonal `BuyerContext`
claims (three-axis identity, 0000 §4.1/OQ#1).

---

## 3. Execution protocol for coding agents

Every WP is executed under this protocol — it is part of each WP's acceptance.

1. **Read first:** `AGENTS.md`, this WP's section, the owning spec (if it
   exists), `0000-foundations.md` §4–§9, and `ARCH-UCP-EXTENSION-MCP.md` §3–§5.
   For any routing/page work, the relevant file in `node_modules/next/dist/docs/`.
2. **Scope discipline:** touch only the files the WP lists (plus their tests
   and direct importers when a signature changes). Do not "improve" adjacent
   code. Do not renumber or rename specs.
3. **Spec-first WPs** (those that include a `specs/00NN-*.md`): write/extend
   the spec using the **RAOS-0001 template** (Abstract · Motivation · Scope ·
   Inputs referencing 0000 BuyerContext · Outputs · Reason-code registry ·
   Deterministic algorithm · Worked examples across **all three archetypes** ·
   Open Questions · Why this spec). Status line: `Draft · Request for Comment`.
4. **Standard Deliverable Set** (PROGRAM-PLAN §7) applies to every spec WP:
   spec md · types · pure reference impl in `src/lib/rules/` (registered as a
   pipeline extension) · Playground wiring · on-site spec page
   (`src/app/specs/00NN-<name>/page.tsx`, clone the 0001 pattern) · row in
   `/specs` index page **and** `specs/README.md` · conformance-tier mapping +
   merchant manifest updates in `src/lib/mock/merchants.ts` · mock catalog
   variants exercising **every** reason code.
5. **Tests are deliverables, not afterthoughts:** every reason code gets at
   least one fixture; every "Edge cases" bullet in the WP gets a test or an
   explicit Open Question in the spec. `npm test` and `npm run build` pass.
6. **Determinism lint:** grep your diff for `Date.now`, `Math.random`,
   `fetch(`, `new Date(` inside `src/lib/rules|extensions` — any hit is a bug.
7. **Report:** end with what shipped, what was deferred to Open Questions, and
   any contract change that affects other WPs.

---

## 4. Work packages

Dependency notation: `←` means "requires". WPs at the same wave with no arrows
between them are parallelizable across sub-agents.

### WAVE 0 — Platform spine (sequential: WP-00 → WP-01 → WP-02 → WP-03)

---

#### WP-00 · Test harness + golden fixtures `(S · no deps)`

**Goal:** make every later refactor provable. **No spec content.**

**Tasks**
1. Add **Vitest** (`npm i -D vitest @vitest/coverage-v8`), `"test"` /
   `"test:watch"` scripts, `vitest.config.ts` (node environment; alias `@/` to
   `src/` matching `tsconfig.json`).
2. `src/lib/rules/__tests__/golden.test.ts`: for **every** mock variant in
   `src/lib/mock/catalog.ts` × a canonical grid of contexts (every
   `customerType` × `membershipTier` × representative regions incl. a
   restricted one × all `fulfillmentMode`s × `resaleCertificateOnFile` /
   `taxExempt` on-off), snapshot the outputs of `calculateVisibility`,
   `calculateEligibility`, `getApplicablePrice`, `validateCart`.
   Use committed JSON snapshot fixtures (`__fixtures__/golden.json`), not
   inline snapshots, so WP-01 can assert byte-identical results.
3. Unit tests pinning today's known behaviors: member→bulk→promo last-wins;
   MOQ/increment failures; tier boundary `>=`; guest-hidden products;
   `REGION_RESTRICTED`.
4. A `reasonCodeCoverage` test helper: asserts every code in a provided
   registry array appears in at least one fixture output (later WPs feed it).

**Acceptance:** `npm test` green; goldens committed; coverage of
`src/lib/rules/` ≥ 90% lines; `npm run build` unaffected.

---

#### WP-01 · Extension seam refactor — registry + staged pipeline + `now` injection `(M · ← WP-00)` — behavior-preserving

**Goal:** turn the hard-coded rule calls into the ARCH §3–§5 machine without
changing one output byte.

**New files** — `src/lib/extensions/`:
- `contract.ts` — `UcpExtension<TConfig, TResult>` exactly per ARCH §3.2
  (`namespace`, `version`, `stage`, `priority`, `reasonCodes`,
  `readConfig(variant)`, `evaluate({config, context, priorResults, now})`),
  plus `ExtensionResult`, `PipelineStage`
  (`VISIBILITY|ELIGIBILITY|PRICE|FULFILLMENT|QUOTE`), `StageResults`.
- `registry.ts` — `register()`, `byStage()` (ordered by `priority`, ties by
  namespace for determinism), `manifestSubset(manifest)` → only evaluators the
  merchant's `capabilities[]` lists (negotiation enforcement — this finally
  makes the manifest *load-bearing*).
- `pipeline.ts` — `evaluateOffer({merchant, variant, quantity, context, now})`
  runs enabled stages in fixed order; guards each evaluator (try/catch →
  degraded result per 0000 §7.3: ELIGIBILITY→`BLOCK`, advisory→omit); folds
  results into a single **`DecisionRecord`** `{ inputsHash, stages: {…},
  reasons: ReasonEntry[] (ordered, with source), computedAt: now }`.
  *DecisionRecord is deliberately the trace substrate for WP-08 — ordered, with
  per-stage attribution — but renders nothing.*
- `evaluators/eligibility.ts`, `evaluators/pricing.ts` — wrap the existing
  functions from `src/lib/rules/` (which remain the pure logic home); pricing
  precedence becomes declared `priority` within PRICE (member 10 · bulk 20 ·
  promo 30 — reproducing today's last-wins exactly).

**Rewired:** `cartValidation.ts` and `/demo` call the pipeline. The old direct
exports remain (thin delegates) so nothing else breaks.

**Explicit non-goals:** no contract/type changes (that's WP-02), no new stages
registered beyond what exists, no manifest route yet.

**Acceptance:** golden fixtures from WP-00 pass **unchanged** (byte-identical);
new tests: registry ordering determinism; a deliberately-throwing fake
evaluator degrades per stage class without crashing the pipeline;
`manifestSubset` excludes a capability and the pipeline skips that evaluator
with a documented degraded result.

---

#### WP-02 · Land the RAOS-0000 contract in code (the pre-1.0 breaking batch) `(M · ← WP-01)`

**Goal:** make code match the published 0000 spec: `BuyerContext`,
`ReasonEntry`/`severity`, provenance/freshness envelope, manifest route.

**Tasks**
1. `src/lib/types/context.ts` — **`BuyerContext`** per 0000 §4: `customerType`,
   `loyaltyTier: 'guest'|'silver'|'gold'` (new, RAOS-0009-owned claim),
   `membershipTier`, `marketRegion`, `fulfillmentMode`, `accountLinked`,
   `taxExempt`, `resaleCertificateOnFile`, `trust: { mode:
   'asserted'|'signed', issuer?, keyId?, signature? }`. **No
   `activeExtensions`** (that fact now lives only in the negotiated manifest
   subset, WP-01). Export deprecated alias `type PricingContext = BuyerContext
   & { activeExtensions?: string[] }` for one minor; migrate all callers off it
   in this WP anyway.
2. `src/lib/types/reasons.ts` — **`ReasonEntry`** per 0000 §8: `code`,
   `message`, `severity: 'BLOCK'|'CONDITION'|'INFO'`, `requirements?`,
   `source` (owning namespace). Migration per 0000 §8.1: evaluators emit
   `ReasonEntry`; `EligibilityReason.blocking` is still **emitted** (derived:
   `severity !== 'INFO'`) and marked `@deprecated supersededBy: severity`.
   `ComputedEligibility.status` is **derived**: any `BLOCK` with no resolvable
   `requirements[]` → `BLOCKED`; any `BLOCK|CONDITION` with a resolution path →
   `CONDITIONAL`; else `ELIGIBLE`.
3. `src/lib/types/envelope.ts` — `Provenance` + `Freshness` per 0000 §9
   (`trustMode` labeled loudly; `computedAt` from injected `now`).
   `ExtensionResult` gains the optional envelope fields.
4. **Most-restrictive normalization:** `normalizeBuyerContext(partial) →
   BuyerContext` — unknown/missing → guest/most-restrictive (0000 §4.3); when
   `trust.mode === 'asserted'`, privilege-granting claims (`membershipTier`,
   `loyaltyTier`, `taxExempt`, `resaleCertificateOnFile`) are **downgraded for
   transaction-gating stages** (0000 §7.2). Pipeline calls it at the boundary.
5. **`src/app/.well-known/ucp/route.ts`** (verify handler conventions against
   `node_modules/next/dist/docs/` first) — GET returns the demo merchants'
   `UcpManifest` (query `?merchant=` selects archetype; default boutique).
   Request-evaluated (no caching opt-in while data is mock).
6. Update `/demo` context simulator to edit the full `BuyerContext` incl.
   `loyaltyTier` and a `trust.mode` toggle that visibly downgrades asserted
   privileges (this demos B6 and 0000 §7.2 in one switch).
7. Update `specs/0000-foundations.md` reference-implementation pointers; tick
   PRODUCT-BACKLOG N1 acceptance boxes that are now true; delete the
   "Mock manifests → { tier, capabilities[] }" line from `specs/TODO.md`.

**Acceptance:** golden fixtures **intentionally change** — regenerate with a
reviewed diff showing only: added `severity`/`source` fields, derived
`blocking`, envelope fields. Tests: normalization matrix (every missing field →
most-restrictive); asserted-vs-signed downgrade per claim; status derivation
truth table; `GET /.well-known/ucp` returns each archetype's manifest with
correct `tier` + `capabilities[]`. Build green.

---

#### WP-03 · RAOS-0001 retrofit + spec page refresh `(S · ← WP-02)`

**Goal:** the published spec and its page reflect the 0000 substrate.

**Tasks:** rewrite 0001's Inputs to reference 0000 `BuyerContext` (drop its
inline context); resolve OQ#1/#2 in-text (`severity` model — resolved by 0000
§8.1) and OQ#4 (most-restrictive for transaction stages, discovery noted open);
document `REGION_RESTRICTED` resolution as already implemented; bump 0001 to
v1.1.0 with a changelog note (additive); update
`src/app/specs/0001-eligibility/page.tsx` reason-registry table to show
`severity` + `source`; keep `blocking` column marked deprecated.

**Acceptance:** spec/page/impl agree; reason-code coverage test green for all
six 0001 codes; build green.

---

### WAVE 1 — v1 truth & trust (parallel after WP-03: WP-04, WP-05, WP-06)

---

#### WP-04 · RAOS-0002 — Contextual Pricing (member + bulk) `(M · ← WP-02)`

**Goal:** formalize what `pricing.ts` does, fix its gaps, and define the
forward-compatible price/offer shapes that 0006/0007 will bind.

**Spec:** `specs/0002-contextual-pricing.md` (namespaces `…member_pricing`,
`…bulk_pricing`; Tier 2).

**Contract (types + impl):**
- `ComputedPriceState` v2: `unitPrice`, `currency` (seam, `'USD'`),
  `priceSource`, **`appliedOffers: AppliedOffer[]`** and
  **`suppressedOffers: SuppressedOffer[]`** replacing free-form
  `appliedOfferState` (deprecated, emitted for one minor).
- **`AppliedOffer`** (the load-bearing forward shape — 0006 and 0007 bind it):
  `{ offerId, type: 'member'|'bulk_tier'|'promo_sale'|'promo_tier'|…,
  namespace, priority, stackable: boolean, exclusive: boolean, unitPriceAfter,
  description }`. `SuppressedOffer` adds `suppressedBy` + reason code.
- Rounding policy: **half-up to cents**, declared in spec (USD-only per C).
- Teaser semantics: teaser price is display-only — `addable: false` is encoded
  by eligibility, never by price; spec the cross-reference.
- Per-customer purchase limit (`limit N`): config `purchaseLimit?: number` on
  `MemberPricing`/variant; reason `PURCHASE_LIMIT_EXCEEDED` (severity BLOCK at
  cart stage). *(Shared code with 0011 — 0002 owns the generic per-order limit;
  0011 owns regulated-goods limits.)*
- `priceOfZero` vs `callForPrice`: `basePrice: 0` is a valid free price;
  `callForPrice: true` on variant → price stage emits `CALL_FOR_PRICE`
  (CONDITION, resolution = intent-capture path, cross-ref 0013).

**Reason codes:** `MEMBER_PRICE_APPLIED` (INFO), `TEASER_LOCKED` (CONDITION),
`BULK_TIER_APPLIED` (INFO), `BELOW_MOQ` (BLOCK), `QUANTITY_INCREMENT_MISMATCH`
(BLOCK), `PURCHASE_LIMIT_EXCEEDED` (BLOCK), `CALL_FOR_PRICE` (CONDITION).

**Edge cases (test each):** member price higher than bulk tier (today's
last-wins documented; final precedence deferred to 0006 ladder — Open
Question); tier boundary exactly met (`>=` — spec it); negative/zero quantity
(reject, BLOCK); guest sees teaser but cart-add blocked; wholesale buyer
without resale cert (composes 0001); rounding at half-cent boundaries.

**Deliverables:** Standard Set (spec page, Playground price-breakdown panel
showing applied *and suppressed* offers, mock variants per code across all
three archetypes, manifest updates: wholesale + grocery list both namespaces;
boutique lists `member_pricing` only).

---

#### WP-05 · RAOS-0005 — Inventory & Availability `(M · ← WP-02; freshness fields coordinate with WP-06)`

**Goal:** agents never recommend what isn't there.

**Spec:** `specs/0005-inventory.md` (namespace `…inventory`; Tier 1).

**Contract:**
- Variant config `inventory?: { state: 'in_stock'|'low_stock'|'out_of_stock'|
  'backorder'|'preorder', quantityAvailable?, perLocation?: Array<{locationId,
  quantity}>, backorderEta?, preorderReleaseDate?, lowStockThreshold?,
  reservationPolicy: 'none'|'soft_hold', reservationTtlSeconds? }`.
- Output `ComputedAvailability { state, onlyXLeft?, perLocation?, freshness }`
  — freshness/TTL mandatory here (0008 envelope, load-bearing).
- New INVENTORY evaluator registered in the ELIGIBILITY stage (priority after
  0001 — an out-of-stock item is visible but not addable) emitting reason codes;
  availability data itself rides as an INFO-stage output on the DecisionRecord.
- **Reservation semantics (spec-level):** soft hold on add-to-cart with TTL;
  expiry → re-validate. Simulated in mock with injected `now`.

**Reason codes:** `OUT_OF_STOCK` (BLOCK, resolution → notify-me/0013),
`LOW_STOCK` (INFO), `BACKORDER_AVAILABLE` (CONDITION, eta in requirements),
`PREORDER_NOT_YET_BUYABLE` (CONDITION, release date), `STOCK_STALE` (CONDITION
— freshness expired, agent must re-fetch), `LOCATION_OUT_OF_STOCK` (CONDITION
— other locations listed), `RESERVATION_EXPIRED` (BLOCK at cart stage).

**Edge cases:** stock changes between recommend and add (golden scenario: same
variant, two `now` values straddling a TTL); pickup store A has it, B doesn't
(compose buyer `fulfillmentMode` + location); backorder-with-ETA vs hard OOS;
preorder visible-not-buyable; "in stock" but fulfillment-blocked (compose 0003
later — note forward ref); **oversell race**: two contexts grab the last unit —
deterministic per-evaluation, race documented as a checkout-time concern with
the reservation TTL as mitigation.

**Playground extra (per §1.2-6):** "two agents, one unit" simulator card in
`/demo` — two side-by-side contexts, a shared mock stock of 1, sliders for
`now`; shows hold/expiry/`RESERVATION_EXPIRED` live.

**Deliverables:** Standard Set; grocery archetype gets per-location stock +
BOPIS variants; wholesale gets backorder; boutique gets preorder one-off.

---

#### WP-06 · RAOS-0008 — Trust, Provenance & Freshness `(M · ← WP-02)`

**Goal:** the envelope from 0000 §9, with depth: staleness behavior, key
rotation, threat model. Crypto **simulated** (B3/D2) behind a real interface.

**Spec:** `specs/0008-trust-provenance.md` (namespace `…trust`; Tier 0).

**Contract & impl:**
- `src/lib/rules/trust.ts`: `signEnvelope(payload, keyId, now)` /
  `verifyEnvelope(envelope, now)` — interface real, implementation simulated
  (deterministic fake signature = hash of canonicalized payload + keyId;
  labeled `trustMode: 'asserted'`). Swap-to-real is mechanical (R5 mitigation:
  the word "SIMULATED" renders in every payload view).
- Freshness rules: per-contract `ttlSeconds` defaults by stage (price 300,
  inventory 60, eligibility 3600 — declared in spec, merchant-overridable);
  staleness behavior matrix: **refuse** for QUOTE, **degrade+flag** (`STALE_*`
  CONDITION codes) for advisory data.
- Key rotation: manifest carries `keys[] {keyId, validFrom, validTo}`; verify
  picks by `keyId`; rotation mid-session worked example.
- Clock-skew tolerance: ±60s window, spec'd.
- Threat model section: spoofed merchant, replayed envelope, stale promo
  served as fresh, tampered price — each mapped to the field that defeats it.

**Reason codes:** `DATA_STALE` (CONDITION), `SIGNATURE_INVALID` (BLOCK),
`ISSUER_UNKNOWN` (BLOCK), `KEY_EXPIRED` (BLOCK), `CLOCK_SKEW_SUSPECTED`
(CONDITION), `TRUST_SIMULATED` (INFO — always emitted while crypto is fake).

**Edge cases:** TTL expiry mid-session (two `now` evaluations); per-field
freshness (price fresh, inventory stale → only inventory degrades); signature
mismatch → most-restrictive; manifest key rotated between fetch and verify.

**Deliverables:** Standard Set; every existing evaluator's results gain the
envelope (pipeline attaches it centrally — one change in `pipeline.ts`, not
per evaluator); Payload Inspector in `/demo` shows envelope + a "stale data"
toggle.

---

### WAVE 2 — v1 completion ✅ COMPLETE (2026-06-11)

---

#### WP-07 · RAOS-0007 — Quote Integrity & Price Lock `(M · ← WP-04, WP-05, WP-06)`

**Goal:** the retailer-trust unlock — the price shown is the price charged.

**Spec:** `specs/0007-quote-integrity.md` (namespace `…quote`; Tier 2).

**Contract & impl (`src/lib/rules/quote.ts`, QUOTE stage evaluator):**
- **QuoteToken** `{ quoteId, merchantId, variantId, quantity,
  buyerContextHash, unitPrice, currency, appliedOffers: AppliedOffer[],
  issuedAt, ttlSeconds, honorPolicy, envelope (0008 signature) }`.
  `buyerContextHash` = stable hash of the **normalized** BuyerContext
  (WP-02's normalizer is the canonicalization).
- `issueQuote(decisionRecord, now)` → token; `validateQuote(token, {context,
  variant, now})` → `HONORED | REQUOTE_REQUIRED | REJECTED` + reasons.
- **Honor policy is merchant-declared** in capability config:
  `onExpiry: 'honor_grace'|'requote'|'reject'` (+ `graceSeconds`),
  `onStockLoss: 'partial'|'reject'`, `onContextChange: 'requote'`.
- Invalidation: TTL expiry · stock loss (calls 0005) · context-hash mismatch ·
  promo-ended-but-quote-valid (merchant choice, spec both paths) · signature
  failure (0008).
- Re-quote flow: same inputs → fresh token; spec idempotency (same context +
  variant + qty within TTL returns the same `quoteId` — deterministic).

**Reason codes:** `QUOTE_ISSUED` (INFO), `QUOTE_EXPIRED` (BLOCK→requote path),
`QUOTE_CONTEXT_CHANGED` (BLOCK→requote), `QUOTE_STOCK_LOST` (BLOCK),
`QUOTE_PARTIALLY_HONORED` (CONDITION), `QUOTE_FORGED` (BLOCK),
`QUOTE_HONORED_GRACE` (INFO).

**Edge cases (test each):** expiry by 1s vs within grace; tier downgraded
between quote and validate (hash mismatch); promo ended but token inside TTL
(honor path AND requote path, one merchant each); replayed token with edited
price (signature catches it); rounding identical between quote and validate;
quantity changed → new quote required.

**Deliverables:** Standard Set; `/demo` gets a "Quote → time-travel → checkout"
card (issue a quote, advance `now`, change context, watch honor/requote);
wholesale + grocery manifests list `…quote`. **v1 is spec-complete when this
WP lands** (0000/0001/0002/0005/0007/0008 ✅).

---

#### WP-08 · RAOS-0013 (part 1) — Decision Trace, three audiences ✅ COMPLETE (2026-06-11) `(M · ← WP-02; enriched by every later evaluator for free)`

**Goal:** render the `DecisionRecord` substrate (WP-01) for the three decided
audiences. Format decision is locked (D1 + memory): **merchant ops-actionable
view · buyer simplified view · developer JSON**. ⚠️ **Process gate that
remains:** post the concrete schema + sample renderings for owner review
before the public spec page ships — but build proceeds.

**Design (one substrate, three renderers — no renderer invents data):**
- `src/lib/trace/types.ts` — `DecisionTrace` = the DecisionRecord plus derived
  fields: per-stage verdicts, the *governing* reason (first BLOCK, else first
  CONDITION), resolution paths, suppressed offers.
- `src/lib/trace/render.ts`:
  - `renderDeveloperTrace(trace)` → the JSON itself (stable key order,
    versioned `traceSchema: '1.0.0'`).
  - `renderMerchantTrace(trace)` → ops-actionable rows: *what blocked the
    sale, which config field caused it, what change would unblock it*
    (e.g. "TIER_RESTRICTION from eligibilityRules.requiredTier='gold' —
    13 of your 40 SKUs are invisible to guests"). Pure function over the
    trace + variant config; no model.
  - `renderBuyerTrace(trace)` → ≤2 plain-language sentences from `message`
    fields of the governing reason + its resolution path. Never leaks
    merchant-internal fields (floor price, margins, suppression internals).
- `/demo`: trace tab with the three-way audience toggle (reuse `ViewToggle`).
- Spec: `specs/0013-intent-capture.md` **section "Decision Trace"** only
  (intent-capture routing itself is WP-14, post-v1; one spec file, two WPs —
  mark routing sections "Planned").

**Reason codes:** none new (the trace consumes, never produces).

**Acceptance:** for every golden fixture, all three renderings are produced
deterministically and snapshot-tested; buyer rendering provably excludes a
deny-list of internal fields (test greps rendered output); developer JSON
round-trips (parse → re-render identical). Owner sign-off recorded in the spec
changelog before the `/specs/0013` page goes live.

---

### WAVE 3 — v1.5 fast-follow (parallel: WP-09, WP-10, WP-11)

---

#### WP-09 · RAOS-0006 — Promotional Pricing & Stacking `(L · ← WP-04)`

**Goal:** the differentiator — merchant-declared, deterministic stacking with
reason codes. Model **locked (B4): priority ladder + per-offer
`stackable`/`exclusive` flags; loyalty burn applied last.**

**Spec:** `specs/0006-promo-stacking.md` (namespace `…promo_pricing`; Tier 2).

**Contract & impl (`src/lib/rules/promos.ts`):**
- Offer types: `sale_markdown`, `quantity_promo` (BOGO / mix-and-match /
  "3 for $5"), `coupon` (code, single-use, expiry, minSpend), `flash_sale`
  (start/end vs injected `now`).
- Resolution algorithm (spec it as numbered steps, implement exactly):
  1) collect candidate offers incl. member/bulk from 0002 as ladder entries;
  2) drop expired/ineligible (each with a SuppressedOffer + code);
  3) sort by merchant-declared `priority`;
  4) walk the ladder: apply if `stackable` with everything applied so far and
     nothing applied is `exclusive`; first `exclusive` offer applied seals the
     set; 5) enforce `floorPrice` (suppress lowest-priority stackables until
     ≥ floor, code `FLOOR_PRICE_PROTECTED`); 6) loyalty burn last (hook for
     0009 — no-op until WP-11); 7) emit applied + suppressed with reasons.
- Per-customer promo limit: config + `OFFER_PER_CUSTOMER_LIMIT`.
- Resolves the 0002 Open Question (member vs bulk precedence) — they become
  ladder entries; the spec shows the default ladder reproducing today's
  member→bulk→promo last-wins for backward compat, and a grocery example
  overriding it.

**Reason codes:** `OFFER_APPLIED` (INFO), `OFFER_EXCLUSIVE` (INFO),
`OFFER_EXPIRED`, `OFFER_BELOW_MIN_SPEND`, `OFFER_PER_CUSTOMER_LIMIT`,
`OFFER_SUPPRESSED_BY_PRIORITY`, `OFFER_NOT_STACKABLE`,
`FLOOR_PRICE_PROTECTED`, `PROMO_ON_INELIGIBLE_ITEM` (all suppression codes
CONDITION/INFO — suppression never blocks the sale).

**Edge cases (test each):** all four advantage types on one line → one
deterministic outcome + full suppression explanation; coupon expires
mid-session (two `now` values); mix-and-match across SKUs (cart-scoped offer —
evaluator gets cart lines, not just one line); promo that *raises* price at
some quantities (spec: never apply a worse-than-base path, code it); stacking
to below floor; promo on OOS item (0005 composes — suppressed).

**Deliverables:** Standard Set; grocery archetype becomes the stacking
showcase (weekly ad + coupon + member price + floor on one SKU); Playground
"offer ladder" visual showing applied/suppressed rungs.

---

#### WP-10 · RAOS-0011 — Tax & Restricted/Regulated Goods `(M · ← WP-03)`

**Goal:** the eligibility side of regulation (computation defers to checkout —
B5 split). Differentiator per backlog N7.

**Spec:** `specs/0011-restricted-goods.md` (namespaces `…tax`, `…restricted`;
Tier 1).

**Contract & impl (`src/lib/rules/restricted.ts`, ELIGIBILITY stage after
0001):**
- Variant config `restrictedGoods?: { regulatedCategory:
  'alcohol'|'cannabis'|'tobacco'|'vape'|'pharmacy'|'none', minimumAge?,
  legalRegions?: string[], carrierRestricted?: boolean, purchaseLimit?:
  { perOrder?, perCustomer? } }` and `taxTreatment: 'inclusive'|'exclusive'|
  'exempt_eligible'`.
- BuyerContext usage: `marketRegion` for legality; **age is never carried as a
  raw birthdate** — a verified-age claim `ageVerified?: { minimumAgeMet:
  number }` rides the trust envelope (0015 forward-ref); unknown age →
  most-restrictive (BLOCK with resolution `AGE_VERIFICATION_REQUIRED`).
- Tax: carry the signal only; agent quotes "$X + tax" (exclusive) vs "$X
  incl. VAT" (inclusive); `taxExempt` claim requires `trust.mode==='signed'`
  to take effect (0000 §7.2).

**Reason codes:** `AGE_VERIFICATION_REQUIRED` (CONDITION),
`REGION_NOT_LEGAL` (BLOCK), `CARRIER_RESTRICTION` (BLOCK — legal but not
shippable; resolution: pickup where supported), `PURCHASE_LIMIT_EXCEEDED`
(BLOCK), `TAX_EXEMPT_UNVERIFIED` (CONDITION), `TAX_TREATMENT_NOTE` (INFO).

**Edge cases:** alcohol legal in region but carrier-restricted (visible,
pickup-only resolution — composes 0003 forward-ref); age unknown vs verified-18
vs verified-21; purchase limit across cart lines of same SKU; resale-cert +
regulated item; tax holiday (out of scope → Open Question); EU
inclusive-display worked example.

**Deliverables:** Standard Set; grocery archetype gains a beer SKU + limits;
wholesale gains a tax-exempt flow with signed-vs-asserted demo.

---

#### WP-11 · RAOS-0009 — Loyalty & Rewards (browse-time earn/burn) `(L · ← WP-04, WP-09; identity simulated pending WP-15)`

**Goal:** browse-time loyalty value visibility — the backlog's top
differentiator. Owns the buyer `loyaltyTier` claim.

**Spec:** `specs/0009-loyalty.md` (namespace `…loyalty`; Tier 3 Member-aware).

**Contract & impl (`src/lib/rules/loyalty.ts`, PRICE stage advisory +
burn hook in 0006 ladder step 6):**
- Config: earn rate, per-category multipliers, earn exclusions (sale items),
  burn `{ minRedemption, pointValue, redeemableOn }`, tier benefits table,
  tier-progress thresholds.
- Outputs: `EarnPreview` per line (points, multiplier, exclusions w/ codes),
  `BurnEligibility` (can redeem, threshold, value), `MemberBenefitSummary`,
  tier-progress ("X points to gold"), expiring-points signal (≤30 days, via
  injected `now`).
- Unlinked-account teaser: `accountLinked: false` → teaser output with no
  real values (`ACCOUNT_NOT_LINKED` CONDITION, resolution = link account).
- Burn applies **after** the 0006 ladder (step 6) — never before promos.

**Reason codes:** `LOYALTY_EARN_PREVIEW` (INFO), `LOYALTY_EARN_EXCLUDED`
(INFO), `REDEMPTION_BELOW_THRESHOLD` (CONDITION), `REDEMPTION_EXCEEDS_BALANCE`
(BLOCK on the redemption, not the sale), `ACCOUNT_NOT_LINKED` (CONDITION),
`TIER_BENEFIT_ACTIVE` (INFO), `POINTS_EXPIRING_SOON` (INFO).

**Edge cases:** earn on promo-discounted line (excluded — show why); pending
vs available points; partial redemption; redeem on already-discounted line
(ladder interaction test with 0006); asserted gold tier without signed trust →
teaser only (0000 §7.2 — the key trust demo); benefits change mid-cart
(crossed spend threshold — Open Question or recompute rule).

**Deliverables:** Standard Set; grocery manifest gains `…loyalty` (headline
tier → 3 where earned); advisory degradation test (loyalty evaluator throws →
sale unaffected, preview omitted).

---

### WAVE 4 — Tier 3/4 completion (parallel where shown)

#### WP-12 · RAOS-0010 — Subscriptions & Recurring `(M · ← WP-07, WP-11)`
Subscription vs one-time price, first-order discount, cadence, skip/pause/
cancel semantics, recurring eligibility, **recurring price lock** (re-issues a
0007 quote per cycle with declared `onPriceChange: 'honor'|'notify'|'cancel'`),
re-verify regulated goods each cycle (0011). Codes:
`SUBSCRIPTION_PRICE_APPLIED`, `FIRST_ORDER_DISCOUNT`, `CADENCE_UNAVAILABLE`,
`SUBSCRIPTION_PRICE_CHANGED`, `SUBSCRIPTION_ITEM_DISCONTINUED` (→ 0004
substitution forward-ref), `REVERIFICATION_REQUIRED`. Edge cases per
PROGRAM-PLAN §6. Standard Set; grocery + boutique archetypes.

#### WP-13 · RAOS-0003 — Fulfillment Feasibility `(L · ← WP-05, WP-10)`
FULFILLMENT stage evaluator: modes (ship/pickup/local_delivery/BOPIS),
windows, lead times, per-region service areas, hazmat/oversize, split-shipment
signal, pickup-location model joined to 0005 per-location stock, same-day
cutoff vs injected `now`. Codes: `FULFILLMENT_MODE_UNAVAILABLE`,
`REGION_NOT_SERVED`, `HAZMAT_RESTRICTION`, `OVERSIZE_RESTRICTION`,
`CUTOFF_PASSED`, `SPLIT_SHIPMENT_REQUIRED`, `LEAD_TIME_EXCEEDS_NEED_BY`,
`DELIVERY_WINDOW_FULL`. Precedence with 0001 `REGION_RESTRICTED` and 0011
`CARRIER_RESTRICTION` documented (eligibility-region beats
fulfillment-region; first-blocking-stage governs). Standard Set; grocery
becomes the BOPIS showcase.

#### WP-14 · RAOS-0013 (part 2) — Intent Capture & Assisted Commerce `(M · ← WP-08, WP-15)`
The routing half: out-of-stock notify-me (binds `OUT_OF_STOCK` resolution),
B2B quote-request handoff (binds `CALL_FOR_PRICE` + MOQ negotiation),
lead-form/WhatsApp channel descriptors in merchant config, assisted-callback;
**consent-gated** (0015): no contact captured without explicit consent flag;
duplicate-lead suppression (idempotency key); spam/abuse note forward-ref
RAOS-0016. Codes: `INTENT_CAPTURED`, `CONSENT_REQUIRED`,
`CHANNEL_UNAVAILABLE`, `DUPLICATE_INTENT_SUPPRESSED`. Completes the 0013 spec
file started in WP-08.

#### WP-15 · RAOS-0015 — Privacy, Consent & Identity `(M · ← WP-02; unblocks WP-14, hardens WP-10/11)`
Consent model (per-purpose flags on BuyerContext), PII minimization (per-stage
field allowlists — pipeline strips context fields a stage didn't declare),
account-linking trust (the signed buyer token verification path — interface
real, issuer simulated; resolves ARCH OQ#5 with a recommendation: external
IdP/OAuth issuer, merchant-trusted), retention signals, RTBF hook,
GDPR-vs-CCPA worked examples, pseudonymous path. Codes: `CONSENT_REQUIRED`,
`CONSENT_WITHDRAWN`, `CLAIM_UNVERIFIED`, `PII_MINIMIZED` (INFO). Tests: a
stage receiving a field it didn't declare fails a lint-style test.

#### WP-16 · RAOS-0014 — Returns & Post-Purchase Policy `(S–M · ← WP-02)`
Catalog-time machine-readable policy: return window, final-sale, restocking
fee, who-pays-shipping, warranty, exchange-vs-refund, EU statutory floor by
region. INFO-stage contract `ComputedReturnPolicy` per line + cart-level mixed
policy summary. Codes: `FINAL_SALE` (CONDITION at add — must be acknowledged),
`RESTOCKING_FEE_APPLIES`, `STATUTORY_RIGHTS_EXTEND_POLICY` (INFO),
`WARRANTY_REGISTRATION_REQUIRED`. Composes 0006 (clearance → final-sale).

#### WP-17 · RAOS-0004 — Discovery, Catalog Semantics & Match `(L · ← WP-02; independent of pricing WPs)`
Merchant-declared `discoverabilityProfile` (keywords, categories, semantic
attributes, intent tags), substitution/alternates graph (binds 0005 OOS and
0010 discontinuation), bundles/kits with component-level
eligibility/availability roll-up (bundle buyable iff all components are —
spec the partial-bundle option), attribute normalization tables,
discoverable ≠ recommendable flag. VISIBILITY-stage adjacency: discovery
*ranks*, never overrides 0001 visibility. Codes: `SUBSTITUTE_AVAILABLE`
(INFO), `BUNDLE_COMPONENT_BLOCKED` (CONDITION), `BUNDLE_COMPONENT_OOS`
(CONDITION), `INVALID_OPTION_COMBINATION` (BLOCK), `FINDABLE_NOT_RECOMMENDED`
(INFO). Boutique becomes the showcase (her real gap per backlog X4).

#### WP-18 · RAOS-0012 — Cart Bridge & Checkout Handoff `(M · ← WP-07, WP-13)`
Cart serialization with per-line QuoteToken carriage, handoff payload to UCP
checkout (the boundary contract: RAOS carries reasoning + locked prices;
checkout owns payment/tax computation), idempotency key on handoff,
expired-quote-at-handoff flows (requote/reject per 0007 policy), partial-cart
proceed option, loyalty/offers surviving serialization byte-exact (test:
serialize → deserialize → revalidate → identical DecisionRecords).
Single-merchant only; marketplace cart flagged V2. Codes: `HANDOFF_READY`,
`HANDOFF_QUOTE_EXPIRED`, `HANDOFF_PARTIAL`, `HANDOFF_DUPLICATE_SUPPRESSED`.

---

### WAVE 5 — Real surface (post-spec-finalization, per D2)

#### WP-19 · Real MCP server `(L · ← v1.5 complete; lifts specs/TODO.md item)`
One "RetailAgentOS Shopping" MCP server as Next.js 16 `route.ts` (verify
against `node_modules/next/dist/docs/` route-handler + after/streaming docs):
resources (`raos://merchant/{id}/manifest|catalog|product/{pid}`,
`raos://spec/{nnnn}`, `raos://reason-registry`) then tools (`browse_catalog`,
`check_eligibility`, `evaluate_offer`, `validate_cart`, `get_quote`,
`begin_checkout`, `capture_intent`) — each a thin adapter over the WP-01
pipeline (ARCH §6 verbatim). Agent auth = client credential; buyer =
`trustMode` per 0015. **Equivalence test (R3): MCP `evaluate_offer` result
deep-equals the Playground pipeline result for identical inputs.** Real crypto
for 0008 lands here behind the WP-06 interface.

---

## 5. Archetype × tier scenario matrix (A3: all three, every edge case)

Each cell is a named scenario that must exist as **mock data + a worked example
in the owning spec + a golden test**. WPs own the cells of their spec row; this
matrix is the cross-check that no archetype is under-served.

### Sara's Boutique (DTC · headline Tier 1→2 journey)
| Spec | Scenarios |
|---|---|
| 0001 | guest-hidden gift line · member-only early access |
| 0002 | teaser price for guests · "limit 2" drop item · free sample ($0) · call-for-price bespoke item |
| 0004 | "personalized gift for dad" intent-tag match · findable-not-recommended sale rack · invalid monogram option combo |
| 0005 | preorder (next collection) · low-stock urgency on a one-off |
| 0006 | flash sale + coupon non-stackable · clearance final-sale (→0014) |
| 0007 | quote honored through a flash-sale ending |
| 0013 | call-for-price → lead form · OOS → notify-me · consent required |
| 0014 | final-sale clearance vs EU buyer statutory rights |

### Atlas Wholesale (B2B · headline Tier 2)
| Spec | Scenarios |
|---|---|
| 0001 | wholesale-only visibility · resale-cert required · `membershipTier` ladder (gold < reseller_plus < distributor) |
| 0002 | MOQ + increment violations · tier boundary exactly met · member-vs-bulk conflict (ladder demo) · per-customer limit |
| 0005 | backorder with ETA · reservation expiry on a large order |
| 0007 | context-hash mismatch (tier downgraded mid-negotiation) · partial honor (price holds, stock short) |
| 0010 | recurring restock subscription with price-change notify |
| 0011 | tax-exempt with signed vs asserted cert · vape line PACT-act carrier block |
| 0013 | below-MOQ → B2B quote-request handoff |
| 0018* | negotiation envelope (horizon) |

### Fresh Corner Market (Grocery · headline Tier 3→4 journey)
| Spec | Scenarios |
|---|---|
| 0001/0011 | beer SKU: age-verification path · region-not-legal · purchase limit 2 cases |
| 0002/0006 | weekly ad + member price + coupon + floor on one SKU (the stacking showcase) · "3 for $5" mix-and-match · BOGO |
| 0005 | per-store stock (BOPIS: store A yes, store B no) · two-agents-one-unit race · stock-stale TTL |
| 0003 | same-day cutoff crossing mid-session · delivery window full · split shipment (frozen pickup-only + pantry ship) · hazmat (butane) |
| 0009 | earn preview with sale-item exclusion · burn after promo ladder · unlinked teaser · points expiring |
| 0010 | subscribe-and-save staples · substitution on discontinued item (→0004) |
| 0012 | full cart handoff with mixed quote states |

---

## 6. Horizon: new problem areas as agents start shopping (reserved specs)

Numbered/scoped now; **built after Wave 4**. Each gets a one-page "Reserved"
stub in `specs/README.md` when its predecessor wave starts, so the namespace
and plane are public before the work.

| ID | Title | Plane | Problem it solves | Key contracts (sketch) |
|----|-------|-------|-------------------|------------------------|
| **0016** | Agent Identity, Reputation & Rate Limits | 0 | Merchants need to know *which agent* is shopping, throttle abuse (notify-me spam, quote farming, scraping), and extend trusted agents better service. The mirror image of buyer trust. | agent credential/registry, per-agent rate classes, abuse reason codes (`AGENT_RATE_LIMITED`, `AGENT_UNVERIFIED`), reputation signal (advisory) |
| **0017** | Merchant Observability & Catalog Change Feed | 0/1 | Once agents depend on catalog-time data, merchants need to see *what agents asked and why decisions fired* (the merchant trace, aggregated), and agents need push-style invalidation (price/stock changed) instead of TTL-polling alone. | decision-log aggregation contract (consumes WP-08 traces), `catalog-events` change feed (price_changed, stock_changed, promo_started/ended), webhook/subscription descriptor in manifest |
| **0018** | Negotiation & Dynamic Offers | 3/5 | B2B reality: list price is the *start*. Agents negotiating within merchant-declared bounds (floor, volume curves, counter-offer rounds) — deterministic envelope, no model in the merchant loop. | `NegotiationEnvelope { floorPrice hidden, counterRules, maxRounds }`, offer/counter-offer tokens (extends 0007), `NEGOTIATION_*` codes |
| **0019** | Payment Constraints & Stored Value | 5 | Pre-checkout payment *eligibility*: gift cards/store credit as tender, BNPL eligibility signals, payment-method restrictions on regulated goods (no credit for cannabis), deposit/preorder payment terms. Carries signals only — processing stays in checkout (B5 pattern). | `TenderConstraints` per variant/cart, stored-value balance claim (trust-gated), `PAYMENT_METHOD_RESTRICTED`, `DEPOSIT_REQUIRED` |
| V2 | Multi-currency / i18n · Marketplace cart | — | already logged in `specs/TODO.md` | seams exist (`currency` field; single-merchant tools) |

Also explicitly *watched but not spec'd*: dispute evidence (the developer
trace + quote token already form the evidence bundle — document this as a
0007/0013 application note, not a new spec); anti-steering/ranking fairness
(policy, not protocol — keep out).

---

## 7. Sequencing summary & parallelization map

```
WAVE 0 (sequential)    WP-00 → WP-01 → WP-02 → WP-03
WAVE 1 (parallel ×3)   WP-04 (0002)   WP-05 (0005)   WP-06 (0008)
WAVE 2 (parallel ×2)   WP-07 (0007 ← 04,05,06)       WP-08 (trace ← 02)
                       ════ v1 spec-complete here (A2 six + trace) ════
WAVE 3 (parallel ×3)   WP-09 (0006)   WP-10 (0011)   WP-11 (0009 ← 09)
WAVE 4 (parallel)      WP-12 (0010)   WP-13 (0003)   WP-15 (0015)
                       WP-16 (0014)   WP-17 (0004)
                       then WP-14 (0013 pt2 ← 08,15) · WP-18 (0012 ← 07,13)
WAVE 5                 WP-19 (real MCP — lifts the D2 TODO)
```

Pacing per D3 ("ship fast and learn"): one WP ≈ one public build-log unit.
Wave-1/3 WPs are sized to run as three parallel sub-agents; merge order within
a wave: lowest WP number first (their type changes are disjoint by design —
each owns its own files in `src/lib/rules/` + `src/lib/types/`; shared-file
edits are limited to `merchants.ts`, `catalog.ts`, `specs/README.md`, and the
`/specs` index, which merge trivially).

---

## 8. Program definition of done (delta to PROGRAM-PLAN §9)

Everything in PROGRAM-PLAN §9 stands, plus:
- [ ] `npm test` green; every reason code covered by `reasonCodeCoverage`
      (WP-00 helper); golden fixtures updated only with a reviewed diff.
- [ ] Determinism grep clean (`Date.now|Math.random|fetch(` absent from
      `src/lib/rules|extensions|trace`).
- [ ] Every scenario cell in §5 owned by a fixture + worked example.
- [ ] Trace renderings exist for any new reason codes (WP-08 renderers are
      table-driven off the registry — adding a code includes its merchant
      remediation text).
- [ ] `specs/TODO.md` and `PRODUCT-BACKLOG.md` rows updated as WPs land.

## 9. Risk register (delta)

| Risk | Mitigation |
|---|---|
| Refactor (WP-01/02) breaks behavior silently | WP-00 goldens first; WP-01 byte-identical gate; WP-02 reviewed-diff-only regeneration |
| Parallel sub-agents collide in shared files | §7 file-ownership rule; shared files are append-mostly (tables, mock arrays) |
| `AppliedOffer` shape churn between 0002→0006→0007 | Shape frozen in WP-04 with ladder fields present from day one (§1.2-4) |
| Trace leaks merchant internals to buyers | WP-08 deny-list test on buyer rendering |
| Simulated crypto mistaken for real | `TRUST_SIMULATED` INFO code always emitted; "SIMULATED" rendered in every payload view (WP-06) |
| Spec sprawl outruns the runnable demo | Hard rule stands: a spec is real only if the Playground runs it (Standard Set item 3/4) |

---

*This plan executes the locked decisions in `questions.md` and the contracts in
`0000-foundations.md` / `ARCH-UCP-EXTENSION-MCP.md`. Adjustments to those
documents made here are listed exhaustively in §1.2; everything else defers.*
