# Track B — RetailAgentOS integration work for **thecustomhub** repo

> **Copy this file into the `thecustomhub` repo** (e.g. `docs/retailagentos/TRACK-B.md`) and
> point a coding agent at it. It is self-contained — you do **not** need the RetailAgentOS
> ("kit") repo open to do the work, only the engine artifact described in **B0**.

## What this is
TheCustomHub is a free pilot / reference merchant for **RetailAgentOS** — an open spec layer
that makes a catalog **agent-readable and transactable** (discoverable by shopping agents in
Claude/ChatGPT, with real eligibility / price / stock / region reasoning, not just a flat feed).

The reusable reasoning engine ("the kit") is already built and shipped as an installable package,
`@retailagentos/engine`. **Track A (the kit) is done.** This document is **Track B** — the work
that lives in *this* (thecustomhub) repo to consume the kit and go live.

## Locked decisions (do not relitigate)
- **Ships to US + CA.** **Pricing is USD only** (CAD / multi-currency is V2, deliberately deferred).
- **Priority:** (1) products agent-compliant + the agentic shopping experience; (2) custom/bulk
  quote capture as a strong follow-on.
- **Engine is pure & deterministic:** `now` is injected; there is **no** `Date.now()` /
  `Math.random()` / `fetch()` inside it. Keep it that way — pass timestamps in.
- **Secrets:** never read, log, or commit `.env`, Firebase service-account / admin keys, or Stripe
  secrets into any RetailAgentOS file or doc.

## Repo facts this plan assumes (verify as you go)
- Vite + React 19 SPA on Firebase: Hosting, Storage, Cloud Functions v2.
- Catalog = static bundled `src/data/products.json` (~59 products, Shopify-shaped variants) — the
  source of truth for the buyer path (not Firestore).
- Checkout = Stripe via Cloud Function `createCheckoutSession`.
- Already multi-channel: products carry `marketplace.amazon`, `walmartData`; Google-taxonomy
  `category` strings; you already export feeds to Amazon/Walmart. RetailAgentOS is just the next
  channel — *AI agents* — derived from the same source.

---

## B0 · Install the kit (do this first — it unblocks everything)

The kit is delivered as a **prebuilt, self-contained tarball** (`dist/` ESM+CJS+types, no source,
no aliases, zero runtime deps). Get it one of two ways:

**Option 1 — tarball (simplest for the pilot):**
1. From the kit repo, the maintainer runs `npm pack -w @retailagentos/engine` to produce
   `retailagentos-engine-0.1.0.tgz`. (A current build of it is already at
   `packages/engine/retailagentos-engine-0.1.0.tgz` in the kit repo.)
2. Copy that `.tgz` into this repo (e.g. `vendor/retailagentos-engine-0.1.0.tgz`).
3. `npm i ./vendor/retailagentos-engine-0.1.0.tgz`

**Option 2 — git/workspace dependency:** if both repos live on the same machine, you *can*
`npm i ../ucp-commerce-extension-demo/packages/engine/retailagentos-engine-0.1.0.tgz`. Do **not**
depend on the kit's `src/` directly — it uses `@/…` path aliases that only resolve inside the kit
repo. Always consume the **built artifact**.

**Verify the install:**
```ts
import { evaluateOffer, buildManifest } from '@retailagentos/engine';
console.log(typeof evaluateOffer, typeof buildManifest); // "function function"
```
Importing the package **self-registers all evaluators** — you just call the public API; there is
no registry to wire up.

> ⚠️ **Whenever the kit's source changes, the tarball must be rebuilt** (`npm run build -w
> @retailagentos/engine`) and reinstalled here. Pin the version in `package.json`.

### The engine public API (the only supported surface)
```ts
// Evaluation (pure; you inject `now` as epoch ms)
evaluateOffer({ merchant, variant, quantity, context, now, trustEnforcement? }) => DecisionRecord
setInventoryHolds(...)   // optional evaluator config, call before evaluateOffer
setQuoteMeta(...)        // optional evaluator config

// Quote lifecycle (price-lock)
issueQuote(record, now) => QuoteToken
validateQuote(token, ctx, now) => QuoteValidationResult

// Human-facing trace
buildDecisionTrace(record) => DecisionTrace
renderBuyerTrace(trace) | renderMerchantTrace(trace) | renderDeveloperTrace(trace)

// Region allowlist helper ("serves exactly these countries")
checkServesRegion(servesRegions: string[], marketRegion: string) => emits REGION_RESTRICTED when not served

// Projections — derive every agent surface from canonical objects (pure)
buildManifest(profile) => UcpManifest                  // for /.well-known/ucp
toSchemaOrgProduct(variant) => SchemaOrgProduct        // Product + Offer JSON-LD (US/CA shipping)
toProductFeed(variants) | toProductFeedRow(variant)    // Google-format feed rows

// Contracts you implement
interface MerchantCatalogAdapter<TSource> {
  merchantProfile(): MerchantProfile;       // tier + capabilities[] + endpoints + servesRegions
  toVariants(source: TSource): Variant[];   // one merchant product -> 1+ RAOS variants
  listVariants(): Variant[];                // whole normalized catalog
}
interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}
```
All referenced types (`Variant`, `MerchantProfile`, `BuyerContext`, `PartialBuyerContext`,
`DecisionRecord`, `QuoteToken`, etc.) are exported from `@retailagentos/engine`.

**Acceptance:** the import above runs in this repo's toolchain (Vite build + any Node/Cloud
Functions runtime) and resolves types. Then proceed to B1.

---

## B1 · Extend the product model + clean the data
**Files:** `src/data/products.json` (+ any TS types describing it).
- Add fields:
  - `callForPrice: boolean` — bulk/custom SKUs that can't be instant-priced.
  - `leadTimeDays?: number` — made-to-order / personalization timing.
  - `shipsTo?: string[]` — default `['US','CA']`; per-product override allowed.
- **Normalize:** strip the Shopify-style **null variant padding rows** out of `variants[]`.
- **Acceptance:** every product validates against the new shape; no null-only variant rows remain.

## B2 · Implement `CustomHubAdapter`
**Goal:** map `products.json → canonical RAOS objects` via `MerchantCatalogAdapter<CustomHubProduct>`.
Mechanical, because the model is already Shopify-shaped.

| products.json | RAOS `Variant` | Notes |
|---|---|---|
| `product.id` + `variant.sku` | `id`, `sku` | drop null-padding rows |
| `product.title` (+ `option1..3`) | `title` | compose option labels |
| `variant.price` | `basePrice` | |
| — | `currency: 'USD'` | CAD deferred (V2) |
| `variant.compareAtPrice` | promo baseline / applied-offer | drives "was $X" messaging |
| `variant.inventoryQty`, `product.inStock` | `inventory.{ state, quantityAvailable, lowStockThreshold }` | `inStock=false`→`out_of_stock`; qty≤threshold→`low_stock` |
| `product.category` (Google taxonomy) | category metadata | reused later by discovery/match |
| `product.isCustomizable` + `customization` | personalization metadata | **still fixed-price** — instant buyable |
| custom/bulk (CustomOrders flow) | `callForPrice: true` (+ quote config) | the follow-on intent-capture path (B6) |

- `merchantProfile()`: set tier + capabilities (eligibility, contextual price, inventory, quote) +
  endpoints + `servesRegions: ['US','CA']`.
- Use `checkServesRegion(['US','CA'], context.marketRegion)` for the region gate (normalize region
  codes to upper-case before calling — the helper is case-sensitive by contract).
- **Acceptance:** `listVariants()` returns N normalized variants; `evaluateOffer` runs over each
  without throwing; a **guest in CA is eligible**, a **guest in GB gets `REGION_RESTRICTED`**.

## B3 · Serve `/.well-known/ucp`
- Cloud Function / Cloud Run handler returning `buildManifest(adapter.merchantProfile())`.
- **Acceptance:** `GET https://thecustomhub.com/.well-known/ucp` returns the manifest JSON listing
  `tier` + `capabilities[]` + endpoints.

## B4 · Serve crawlable product data (schema.org)
- The SPA is **client-rendered**, so agents/crawlers won't run it. Inject `Product`+`Offer` JSON-LD
  via prerender or a per-product Cloud Function using `toSchemaOrgProduct(variant)` (includes US/CA
  `shippingDetails`).
- **Acceptance:** product URLs expose valid `Product`/`Offer` JSON-LD **without** running the SPA
  (verify with `curl` + a structured-data validator).

> B3 and B4 are independent — do them in parallel.

## B5 · Cloud Run MCP server *(the live Claude demo — the payoff)*
- Use Cloud **Run**, not Functions — MCP needs long-lived SSE/streaming.
- Expose: a catalog **resource** (normalized variants from the adapter) + **tools** `evaluateOffer`
  and `issueQuote` that wrap the kit; checkout hands off to the existing Stripe
  `createCheckoutSession`.
- Inject `now = Date.now()` at the server boundary (the server is allowed to read the clock; the
  engine is not) and pass it into `evaluateOffer` / `issueQuote`.
- **Acceptance:** connect in Claude Desktop and *"find me a [product] that ships to Canada under
  $X"* → the agent reasons, quotes, and completes via Stripe; an out-of-region or out-of-stock item
  is **declined with a reason**, not a failed checkout.

## B6 · *(Follow-on)* Custom / bulk intent capture — the differentiator
- Replace the `/custom-orders → /contact` form **for agents** with a structured
  `callForPrice → intent-capture → quote-request` flow (call-for-price + intent capture + quote).
- **Acceptance:** *"I need 25 custom robotics-team shirts"* → the agent collects structured
  requirements → emits a quote request the merchant can act on (instead of dead-ending at a form).

---

## Suggested order
`B0 → B1 → B2 → (B3, B4 parallel) → B5 → B6`

Run the existing build/tests after each step. Commit per step with clear messages.
**Do not push** until the maintainer reviews.

## Done-for-pilot definition
A real CustomHub catalog is agent-compliant end-to-end: **discoverable** (manifest + schema.org),
**reasoned** (eligibility / price / stock / region via the kit), and **transactable in Claude**
(MCP → Stripe) — for a US **and** a Canadian shopper — with the custom-quote path demonstrated as
the differentiator a generic instant-checkout feed cannot do.
