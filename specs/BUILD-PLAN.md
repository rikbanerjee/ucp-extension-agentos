# RetailAgentOS — Build Plan (the one execution queue)

**Role:** the single, forward-looking execution document for **engine + spec work**. If you
are a coding agent asked to "build the next thing," start here — not in
`MASTER-BUILD-PLAN.md`, `PROGRAM-PLAN.md`, or `PUNCH-LIST.md` (those are retained as detail
archives; this file supersedes their ordering). Website/positioning work has its own queue:
[`SITE-PLAN.md`](./SITE-PLAN.md) — never mix the two in one task.
**Last reconciled:** 2026-07-04.

**How this file stays true:** when a task below lands, (1) move its row to §1, (2) update
the spec's status row in [`README.md`](./README.md), (3) update
[`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md) if you ran anything that changes a
verified fact. One home per fact: status lives in `VERIFICATION-NEEDED.md`, catalog lives
in `README.md`, order lives here.

---

## 1. Done (do not rebuild — summary only)

Waves 0–2 of the original plan are complete: test harness + golden fixtures, extension
registry + five-stage pipeline + `now` injection, the RAOS-0000 contract in code
(`BuyerContext`, `ReasonEntry`/severity, `/.well-known/ucp` route), and the full v1 spine —
specs **0000, 0001, 0002, 0005, 0007, 0008, 0013 pt 1 (trace)** published Draft·RFC with
tested reference implementations. The engine is extracted as `@retailagentos/engine`
(`packages/engine`, v0.1.0, tarballed). 328/328 tests passing as of 2026-07-04.

**Q1 hygiene batch — done (2026-07-04):** tsc and `src/lib` lint are clean, `npm run build`
passes, real coverage recorded (93.8% lines on `src/lib/rules`), and the engine tarball was
rebuilt and smoke-tested in an external project (ESM + CJS). Details: `VERIFICATION-NEEDED.md` §1.

**Q2b · Kit defects surfaced by the pilot audit — done (2026-08-01):** both kit defects found
by the Track B audit are resolved. **OQ-1 (RAOS-0000):** `buildManifest()` now composes
`endpoints` + `servesRegions` onto the manifest instead of dropping them; `buildManifest(profile)`
is self-sufficient. **OQ-2 (RAOS-0001):** the region allowlist is now enforced by `evaluateOffer`
itself (merchant-level short-circuit, not folded into `calculateEligibility` — it's a
merchant-level invariant, not a per-variant rule); `MerchantProfile.servesRegions` is now
required; undeclared state (JS/JSON-only backstop) surfaces as `REGION_POLICY_UNDECLARED`
(`INFO`, additive) once at manifest-build time. Full resolution write-ups:
`specs/0000-foundations.md` §13, `specs/0001-eligibility.md` §9.6. Engine bumped to 0.2.0
(breaking: required field, manifest shape, `evaluateOffer` behavior). 348/348 tests passing.
Details: `reference-implementation/thecustomhub/04-pilot-evidence.md` §8,
`VERIFICATION-NEEDED.md` §1. **Q2 itself (the pilot) remains open** — this closed only the
kit-side blockers; merchant-side Phase 1/4 work in `RUNBOOK-CLOSE-Q2.md` is still outstanding.

Per-WP detail for the done work: `MASTER-BUILD-PLAN.md` §4 Waves 0–2.

---

## 2. Rules for every task (non-negotiable)

Restated from `MASTER-BUILD-PLAN.md` §1.3/§3 — read those sections in full before a spec WP.

1. **Read first:** `AGENTS.md`, the owning spec (or its `wiki/pending/` brief),
   `0000-foundations.md` §4–§9. This is Next.js 16 — check `node_modules/next/dist/docs/`
   before touching routing/pages.
2. **Determinism:** no `Date.now()`, `Math.random()`, `fetch()`, `new Date()` inside
   `src/lib/rules|extensions|trace`. Time is an injected `now`. Grep your diff.
3. **Most-restrictive default** on unknown/missing/untrusted context; fail-degraded, never
   crash; additive-only reason codes.
4. **Spec WPs ship the Standard Deliverable Set** (spec md · types · pure rules impl
   registered as an evaluator · Playground wiring · spec page · catalog row updates ·
   manifest/mock updates · a fixture for every reason code). See `PROGRAM-PLAN.md` §7.
5. **Tests are deliverables.** `npm test` green; every new reason code covered; golden
   fixtures regenerate only with a reviewed diff. `npm run build` must pass.
6. **Scope discipline:** touch only your task's files. Don't renumber or rename specs.
   If a spec and RAOS-0000 disagree, 0000 wins.

---

## 3. The queue (in order)

**Reordered 2026-08-01.** Rationale in §5. The short version: the binding constraint on this
project is **proof, not spec count**. Seven specs with 328 passing tests and a packaged engine
is already more than enough surface to justify one real transaction. A tenth spec is worth
less than the first live merchant. The queue below is therefore gated: nothing past Q4 starts
until the pilot produces evidence.

### ~~Q1 · Hygiene batch~~ — ✅ done 2026-07-04 (moved to §1)

### Q2 · TheCustomHub pilot, Track B `(L · lives in the thecustomhub repo)` — **THE GATE**
The only path from "simulated demo" to "an agent bought something real." Brief:
[`reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md`](./reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md)
(self-contained; steps B0–B6). Plus the **B6 evidence instrumentation** (before/after agent
task failure rate + verbatim transcripts) defined in
[`reference-implementation/README.md`](./reference-implementation/README.md) — without it the
pilot is an anecdote, and no "real purchase" claim may be published before it lands.

**Completion is tracked in one place:**
[`reference-implementation/thecustomhub/04-pilot-evidence.md`](./reference-implementation/thecustomhub/04-pilot-evidence.md)
— the intake checklist for every artifact that must arrive from the merchant repo. While that
file has open boxes, Q2 is open. It also resolves two prior doc bugs: the duplicate "B6" label
(now **B6-feature** vs **B7-evidence**) and the conflicting completion bars between
`TRACK-B-FOR-THECUSTOMHUB.md` and `PUNCH-LIST.md`. **Canonical bar: B0–B5 + B7-evidence.
B6-feature is a follow-on and does not gate Q2.**

**Hard rule:** no new spec WP (Q6+) may start while Q2 is open. Site/positioning work is not a
substitute for this and does not unblock it. If Q2 is genuinely parked on the merchant's side,
say so in `VERIFICATION-NEEDED.md` with a date and a reason — do not silently reorder around it.

### ~~Q2b · Kit defects surfaced by the pilot audit~~ — ✅ done 2026-08-01 (moved to §1)

### Q3 · Real crypto behind the `trust.ts` seam `(S · was Q8, split out and promoted)`
Swap `simulatedSign` (djb2) for HMAC-SHA256 over the existing canonicalization; flip
`trustMode` to `'signed'`; keep `TRUST_SIMULATED` as a valid mode for the Playground. The
interface is already locked (`signEnvelope`/`verifyEnvelope`), so this is a body swap plus key
material and a rotation story — **not** the MCP work it was previously bundled with.

*Why promoted:* the price-lock guarantee (RAOS-0007) is the single most defensible claim in
the suite, and it is currently the one every reviewer discounts because the signature literally
says `sim:`. Small task, disproportionate credibility return. Ships alongside Q2, not after.

### Q4 · RAOS-0011 — Tax & Restricted/Regulated Goods `(M)`
Promoted above 0006. Real legal exposure, smaller than 0006, and the clearest thing baseline
UCP structurally cannot do at catalog time — a spec that is *about* refusing a sale is a
category no checkout-time extension will absorb. Brief: `MASTER-BUILD-PLAN.md` WP-10 +
`wiki/pending/0011-restricted-goods.md`.

### Q5 · Upstream contribution track `(M · new · ← Q2 evidence)`
Per [UCP's own CONTRIBUTING](https://github.com/Universal-Commerce-Protocol/ucp/blob/main/CONTRIBUTING.md):
vendors are told to build in `com.{vendor}.*` first and submit upstream **once there is proven
adoption**. `com.os.retailagent.*` is the sanctioned on-ramp, not a competing fork. So:

1. Package RAOS-0001 (eligibility) and RAOS-0007 (quote integrity) as UCP extension proposals —
   the two with the cleanest "baseline UCP has no catalog-time equivalent" argument.
2. File them with the Q2 failure-rate evidence attached. Evidence is the admission ticket.
3. Track the outcome publicly on `/evidence`.

Absorption upstream is the **win condition**, not the failure mode. Design every remaining spec
so it can be donated: no RAOS-only concepts that don't translate to a `dev.ucp.*` shape.

### Q6 · RAOS-0006 — Promotional Pricing & Stacking `(L · ← 0002, done)`
Demoted from Q3 — still the #1 differentiation gap, but it is a large build and its value is
compounded by, not prior to, a live merchant. `AppliedOffer` was frozen in 0002 so this stays
additive whenever it lands. Brief: `MASTER-BUILD-PLAN.md` WP-09 +
`wiki/pending/0006-promo-stacking.md`. Locked design: priority ladder + per-offer
`stackable`/`exclusive`, loyalty burn last, floor-price protection. Grocery archetype.

### Q7 · RAOS-0009 — Loyalty & Rewards `(L · ← Q6, burn rides the promo ladder)`
Brief: `MASTER-BUILD-PLAN.md` WP-11 + `wiki/pending/0009-loyalty.md`.

### Q8 · Distribution: platform adapter `(L · new · ← Q2)`
The largest *real* adoption barrier is that an SMB on Shopify/WooCommerce cannot hand-author
rule manifests. `@retailagentos/engine` already removes the schema-authoring problem for anyone
who can run `npm i`; this closes the rest of the gap. Pick **one** platform (Shopify, given
where UCP's gravity is) and ship a thin app/adapter that maps existing merchant admin data —
customer tags, price lists, inventory locations, metafields — into `BuyerContext` + rule
profiles with zero hand-written JSON. One platform done properly beats four half-done.

### Q9 · Evidence artifacts E1/E2/E4 `(S each · parallel with anything)`
From `../EVIDENCE-PLAN.md`. Largely landed via the SITE-PLAN work; keep as packaging-only.
**Not** a place to spend a week when Q2 is open.

### Q10 · Real MCP server `(L · ← Q2 proves the pattern)`
The transport half of the old Q8. Generalize the pilot's transport into the kit: WP-19 brief in
`MASTER-BUILD-PLAN.md`. Hard gate: the MCP `evaluate_offer` result must deep-equal the pipeline
result for identical inputs.

### Q11 · Tier 3/4 completion `(after Q2–Q8 validate demand)`
In dependency order: 0010 Subscriptions (← 0009) · 0015 Privacy · 0014 Returns · then 0013 pt 2
Intent-capture routing (← 0015). Briefs: `MASTER-BUILD-PLAN.md` WP-12…WP-18.

**Reclassified — write as adapters, not as rival specs:** 0003 Fulfillment Feasibility, 0012
Cart Bridge, and 0004 Discovery/Match sit directly over ground UCP already occupies or is
moving into (`dev.ucp.shopping.fulfillment` and `dev.ucp.shopping.discount` both extend
`dev.ucp.shopping.checkout`; catalog search is native). The defensible RAOS contribution in
these three is **only** the catalog-time / pre-cart evaluation, handing off to the native
`dev.ucp.*` shapes at checkout. Do not re-specify what UCP already expresses; specify the
shift-left and map to theirs.

---

## 4. Standing decisions (don't relitigate)

- Namespace `com.os.retailagent.shopping.*`; vendor-neutral, UCP upstream-candidate prose.
- Conformance tier (merchant maturity) ≠ buyer loyalty tier (a `BuyerContext` claim).
- Promo model: priority ladder + `stackable`/`exclusive`; loyalty burn last.
- USD-only and single-merchant cart in v1 (seams exist; multi-currency + marketplace = V2).
- MCP simulated until Q10; crypto simulated (labeled `TRUST_SIMULATED`) until **Q3** (split
  from the MCP work 2026-08-01 and promoted).
- Trace format decided: merchant ops-view · buyer simplified · developer JSON. One open
  process item: formally record owner sign-off on the trace schema in the 0013 changelog.
- Horizon specs 0016–0019 stay reserved (namespaces only) until Q11 is done.
- **Upstream absorption is the goal, not the threat** (added 2026-08-01). Every spec is written
  to be donatable to `dev.ucp.*`. Success looks like a RAOS shape landing in the UCP core and
  the `com.os.retailagent.*` namespace shrinking.

Full decision log: `../questions.md`.

---

## 5. Maturity ladder — theory → implementation-ready

Added 2026-08-01. A spec is not "done" when the prose is written. It is done when a merchant
can run it in production. Six stages; **every published spec carries its stage**, and the
public catalog shows the stage, not just `Draft · RFC`.

| Stage | Means | Evidence required | Where RAOS is today |
|---|---|---|---|
| **S0 · Specified** | Prose + schema exist | Spec page published | All 16 modules have at least a brief |
| **S1 · Executable** | Pure reference impl, deterministic, a fixture per reason code | `npm test` green; reason-code coverage report | **7 specs** (0000, 0001, 0002, 0005, 0007, 0008, 0013 pt 1) — 328 tests, 93.8% lines |
| **S2 · Packaged** | Installable by a third party with no repo access | External smoke test, ESM + CJS | ✅ `@retailagentos/engine` v0.1.0 |
| **S3 · Trustworthy** | No simulated primitives on any load-bearing path | Real signatures; key rotation documented | ❌ blocked on **Q3** |
| **S4 · Proven** | A real agent completes a real purchase against a real catalog | B6 before/after failure rate + verbatim transcripts | ❌ blocked on **Q2** |
| **S5 · Distributable** | A non-engineer merchant can adopt it | Platform adapter; zero hand-authored JSON | ❌ blocked on **Q8** |
| **S6 · Standard** | The semantics live upstream | A filed `dev.ucp.*` extension proposal | ❌ blocked on **Q5** |

**The honest read of the ladder:** the project is strong at S1–S2 and has nothing at S3–S6.
Adding more S0/S1 specs widens a base that is already wide enough. The entire remaining value
of this project is in climbing S3 → S6 with the seven specs that already exist.

**Rule:** no module advances past S1 in the public catalog without the evidence column filled
in `../VERIFICATION-NEEDED.md`. No stage may be claimed on the site that is not claimable here.

### What the "16 modules, mostly unbuilt" critique gets right and wrong

Right: 9 of 16 modules have no code, foundation crypto is simulated, there is no platform
distribution, and a solo maintainer cannot out-govern the UCP steering coalition. Those are
real and the queue above is reordered around them.

Wrong on three points, recorded here so they don't get re-litigated:

1. **Not "12 of 16 unreleased."** Seven modules have tested reference implementations with
   328 passing tests and 93.8% line coverage. `Draft · RFC` is a governance label, not an
   indicator of missing code.
2. **Simulated crypto is a labeled seam, not a hidden defect.** `trust.ts` emits
   `trustMode: 'asserted'`, a `sim:` signature prefix, and a `TRUST_SIMULATED` reason code
   specifically so no consumer can mistake it for real. Q3 closes it.
3. **"Merchants must hand-author JSON Schema manifests" is out of date.** The engine ships as
   a zero-runtime-dependency tarball; adoption is `npm i`, not schema authoring. The remaining
   gap is platform distribution for merchants who can't run npm at all — that's Q8.
