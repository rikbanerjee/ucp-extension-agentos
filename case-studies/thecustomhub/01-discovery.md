# TheCustomHub — Discovery Findings (spine-first)

_Read-only pass of the sibling repo `~/code/thecustomhub` on 2026-06-23. No secrets opened._

## Stack (as-is)
- **Vite + React 19 SPA** (client-rendered; not Next.js, no SSR/prerender detected).
- **Firebase:** Hosting, Storage (product images), Cloud Functions v2.
- **Checkout:** Stripe via Cloud Function `createCheckoutSession` (`onCall`, secret-guarded).
- **Catalog:** a **static bundled `src/data/products.json`** (59 products) — NOT Firestore. This is the source of truth for the buyer path.
- **Already multi-channel:** products carry `marketplace.amazon: "active"`, `walmartData`, and the repo has Walmart upload spreadsheets/CSV. They already export their catalog to Amazon/Walmart.

## Product model (`products.json`)
```
{ id, title, vendor, category (Google product taxonomy string), type,
  price?, description, isCustomizable, customization{type,label,instructions},
  images[], inStock, tags[], marketplace{...}, walmartData, variants[],
  externalLinks, specifications }
```
**Variant model (Shopify-shaped):**
```
{ sku, option1, option2, option3, price, compareAtPrice, inventoryQty, variantImg }
```
- Pricing/stock live in **variants** (57/59 use variants; top-level `price` only 2/59).
- `inventoryQty` present (e.g. 20); `inStock` boolean is the headline availability signal.
- `category` already uses Google taxonomy strings — feed-friendly.
- Note: variant arrays contain Shopify-style **null padding rows** (data hygiene to handle in the adapter).

## Two commerce modes (this is the key insight)
1. **Catalog products** — fixed price, variants, `inStock`, Stripe checkout. Agents can transact these directly. → maps to eligibility / contextual price / inventory / quote (price-lock).
2. **Custom / bulk orders** — the `/custom-orders` page funnels to a **"Get a Free Quote"** contact form (`/contact`) for group/bulk custom apparel (sports teams, clubs, events). Today it's a human contact flow (contact form + WhatsApp/email).
   → This is the **call-for-price → intent-capture → quote** path (RAOS-0002 `CALL_FOR_PRICE` + 0013 intent capture + 0007 quote). **This is the differentiator demo** — an agent handling "I need 25 custom robotics-team shirts" with structured requirement capture, which generic instant-checkout (ACP) cannot do.

## Gaps to fill in the model (co-design)
- No `leadTime` / made-to-order timing (custom items need it).
- No explicit `callForPrice` flag (bulk/custom = call for price).
- No region/eligibility fields (shipping scope unconfirmed — likely US).
- Variant null-padding rows need normalizing.
- **SPA SEO limitation:** client-rendered, so schema.org JSON-LD / crawlable product data needs a prerender or a Cloud Function projection (agents/crawlers won't run the SPA reliably).

## Why this merchant is a strong reference
They already think in **"project the catalog to many channels"** (Amazon, Walmart). RetailAgentOS is simply the next channel — *AI agents* — derived from the same source. The framing writes itself: "you already feed Amazon and Walmart; here's how you become readable to Claude and ChatGPT — and unlike a marketplace feed, it can also handle your custom-quote business."

## Proposed spine-first design (next)
- Extract the RetailAgentOS engine (`src/lib/extensions` + `rules` + `types`) into a publishable package with an embeddable/hostable boundary.
- Define the canonical **adapter interface**: `TheCustomHub products.json → canonical RAOS objects`. Straightforward because the model is already Shopify-shaped.
- Two projections to prove value first: `/.well-known/ucp` manifest + schema.org JSON-LD, both derived from `products.json` via the kit (served from a Cloud Function / Cloud Run).
- Then the scoped MCP server (Cloud Run) for the live Claude demo, featuring BOTH modes — catalog buy + custom-quote intent capture.

## Open confirmations needed
- [ ] Shipping region scope (US-only? international?) → eligibility/region semantics.
- [ ] Is featuring the **custom-quote intent-capture** flow as the headline differentiator the right call for the case study?
