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
