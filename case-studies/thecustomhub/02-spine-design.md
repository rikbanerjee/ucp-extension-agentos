# TheCustomHub — Spine-First Design

**Priority (per partner):** (1) make products **agent-compliant** — clean, structured, RAOS-shaped data; (2) build the **agentic shopping experience**; (3) custom-quote intent capture as a strong follow-on.
**Regions:** ships to **US + CA**. **Pricing: USD only** for the pilot (CAD/multi-currency = V2, deferred deliberately).

---

## 1. The engine package boundary

Extract today's reference engine (`src/lib/extensions` + `src/lib/rules` + `src/lib/types`) into one installable, **pure, deterministic** package — the reusable kit. Same code runs **embedded** (TheCustomHub Cloud Functions/Run) or **hosted** (future RetailAgentOS Cloud), identical results, because there is no I/O and `now` is injected.

**Proposed package:** `@retailagentos/engine`

```ts
// types
export type { Variant, MerchantProfile, UcpManifest, BuyerContext, DecisionRecord,
  EligibilityRules, FulfillmentConstraints, InventoryConfig, QuoteConfig } from './types';

// evaluation (pure; now injected)
export function evaluateOffer(input: {
  merchant: MerchantProfile; variant: Variant; quantity: number;
  context: PartialBuyerContext; now: number; trustEnforcement?: 'enforce'|'legacy';
}): DecisionRecord;

// quote lifecycle
export function issueQuote(record: DecisionRecord, now: number): QuoteToken;
export function validateQuote(token: QuoteToken, ctx: {...}, now: number): QuoteValidation;

// trace renderers (the human-facing payoff)
export function buildDecisionTrace(record: DecisionRecord): DecisionTrace;
export function renderBuyerTrace(t): BuyerTraceView;
export function renderMerchantTrace(t): MerchantTraceRow[];
export function renderDeveloperTrace(t): string;
```

**Rule:** importing the package self-registers the evaluators (as `src/lib/extensions/index.ts` does today). Consumers never touch the registry; they call `evaluateOffer`. Boundary contract = this surface + a pinned semver. This is what the TheCustomHub repo depends on.

---

## 2. The canonical adapter interface (the reusable contract)

Every merchant implements **one** thing: a mapping from their catalog to canonical RAOS objects. Everything else (manifest, schema.org, feed, MCP) is derived by the kit.

```ts
export interface MerchantCatalogAdapter<TSource> {
  /** The merchant manifest: tier + capabilities[] + endpoints + keys. */
  merchantProfile(): MerchantProfile;
  /** One merchant product → one or more buyable RAOS Variants (handles option matrices). */
  toVariants(source: TSource): Variant[];
  /** Convenience: the whole normalized catalog. */
  listVariants(): Variant[];
}

/** Maps an agent/session’s claims → a normalized BuyerContext (region gate lives here). */
export interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string; /* ... */ }): PartialBuyerContext;
}
```

TheCustomHub implements `MerchantCatalogAdapter<CustomHubProduct>` over `products.json`. Because their model is already Shopify-shaped, the mapping is mechanical.

---

## 3. TheCustomHub → RAOS field mapping

| products.json | RAOS `Variant` | Notes |
|---|---|---|
| `product.id` + `variant.sku` | `id`, `sku` | drop the Shopify null-padding variant rows |
| `product.title` (+ `option1..3`) | `title` | compose option labels |
| `variant.price` | `basePrice` | |
| — | `currency: 'USD'` | CAD deferred (V2) |
| `variant.compareAtPrice` | `promoPricing` baseline / `AppliedOffer` | drives "was $X" messaging |
| `variant.inventoryQty`, `product.inStock` | `inventory.{ state, quantityAvailable, lowStockThreshold }` | `inStock=false`→`out_of_stock`; qty≤threshold→`low_stock` |
| `product.category` (Google taxonomy) | category metadata | reused later by Discovery/Match (0004) |
| `product.isCustomizable` + `customization` | personalization metadata | **still fixed-price** — instant buyable |
| custom/bulk (CustomOrders flow) | `callForPrice: true` + `quoteConfig` | the follow-on intent-capture path |
| ships US+CA | region eligibility (see §4) | |

### Gaps to add to TheCustomHub's product model (co-design)
- `callForPrice: boolean` — for bulk/custom SKUs that can't be instant-priced.
- `leadTimeDays?: number` — made-to-order / personalization timing.
- `shipsTo?: string[]` — defaults to `['US','CA']` at merchant level; per-product override allowed.
- Normalize the **null variant padding** rows out of `products.json` (data hygiene).

---

## 4. Region handling (US + CA)

Model a **merchant-level served-regions allowlist** rather than the spec's current blocklist (`fulfillmentConstraints.restrictedRegions`):

- Merchant default: `servesRegions: ['US','CA']`.
- `BuyerContextResolver` sets `context.marketRegion` from the agent/session.
- Eligibility emits `REGION_RESTRICTED` (BLOCK) when `marketRegion ∉ servesRegions`.

> Minor spec note: RAOS-0001 today expresses regions as a *blocklist*. An allowlist (`servesRegions`) is cleaner for "we ship to exactly these countries." Propose adding allowlist semantics to 0001 — TheCustomHub is the forcing case. (Adapter can emulate it today; spec it properly later.)

---

## 5. The agentic shopping experience (end-to-end flow)

1. **Discover** — agent fetches `/.well-known/ucp` → sees `tier` + `capabilities[]` (eligibility, pricing, inventory, quote). Catalog available as a feed + an MCP resource.
2. **Reason** — for a candidate product the agent calls `evaluateOffer` (an MCP tool) with a `BuyerContext` (region US/CA, guest) → `DecisionRecord`: eligible? final price? in stock? ships to their country?
3. **Explain** — `renderBuyerTrace` gives the shopper plain-language status + next step; no dead-ends.
4. **Lock & buy** — buyable → `issueQuote` (price-lock) → hand off to the existing Stripe `createCheckoutSession`.
5. **(Follow-on) Custom/bulk** — `callForPrice` SKUs → intent capture: agent collects structured requirements → quote request (replaces today's `/contact` form for agents).

This is the "agentic shopping experience": the agent never recommends what it can't fulfill, always knows the real price, and can complete the buy — including for a Canadian shopper, where a naive feed would dead-end.

---

## 6. Build sequence (spine-first)

**In THIS repo (the kit):**
1. Extract `@retailagentos/engine` (package boundary §1); keep the existing app importing from it (no behavior change; 293 tests stay green).
2. Define `MerchantCatalogAdapter` + `BuyerContextResolver` interfaces (§2) in the package.

**In TheCustomHub repo (separate Claude session, consumes the kit):**
3. Implement `CustomHubAdapter` over `products.json` (§3) + add the 4 model fields (§3 gaps).
4. Cloud Function/Run: serve `/.well-known/ucp` + schema.org JSON-LD derived via the kit.
5. Cloud Run MCP server exposing the catalog resource + `evaluateOffer`/`issueQuote` tools (the live Claude demo).

## 7. Open items
- [ ] Confirm package name/namespace (`@retailagentos/engine`?) and where it's published (npm public / GitHub Packages / git dep for pilot).
- [ ] Allowlist region semantics — adapter-emulate now, spec into 0001 later.
- [ ] CAD/multi-currency — explicitly deferred (V2).
