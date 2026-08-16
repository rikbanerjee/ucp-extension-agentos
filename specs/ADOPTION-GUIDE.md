# RetailAgentOS — Adoption Guide (the reference architecture)

**Audience:** a retail IT engineer making a real store agent-ready as a UCP extension.
**Promise:** you implement **two small contracts** and pick a **tier**. Everything else —
manifest, schema.org markup, product feed, decision pipeline, quotes, traces — is derived
by the engine. You never re-implement commerce reasoning.

If you only read one document before integrating, read this one. The RFCs in
`specs/00NN-*.md` are the contracts; this is the path through them.

---

## 1. The mental model (60 seconds)

**UCP** gives commerce its rails: discovery, catalog, cart, checkout handoff.
**RetailAgentOS (RAOS)** adds the layer UCP doesn't carry: the merchant's *reasoning* —
who may see an item, who may buy it, at what price, in what stock, shipped where — moved
from checkout-time to **catalog-time**, as deterministic, machine-readable contracts with
a reason code on every decision.

Every decision runs through one fixed five-stage pipeline:

```
VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE
```

Same inputs → byte-identical output, always. No model in the loop, no clock reads inside
the engine (`now` is always injected). That determinism is what lets an agent trust — and
explain — every answer.

**One axis to remember: the conformance tier (0–4).** It describes *your store's* maturity,
not your buyers. (A buyer's gold/silver/guest loyalty standing is a separate `BuyerContext`
claim — never a tier.) You declare a headline tier plus an authoritative `capabilities[]`
list in your `/.well-known/ucp` manifest; agents negotiate against `capabilities[]` and
degrade gracefully for anything you don't support. Partial adoption is first-class.

---

## 2. What you implement: two contracts, nothing else

```ts
import { evaluateOffer, buildManifest, toSchemaOrgProduct } from '@retailagentos/engine';

// 1. Map YOUR catalog to canonical variants
interface MerchantCatalogAdapter<TSource> {
  merchantProfile(): MerchantProfile;      // tier + capabilities[] + endpoints + servesRegions
  toVariants(source: TSource): Variant[];  // one of your products -> 1+ RAOS variants
  listVariants(): Variant[];               // your whole normalized catalog
}

// 2. Resolve who is shopping (region, fulfillment mode, claims)
interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}
```

From those two, the engine derives every agent-facing surface:

| You call | You get | Serve it at |
|---|---|---|
| `buildManifest(profile)` | UCP discovery manifest | `GET /.well-known/ucp` |
| `toSchemaOrgProduct(variant)` | `Product`+`Offer` JSON-LD | each product URL (server-rendered — agents don't run your SPA) |
| `toProductFeed(variants)` | Google-format feed rows | wherever you publish feeds |
| `evaluateOffer({merchant, variant, quantity, context, now})` | full `DecisionRecord` with reasons | your API / MCP tools |
| `issueQuote(record, now)` / `validateQuote(...)` | price-lock tokens | quote + checkout handoff |
| `buildDecisionTrace(record)` + 3 renderers | buyer / merchant-ops / developer views of any decision | UI, support tooling, logs |

The engine package is `@retailagentos/engine` (see
[`reference-implementation/engine.md`](./reference-implementation/engine.md)). It has zero
runtime dependencies; importing it self-registers all evaluators.

**Two rules you must not break:**
1. **Never call the system clock inside evaluation.** Read `Date.now()` once at your server
   boundary and pass it in as `now`.
2. **Never fork the reasoning.** If a spec doesn't fit your store (e.g. you need a region
   *allowlist* where the spec models a blocklist), raise it as an Open Question on the spec —
   don't quietly re-implement a decision outside the engine. One source of truth is the
   whole point.

---

## 3. The adoption ladder — pick your tier, ship in steps

Each tier is cumulative and independently valuable. A one-person boutique can stop at
Tier 1 and already be agent-safe.

### Tier 0 · Discoverable — "an agent can find and correctly read my catalog"
*Typical effort: ~1 day once your adapter maps the catalog.*

| Do | Backed by |
|---|---|
| Implement `MerchantCatalogAdapter` over your existing product data | [RAOS-0000](./0000-foundations.md) |
| Serve `buildManifest()` at `/.well-known/ucp` | RAOS-0000 |
| Serve `toSchemaOrgProduct()` JSON-LD on product pages (prerender or edge function if you're an SPA) | RAOS-0000 / 0004-adjacent |

**Acceptance:** `curl https://yourstore.com/.well-known/ucp` returns tier + capabilities;
`curl` on a product URL returns valid JSON-LD without JavaScript.

### Tier 1 · Qualified — "no dead-end carts"
*Only eligible, in-stock, reachable items surface, with a reason for everything hidden or blocked.*

| Do | Backed by |
|---|---|
| Populate `eligibilityRules` on variants (visibility, region, qualification) | [RAOS-0001](./0001-eligibility.md) |
| Populate `fulfillmentConstraints` (mode, region, hazmat/oversize, lead time, cutoff) + `MerchantProfile.timezone` | [RAOS-0003](./0003-fulfillment.md) |
| Populate `inventory` state (+ freshness TTL, optional soft-hold reservation) | [RAOS-0005](./0005-inventory.md) |
| Implement `BuyerContextResolver`; call `evaluateOffer` per product view / cart line | RAOS-0000 §4 |

**Acceptance:** an out-of-region, unreachable, or out-of-stock request returns a `ReasonEntry`
(e.g. `REGION_RESTRICTED` [merchant-level], `REGION_NOT_SERVED`/`FULFILLMENT_MODE_UNAVAILABLE`
[item-level, RAOS-0003], `OUT_OF_STOCK`) with severity and resolution path — not a silent miss
or a checkout failure.

### Tier 2 · Priced — "the right price per buyer, honored at checkout"

| Do | Backed by |
|---|---|
| Configure member / bulk pricing (MOQ, increments, tiers, teaser prices, purchase limits) | [RAOS-0002](./0002-contextual-pricing.md) |
| Issue and validate quote tokens; declare your honor policy (grace / requote / reject) | [RAOS-0007](./0007-quote-integrity.md) |
| Attach the trust/freshness envelope (simulated signing is fine to start — it's labeled) | [RAOS-0008](./0008-trust-provenance.md) |

**Acceptance:** the price an agent shows is bound in a TTL'd `QuoteToken`; a stale or
context-changed quote is re-quoted per your declared policy, never silently repriced.

### Tier 3 · Member-aware and Tier 4 · Assisted
Loyalty earn/burn preview (0009), subscriptions (0010), promo stacking (0006),
cart handoff (0012), intent capture (0013 pt 2), returns (0014) — these
specs are catalogued and designed but **not yet published/built**. (Fulfillment feasibility,
formerly listed here, was promoted to Tier 1 on 2026-08-12 — see above.) Track their status in
[`README.md`](./README.md) (the catalog) and their intent pages under
[`wiki/pending/`](./wiki/pending/). Don't build ahead of a published spec; the contracts
may still move.

---

## 4. The transport story (how agents actually reach you)

- **Minimum (Tier 0):** static surfaces — manifest + JSON-LD + feed. Crawlable agents work
  with zero live endpoints.
- **Interactive:** expose `evaluateOffer` and `issueQuote` as MCP tools on a long-lived
  server (Cloud Run-class, not short-lived functions — MCP needs streaming). The MCP layer
  must be a **thin adapter**: it authenticates the agent, injects `now`, calls the engine,
  and returns the engine's output unmodified. The acceptance test is equivalence: the MCP
  tool result deep-equals a direct `evaluateOffer` call for identical inputs.
- **Checkout:** hand off to your existing checkout (e.g. Stripe session), carrying quote
  tokens. RAOS carries reasoning + locked prices; checkout owns payment and tax computation.

---

## 5. Worked example: TheCustomHub

A real made-to-order apparel merchant (Vite/React SPA on Firebase, Stripe checkout,
~59-product Shopify-shaped `products.json`) adopting the ladder as a pilot:

| Ladder step | What it looked like there |
|---|---|
| Adapter | `CustomHubAdapter`: `products.json` → variants; `compareAtPrice` → applied offer; `inventoryQty` → inventory state; null variant rows stripped |
| Buyer context | region (US/CA allowlist via `checkServesRegion`) + fulfillment mode |
| Tier 0 | manifest via Cloud Function; JSON-LD via prerender (the SPA is invisible to agents otherwise) |
| Tier 1–2 | eligibility + inventory + quote via `evaluateOffer`/`issueQuote` behind a Cloud Run MCP server |
| Differentiator | `callForPrice: true` custom/bulk SKUs route to structured intent capture instead of dead-ending at a contact form |

Full detail, in reading order:
[`reference-implementation/thecustomhub/01-discovery.md`](./reference-implementation/thecustomhub/01-discovery.md) →
[`02-spine-design.md`](./reference-implementation/thecustomhub/02-spine-design.md) →
[`03-implementation-plan.md`](./reference-implementation/thecustomhub/03-implementation-plan.md) →
[`TRACK-B-FOR-THECUSTOMHUB.md`](./reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md)
(the last one is the self-contained brief you can copy into your own repo and hand to a
coding agent — it is the template for any new merchant integration).

---

## 6. Ground rules the whole architecture depends on

These come from [RAOS-0000](./0000-foundations.md) and apply to every tier:

- **Determinism:** same `(BuyerContext, manifest, catalog, now)` → identical output.
- **Most-restrictive default:** unknown/missing/untrusted context degrades to guest.
  Asserted (unsigned) privilege claims are downgraded for transaction-gating stages.
- **Fail-degraded, never crash:** a failing safety-critical evaluator blocks; a failing
  advisory evaluator is omitted. Unknown blocking reason code → treat as BLOCK.
- **Additive-only evolution:** reason codes never change meaning; semver per namespace;
  deprecation via `supersededBy`.
- **Namespace:** `com.os.retailagent.shopping.*`, vendor-neutral, written as UCP
  upstream candidates.
- **v1 seams:** USD-only (a `currency` field exists as a seam), single-merchant cart.

---

## 7. Where to go next

| You want | Read |
|---|---|
| What each spec means, in plain language | [`WIKI.md`](./WIKI.md) + [`wiki/*.md`](./wiki/) |
| The exact contract for a spec | `specs/00NN-*.md` (the RFC) |
| The catalog + status of all specs | [`README.md`](./README.md) |
| To see it running | the Playground (`npm run dev` → `/demo`) and the per-spec cookbook (`src/app/sandbox/reference/`) |
| To build the remaining specs (contributors/coding agents) | [`BUILD-PLAN.md`](./BUILD-PLAN.md) |
| To argue with a design decision | each RFC's Open Questions section — disagreement from people who run real catalogs is the most valuable input there is |
