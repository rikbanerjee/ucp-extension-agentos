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

**Namespace:** `com.os.retailagent.shopping.*` (vendor-neutral, upstream-candidate per A1)

Every spec is backed by a runnable reference implementation in this repo — if the Playground
runs it, the spec is real.

---

## Conformance tiers

| Tier | Name | Promise |
|------|------|---------|
| 0 | Discoverable | An agent can find and correctly read my catalog. |
| 1 | Qualified | No dead-end carts — only eligible, in-stock items surface. |
| 2 | Priced | The right price per buyer, honored at checkout. |
| 3 | Member-aware | Merchant *supports* member/loyalty-aware pricing, earn preview, subscriptions. (Buyer loyalty tier is an orthogonal `BuyerContext` claim, not a rung here.) |
| 4 | Assisted | Full commerce — fulfillment, handoff, intent, returns. |

---

## The spec catalog

### Plane 0 · Foundation

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0000 | [Protocol Foundations, Context & Conformance](./0000-foundations.md) | `…core` | **Draft · RFC** | Foundation |
| 0008 | [Trust, Provenance & Freshness](./0008-trust-provenance.md) | `…trust` | **Draft · RFC** v1.0.0 | Foundation |
| 0015 | Privacy, Consent & Identity *(planned)* | `…identity` | Not started | Foundation |

### Plane 1 · Discovery & Truth

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0004 | Discovery & Catalog Semantics *(planned)* | `…discovery` | Not started | Tier 0 |
| 0005 | [Inventory & Availability](./0005-inventory.md) | `…inventory` | **Draft · RFC** v1.0.0 | Tier 1 |

### Plane 2 · Reasoning

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0001 | [Eligibility & Visibility Semantics](./0001-eligibility.md) | `…eligibility` | **Draft · RFC** v1.1.0 | Tier 1 |
| 0011 | Tax & Restricted / Regulated Goods *(planned)* | `…restricted` | Not started | Tier 1 |

### Plane 3 · Price & Value

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0002 | [Contextual Pricing (Member + Bulk)](./0002-contextual-pricing.md) | `…member_pricing`, `…bulk_pricing` | **Draft · RFC** v1.0.0 | Tier 2 |
| 0006 | Promotional Pricing & Stacking *(planned)* | `…promo_pricing` | Not started | Tier 2 |
| 0007 | [Quote Integrity & Price Lock](./0007-quote-integrity.md) | `…quote` | **Draft · RFC** v1.0.0 | Tier 2 |
| 0009 | Loyalty & Rewards *(planned)* | `…loyalty` | Not started | Tier 3 |
| 0010 | Subscriptions & Recurring *(planned)* | `…subscription` | Not started | Tier 3 |

### Plane 4 · Fulfillment

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0003 | Fulfillment Feasibility *(planned)* | `…fulfillment_constraints` | Not started | Tier 4 |

### Plane 5 · Outcomes & Handoff

| # | Spec | Namespace | Status | Tier |
|---|------|-----------|--------|------|
| 0012 | Cart Bridge & Checkout Handoff *(planned)* | `…cart_bridge` | Not started | Tier 4 |
| 0013 | [Intent Capture, Assisted Commerce & Decision Trace](./0013-intent-capture.md) | `…trace` | **Draft · RFC** v0.1.0 | Tier 3 |
| 0014 | Returns & Post-Purchase Policy *(planned)* | `…returns` | Not started | Tier 4 |

---

## How to contribute

These drafts exist to be argued with. Each spec ends with an **Open Questions / Request for
Comment** section — genuine design forks, not rhetorical ones. If you run a real catalog, build
on a commerce platform, or work on agents, your disagreement is the most valuable input there
is.

- Email: rikbanerjee007@gmail.com
- Or reply on the build-log post for the relevant week.

*Draft status. Namespaces and shapes will change as the specs are pressure-tested in public.*
