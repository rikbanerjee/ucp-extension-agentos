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

Every spec is backed by a runnable reference implementation in this repo — if the Playground
runs it, the spec is real.

## The set

| # | Spec | Namespace | Status |
|---|------|-----------|--------|
| 0001 | [Eligibility & Visibility Semantics](./0001-eligibility.md) | `com.ezyupload.shopping.eligibility` | Draft · RFC |
| 0002 | Contextual Pricing *(planned)* | `…member_pricing` / `…bulk_pricing` / `…promo_pricing` | Not started |
| 0003 | Fulfillment Feasibility *(planned)* | `com.ezyupload.shopping.fulfillment_constraints` | Not started |
| 0004 | Discovery & Intent *(planned)* | TBD | Not started |

## How to contribute

These drafts exist to be argued with. Each spec ends with an **Open Questions / Request for
Comment** section — genuine design forks, not rhetorical ones. If you run a real catalog, build
on a commerce platform, or work on agents, your disagreement is the most valuable input there
is.

- Email: rikbanerjee007@gmail.com
- Or reply on the build-log post for the relevant week.

*Draft status. Namespaces and shapes will change as the specs are pressure-tested in public.*
