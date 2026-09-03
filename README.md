# RetailAgentOS

**RetailAgentOS lets a shopping AI act safely on a real store — WebMCP exposes only the next safe
browser action, and RetailAgentOS's deterministic engine decides what that action is allowed to be.**

- **WebMCP Live Demo:** [www.retailagentos.com/webmcp-showcase](https://www.retailagentos.com/webmcp-showcase)
  — the RetailAgentOS WebMCP Agent Storefront, built for the OpenAI WebMCP Challenge.
  `/agent-ready-storefront` is a compatibility route that renders the identical page and points its
  canonical identity at `/webmcp-showcase`.
- **Video:** [Watch the WebMCP demo on YouTube](https://youtu.be/aIScR90pSb0). The site reads this
  public URL from `NEXT_PUBLIC_WEBMCP_VIDEO_URL`; no placeholder link is ever rendered.

## Test prompt

Paste this into the browser agent (or use the page's own "Watch guided mission" button if no
WebMCP-capable agent is connected):

> Build a weekend breakfast cart under $30 from Fresh Corner Market using local delivery. Include one dozen Farm Eggs and one Artisan Sourdough Bread loaf. If the Farm Eggs inventory cannot be trusted, show me one merchant-valid substitute, explain the price difference, and wait for my approval. After I approve, prepare the cart for review, but do not check out.

## What the human and the agent do together

The agent reads the storefront's registered WebMCP tools, searches the catalog, and asks
RetailAgentOS to evaluate the shopping plan. When the engine finds the eggs' inventory data stale,
it doesn't fail — it proposes a merchant-valid substitute (Cage-Free Eggs) and pauses. **The human
shopper approves or declines that substitute** — a real click, never auto-approved and never
inferred. Only after approval does the agent invoke `prepare_validated_cart`, and only because
RetailAgentOS revalidated inventory, price, fulfillment, and the $30 budget does a cart actually
appear. The agent can optionally ask RetailAgentOS to revise that cart (e.g. "make it two loaves of
bread"); the engine re-checks everything again before replacing it. Checkout is never registered as
a tool — the mission stops at a prepared cart.

## Why WebMCP is essential here

Without WebMCP, an AI shopping agent either scrapes a page and guesses (wrong prices, phantom
stock, invented delivery promises) or a merchant hand-builds a bespoke, ungoverned integration per
agent. WebMCP gives the agent a small, typed, discoverable set of *safe next actions* — and because
RetailAgentOS controls which tools are registered and what each one is allowed to return, the agent
can never reach a tool it shouldn't, invent a price the merchant didn't set, or push a cart past a
constraint (budget, inventory, fulfillment mode) the merchant actually enforces. The browser
registration lifecycle (`registerTool`/`AbortSignal`) is what makes "safe next action" a real,
revocable guarantee instead of a hopeful convention.

## Judge in 90 seconds

1. Open the live demo URL above.
2. Confirm the page reports **"Native WebMCP detected"** (or, if your browser doesn't support
   `document.modelContext` yet, that's expected — use "Watch guided mission" instead, which runs the
   identical RetailAgentOS handlers without an external agent).
3. Paste the test prompt above into your WebMCP-capable browser agent.
4. **Approve** the proposed substitution when the agent presents it (Cage-Free Eggs for the
   stale-inventory Farm Eggs).
5. Observe the prepared cart — Mission Control shows the real registration/invocation/decision
   telemetry that produced it, and Decision Summary shows RetailAgentOS's authoritative
   `CART_PREPARED` status.
6. Optionally, click "Watch guided cart revision" (or ask your agent) to see RetailAgentOS govern a
   cart change — it only replaces the cart because the revised plan still satisfies budget,
   inventory, and fulfillment.
7. Switch to the **TheCustomHub** scenario and try the quote flow — a custom order that must go to
   merchant review, never a fabricated price.
8. Expand **Developer Evidence** at the bottom for the raw tool schemas, full telemetry log, and
   registry parity check.

## Controlled-fixture disclosure

Fresh Corner Market and TheCustomHub are **fictional, server-bound controlled fixtures** built for
this showcase — not live merchant systems. Every decision (eligibility, price, inventory,
fulfillment, quote status) is produced by `@retailagentos/engine`, the same deterministic evaluator
used elsewhere in this repo; nothing is hand-scripted for the demo. Checkout, payment, and order
placement are never registered as tools. TheCustomHub never receives cart preparation — it is
quote-only, and its quotes always carry `fixedPrice: null`. No live TheCustomHub catalog, quote,
cart, or order API is called. A generalized remote/server MCP integration is designed but not
shipped; this demo is the native browser WebMCP surface only.

## What was built during the challenge

RetailAgentOS's UCP manifest, deterministic engine, external/client adapter seams, and projections
**predate** the WebMCP Challenge. The native browser WebMCP delivery — everything at
`/webmcp-showcase` — was built during the challenge window (Aug 25–Sep 3, 2026):

| Commit | What it added |
|---|---|
| [`92753e5`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/92753e5) | Browser adapter, canonical seven-tool descriptors, `packages/webmcp`, controlled gateway. |
| [`d094e12`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/d094e12) | Canonical `/webmcp-showcase` route and purchase-plan documentation. |
| [`e464bb8`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/e464bb8) | Showcase hardening and explicit lifecycle evidence. |
| [`d9a5eb5`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/d9a5eb5) | Judge-facing UX rework and native-vs-replay telemetry truthfulness fixes. |
| [`0228160`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/0228160) | Optional `revise_validated_cart` cart-revision extension. |
| [`5b1603e`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/5b1603e) | Submission-hardening pass: grouped Mission Control telemetry, a completed shopper-approval sequence with correct actor attribution, `CART_PREPARED`/`CART_REVISED`-aware Decision Summary copy, a canonical Farm Eggs title/unit, unit×line-total display in the revised cart, and a 320px layout fix. |
| [`12f8ba0`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/12f8ba0) | Deterministic native approval-to-cart handoff and lifecycle correctness hardening: registration-before-return, trusted decision-scoped server-side cart idempotency, unconditional registration-controller cleanup, and an explicit retry path for a failed guided-fallback cart preparation. |
| [`0b0b71a`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/0b0b71a) | Correctness-gap closure and further showcase hardening: bounded catalog search ranking with fixture-supplied aliases, the named $30 Farm Eggs breakfast mission, guided-progress feedback, and submission-document consolidation. |
| [`6a57c09`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/6a57c09) | Structured TheCustomHub quote workflow — the typed 25-shirt configuration, budget ceiling, and delivery request, still returning `fixedPrice: null` with no cart, order, payment, or checkout. |
| [`4790f74`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/4790f74) | Focused challenge navigation and page identity: route-specific chrome on both showcase routes, a compact challenge footer, canonical shared metadata, judge anchors with accessible focus, a global WebMCP Live Demo link, and optional video-link configuration. |

Later commits on `main` (`b0550a8` and the submission-package reconciliation that follows it) are
documentation and evidence corrections, not product implementation.

Native browser WebMCP is shipped for this controlled showcase. A generalized remote/server MCP,
production authentication, persistence, multi-tenancy, payments, and real merchant control remain
unshipped — see [`specs/WEBMCP-PLATFORM-BUILD.md`](./specs/WEBMCP-PLATFORM-BUILD.md)'s "Current
submission status" for the single authoritative record of what's shipped, verified, and not.

---

## The reasoning layer underneath

UCP (Universal Commerce Protocol) gives commerce the rails: discovery, catalog, cart,
checkout handoff. But a merchant's *reasoning* — who may see an item, who qualifies to buy
it, at what price, in what stock, shipped where — lives locked in backend code and only
fires at checkout. AI shopping agents hit it like a wall: dead-end carts, wrong quotes,
gated SKUs shown to unqualified buyers.

**RetailAgentOS (RAOS) moves that reasoning from checkout-time to catalog-time**, as
deterministic, versioned, machine-readable UCP extensions with a reason code attached to
every decision — published as open, upstream-candidate RFCs, and proven by a runnable
reference implementation in this repo.

### The three ideas

1. **One pipeline.** Every decision runs `VISIBILITY → ELIGIBILITY → PRICE → FULFILLMENT →
   QUOTE` through pure, registered evaluators. Same inputs → byte-identical output; no
   model in the loop; time is injected, never read.
2. **One adoption axis.** Merchants declare a conformance tier (0 Discoverable · 1
   Qualified · 2 Priced · 3 Member-aware · 4 Assisted) backed by an authoritative
   `capabilities[]` list at `/.well-known/ucp`. Agents negotiate against capabilities and
   degrade gracefully — partial adoption is first-class.
3. **One source of truth.** The spec is real only if the Playground runs it. The demo UI,
   the spec pages, the packaged engine (`@retailagentos/engine`), and any MCP transport all
   call the same evaluators.

### Where to go

| You want to | Read |
|---|---|
| **Make a real store agent-ready** (the reference architecture) | [`specs/ADOPTION-GUIDE.md`](./specs/ADOPTION-GUIDE.md) |
| Understand the project (plain-language map) | [`specs/WIKI.md`](./specs/WIKI.md) |
| Browse the spec catalog by tier | [`specs/README.md`](./specs/README.md) |
| Build the next spec / task (coding agents start here) | [`specs/BUILD-PLAN.md`](./specs/BUILD-PLAN.md) |
| See the engine package + the live merchant pilot | [`specs/reference-implementation/`](./specs/reference-implementation/README.md) |
| Know what's verified real vs. asserted | [`VERIFICATION-NEEDED.md`](./VERIFICATION-NEEDED.md) |
| Full WebMCP platform build record and current submission status | [`specs/WEBMCP-PLATFORM-BUILD.md`](./specs/WEBMCP-PLATFORM-BUILD.md) |

### What's built today

Seven specs published as Draft·RFC with tested reference implementations — 0000 Foundations,
0001 Eligibility, 0002 Contextual Pricing, 0005 Inventory, 0007 Quote Integrity, 0008
Trust/Provenance, 0013 pt 1 Decision Trace — plus a real `/.well-known/ucp` route, golden-
fixture determinism tests, and the engine extracted as an installable package. Nine more
specs are catalogued with briefs. A real merchant pilot (TheCustomHub) is in progress.
Current status, with evidence: [`VERIFICATION-NEEDED.md`](./VERIFICATION-NEEDED.md).

## WebMCP implementation notes

Tool inventory: `get_storefront_capabilities`, `search_catalog`, `evaluate_shopping_plan`, `find_valid_alternatives`, `apply_plan_repair`, `prepare_validated_cart`, and `request_quote` (the seven canonical Phase 1 tools), plus the optional `revise_validated_cart` extension (registered only after a Fresh Corner cart exists). The quote result always preserves `fixedPrice: null`; no checkout tool is ever registered.

```ts
await document.modelContext?.registerTool(tool, { signal: controller.signal });
```

The standalone package is [`packages/webmcp`](./packages/webmcp), with emitted ESM, CommonJS, and declaration artifacts. Browser deployment verification is documented in [`specs/WEBMCP-CHROME-VERIFICATION.md`](./specs/WEBMCP-CHROME-VERIFICATION.md).

### Route chrome

The canonical `/webmcp-showcase` and compatibility `/agent-ready-storefront` routes use focused
challenge chrome: RetailAgentOS identity, an "OpenAI WebMCP Challenge" badge, and Run Demo · How It
Works · Developer Evidence · GitHub · Back to RetailAgentOS. They do not render the normal
dropdown-heavy company navigation or the large multi-column footer; every other route keeps the
normal platform navigation and footer. `src/components/layout/AppShell.tsx` picks exactly one
header and one footer per route, so the two systems are never both present. Judge anchors are
`#webmcp-mission`, `#why-webmcp`, and `#developer-evidence`; shared naming, links, and the optional
video URL live in [`src/lib/content/showcaseChrome.ts`](./src/lib/content/showcaseChrome.ts).

## The demo (Playground)

Three mock merchant archetypes prove one protocol surface supports radically different
retail models:

- **Sara's Boutique** (DTC, discovery-led) — teaser prices, guest-hidden lines, preorders.
- **Atlas Wholesale** (B2B, qualification-first) — MOQ, increments, tiered pricing,
  resale-certificate gating.
- **Fresh Corner Market** (grocery, context-heavy) — weekly offers, per-store stock,
  pickup/delivery/region constraints.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` (or the port `npm run dev` reports) — `/demo` is the
Playground (context simulator, cart validation, payload inspector with human/JSON toggle),
`/specs` hosts the spec pages, `/webmcp-showcase` is the WebMCP Live Demo above, and
`src/app/sandbox/reference/` holds a runnable per-spec cookbook.

> **Note for coding agents:** this repo runs Next.js 16 with breaking changes vs. your
> training data — read `node_modules/next/dist/docs/` before touching routing/pages
> (see `AGENTS.md`).

## License

Licensed under the [Apache License, Version 2.0](./LICENSE).

## Contributing

Every RFC ends with genuine Open Questions. If you run a real catalog, build a commerce
platform, or work on agents, your disagreement is the most valuable input there is:
rikbanerjee007@gmail.com.
