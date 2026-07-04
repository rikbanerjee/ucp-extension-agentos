# TheCustomHub × RetailAgentOS — Implementation Plan (agent-actionable)

> **For coding agents:** this is the executable plan. Read `01-discovery.md` (the merchant's
> as-is stack/data) and `02-spine-design.md` (the architecture + interfaces) first. Work is split
> across **two repos**; do Track A before Track B (B depends on A's package + interfaces).

## Locked decisions
- **Spine-first**: build the reusable kit before the merchant wiring.
- **Regions**: ships to **US + CA**. **Pricing: USD only** (CAD/multi-currency = V2, deferred).
- **Priority**: (1) products agent-compliant + the agentic shopping experience; (2) custom/bulk quote as a follow-on.
- **Two repos**: `~/code/ucp-commerce-extension-demo` (RetailAgentOS = "the kit") and `~/code/thecustomhub` (the merchant). Merchant changes happen in the merchant repo; never commit merchant code into the kit repo. No secrets in either.

---

## TRACK A — The Kit (RetailAgentOS repo)

### A1 · Extract the engine into `@retailagentos/engine` (behavior-preserving)
**Goal:** one installable, pure, deterministic package the merchant repo depends on.
- **Move/wrap:** `src/lib/extensions/**`, `src/lib/rules/**`, `src/lib/types/**` behind a package entrypoint.
- **Public API (the only supported surface):**
  - `evaluateOffer({ merchant, variant, quantity, context, now, trustEnforcement? }) → DecisionRecord`
  - `issueQuote(record, now) → QuoteToken` · `validateQuote(token, ctx, now) → QuoteValidation`
  - `buildDecisionTrace(record)` · `renderBuyerTrace/renderMerchantTrace/renderDeveloperTrace`
  - all referenced types
- Importing the package must self-register evaluators (as `src/lib/extensions/index.ts` does today).
- **Pilot consumption:** git/workspace dependency (no npm publish yet). Name `@retailagentos/engine`.
- **Acceptance:** the existing app imports from the package; `npm run build` clean; **293 tests still pass** (the no-behavior-change proof). No `Date.now()`/`fetch`/`Math.random()` in the package's rule/extension code.

### A2 · Define the adapter interfaces (in the package)
**Goal:** the one contract every merchant implements.
```ts
export interface MerchantCatalogAdapter<TSource> {
  merchantProfile(): MerchantProfile;          // manifest (tier + capabilities[] + endpoints + keys)
  toVariants(source: TSource): Variant[];      // one merchant product → 1+ RAOS variants
  listVariants(): Variant[];                   // whole normalized catalog
}
export interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}
```
- **Acceptance:** interfaces exported + documented; a trivial in-repo fake adapter compiles against them.

### A3 · Region allowlist helper
**Goal:** support "serves exactly these countries" cleanly (spec uses a blocklist today).
- Add a helper `servesRegions: string[]` notion + an eligibility check that emits `REGION_RESTRICTED` (BLOCK) when `context.marketRegion ∉ servesRegions`. Adapter-level for the pilot; propose folding allowlist semantics into RAOS-0001 later (TheCustomHub is the forcing case).
- **Acceptance:** unit test — region `US`/`CA` pass, `GB` → `REGION_RESTRICTED`.

### A4 · Generic projection helpers (fed by adapter output)
**Goal:** derive every agent surface from canonical objects so they can't drift.
- `buildManifest(profile) → UcpManifest` for `/.well-known/ucp`.
- `toSchemaOrgProduct(variant) → JSON-LD` (`Product`+`Offer`, availability, price, shippingDetails for US/CA).
- `toProductFeed(variants) → feed rows` (Google-format; reuses their existing feed muscle).
- **Acceptance:** snapshot tests for each projection over a sample variant.

---

## TRACK B — The Merchant (thecustomhub repo; consumes the kit)

### B1 · Extend the product model + clean data
**Files:** `src/data/products.json` (+ any TS types).
- Add fields: `callForPrice: boolean` (bulk/custom SKUs), `leadTimeDays?: number`, `shipsTo?: string[]` (default `['US','CA']`).
- Normalize: strip Shopify-style **null variant padding rows**.
- **Acceptance:** every product validates against the new shape; no null-only variants remain.

### B2 · Implement `CustomHubAdapter`
**Goal:** `products.json → canonical RAOS objects` (mechanical — model is already Shopify-shaped).
- Implement `MerchantCatalogAdapter<CustomHubProduct>` from the kit (A2).
- Mapping (see `02-spine-design.md §3` for the full table): `variant.price→basePrice`, `currency:'USD'`, `inventoryQty/inStock→inventory.{state,quantityAvailable,lowStockThreshold}`, `compareAtPrice→promo baseline`, `isCustomizable/customization→personalization metadata (still fixed-price)`, custom/bulk → `callForPrice:true`.
- `merchantProfile()`: tier + capabilities (eligibility, contextual price, inventory, quote) + endpoints + `servesRegions:['US','CA']`.
- **Acceptance:** `listVariants()` returns N normalized variants; `evaluateOffer` runs over each without throwing; a guest in `CA` is eligible, a guest in `GB` gets `REGION_RESTRICTED`.

### B3 · Serve `/.well-known/ucp`
- Cloud Function / Cloud Run handler returning `buildManifest(adapter.merchantProfile())` (A4).
- **Acceptance:** `GET /.well-known/ucp` returns the manifest JSON; `checkUcpDiscovery` (the AEO scorer) detects the extensions.

### B4 · Serve crawlable product data (schema.org)
- The SPA is client-rendered → inject `Product`+`Offer` JSON-LD via prerender or a Cloud Function per product (A4's `toSchemaOrgProduct`). Include US/CA shipping.
- **Acceptance:** product URLs expose valid JSON-LD without running the SPA.

### B5 · Cloud Run MCP server (the live Claude demo)
- Cloud **Run** (not Functions — MCP uses long-lived SSE/streaming).
- Expose: a catalog **resource** (normalized variants) + **tools** `evaluateOffer` and `issueQuote` wrapping the kit; checkout hands off to the existing Stripe `createCheckoutSession`.
- **Acceptance:** connect in Claude Desktop; "find me a [product] that ships to Canada under $X" → reasons, quotes, no dead-end; an out-of-region/oos item is declined with a reason, not a failed checkout.

### B6 · (Follow-on) Custom/bulk intent capture
- Replace the `/custom-orders → /contact` form *for agents* with a structured `callForPrice` → intent-capture → quote-request flow (RAOS-0002 `CALL_FOR_PRICE` + 0013 intent capture + 0007 quote).
- **Acceptance:** "I need 25 custom robotics-team shirts" → agent collects structured requirements → emits a quote request the merchant can act on.

---

## Suggested order
A1 → A2 → (A3, A4 parallel) → B1 → B2 → (B3, B4 parallel) → B5 → B6.

## Done-for-pilot definition
A real CustomHub catalog is agent-compliant end-to-end: discoverable (manifest + schema.org), reasoned (eligibility/price/stock/region via the kit), and transactable in Claude (MCP → Stripe) — for a US **and** a Canadian shopper — with the custom-quote path demonstrated as the differentiator.
