# RetailAgentOS — the merchant reasoning layer for agentic commerce

UCP (Universal Commerce Protocol) gives commerce the rails: discovery, catalog, cart,
checkout handoff. But a merchant's *reasoning* — who may see an item, who qualifies to buy
it, at what price, in what stock, shipped where — lives locked in backend code and only
fires at checkout. AI shopping agents hit it like a wall: dead-end carts, wrong quotes,
gated SKUs shown to unqualified buyers.

**RetailAgentOS (RAOS) moves that reasoning from checkout-time to catalog-time**, as
deterministic, versioned, machine-readable UCP extensions with a reason code attached to
every decision — published as open, upstream-candidate RFCs, and proven by a runnable
reference implementation in this repo.

## The three ideas

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

## Where to go

| You want to | Read |
|---|---|
| **Make a real store agent-ready** (the reference architecture) | [`specs/ADOPTION-GUIDE.md`](./specs/ADOPTION-GUIDE.md) |
| Understand the project (plain-language map) | [`specs/WIKI.md`](./specs/WIKI.md) |
| Browse the spec catalog by tier | [`specs/README.md`](./specs/README.md) |
| Build the next spec / task (coding agents start here) | [`specs/BUILD-PLAN.md`](./specs/BUILD-PLAN.md) |
| See the engine package + the live merchant pilot | [`specs/reference-implementation/`](./specs/reference-implementation/README.md) |
| Know what's verified real vs. asserted | [`VERIFICATION-NEEDED.md`](./VERIFICATION-NEEDED.md) |

## What's built today

Seven specs published as Draft·RFC with tested reference implementations — 0000 Foundations,
0001 Eligibility, 0002 Contextual Pricing, 0005 Inventory, 0007 Quote Integrity, 0008
Trust/Provenance, 0013 pt 1 Decision Trace — plus a real `/.well-known/ucp` route, golden-
fixture determinism tests, and the engine extracted as an installable package. Nine more
specs are catalogued with briefs. A real merchant pilot (TheCustomHub) is in progress.
Current status, with evidence: [`VERIFICATION-NEEDED.md`](./VERIFICATION-NEEDED.md).

## WebMCP Challenge showcase

Open [`/webmcp-showcase`](http://localhost:3010/webmcp-showcase) to see isolated controlled Fresh Corner Market and TheCustomHub quote fixtures. The page leads with the business outcome — "The browser agent asks. RetailAgentOS checks what the retailer can actually promise." — then offers two clearly separated paths: **Try with a browser agent** (real `document.modelContext` registration status, the shopper prompt, a copy action) and **Watch guided mission** (a deterministic replay of the same canonical descriptors, always labelled "Guided replay · Same RetailAgentOS handlers · No external agent," available even when a native agent is detected). The deterministic engine, not the browser or a model, decides whether a cart may be prepared; each storefront session is server-bound and checkout is never registered. A Mission Control timeline translates real registration/invocation/decision telemetry into plain retail language, with raw tool names, lifecycle, and decision codes progressively disclosed.

Tool inventory: `get_storefront_capabilities`, `search_catalog`, `evaluate_shopping_plan`, `find_valid_alternatives`, `apply_plan_repair`, `prepare_validated_cart`, and `request_quote`. The quote result always preserves `fixedPrice: null`; Phase 1 has no checkout tool.

```ts
await document.modelContext?.registerTool(tool, { signal: controller.signal });
```

The standalone package is [`packages/webmcp`](./packages/webmcp), with emitted ESM, CommonJS, and declaration artifacts. Browser deployment verification is documented in [`specs/WEBMCP-CHROME-VERIFICATION.md`](./specs/WEBMCP-CHROME-VERIFICATION.md). This is challenge-period, controlled demonstration work: no live TheCustomHub integration, authentication, persistence, payment processing, or marketplace control is claimed.

### Challenge provenance

The UCP manifest/specs, deterministic engine, external/client adapter seams, and projections predate the challenge. The native browser WebMCP delivery was added during the Aug 30–31, 2026 challenge work; it should not be presented as a new generalized commerce platform or as a hosted remote MCP server.

| Commit | Evidence |
|---|---|
| [`92753e5`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/92753e5) | Browser adapter, canonical descriptors, package, and controlled gateway. |
| [`d094e12`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/d094e12) | Canonical showcase route and purchase-plan documentation. |
| [`e464bb8`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/e464bb8) | Showcase hardening and explicit lifecycle evidence. |

Native browser WebMCP is shipped at `/webmcp-showcase`. A generalized remote/server MCP, production authentication, persistence, multi-tenancy, payments, and real merchant control remain unshipped.

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

Then open `http://localhost:3000` — `/demo` is the Playground (context simulator, cart
validation, payload inspector with human/JSON toggle), `/specs` hosts the spec pages, and
`src/app/sandbox/reference/` holds a runnable per-spec cookbook.

> **Note for coding agents:** this repo runs Next.js 16 with breaking changes vs. your
> training data — read `node_modules/next/dist/docs/` before touching routing/pages
> (see `AGENTS.md`).

## Contributing

Every RFC ends with genuine Open Questions. If you run a real catalog, build a commerce
platform, or work on agents, your disagreement is the most valuable input there is:
rikbanerjee007@gmail.com.
