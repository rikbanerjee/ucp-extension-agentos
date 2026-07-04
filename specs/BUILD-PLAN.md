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

### ~~Q1 · Hygiene batch~~ — ✅ done 2026-07-04 (moved to §1)

### Q2 · TheCustomHub pilot, Track B `(L · lives in the thecustomhub repo)`
The only path from "simulated demo" to "an agent bought something real." Brief:
[`reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md`](./reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md)
(self-contained; steps B0–B6). Plus the **B6 evidence instrumentation** (before/after agent
task failure rate + verbatim transcripts) defined in
[`reference-implementation/README.md`](./reference-implementation/README.md) — without it the
pilot is an anecdote, and no "real purchase" claim may be published before it lands.

### Q3 · RAOS-0006 — Promotional Pricing & Stacking `(L · ← 0002, done)`
The #1 differentiation gap; the `AppliedOffer` shape was frozen in 0002 specifically so this
is additive. Full brief: `MASTER-BUILD-PLAN.md` WP-09 + `wiki/pending/0006-promo-stacking.md`.
Locked design: priority ladder + per-offer `stackable`/`exclusive`, loyalty burn last,
floor-price protection. Grocery archetype is the showcase.

### Q4 · RAOS-0011 — Tax & Restricted/Regulated Goods `(M · unblocked today)`
Real legal exposure; no other protocol covers it. Brief: `MASTER-BUILD-PLAN.md` WP-10 +
`wiki/pending/0011-restricted-goods.md`.

### Q5 · RAOS-0009 — Loyalty & Rewards `(L · ← Q3, burn rides the promo ladder)`
Brief: `MASTER-BUILD-PLAN.md` WP-11 + `wiki/pending/0009-loyalty.md`.

### Q6 · Evidence artifacts E1/E2/E4 `(S each · parallel with anything)`
From `../EVIDENCE-PLAN.md`: the public scorecard page, the curl-able `agents.md` machine
onboarding file, and the generated conformance/coverage scoreboard. Pure packaging of things
that already exist; they make the project promotable while Q2–Q5 run.

### Q7 · Tier 3/4 completion `(after Q2–Q5 validate demand)`
In dependency order: 0010 Subscriptions (← 0009) · 0003 Fulfillment (← 0011) · 0015 Privacy
· 0014 Returns · 0004 Discovery/Match (independent — can run any time) · then 0013 pt 2
Intent-capture routing (← 0015) · 0012 Cart Bridge (← 0003). Briefs: `MASTER-BUILD-PLAN.md`
WP-12…WP-18 + the matching `wiki/pending/` pages.

### Q8 · Real MCP server + real crypto `(L · ← Q2 proves the pattern)`
Generalize the pilot's transport into the kit: WP-19 brief in `MASTER-BUILD-PLAN.md`.
Hard gate: the MCP `evaluate_offer` result must deep-equal the pipeline result for
identical inputs. Real signing swaps in behind the existing `trust.ts` interface.

---

## 4. Standing decisions (don't relitigate)

- Namespace `com.os.retailagent.shopping.*`; vendor-neutral, UCP upstream-candidate prose.
- Conformance tier (merchant maturity) ≠ buyer loyalty tier (a `BuyerContext` claim).
- Promo model: priority ladder + `stackable`/`exclusive`; loyalty burn last.
- USD-only and single-merchant cart in v1 (seams exist; multi-currency + marketplace = V2).
- MCP simulated until Q8; crypto simulated (labeled `TRUST_SIMULATED`) until Q8.
- Trace format decided: merchant ops-view · buyer simplified · developer JSON. One open
  process item: formally record owner sign-off on the trace schema in the 0013 changelog.
- Horizon specs 0016–0019 stay reserved (namespaces only) until Q7 is done.

Full decision log: `../questions.md`.
