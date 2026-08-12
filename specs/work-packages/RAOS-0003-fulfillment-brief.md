# Work Package: RAOS-0003 · Fulfillment Feasibility (Tier 1) — full build

**Status:** ready to run · not yet executed
**Written:** 2026-08-12 · supersedes the brief in `specs/PROGRAM-PLAN.md` §6 (RAOS-0003 entry,
still `[Plane 4]` — stale, kept as historical scope reference only) and the header of
`specs/wiki/pending/0003-fulfillment.md` (still says "Tier 4 · Plane 4" — stale for the same
reason). This file is the current, run-ready version; §8 below has the agent fix those two
pointers as part of the deliverable.

You are writing and implementing a new spec for RetailAgentOS (RAOS), an open set of UCP
(Universal Commerce Protocol) extensions that move merchant reasoning from checkout-time to
catalog-time with machine-readable reasons attached.

**Repo:** `/Users/rikbanerjee/code/ucp-commerce-extension-demo`
**Mode:** full Standard Deliverable Set in one run — spec, types, evaluator, Playground, spec
page, tests. Do not stop for approval. Where a call is yours to make, make it and document it.

---

## 0. Read these first — do not skip

| File | Why |
|---|---|
| `specs/0001-eligibility.md` | **The template.** Match its structure, voice, and rigor exactly. Also the spec you will modify — see §3. Read §9.6 closely. |
| `specs/wiki/pending/0003-fulfillment.md` | Captured intent for THIS spec. Build on it; its "Tier 4 · Plane 4" header is now stale. |
| `specs/0000-foundations.md` §4 (BuyerContext), §4.3 (normalization defaults), §7.2 (most-restrictive), §7.4 (deprecation), §8 (ReasonEntry/severity) | Shared contracts. You will be **changing** §4 — see §4 below. |
| `specs/README.md` | Tier catalog. 0003 moves Tier 4 → Tier 1. |
| `src/lib/extensions/contract.ts` | `PipelineStage` + `STAGE_ORDER`. `FULFILLMENT` already exists, positioned after `PRICE`. |
| `src/lib/types/extensions.ts` (`FulfillmentConstraints`, ~line 83) | Existing config — only `availableModes` + `restrictedRegions` today. |
| `src/lib/rules/eligibility.ts` | Where fulfillment-mode checking currently lives (inside ELIGIBILITY, owned by 0001). You are moving it. |
| `src/lib/rules/regionAllowlist.ts`, `src/lib/extensions/pipeline.ts` | Merchant-level `servesRegions`, shipped 2026-08-02. Collides with your region codes. |
| `src/lib/types/context.ts` | `BuyerContext`. Note what is **not** there: no `needByDate`, no timezone. |
| `specs/MASTER-BUILD-PLAN.md` §3 items 4–7 | Standard Deliverable Set + determinism lint = definition of done. |

---

## 1. Why this spec, and who it is for

RAOS-0003 is **promoted from Tier 4 to Tier 1** (decided 2026-08-12). Tier 1 is "no dead-end
carts." For a last-mile network, "can this reach this buyer at all" *is* the dead-end-cart
question — burying it at Tier 4 told the highest-value adopters they were an afterthought.

**Secondary audience, and it shapes §9:** this spec is intended to function as a credible
Request for Comment to people who operate fulfillment networks (Instacart, DoorDash, Uber).
§9 Open Questions is not a formality — it is the outreach artifact. Write forks a fulfillment
operations engineer would recognize as real.

---

## 2. Decisions already made — implement these, do not relitigate

| # | Decision | Consequence for you |
|---|---|---|
| **A** | **Merchant-owned feasibility in v1**, with a *designed-but-unbuilt* provider-delegation extension point documented in §9. | Build merchant-owned only. See §5 for what the extension point must articulate. |
| **B** | **Breaking changes are acceptable. Bump engine to 0.3.0.** | Migrate `FULFILLMENT_UNAVAILABLE` ownership out of 0001 cleanly, per §7.4 deprecation contract. No dual-emit. |
| **C** | **Ship everything deterministically evaluable.** | Modes, region, carrier restrictions (hazmat/oversize), lead-time vs need-by, and cutoff. Live capacity (`DELIVERY_WINDOW_FULL`) is **out** — it cannot be deterministic. |
| **D** | **Full Standard Deliverable Set in one run.** | No approval gates. Document your calls in the final report. |

### The one architectural call you must make and document

`STAGE_ORDER` is `VISIBILITY → ELIGIBILITY → PRICE → FULFILLMENT → QUOTE`. Every reason code in
your v1 scope is `BLOCK` severity and dead-end-cart — yet `FULFILLMENT` runs *after* `PRICE`.
Computing a price for an undeliverable item is wasted work and produces a confusing trace where
a price sits next to a hard block.

**Recommendation:** move feasibility *before* `PRICE`. Breaking changes are approved, so
reordering `STAGE_ORDER` is on the table. Prefer a clean stage-per-concern model over smuggling
fulfillment logic into `ELIGIBILITY`.

**But note the future constraint:** shipping *cost* (not in v1) genuinely depends on price and
weight, so it must run after `PRICE`. If you reorder, leave a documented home for cost later —
a feasibility stage early and the existing `FULFILLMENT` stage retained for cost/planning is the
most future-proof shape. Whatever you choose, justify it in the spec and the report.

---

## 3. Migrations out of RAOS-0001 (breaking, approved)

0001 §3 says it "consumes a fulfillment signal but does not define fulfillment semantics."
0003 now owns those semantics. Migrate both:

- **`availableModes`** → mode feasibility moves out of `calculateEligibility` into your evaluator.
- **`restrictedRegions`** → variant-level region restriction moves too (same argument).
- **`FULFILLMENT_UNAVAILABLE`** → deprecate in 0001 with `supersededBy`, re-source to 0003's
  namespace. Do **not** also introduce `FULFILLMENT_MODE_UNAVAILABLE` (the wiki stub proposes it)
  — that would ship two codes meaning the same thing. Pick one name, document the rename.

**Do not touch merchant-level `servesRegions`.** That short-circuit in `evaluateOffer` was
deliberately placed there on 2026-08-02 (0001 §9.6) because it is a merchant-level invariant, not
a per-variant rule. It stays. Your region code must not become a third region concept — read
§9.6 and either reuse `REGION_RESTRICTED` or document a crisp semantic difference.

**Precedence rule (was an open question, now decide it):** when an item is blocked by both an
eligibility rule and a fulfillment rule, adopt **first-blocking-stage governs** unless you find a
concrete reason it produces a worse buyer explanation. Document the rule and give it a test.

### Known bug to fix while you are here

0001 §7 documents a pinned asymmetry: `FULFILLMENT_UNAVAILABLE` is currently **unreachable** for
a variant with no `eligibilityRules`, because `calculateEligibility` early-returns at step 4. The
acceptance criterion is already written in 0001 §7. Your migration should resolve it. Update the
0001 §7 note to record the resolution — follow the changelog discipline in 0001 §11, do not
delete history.

---

## 4. Contract changes your scope requires — plan for these

`LEAD_TIME_EXCEEDS_NEED_BY` and `CUTOFF_PASSED` **cannot be evaluated with today's types.**
Verified: `needByDate`, `timezone`, `cutoff`, and `leadTime` do not exist anywhere in
`src/lib/types/` or `src/lib/rules/`. You must add them, and two are changes to *shared*
contracts that every other spec binds to. Treat this as the highest-risk part of the WP.

1. **`BuyerContext.needByDate`** (RAOS-0000 §4) — a new field on the shared buyer context.
   Required for `LEAD_TIME_EXCEEDS_NEED_BY`.
   **Make it optional.** Follow the 0001 §9.6 precedent: a naive "most-restrictive" reading
   (absent ⇒ block) would break every existing fixture. Absent should mean "no deadline
   asserted ⇒ never blocks on lead time." Add the normalization rule to §4.3 and to
   `normalizeBuyerContext`.
2. **Merchant-local timezone** — a "3pm cutoff" is meaningless without one. Decide where it
   lives (`MerchantProfile` is the natural home, since it is a merchant-level invariant like
   `servesRegions`) and whether it is required or optional-with-default. If you make it required,
   expect the same fixture-construction breakage `servesRegions` caused — that is acceptable
   under Decision B, but say so in the report.
3. Update **RAOS-0000's changelog (§13)** for both. A change to `BuyerContext` affects every
   spec; it must be recorded there, not only in 0003.

**Determinism trap:** cutoffs and lead times are the single most likely source of a determinism
bug in this WP. Time is always injected as `now`. Never call `Date.now()` or `new Date()` inside
`src/lib/rules` or `src/lib/extensions`. Timezone conversion must be pure and deterministic.

---

## 5. The provider extension point (§9) — this is the outreach artifact

Decision A ships merchant-owned feasibility, but the whole point of the Tier 1 promotion is to be
credible to fulfillment networks — and for Instacart or DoorDash, feasibility is *not* merchant
data. The merchant says "I stock milk"; the network says "I can deliver it in two hours."
RAOS currently has **no third-party fulfillment-provider actor** — only merchant and buyer.

Write a substantial §9 subsection that designs (does **not** build) that delegation. Address at
minimum:

- How a merchant declares "feasibility for mode X is asserted by provider P" in its manifest.
- Who signs that assertion, and how it composes with the RAOS-0008 trust/provenance envelope —
  a provider assertion is third-party data, so what `trustMode` does it carry?
- Freshness: a two-hour delivery promise is far more perishable than a shipping policy. What TTL
  semantics apply, and what does an agent do with a stale one?
- What breaks in the current model if the provider disagrees with the merchant.

Be explicit that this is designed and unbuilt. Then ask real questions — this section is what a
fulfillment engineer will actually respond to.

---

## 6. Scope line: deterministic vs. live capacity

Ship, with a fixture for each: mode feasibility · region · carrier restrictions (hazmat,
oversize) · lead-time vs need-by · cutoff passed.

Explicitly **defer**, naming the tier and reason: live slot capacity (`DELIVERY_WINDOW_FULL`),
split-shipment planning, and anything requiring a live capacity query. The line is
**deterministic from injected inputs** — if a candidate code fails that test, it does not belong
in v1. Say this in §3 Scope and defend it.

Do not ship a reason code you cannot test.

---

## 7. Deliverables

1. `specs/0003-fulfillment.md` — RAOS-0001 section structure exactly: Abstract · Motivation ·
   Scope · Inputs · Outputs · Reason code registry · Evaluation algorithm · Worked examples
   (three archetypes) · Open Questions/RFC (incl. §5 above) · Why this spec · Changelog.
2. Types: extend `FulfillmentConstraints`; add `BuyerContext.needByDate` and merchant timezone.
3. Pure reference impl in `src/lib/rules/`, registered as a pipeline extension.
4. Playground wiring + spec page `src/app/specs/0003-fulfillment/page.tsx` (clone 0001's).
5. Rows in **both** `/specs` index and `specs/README.md` — under **Tier 1**.
6. Conformance-tier mapping + manifest updates in `src/lib/mock/merchants.ts`.
7. Mock variants exercising **every** shipped reason code. Grocery archetype is the BOPIS
   showcase (store A vs store B stock) per the wiki stub.
8. Tests: every reason code gets ≥1 fixture; every edge case gets a test or an explicit Open
   Question. `npm test` and `npm run build` pass.
9. Engine bumped to **0.3.0** with a changelog entry naming every breaking change.

---

## 8. Tier 4 → Tier 1 migration checklist

Grep for `0003` and for `Tier 4`; verify every hit. At minimum:

- `specs/README.md` — move the 0003 row into the Tier 1 table.
- `specs/wiki/pending/0003-fulfillment.md` — header says "Tier 4 · Plane 4".
- `specs/0000-foundations.md` — Tier 1's definition may need to name fulfillment feasibility.
- `specs/ADOPTION-GUIDE.md` — tier-by-tier reference architecture.
- `src/app/evidence/conformance/data.ts` — conformance scoreboard.
- `specs/BUILD-PLAN.md` — execution queue.

A stale "Tier 4" reference makes the tier model look untrustworthy, which is the one thing this
project cannot afford.

---

## 9. House rules — non-negotiable

- **Determinism:** no `Date.now()`, `Math.random()`, `fetch(`, `new Date(` in `src/lib/rules` or
  `src/lib/extensions`. Grep your diff before finishing.
- **The spec is real only if the Playground runs it.** Anything designed but unbuilt goes in Open
  Questions, clearly labeled.
- **Never repurpose an existing reason code's meaning.** New codes additive; deprecations carry
  `supersededBy` and survive ≥1 major (RAOS-0000 §7.4).
- **No new status tables or taxonomies.** Update `VERIFICATION-NEEDED.md` and the
  `specs/README.md` row. Do not invent a tracking doc.
- **Label simulated seams** the way RAOS-0008 marks `TRUST_SIMULATED`.
- **`marketing/` has a pre-existing, unrelated `tsc` failure** (`VERIFICATION-NEEDED.md` §2). It
  is gitignored and out of scope — do not fix it, do not let it block you. Verify your work with
  `npx tsc --noEmit` scoped to `src/`, and note the known failure in your report.

---

## 10. Report when done

End with: what shipped · what was deferred and why · the `STAGE_ORDER` decision and its
justification · every contract change affecting another spec (especially `BuyerContext`) · the
full list of breaking changes in engine 0.3.0 · confirmation `npm test` and `npm run build` pass,
with the test count.
