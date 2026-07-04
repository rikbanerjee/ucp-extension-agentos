# RetailAgentOS — Prod-Readiness Punch List

> **Superseded (2026-07-04):** this list's ordering has been folded into
> [`specs/BUILD-PLAN.md`](./specs/BUILD-PLAN.md) (Q1–Q8), which is now the single execution
> queue. Retained for the rationale text below; don't take order from this file.

**Date:** 2026-07-01 · **Status:** Superseded by `specs/BUILD-PLAN.md` — rationale archive only.
**Sources:** `specs/TODO.md`, `specs/PROGRAM-PLAN.md`, `specs/MASTER-BUILD-PLAN.md`,
`specs/reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md`.
**See also:** [`specs/WIKI.md`](./specs/WIKI.md) — plain-language intent per spec, and each
pending item below now has its own detail page under `specs/wiki/pending/`.
**Before acting on any item below as "already done":** check [`VERIFICATION-NEEDED.md`](./VERIFICATION-NEEDED.md)
— tests were re-run and pass (328/328, 2026-07-04), but coverage %, `npm run build`, and three
undocumented app surfaces (`sandbox/reference`, `sandbox/retail-agent-os`, `aeo-score`) were
not fully assessed and could change this list's priorities.

Ordered by what actually unlocks "real merchant transacting" fastest, not by spec number.

---

## P0 — Blockers to anything being real (not simulated)

1. **Ship TheCustomHub pilot (Track B, B0–B5).** This is the only path from "simulated demo"
   to a live agent completing a real purchase. Engine is already built and tarballed
   (`packages/engine`) — the work is entirely in the *other* repo now.
   - B0: install `@retailagentos/engine` tarball in thecustomhub repo.
   - B1: extend `products.json` (`callForPrice`, `leadTimeDays`, `shipsTo`), strip null-variant rows.
   - B2: implement `CustomHubAdapter` (products.json → RAOS `Variant[]`).
   - B3 + B4 (parallel): serve real `/.well-known/ucp`; serve schema.org `Product`/`Offer` JSON-LD
     (SPA is client-rendered, so this needs prerender or a Cloud Function — agents can't run the SPA).
   - B5: real MCP server on **Cloud Run** (SSE/streaming — not Cloud Functions), tools
     `evaluateOffer` + `issueQuote`, checkout handoff to existing Stripe `createCheckoutSession`.
   - **Acceptance:** Claude Desktop connects, finds a product that ships to Canada under $X,
     quotes it, completes checkout via Stripe; an out-of-region/out-of-stock item is declined
     with a reason, not a failed checkout.
   - **B6 — evidence, not just a working demo (per `EVIDENCE-PLAN.md` E5; detailed in
     `specs/reference-implementation/README.md`):** this step is what turns the pilot from an
     anecdote into a benchmark, and it doesn't block B0–B5, it rides on top of them.
     - Run the same agent task set against the **raw, unmodified** TheCustomHub store first
       and record the failure count (dead-end cart, wrong quote, silent no-match).
     - Run the identical task set again **after** Track B ships. The headline number is
       "agents completed 0/N tasks on the unmodified store; N-1/N with the reasoning layer."
     - Capture both the positive acceptance transcript (finds → quotes → checks out) and the
       negative one (declined with a reason) **verbatim**, not just as a checked acceptance box.
     - **Do not publish** "a real agent completed a real purchase" or any live-MCP claim
       before this step lands (claim-discipline rule from `EVIDENCE-PLAN.md` §5).

2. **Real MCP transport for the kit itself (WP-19).** Currently everything is simulated per
   locked decision D2. Once Track B proves the pattern once, generalize: Next.js 16 `route.ts`
   resources (`raos://merchant/{id}/manifest|catalog`, `raos://spec/{nnnn}`) + tools
   (`browse_catalog`, `check_eligibility`, `evaluate_offer`, `validate_cart`, `get_quote`,
   `begin_checkout`, `capture_intent`) as thin adapters over the existing pipeline.
   - **Equivalence test required:** MCP `evaluate_offer` output must deep-equal the Playground
     pipeline output for identical inputs.

3. **Real crypto for trust envelope (0008).** Today `signEnvelope`/`verifyEnvelope` are
   deterministic fakes labeled `TRUST_SIMULATED`. Swapping to real signing is scoped as
   mechanical behind the existing interface (`src/lib/rules/trust.ts`) — do this once a real
   transport exists (no point signing payloads nobody can verify yet).

---

## P1 — Highest-leverage spec work (differentiation, not just parity)

4. **RAOS-0006 — Promotional Pricing & Stacking.** Called out repeatedly across
   `PRODUCT-BACKLOG.md` and `PROGRAM-PLAN.md` as the #1 differentiation gap vs. ACP/UCP/Talon.One
   — nobody else specs a deterministic, merchant-declared stacking model with reason codes.
   `AppliedOffer` shape is already frozen for this in WP-04 (0002), so this is additive, not a
   rewrite. Grocery archetype is the intended showcase (weekly ad + coupon + member price + floor
   on one SKU).

5. **RAOS-0011 — Tax & Restricted/Regulated Goods.** Real legal exposure (alcohol/cannabis/
   tobacco delivery compliance) and no existing protocol covers it. Depends only on WP-03
   (0001 retrofit), which is done — this is unblocked today.

6. **RAOS-0009 — Loyalty & Rewards (browse-time earn/burn).** Second-highest differentiation
   item per the backlog; depends on 0006 landing first (burn is applied after the promo ladder).

7. **Close the trace sign-off gate (0013 / WP-08).** The three-audience decision trace
   (merchant ops / buyer simplified / developer JSON) is built, but `MASTER-BUILD-PLAN.md`
   still calls for an explicit owner review of the schema before the `/specs/0013` page goes
   fully public. This is a five-minute review, not a build task — just needs to be formally closed.

---

## P2 — Rounds out v1.5 / Tier 3–4 completion

8. **RAOS-0003 — Fulfillment Feasibility** (ship/pickup/local-delivery/BOPIS, cutoff times,
   hazmat/oversize). Depends on 0005 (done) and 0011 (item 5 above).
9. **RAOS-0004 — Discovery, Catalog Semantics & Match.** Sara's Boutique's actual gap
   (intent-tag matching, substitutions, bundles). Independent of the pricing chain — can run
   in parallel with anything above.
10. **RAOS-0010 — Subscriptions & Recurring.** Depends on 0007 (done) + 0009 (item 6).
11. **RAOS-0012 — Cart Bridge & Checkout Handoff.** The last-mile serialization work; depends
    on 0007 + 0003.
12. **RAOS-0014 — Returns & Post-Purchase Policy** and **RAOS-0015 — Privacy, Consent & Identity.**
    Lower urgency but both are cross-cutting "must-haves" the backlog flags as trust unlocks;
    0015 also hardens the account-linking trust story that 0009/0011 currently only simulate.

---

## P3 — Infra hygiene (do opportunistically, not blocking)

13. Multi-currency/i18n and cross-merchant/marketplace cart remain **explicitly V2** — do not
    pull forward. Keep `currency` as a design seam only (already done).
14. Reserved horizon specs (0016 Agent Identity/Rate-Limits, 0017 Observability/Change Feed,
    0018 Negotiation, 0019 Payment Constraints) — numbered and scoped in `MASTER-BUILD-PLAN.md`
    §6, intentionally post-Wave-4. No action needed yet beyond keeping the namespace reservations
    intact in `specs/README.md`.

---

## Recommended immediate order

**Track B (items 1–2) → 0006 → 0011 → 0009 → everything else.**

Rationale: Track B converts the whole project from "credible demo" to "an agent actually bought
something," which is the strongest possible proof point for the upstream-UCP pitch. 0006 is the
cheapest high-differentiation spec left (contract already frozen). 0011 is unblocked today and
carries real legal-exposure urgency. Everything in P2 can wait for validation from the pilot.
