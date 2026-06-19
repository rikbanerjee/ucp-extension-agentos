# RetailAgentOS — Spec Program: Decisions I Need From You

> Fill in the blanks / circle a choice. Each question has my **recommended default** so
> nothing blocks — if you skip one, the sub-agents proceed on the default. The plan
> (`specs/PROGRAM-PLAN.md`) is written to be executable *as-is* on these defaults; your
> answers only refine it.
>
> How to answer: type your choice after `→`. One word is fine.

---

## A. Strategic framing

**A1. Who is this spec series ultimately written *for*?**
Are we writing RAOS extensions as **(a)** vendor-scoped extensions that live forever under
`com.ezyupload.shopping.*`, or **(b)** candidate proposals we intend to push *upstream into UCP*
(so the language must stay vendor-neutral and we'd later rename namespaces)?
- Recommended default: **(b) upstream-candidate** — write vendor-neutral, keep the namespace as the reference implementation, flag "proposed for UCP core" per spec.
- → _______________b, also make any packages as needed to com.os.retailagent.shopping.* donot use ezyupload for anything replace the wording ezyupload in this project rightw now_______________________________

**A2. What is the v1 boundary** (what must be *spec-complete* in the next ~8–10 weeks vs. backlog)?
- Recommended default v1: Foundations (0000), Eligibility (0001, done), Contextual Pricing (0002),
  Inventory (0005), Quote Integrity (0007), Trust/Provenance (0008). Everything else = backlog.
- → ___________________________v1___________________

**A3. Which retailer archetype leads v1** (drives which worked examples we build first)?
Boutique (DTC) / Wholesale (B2B) / Grocery (offers+fulfillment) / All three equally.
- Recommended default: **All three**, but lead each spec's *first* worked example with **Grocery** (richest edge cases).
- → All three.. plan every edge cases and retail scenarios for each of this retail type

---

## B. The big architectural decisions

**B1. Conformance Tiers** — adopt the Tier 0–4 model below and map it to the `/for-merchants`
service tiers (Audit → Managed Pilot)?
> Tier 0 Discoverable · Tier 1 Qualified · Tier 2 Priced · Tier 3 Loyal · Tier 4 Assisted
- Recommended default: **Yes, adopt.** It's the "retail tier" backbone — a boutique adopts Tier 0–1, a grocery chain Tier 0–4.
- → **DECIDED (2026-06-06): Modify — split the axis.** Conformance tiers 0–4 describe *merchant
  implementation maturity* and are cumulative; rename Tier 3 "Loyal" → **"Member-aware"** so it
  describes merchant capability, not the buyer. *Buyer* loyalty tier (gold/silver/guest) is a
  separate, orthogonal `BuyerContext` claim owned by RAOS-0009 — never a rung on the conformance
  ladder. The `/.well-known/ucp` manifest publishes a headline `tier` number **backed by an
  à-la-carte `capabilities[]` list** so negotiation never depends on the ladder being perfectly
  nested. Service tiers (Audit → Managed Pilot) map onto *conformance* only.

**B2. Quote Integrity (price-lock tokens)** — do we make "the price the agent showed *will* be
honored at checkout" a first-class spec (RAOS-0007) now?
This is the single biggest *trust* unlock for retailers.
- Recommended default: **Yes — it's a must-have, not a nice-to-have.**
- → Yes / No / Defer

**B3. Trust & Provenance (signed payloads, data freshness/TTL)** — spec now (RAOS-0008) or defer
until there's a real (non-simulated) endpoint?
- Recommended default: **Spec the *contract* now (envelope, TTL, signature fields), simulate the crypto.** Real signing waits for the real endpoint.
- → Spec now / Defer

**B4. Promo & discount stacking precedence** — confirm the canonical order of operations when
multiple price advantages apply to one line. Current code does: member → bulk → promo (last wins).
Real retail needs an explicit, declarable model. Pick the default rule:
- (a) **Best-price-wins** (compute each path, take lowest) — buyer-friendly, simple to explain.
- (b) **Priority ladder** (merchant declares precedence; one wins) — matches most POS systems.
- (c) **Stacking with exclusivity flags** (some combine, some don't) — most powerful, most complex.
- Recommended default: **(b) priority ladder as the model, with per-offer `stackable` + `exclusive` flags** so (a) and (c) are expressible. Loyalty burn applied last, after tax rules decided.
- → a / b / c / other: ____________________________

**B5. Tax & regulated goods** — in scope for the spec series, or explicitly deferred to UCP
checkout core?
Covers: tax-inclusive (EU/VAT) vs tax-exclusive (US), age-restricted goods (alcohol/tobacco),
purchase limits, region legality.
- Recommended default: **In scope as RAOS-0011, but split**: *eligibility* side (can this buyer buy this restricted item, in this region) is ours; *tax computation* defers to checkout, we only carry the `taxTreatment` signal.
- → In scope / Defer / Split (recommended)

**B6. Identity & trust of buyer context** — when an agent claims "this buyer is a wholesale
member, gold tier," how is that trusted?
- (a) Agent-asserted, merchant trusts it (demo-simple).
- (b) Signed buyer-context token from an identity provider / account link (OAuth-style).
- Recommended default: **Spec for (b), simulate as (a) for now.** Account-linking trust is a real
  blocker for loyalty/member pricing — design it in, fake it in the playground.
- → a / b (recommended) / discuss

---

## C. Scope toggles (each is a whole spec — in or out of the program?)

Circle IN or OUT. Defaults reflect "what makes retailers depend on this."

| Spec | Dimension | Default | Your call |
|------|-----------|---------|-----------|
| RAOS-0005 | Inventory & real-time availability | **IN** (must-have) | IN |
| RAOS-0009 | Loyalty & rewards (earn/burn) | **IN** (Phase 2) | IN  |
| RAOS-0010 | Subscriptions / subscribe-&-save | **IN** (grocery + DTC) | IN |
| RAOS-0011 | Tax & regulated/restricted goods | **IN** (split, see B5) | IN |
| RAOS-0012 | Cart bridge & checkout handoff | **IN** (Phase 5) | IN |
| RAOS-0013 | Intent capture & assisted commerce | **IN** (Phase 3) | IN  |
| RAOS-0014 | Returns & post-purchase policy | **IN** (trust unlock) | IN  |
| RAOS-0015 | Privacy, consent & PII handling | **IN** (compliance) | IN  |
| — | Bundles / kits / configurable products | IN as part of 0004 catalog | IN  |
| — | Multi-currency / i18n from day 1 | **OUT of v1** (design hooks, single-currency USD now) | **OUT** → V2 TODO |
| — | Cross-merchant / marketplace cart | **OUT** (flag as future) | **OUT** → V2 TODO |

---

## D. The one that needs *you* specifically

**D1. Agent Reasoning / Explainability trace.**
Your own note (in my memory) says: **do not build the Phase-3 agent-reasoning trace without
discussing the format with you first.** So before any sub-agent touches it:
- Who is the audience for the trace — **the merchant** (debugging why an item was blocked), **the
  buyer** (a plain-language "why"), or **the developer/agent** (machine-readable decision log)? (Can be more than one.)
  - → Business/Ops Actionable View for Merchant. Simplified View for Buyer, Developer gets a technical json paylod with machine readable logs
- What format — narrative text / structured decision-log JSON / a visual step-by-step console?
  - → ______________as appropiate for each audience mentioned above________________________________
- Is this v1 or backlog?
  - → v1

**D2. Real MCP endpoint vs. simulated.**
You said earlier: keep it demo-mode, specs-first, UCP still simulated. Confirm that still holds for
this whole program (it changes whether 0007/0008 need real crypto + transport now).
- → Still simulated / Time to build a real endpoint. My answer: Keep simulated endpoint and then build the real MCP as next step once the specs is fully finalized. So keep MCP as a TODO in the project TODO list.

**D3. Cadence.** Is the public build-log still **one shipped spec per week**? That sets how the
waves in the plan are paced.
- → I want to ship fast and learn. 

---

*When you've filled this in, hand it back and I'll lock the defaults into `specs/PROGRAM-PLAN.md`
and the per-spec sub-agent briefs. Unanswered = proceed on the recommended default.*
