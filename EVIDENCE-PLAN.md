# RetailAgentOS — Evidence Plan

**Owner:** Rik Banerjee · **Date:** 2026-07-01 · **Status:** Working plan
**Audiences:** (1) Merchants/pilot prospects · (2) Protocol & platform community (UCP/ACP maintainers, Shopify/BigCommerce-class platforms)
**Companion:** `PITCH-ONE-PAGER.md` (the narrative these artifacts prove)
**Ground truth:** `POSITIONING.md` Part II scorecard — every claim below stays on the ✅/🟡 side of that line or is explicitly labeled as the thing being built.

---

## 1. The packaging thesis

You are not selling software. You are selling **proof that a problem everyone is about to hit has already been solved once, in the open, with receipts.**

The problem: *AI shopping agents can discover catalogs but cannot reason about merchant rules — so they produce dead-end carts, wrong quotes, and gated SKUs shown to unqualified buyers. The merchant's reasoning lives locked in checkout code, invisible to agents.*

The solved claim (survives due diligence today):
> **The only open, runnable, deterministic, reason-coded merchant-reasoning architecture in the agentic-commerce conversation — published as upstream-candidate RFCs, not a walled product.**

Evidence, not adjectives, is the entire strategy. Each artifact below exists to make one specific claim *checkable by a stranger in under five minutes* — a merchant, a platform engineer, or an agent itself.

---

## 2. The evidence artifacts (what to build)

Ordered by leverage per unit of work. E1–E4 are packaging of things that already exist; E5–E7 require the Track B pilot; E8 is ongoing.

### E1 — The public scorecard page (`/evidence` or `/scorecard`)
**Proves:** rigor and honesty — "here is exactly what's real, specified, and next."
**Build:** publish the POSITIONING.md Part II scorecard as a live page in the Playground app, with each ✅ row linking to the actual file/test in the repo. Add the summary numbers: ~130 golden-fixture cases, 96% line coverage on rules, 4/19 work packages, 2/16 specs published.
**Why it works:** no vendor will ever publish this. It is the single strongest trust signal for the platform audience, and it inoculates every other claim.
**Effort:** 1–2 days. Everything exists; this is rendering.

### E2 — `agents.md` (machine onboarding file)
**Proves:** "agents are first-class users here" — the parallel.ai move.
**Build:** a curl-able file describing how an agent discovers the manifest, negotiates capabilities, and parses reason codes, with worked request/response examples drawn from the golden fixtures. Serve at `/agents.md` alongside the existing `/.well-known/ucp`.
**Effort:** half a day. Near-zero effort, perfectly on-thesis.

### E3 — Reason-code demo reel ("the wall vs. the reason")
**Proves:** the core differentiation, visually, in 90 seconds.
**Build:** side-by-side capture: an agent hitting a normal store (dead-end cart, silent failure) vs. the same intent against the RAOS pipeline (structured decline: `FULFILLMENT_REGION_UNSUPPORTED`, severity, owning namespace, what-would-unblock). Use the three archetypes — boutique member price, wholesale MOQ, grocery restriction — as three 30-second cuts.
**Format:** short video + GIF for LinkedIn/Substack, embedded on the site. The Playground's business-view/JSON-view toggle is the star: *every decision, in your language and the agent's.*
**Effort:** 2–3 days including capture and editing.

### E4 — Conformance/coverage scoreboard
**Proves:** "the Playground proves the spec" as a citable number.
**Build:** a generated table: every reason code in the published specs × exercised-by-fixture status; every archetype × scenario cell. Output both as a page and as JSON (agents can read it too). The reason-code coverage helper already exists in the test harness — this packages its output.
**Effort:** 1–2 days.

### E5 — The pilot case study (TheCustomHub, Track B) — **the anchor evidence**
**Proves:** "an agent actually bought something" — converts the whole project from credible demo to demonstrated outcome.
**Build:** complete Track B B0–B5 per `PUNCH-LIST.md` item 1, then write it up as a case study with the acceptance transcript verbatim: Claude Desktop connects → finds a product that ships to Canada under $X → quotes → completes Stripe checkout; and the negative case: out-of-region item declined *with a reason*, not a failed checkout.
**Critical addition — instrument the before/after metric:** run the same agent tasks against the raw SPA first and record the failure rate. "Agents completed 0/N tasks on the unmodified store; N-1/N with the reasoning layer" is the headline number for both audiences. Without it the pilot is an anecdote; with it, it's a benchmark.
**Effort:** the Track B work itself (already scoped) + 2 days of instrumentation and write-up.

### E6 — Live equivalence proof (MCP = Playground)
**Proves:** the transport is a thin adapter, not a second implementation — determinism survives the wire.
**Build:** when WP-19's first tool lands (or reusing the Track B MCP server), publish the equivalence test result: MCP `evaluate_offer` output deep-equals the Playground pipeline output for identical inputs. One page, green check, link to the test.
**Effort:** rides on Track B / WP-19; packaging is hours.

### E7 — Agent-readiness audit tool (`/audit?url=...`)
**Proves:** the problem is universal, one store at a time — and generates inbound interest.
**Build:** point it at any store URL; report JSON-LD present? `/.well-known/ucp` manifest? prices machine-readable? rules discoverable? Score /100 with the failing checks explained in reason-code style (eat your own dog food). This is the SEO-site-grader growth loop applied to AEO: every audit run markets the category.
**Effort:** 3–5 days using parsers already in the repo. Ship after E5 so the audit can point to a store that scores 100.

### E8 — The build-log (ongoing, Substack/LinkedIn)
**Proves:** "the practitioner writing the missing vocabulary in the open."
**Build:** every 📐 row in the scorecard is a future chapter with a locked design already behind it. One post per artifact above as it ships, anchored by the launch essay already in `marketing/substack/`. The scorecard page (E1) is the table of contents; each post moves a row from 📐 to ✅ in public.

---

## 3. Sequencing

```
Week 1        E1 scorecard page + E2 agents.md          (packaging of existing truth)
Week 1–2      E3 demo reel + E4 conformance scoreboard  (the shareable artifacts)
Weeks 2–5     E5 Track B pilot + before/after metric    (the anchor — per PUNCH-LIST item 1)
Week 5        E6 equivalence proof                      (rides on E5's MCP server)
Week 6        E7 audit tool                             (growth loop, after a 100-score store exists)
Continuous    E8 build-log posts, one per artifact
```

Rationale: E1–E4 make the project *promotable this week* using only what's verifiably built. E5 is the credibility phase-change and everything after it compounds. Do not delay E1–E4 waiting for the pilot — the honest scorecard is precisely what makes pre-pilot promotion safe.

---

## 4. Per-audience packaging

### Merchants / pilot prospects
- **Lead artifact:** E3 demo reel, then E5 case study once it exists.
- **The sell:** "Agents are already trying to shop your store and failing silently. Here's what that costs, here's what fixing it looks like, and here's a real store where it works end-to-end." E7 makes this personal: *your* store scores 34/100.
- **The ask:** be pilot #2/#3. One archetype slot each (boutique done via TheCustomHub → recruit a wholesale/B2B and a grocery/regulated merchant to complete the archetype proof).

### Protocol & platform community
- **Lead artifacts:** E1 scorecard + E4 conformance + the published RFCs (0000, 0001).
- **The sell:** "This is the extension layer UCP doesn't carry and ACP doesn't cover — proven on three merchant archetypes, deterministic with golden fixtures, offered upstream. Implement it once at the platform level and your long tail inherits agent-readiness for free."
- **The ask:** review the RFCs; adopt the reason-code vocabulary; co-author 0011 (regulated goods — the gap with real legal exposure that no protocol addresses).
- E6 matters most here: platform engineers will ask "is the MCP surface a real adapter or a demo fork?" — the equivalence test is the one-line answer.

---

## 5. Claim discipline (what you may and may not say)

**Say freely (verified in repo):** deterministic pipeline with golden-fixture enforcement · reason code with severity + namespace on every decision · real `/.well-known/ucp` discovery with load-bearing capability negotiation · trust-aware context normalization with visible SIMULATED labeling · three archetypes on one protocol surface · two published Draft·RFCs, fourteen catalogued.

**Say only after E5 lands:** "a real agent completed a real purchase" · any live-MCP claim · the before/after metric.

**Do not say (until built):** production-ready · cryptographically signed · inventory-aware · quote-guaranteed · real merchant integrations (plural).

The SIMULATED label and the scorecard are assets, not embarrassments — they are what make every other claim believable.

---

## 6. Definition of done for "evidence package v1"

- [ ] E1 scorecard page live, rows linked to code/tests
- [ ] E2 `agents.md` served and curl-able
- [ ] E3 demo reel published (site + LinkedIn + Substack)
- [ ] E4 conformance scoreboard generated from the test harness
- [ ] E5 pilot case study with acceptance transcript + before/after metric
- [ ] E6 equivalence result page
- [ ] E7 audit tool live with TheCustomHub scoring 100
- [ ] `PITCH-ONE-PAGER.md` narrative kept in sync with what's shipped
