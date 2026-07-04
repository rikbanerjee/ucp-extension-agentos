# RetailAgentOS — Site Plan (the public reference-architecture platform)

**Role:** the execution plan for the *website* — turning the demo app into the public
platform that positions RetailAgentOS as the open answer to agentic commerce, for a
broader audience than protocol engineers.
**Relationship to other plans:** engine/spec work lives in [`BUILD-PLAN.md`](./BUILD-PLAN.md)
(Q-queue) — never both queues in one task. Copy source of truth:
[`../HOMEPAGE-COPY.md`](../HOMEPAGE-COPY.md) (untracked, at repo root). Claim discipline:
[`../EVIDENCE-PLAN.md`](../EVIDENCE-PLAN.md) §5 — nothing ships on a page that isn't
verifiably true per [`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md).
**Last reconciled:** 2026-07-04.

---

## 0. The positioning problem the site must solve

Today the site is built for one audience: someone who already cares about UCP extensions.
The broader audience is three audiences, and each needs a different door:

| Audience | What they need in 30 seconds | Today's gap |
|---|---|---|
| **Retailer / commerce exec** | "AI shoppers exist, my store is failing them, here's my score and my level" — zero protocol language | Homepage leads with protocol framing; the AEO score tool exists but isn't the front door |
| **Platform engineer / builder** | "Open specs + a runnable reference architecture I can adopt tier by tier" | ADOPTION-GUIDE exists only as markdown in the repo; no `/adopt` page; evidence scattered |
| **AI agent** (yes, a first-class user) | A curl-able onboarding file + the manifest | `/.well-known/ucp` exists; `/agents.md` doesn't |

The organizing move (same as the docs restructure): **one public axis — the readiness
ladder** — expressed in plain language for retailers (HOMEPAGE-COPY §4's four levels) and
mapped 1:1 to conformance tiers for engineers.

---

## 1. Rules for every site work package (SWP)

1. **Next.js 16** — read the relevant file in `node_modules/next/dist/docs/` before
   touching routing/pages (AGENTS.md). `npm run build` + `npx tsc --noEmit` pass on every SWP.
2. **Claim discipline** (EVIDENCE-PLAN §5): every number rendered on a page must match
   `VERIFICATION-NEEDED.md`. Known stale numbers to fix on sight: "130+ checks" → **328
   tests**; "96% coverage" → **93.8% lines on `src/lib/rules`** (or omit). Nothing may say
   "live MCP," "real purchase," or "cryptographically signed" until BUILD-PLAN Q2/Q8 land.
3. **Plain-language rule** for retailer-facing surfaces: use HOMEPAGE-COPY's translation
   glossary (never "reason codes" above the fold — "every no comes with a why").
4. **One source of truth:** pages render data from the engine/registry/fixtures where
   possible (e.g. reason-code tables generated, not hand-copied).
5. Don't touch `src/lib/**` (engine) in a site SWP. Don't edit the Story-mode sandbox's
   logic — it's narrative-only and stays clearly labeled as such.

---

## 2. The work packages (in order)

### SWP-1 · Homepage rebuild — education-first, broader audience `(M)` — ✅ done 2026-07-04
*(Note: the old "Where RAOS fits" diagram + founder bio sections were dropped from the
homepage as protocol-heavy; founder story remains at `/profile` — surface it via About nav
in SWP-7.)*
**Files:** `src/app/page.tsx` (+ `src/components/AgentDemoStrip.tsx` wrapped, not edited).
**Do:** merge the two existing design docs:
- Structure/ordering: [`homepage-reorder.md`](./homepage-reorder.md) (cold-traffic,
  problem-before-conversion, breadth connector, merged closing rail).
- Copy: `HOMEPAGE-COPY.md` sections 1–8 (hero → problem panel → how-it-works → readiness
  ladder → proof stats → two doors → final CTA → agent footer strip).
- **Where they conflict, HOMEPAGE-COPY wins** (it's the newer, audience-broadening deck);
  homepage-reorder contributes the ordering principles and the breadth connector.
- Proof stats: 328 automated checks · 100% decisions explained · 3 store types; keep the
  honesty line linking to `/evidence` (SWP-3).
- Two doors: retailers → `/aeo-score`; platforms & builders → `/adopt` (SWP-2).
**Acceptance:** no protocol vocabulary above the fold; hero CTA scroll-to-demo works;
both doors resolve; build + tsc clean.

### SWP-2 · `/adopt` — the Adoption Guide as a product page `(M)` — ✅ done 2026-07-04
The reference architecture becomes a public URL, not a repo file.
**Files:** new `src/app/adopt/page.tsx` (clone an existing spec-page pattern for layout).
**Do:** render [`ADOPTION-GUIDE.md`](./ADOPTION-GUIDE.md) as a designed page: the
two-contracts code block, the tier ladder as an interactive stepper (each tier: what you
implement, which specs, acceptance checks), the TheCustomHub worked example, and a
"platforms: build it once, your long tail inherits it" band. CTA: read the specs / clone
the repo / email for a pilot slot.
**Acceptance:** an outside engineer can go hero → `/adopt` → a specific RFC without
reading the repo; content stays consistent with ADOPTION-GUIDE.md (link to it as canonical).

### SWP-3 · `/evidence` — the public scorecard (EVIDENCE-PLAN E1) `(S–M)` — ✅ done 2026-07-04
**Files:** new `src/app/evidence/page.tsx`; data as a typed constant module.
**Do:** publish the POSITIONING Part II scorecard as a live page: requirement rows with
✅/🟡/📐/⬜/🚫 status, each ✅ linking to the file/test that proves it; summary stats from
VERIFICATION-NEEDED (328/328 tests, tsc clean, build passing, tarball smoke-tested);
"claims we don't make yet" section rendered proudly (the differentiator).
**Acceptance:** every row's status matches VERIFICATION-NEEDED at ship time; page linked
from homepage proof section and footer.

### SWP-4 · `/agents.md` + agent footer (EVIDENCE-PLAN E2) `(S)` — ✅ done 2026-07-04
**Files:** new route serving markdown/plaintext (e.g. `src/app/agents.md/route.ts` — check
Next 16 route-handler docs for the exact pattern); footer strip in `layout.tsx`.
**Do:** a curl-able onboarding file: how an agent fetches `/.well-known/ucp`, negotiates
`capabilities[]`, calls the evaluation surface, parses `ReasonEntry` (code/severity/source/
requirements), with one worked request/response drawn from the golden fixtures. Footer on
every page: "For AI agents: start at `/agents.md` and `/.well-known/ucp`."
**Acceptance:** `curl localhost:3000/agents.md` returns the file; examples are copied from
real fixture output, not invented.

### SWP-5 · Conformance scoreboard (EVIDENCE-PLAN E4) `(M)`
**Files:** new `src/app/evidence/conformance/page.tsx` + a JSON route.
**Do:** generate (from the extension registry + fixtures, not hand-written): every reason
code in the published specs × exercised-by-fixture status; archetype × spec scenario grid.
Serve as both a page and JSON (agents can read it too).
**Acceptance:** adding a reason code without a fixture visibly breaks the scoreboard;
numbers derived at build time from the same source the tests use.

### SWP-6 · AEO score = the Readiness Index front door `(M)`
**Files:** `src/app/aeo-score/**` (exists; polish, don't rebuild).
**Do:** align the tool's output with the homepage's four-level ladder (HOMEPAGE-COPY §4)
so the score maps to a level; results page gets: your level, the exact failing checks in
plain language ("no reason attached to price differences" not "missing 0002"), a
shareable one-page result (next.md's Readiness Index concept), and the retailer CTA.
Rename surface copy from "AEO score" to "AI-readiness score" (keep the route; add
`/readiness` alias if cheap).
**Acceptance:** running it against TheCustomHub (post-pilot) and a raw store produces
visibly different levels; result page is screenshot-able.

### SWP-7 · IA / navigation consolidation `(S–M)` — ✅ done 2026-07-04
**Files:** `src/components/layout/NavBar.tsx`, `layout.tsx`, small edits on affected pages.
**Do:** collapse the 13-route sprawl into an audience-based nav:
**For retailers** (`/aeo-score`, `/for-merchants`, `/guided`) · **For builders** (`/adopt`,
`/specs`, `/demo`, `/architecture`, cookbook) · **Evidence** (`/evidence`, conformance,
`/buildlog`) · **About** (`/vision`, `/profile`). Surface the cookbook
(`/sandbox/reference`) in builder nav; label Story-mode (`/sandbox/retail-agent-os`) as
"narrative demo" wherever linked; `/story-preview` gets noindex or folds into `/guided`.
**Acceptance:** every page reachable in ≤2 clicks from the homepage; no orphan routes;
nav reflects the three audiences.

### SWP-8 · Spec pages get the tier frame `(S)`
**Files:** `src/app/specs/page.tsx` + the 7 spec pages (pattern edit).
**Do:** reorganize the `/specs` index by conformance tier (mirror `specs/README.md`
exactly); each spec page gets a tier badge, a "status: Draft·RFC vX · built & tested"
line consistent with the catalog, and an "adopt this" link to the relevant `/adopt` rung.
**Acceptance:** `/specs` and `specs/README.md` list identical statuses; no plane/wave
vocabulary anywhere public.

### SWP-9 · (post-pilot) Case study + demo reel embed `(gated on BUILD-PLAN Q2)`
When TheCustomHub Track B + the B6 before/after metric land: a `/evidence/pilot` page
with the headline number ("agents completed 0/N tasks on the unmodified store; N-1/N with
the reasoning layer") and both verbatim transcripts; embed the E3 demo reel when produced.
**Hard gate:** EVIDENCE-PLAN §5 — none of this page exists before the metric is real.

---

## 3. Sequencing & how to hand these to Sonnet agents

```
SWP-1 (homepage)  ──┐
SWP-2 (/adopt)      ├─ parallel, independent files
SWP-3 (/evidence)   │
SWP-4 (agents.md) ──┘
then SWP-7 (nav — after the new pages exist to link to)
SWP-5, SWP-6, SWP-8 — parallel after SWP-7
SWP-9 — only after BUILD-PLAN Q2
```

One SWP = one agent task. Each prompt should include: the SWP section verbatim, the rule
block (§1), the copy source (`HOMEPAGE-COPY.md` for retailer surfaces), and the reminder
to read `node_modules/next/dist/docs/` first. Update this file's SWP status lines as work
lands (same convention as BUILD-PLAN).
