# RetailAgentOS — Open Specs

Machine-readable merchant-reasoning semantics, layered on top of UCP (Universal Commerce
Protocol), drafted in the open.

**The idea in one line:** UCP gives commerce the rails — discovery, catalog, cart, checkout
handoff. These specs move a merchant's *reasoning* (who may see this, who may buy it, at what
price, with what fulfillment) **from checkout-time to catalog-time, with machine-readable
reasons attached** — so AI shopping agents can act correctly and explain themselves.

**Why open / why specs first:** a small retailer can't build a bespoke AI-commerce integration.
But if the semantics exist as an open spec, the platform they already use can implement it once
and every merchant inherits agent-readiness for free. The spec is the leverage. The goal is to
prove patterns on real merchant archetypes and propose the durable ones upstream into UCP.

**Namespace:** `com.os.retailagent.shopping.*` (vendor-neutral, upstream-candidate)

## Start where you are

| You are | Start with |
|---|---|
| A retail IT engineer integrating a real store | [`ADOPTION-GUIDE.md`](./ADOPTION-GUIDE.md) — the reference architecture, tier by tier |
| New to the project, or picking it back up | [`WIKI.md`](./WIKI.md) — the plain-language map |
| A contributor / coding agent building the next spec | [`BUILD-PLAN.md`](./BUILD-PLAN.md) — the engine/spec execution queue |
| A coding agent working on the public website | [`SITE-PLAN.md`](./SITE-PLAN.md) — the site/positioning execution queue |
| Verifying what's actually real | [`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md) — the single status source |

Every published spec is backed by a runnable reference implementation — if the Playground
runs it, the spec is real. The packaged engine and the live merchant pilot are documented in
[`reference-implementation/`](./reference-implementation/README.md).

---

## The catalog, organized by conformance tier

A merchant declares a headline **tier** (0–4, cumulative) backed by an authoritative
`capabilities[]` list; agents negotiate against `capabilities[]` and degrade gracefully.
The tier describes *merchant implementation maturity* — a buyer's gold/silver/guest loyalty
standing is an orthogonal `BuyerContext` claim (owned by RAOS-0009), never a tier.

### Foundation (required at every tier)

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0000 | [Protocol Foundations, Context & Conformance](./0000-foundations.md) | `…core` | **Draft · RFC** | [intent](./wiki/0000-foundations.md) |
| 0008 | [Trust, Provenance & Freshness](./0008-trust-provenance.md) | `…trust` | **Draft · RFC** v1.0.0 | [intent](./wiki/0008-trust-provenance.md) |
| 0013 pt 1 | [Decision Trace (three audiences)](./0013-intent-capture.md) | `…trace` | **Draft · RFC** v0.1.0 | [intent](./wiki/0013-decision-trace.md) |
| 0015 | Privacy, Consent & Identity | `…identity` | Planned | [pending](./wiki/pending/0015-privacy-consent.md) |

### Tier 0 · Discoverable — "an agent can find and correctly read my catalog"

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0004 | Discovery & Catalog Semantics | `…discovery` | Planned | [pending](./wiki/pending/0004-discovery-match.md) |

### Tier 1 · Qualified — "no dead-end carts"

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0001 | [Eligibility & Visibility Semantics](./0001-eligibility.md) | `…eligibility` | **Draft · RFC** v2.0.0 | [intent](./wiki/0001-eligibility.md) |
| 0003 | [Fulfillment Feasibility](./0003-fulfillment.md) | `…fulfillment_constraints` | **Draft · RFC** v1.0.0 | [intent](./wiki/pending/0003-fulfillment.md) |
| 0005 | [Inventory & Availability](./0005-inventory.md) | `…inventory` | **Draft · RFC** v1.0.0 | [intent](./wiki/0005-inventory.md) |
| 0011 | Tax & Restricted / Regulated Goods | `…tax`, `…restricted` | Planned · next up | [pending](./wiki/pending/0011-restricted-goods.md) |

### Tier 2 · Priced — "the right price per buyer, honored at checkout"

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0002 | [Contextual Pricing (Member + Bulk)](./0002-contextual-pricing.md) | `…member_pricing`, `…bulk_pricing` | **Draft · RFC** v1.0.0 | [intent](./wiki/0002-contextual-pricing.md) |
| 0007 | [Quote Integrity & Price Lock](./0007-quote-integrity.md) | `…quote` | **Draft · RFC** v1.0.0 | [intent](./wiki/0007-quote-integrity.md) |
| 0006 | Promotional Pricing & Stacking | `…promo_pricing` | Planned · next up | [pending](./wiki/pending/0006-promo-stacking.md) |

### Tier 3 · Member-aware — "supports member/loyalty-aware pricing and earn preview"

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0009 | Loyalty & Rewards | `…loyalty` | Planned | [pending](./wiki/pending/0009-loyalty.md) |
| 0010 | Subscriptions & Recurring | `…subscription` | Planned | [pending](./wiki/pending/0010-subscriptions.md) |

### Tier 4 · Assisted — "full commerce: handoff, intent, returns"

| # | Spec | Namespace | Status | Wiki |
|---|------|-----------|--------|------|
| 0012 | Cart Bridge & Checkout Handoff | `…cart_bridge` | Planned | [pending](./wiki/pending/0012-cart-bridge.md) |
| 0013 pt 2 | Intent Capture & Assisted Commerce | `…intent_capture` | Planned | [pending](./wiki/pending/0013-intent-capture-routing.md) |
| 0014 | Returns & Post-Purchase Policy | `…returns` | Planned | [pending](./wiki/pending/0014-returns.md) |

**Reserved (horizon, namespaces only):** 0016 Agent Identity & Rate Limits · 0017 Merchant
Observability & Change Feed · 0018 Negotiation & Dynamic Offers · 0019 Payment Constraints &
Stored Value. Scoped in `MASTER-BUILD-PLAN.md` §6; not started by design.
**Explicit V2:** multi-currency/i18n · cross-merchant/marketplace cart (`TODO.md`).

---

## How to contribute

These drafts exist to be argued with. Each spec ends with an **Open Questions / Request for
Comment** section — genuine design forks, not rhetorical ones. If you run a real catalog, build
on a commerce platform, or work on agents, your disagreement is the most valuable input there
is.

- Email: rikbanerjee007@gmail.com
- Or reply on the build-log post for the relevant week.

*Draft status. Namespaces and shapes will change as the specs are pressure-tested in public.*
