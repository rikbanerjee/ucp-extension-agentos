# RetailAgentOS — Positioning & Reference-Architecture Assessment

**Owner:** Rik Banerjee · **Date:** 2026-06-10 · **Status:** Working document
**Scorecard refreshed:** 2026-07-04 — Part II re-verified against current `src/` and `specs/`
(Part I's messaging/positioning language is unchanged; only the honesty-check in Part II was
re-graded). See the refresh note at the end of Part II for what changed and what wasn't
independently re-run.
**Purpose:** (1) The category-defining positioning narrative — the way parallel.ai redefined *search for AIs*, RetailAgentOS redefines *the merchant for AIs*. (2) An honest, code-verified assessment of how close what's built today is to a real reference architecture — because credible promotion requires knowing exactly where the line between "real" and "planned" sits.
**Sources:** README.md · PROJECT_CONTEXT.md · specs/PROGRAM-PLAN.md · specs/MASTER-BUILD-PLAN.md · specs/ARCH-UCP-EXTENSION-MCP.md · specs/PRODUCT-BACKLOG.md · next.md · verified against `src/` on 2026-06-10; re-verified 2026-07-04.

---

## Part I — The Positioning

### 1. The parallel.ai playbook, decoded

Parallel Web Systems doesn't sell "a search engine." Its homepage says **"Infrastructure for intelligence on the web"** and **"Towards a programmatic web for AIs."** The playbook has five moves:

1. **Name a new category, don't compete in an old one.** Not "better search" — *search built for AIs*. The web was built for humans; they're building the machine-native version.
2. **Claim the infrastructure layer.** "Infrastructure" positions you below the application fight, where everyone is a potential customer and nobody is a competitor.
3. **Prove it with evidence, not adjectives.** Benchmarks with published methodology, "evidence-based outputs," "verifiability and provenance for every atomic output."
4. **Make agents first-class users.** A literal "Onboard your Agent" CTA and an `agents.md` file agents can curl. The product's primary user is a machine.
5. **A directional manifesto sentence** that frames everything: *towards a programmatic web for AIs.*

### 2. The same move, applied to commerce

The structural rhyme is exact:

| | Parallel | RetailAgentOS |
|---|---|---|
| Old assumption | The web is for human readers | The storefront is for human shoppers |
| What broke | AI agents can't reliably read the human web | AI agents can't reliably reason about merchant rules |
| The redefinition | Search rebuilt as an API for AIs | The merchant rebuilt as a machine-readable contract for AIs |
| The layer claimed | Web infrastructure for agents | Commerce reasoning infrastructure for agents |
| The proof | Benchmarks, provenance on every output | A runnable reference implementation, a reason code on every decision |
| The manifesto | "Towards a programmatic web for AIs" | "Towards a machine-readable merchant" |

The category being named: **the merchant reasoning layer.**

UCP and ACP give agentic commerce its rails — discovery, catalog, cart, checkout handoff. But a merchant's *reasoning* — who may see this item, who qualifies to buy it, at what price, under which promo, with what stock, fulfillable where — lives locked in backend code and only fires at checkout. Agents hit it like a wall: dead-end carts, wrong quotes, gated SKUs surfaced to unqualified buyers. RetailAgentOS moves that reasoning to **catalog time**, as deterministic, versioned, machine-readable contracts with a reason code attached to every decision.

### 3. The messaging kit

**Hero line (parallel.ai register):**
> **The reasoning layer for agentic commerce.**
> AI agents can find your catalog. RetailAgentOS lets them understand your rules.

**The manifesto sentence:**
> Towards a machine-readable merchant — where every visibility, eligibility, price, and fulfillment decision is a contract an agent can read, act on, and explain.

**The one-liner (technical audience):**
> RetailAgentOS moves merchant reasoning from checkout-time to catalog-time — deterministic, versioned, machine-readable, with reasons attached.

**The one-liner (retail audience):**
> AI shopping agents are already active. RetailAgentOS is how your store's rules — who qualifies, what price, what's in stock, what ships where — become something an agent gets right instead of guesses at.

**The differentiation sentence (vs. the field):**
> UCP gives commerce the rails. ACP gives it checkout. RetailAgentOS gives it the layer neither carries: the merchant's reasoning, at catalog time, with a reason code on every decision.

**The mission sentence (the "open" angle parallel.ai doesn't have — your unfair advantage):**
> Built as open specs, not a walled product: prove the semantics on real merchant archetypes, publish them as versioned RFCs, and propose them upstream — so every platform implements once and the long tail of small retailers inherits agent-readiness for free.

**Evidence claims that are true today** (each verified in Part II — promote these freely;
*updated 2026-07-04, see refresh note*):

- **Seven** specs published as Draft·RFC — 0000 Foundations, 0001 Eligibility, 0002 Contextual
  Pricing, 0005 Inventory, 0007 Quote Integrity, 0008 Trust/Provenance, and 0013 Part 1
  (Decision Trace) — with 9 more catalogued across 6 architectural planes.
- A real, running `/.well-known/ucp` discovery endpoint serving tier + capabilities manifests — aligned with the discovery pattern UCP itself uses.
- A registered, staged, fault-isolated extension pipeline (Visibility → Eligibility → Price → Fulfillment → Quote) — not hard-coded rules.
- Every decision is deterministic: same context + same rules → byte-identical output, enforced by golden-fixture tests (13 test suites, 300+ test cases by static count — re-run `npm test -- --coverage` for a current line-coverage figure; not independently re-executed in this refresh pass, see note).
- Every block, condition, and applied price carries a structured reason code with severity and owning namespace — agents explain, not just refuse.
- Trust is honest: asserted buyer claims are visibly downgraded to most-restrictive; the word SIMULATED renders wherever crypto isn't real yet.
- Three merchant archetypes (boutique DTC, B2B wholesale, grocery) prove one protocol surface supports radically different retail models.
- **(New since original scorecard)** Inventory truth: an agent never recommends what isn't in stock, with mandatory freshness TTLs and soft-reservation semantics (RAOS-0005, built).
- **(New since original scorecard)** Quote integrity: the price an agent shows is bound in a signed, TTL'd token and honored or re-quoted per a merchant-declared policy (RAOS-0007, built).
- **(New since original scorecard)** Three-audience decision trace: the same decision renders as buyer plain-language, merchant ops-actionable, and full developer JSON — one substrate, no re-implementation (RAOS-0013 part 1, built).
- **(New since original scorecard)** The rule engine is packaged as an installable, dependency-free kit (`@retailagentos/engine`) and is being applied to a real merchant catalog (TheCustomHub pilot, in progress — see `specs/reference-implementation/`).

**Claims to avoid until the gaps in Part II close:** "production-ready," "live MCP server,"
"cryptographically signed," "real merchant integrations" (plural — one pilot is in progress,
not shipped), "promo-stacking-aware," "loyalty-aware." Each is designed but not built —
promoting them now spends the credibility the determinism story earns. (`inventory-aware` and
`quote-guaranteed` were on this list originally — both are now true claims; see refresh note.)

### 4. The parallel.ai tactics worth copying next

1. **An `agents.md` onboarding file.** Parallel's most quietly brilliant move: a URL an agent curls to onboard itself. RetailAgentOS already serves `/.well-known/ucp`; add a human-and-agent-readable `agents.md` describing how an agent negotiates capabilities and parses reason codes. Near-zero effort, perfectly on-thesis.
2. **A benchmark equivalent.** Parallel's authority comes from published evals. The RAOS analog: a public **conformance/coverage scoreboard** — every reason code exercised by a fixture, every archetype × spec scenario cell green. "The Playground proves the spec" turned into a number people can cite.
3. **Human/Machine duality on the site.** Parallel's homepage toggles Human/Machine. The Playground's business-view/JSON-view toggle is the same idea — frame it that way explicitly: *every decision, in your language and the agent's.*
4. **The trust-center pattern.** Parallel leads with SOC-2/ZDR. The RAOS equivalent is the determinism + provenance story: no model in the decision loop, additive-only codes, signed envelopes (when real). That's the merchant's brand-safety answer.

---

## Part II — How Close Is This to a Real Reference Architecture?

### 5. What "a real reference architecture" means here

A reference architecture for a merchant reasoning layer needs, at minimum: (a) a discovery and negotiation surface, (b) a canonical context and identity model, (c) an extensible, deterministic decision pipeline, (d) a uniform decision vocabulary, (e) the domain semantics themselves (eligibility, pricing, inventory, promos, quotes, fulfillment, loyalty, …), (f) trust, provenance and freshness, (g) a transport agents actually speak (MCP), (h) a conformance/test story, and (i) production hardening (persistence, multi-tenancy, auth, scale). The scorecard below grades each against what is verifiably in the repo today.

### 6. The scorecard (originally verified 2026-06-10; re-verified against current `src/` and `specs/` on 2026-07-04 — changed rows marked **REFRESHED**)

**Legend:** ✅ Built & tested · 🟡 Partially built · 📐 Specified/designed only · ⬜ Planned, not designed in depth · 🚫 Explicit non-goal (for now)

| # | Reference-architecture requirement | Status | Evidence / gap |
|---|-----------------------------------|--------|----------------|
| a1 | Discovery manifest (`/.well-known/ucp`, tier + `capabilities[]`) | ✅ | Real Next.js route handler + tests (`src/app/.well-known/ucp/route.ts`); locked split-axis tier model. Data is mock. |
| a2 | Capability negotiation enforced at runtime | ✅ | `registry.manifestSubset()` — the manifest is load-bearing; absent capability → documented degraded result, tested. |
| b1 | Canonical buyer context | ✅ | `BuyerContext` (`src/lib/types/context.ts`) with `loyaltyTier`, `trust.mode`; `activeExtensions` modeling bug removed. |
| b2 | Most-restrictive normalization + trust downgrade | ✅ | `normalizeBuyerContext.ts` + tests; asserted privilege claims downgraded for transaction-gating stages. |
| b3 | Real identity/consent/PII model (RAOS-0015) | 📐 | Still spec'd only (WP-15, unstarted); interface designed, nothing built. Buyer token verification simulated by decision (B6). |
| c1 | Extension contract (`UcpExtension`: namespace@semver, stage, priority, pure evaluate) | ✅ | `src/lib/extensions/contract.ts` per ARCH §3.2. |
| c2 | Registry + staged pipeline + fault isolation + `now` injection | ✅ | `registry.ts`, `pipeline.ts`; throwing evaluator degrades (BLOCK for safety stages) without crashing — tested. |
| c3 | Determinism guarantee | ✅ | Golden fixtures; no `Date.now`/`Math.random`/IO in rules; same inputs → identical `DecisionRecord`. |
| d1 | Uniform reason vocabulary (`ReasonEntry`: code, severity, source, requirements) | ✅ | `src/lib/types/reasons.ts`; `blocking` deprecated with migration path; status derived. |
| d2 | Decision substrate for explainability (`DecisionRecord`) | ✅ | Folded by `pipeline.ts` — ordered reasons with per-stage attribution. |
| d3 | Per-audience trace renderings (merchant ops / buyer / developer JSON) | ✅ **REFRESHED** (was 📐) | WP-08 shipped: `src/lib/trace/{derive,render,types}.ts`; `renderBuyerTrace`/`renderMerchantTrace`/`renderDeveloperTrace` all exist, tested, exported from the engine package. |
| e1 | Eligibility & visibility semantics (RAOS-0001) | ✅ | Published Draft·RFC v1.1.0 + reference impl + spec page + every code fixture-covered. The flagship. |
| e2 | Contextual pricing — member/bulk/MOQ (RAOS-0002) | ✅ **REFRESHED** (was 🟡) | `specs/0002-contextual-pricing.md` published Draft·RFC v1.0.0; `AppliedOffer`/`suppressedOffers` shape landed and is the frozen contract RAOS-0006/0007 bind to. |
| e3 | Promo stacking ladder (RAOS-0006) | 📐 (was 🟡 — corrected, not upgraded) | Still unbuilt. The original 🟡 overstated it: no `promos.ts` exists and `specs/0006-promo-stacking.md` is not written. Fully designed (WP-09, priority ladder + stackable/exclusive locked by B4) but zero code. This is the top differentiation gap per `PRODUCT-BACKLOG.md` and should not be marked partial. |
| e4 | Inventory & availability (RAOS-0005) | ✅ **REFRESHED** (was 📐) | `specs/0005-inventory.md` published Draft·RFC v1.0.0; `src/lib/rules/inventory.ts` + `src/lib/extensions/evaluators/inventory.ts` built and tested, incl. reservation TTL. |
| e5 | Quote integrity / price lock (RAOS-0007) | ✅ **REFRESHED** (was 📐) | `specs/0007-quote-integrity.md` published Draft·RFC v1.0.0; `src/lib/rules/quote.ts` + evaluator built and tested. The retailer-trust unlock is real, not paper. |
| e6 | Fulfillment feasibility (RAOS-0003) | 🟡 | Unchanged: mode/region flags evaluated today via RAOS-0001; real feasibility (windows, lead times, BOPIS, cutoffs) still designed only, no `specs/0003-*.md` written. |
| e7 | Loyalty, subscriptions, tax/restricted, returns, discovery semantics, cart bridge (0009/0010/0011/0014/0004/0012) | 📐/⬜ | Unchanged: catalogued with briefs, edge cases, reason codes; none implemented. Each now has a pending-task page under `specs/wiki/pending/`. |
| f1 | Provenance/freshness envelope types | ✅ **REFRESHED** (was 🟡) | `specs/0008-trust-provenance.md` published Draft·RFC v1.0.0; `src/lib/rules/trust.ts` (sign/verify, TTL matrix, key rotation) built and tested; envelope attached centrally in `pipeline.ts`. |
| f2 | Real cryptography | 🚫 | Unchanged: simulated by locked decision (D2); interface designed for mechanical swap; `TRUST_SIMULATED` labeled everywhere. |
| g1 | MCP server (tools + resources over the pipeline) | 📐 (context added) | Still zero live transport code (WP-19 unstarted). **New since original scorecard:** the engine is now packaged (`@retailagentos/engine`, `packages/engine`) specifically so a real transport can be built *outside* this repo — TheCustomHub pilot's Track B (B5) is the first concrete attempt, in progress, not shipped. |
| h1 | Test harness + golden fixtures + coverage | ✅ (numbers re-checked, not re-run) | Vitest; grown to 13 test suites, ~300+ test-case blocks by static count (was ~130). **Caveat:** `npm test` could not be executed in this refresh pass (sandbox native-module issue unrelated to the code) — line-coverage % was not re-verified and the 96% figure should be treated as stale until someone re-runs `npm test -- --coverage` locally. |
| h2 | Public conformance suite third parties can run | ⬜ | Unchanged: internal only; no packaged conformance kit. This is EVIDENCE-PLAN's E4. |
| i1 | Persistence, multi-tenant infra, agent auth, rate limiting, real merchant/platform integrations | 🚫 (context added) | Still explicit non-goals of the demo phase. **New since original scorecard:** "real merchant integrations" moved from purely hypothetical to *in progress* — the TheCustomHub pilot (see `specs/reference-implementation/`) is actively targeting this, unshipped. |

**Refresh note (2026-07-04):** five rows moved from designed-only to built (d3, e2, e4, e5, f1) —
this is the v1 spec-complete cut line (`0000/0001/0002/0005/0007/0008` + the 0013 trace half)
landing since the original pass. One row was *corrected downward* (e3: was marked 🟡 "partial,"
actually 📐 "fully designed, zero code" — worth catching before this scorecard goes on a public
page, since overstating an unbuilt differentiator is a worse credibility risk than understating
one). Coverage % (h1) and MCP status (g1) were not independently re-run/re-designed in this
pass — flagged rather than guessed at.

### 7. The honest verdict

**The architecture is real. The platform is early. The plan connecting them is unusually rigorous.**

Three things are true at once:

**1. The foundation plane is genuinely a reference architecture, not a demo trick.** What's built — discovery manifest, negotiated capabilities, canonical context with trust-aware normalization, a registered/staged/fault-isolated/deterministic pipeline, a uniform reason vocabulary, and a tested golden-fixture harness — is exactly the load-bearing substrate a real implementation would need, built to the published RAOS-0000 contract rather than ad hoc. Most "protocol demos" fake this layer; this one didn't.

**2. Breadth is now ~7 of 16, and the v1 spine is complete.** *(Updated 2026-07-04 — was "~2 of
16".)* Seven specs are published of sixteen catalogued, and the entire locked v1 cut line —
0000, 0001, 0002, 0005, 0007, 0008, plus the 0013 trace half — is done, tested, and wired into
the Playground. What's still paper: promo stacking (0006, the single biggest commercial
differentiator per the backlog), browse-time loyalty (0009), restricted/regulated goods (0011,
the one with real legal exposure), and everything in Plane 4/5 (fulfillment, cart bridge,
returns, intent-capture routing). The pipeline now registers evaluator families for eligibility,
pricing, inventory, and quote across four of five stages; only FULFILLMENT still runs empty.

**3. The production layer is deliberately absent, but one pilot is now underway.** No
persistence, no real crypto, no live MCP transport, no real merchant data at scale, no agent
auth — still explicit, documented non-goals of the core repo. What's changed: the engine is
packaged (`@retailagentos/engine`) specifically so a *different* codebase can consume it, and a
real merchant pilot (TheCustomHub) is actively being wired up against it — see
`specs/reference-implementation/`. That pilot is the thing that will actually close this gap,
not more spec-writing in this repo.

**Distance to "real," quantified (updated 2026-07-04):** by the repo's own work-package map,
roughly 9 of 20 WPs are done (Waves 0–2 complete per `MASTER-BUILD-PLAN.md`). By spec count, 7 of
16 published (was 2 of 16). By architectural plane: Plane 0 (foundation) ✅ · Plane 1 (discovery
& truth) ✅ for inventory, 📐 for discovery/match · Plane 2 (reasoning) ✅ for eligibility, 📐 for
restricted goods · Plane 3 (price & value) ✅ for pricing/quote, 📐 for promo stacking/loyalty ·
Planes 4/5 (fulfillment, outcomes) still 📐/⬜ almost entirely. The remaining gap to "integration
credible" is no longer spec-writing — it's the v1.5 fast-follow specs (0006/0011/0009) plus
WP-19 (real MCP + real crypto), which the TheCustomHub pilot is now the forcing function for.

### 8. Why the gap is a feature in the promotion (the parallel.ai lesson, inverted)

Parallel promotes finished infrastructure. RetailAgentOS shouldn't pretend to be that — its strongest position is the one `next.md` already identifies: **the practitioner writing the missing vocabulary in the open.** In that framing the gap *is* the content:

- The scorecard above is publishable almost as-is — "here's exactly what's real, what's specified, and what's next" is the rigor signal tech execs follow and no vendor will ever publish.
- Every 📐 row is a future build-log chapter with a locked design already behind it.
- The claim that *can* be made at parallel.ai confidence today is narrow and strong: **the only open, runnable, deterministic, reason-coded merchant-reasoning architecture in the agentic-commerce conversation — published as upstream-candidate RFCs, not a walled product.** UCP doesn't carry it, ACP doesn't carry it, UIP covers loyalty/promos at platform level but not the per-merchant declarative layer. That sentence survives due diligence.

### 9. The three moves that most shrink the credibility gap

*(Updated 2026-07-04 — moves 1 and 2 below are now done; superseded by three new moves.)*

~~1. Ship the v1 spine (WP-04 → WP-07: pricing, inventory, trust, quote).~~ **Done.** All four
specs are published, built, and tested.
~~2. Ship the trace renderers (WP-08).~~ **Done.** Three-audience trace renderers exist, tested,
exported from the engine package.

The three moves that now matter most:

1. **Land the TheCustomHub pilot with its evidence instrumentation (Track B, `PUNCH-LIST.md`
   item 1, including the B6 before/after metric).** This is the credibility phase-change per
   `EVIDENCE-PLAN.md` E5 — it converts every claim above from "designed and tested in isolation"
   to "an agent actually completed a real purchase," with a number attached.
2. **Ship RAOS-0006 (promo stacking).** The `AppliedOffer` shape was frozen specifically so this
   wouldn't require a rewrite — it's the cheapest remaining move that closes the single biggest
   commercial-differentiation gap this scorecard identifies (row e3).
3. **Publish `agents.md` + the conformance scoreboard (EVIDENCE-PLAN E1/E2).** Still the two
   cheapest parallel.ai-style proof artifacts, and now backed by more real rows than when this
   was first written — machine onboarding, and a number that makes "the Playground proves the
   spec" citable.

---

*Part I is safe to excerpt for the site, LinkedIn, and Substack. Part II is the internal truth that keeps Part I honest — update the scorecard as WPs land.*
