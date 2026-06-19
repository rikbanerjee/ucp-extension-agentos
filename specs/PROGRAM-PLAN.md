# RetailAgentOS — Spec Program Plan

**Owner:** Rik Banerjee · **Status:** Living plan · **Date:** June 2026
**Companion:** the decisions in [`/questions.md`](../questions.md) are now **locked** (A1–A3, B1–B6, C toggles, D1–D3) — this plan reflects FINAL v1 scope (multi-currency and marketplace cart are **OUT → V2**, §11).
**Execution:** the waves in §8 are superseded by the work-package plan in [`MASTER-BUILD-PLAN.md`](./MASTER-BUILD-PLAN.md) (2026-06-09) — coding agents execute from there; this doc remains authoritative for the spec catalog, conformance model, and per-spec briefs. The agent-reasoning trace *format* is now **decided** (merchant ops-view · buyer simplified · developer JSON — see MASTER-BUILD-PLAN WP-08); only the concrete schema review remains.

---

## 1. North Star

> UCP gives commerce the **rails** — discovery, catalog, cart, checkout handoff.
> A retailer's **reasoning** — who may see this, who may buy it, at what price, with what
> stock, fulfillment, loyalty and policy — lives locked inside their backend and only fires at
> checkout. **RetailAgentOS is the bridge that moves that reasoning to *catalog time*, as
> machine-readable, reasoned contracts an AI agent can act on and explain.**

When an AI agent shops on a buyer's behalf, it reaches RetailAgentOS to make every decision:
*Should I show this? Can they buy it? At what price? Is it in stock? Will it ship here? Do they
earn points? Is the price I'm quoting going to hold? What's the return policy?*

**This program turns that from a 3-extension demo into a complete, conformance-tiered semantic
layer that retailers can depend on.**

---

## 2. Architecture: the bridge in layers

Every spec slots into one of six planes. Lower planes are dependencies for higher ones.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PLANE 5 · OUTCOMES & HANDOFF                                          │
│  Cart Bridge (0012) · Intent Capture (0013) · Returns/Policy (0014)   │
├──────────────────────────────────────────────────────────────────────┤
│  PLANE 4 · FULFILLMENT                                                 │
│  Fulfillment Feasibility (0003)                                        │
├──────────────────────────────────────────────────────────────────────┤
│  PLANE 3 · PRICE & VALUE                                               │
│  Contextual Pricing (0002) · Promo & Stacking (0006)                  │
│  Loyalty & Rewards (0009) · Subscriptions (0010) · Quote Lock (0007)  │
├──────────────────────────────────────────────────────────────────────┤
│  PLANE 2 · REASONING (who / what / why)                               │
│  Eligibility & Visibility (0001 ✓) · Tax & Restricted Goods (0011)    │
├──────────────────────────────────────────────────────────────────────┤
│  PLANE 1 · DISCOVERY & TRUTH                                          │
│  Discovery & Semantic Match (0004) · Inventory & Availability (0005)  │
├──────────────────────────────────────────────────────────────────────┤
│  PLANE 0 · FOUNDATION (the spine — everything depends on it)          │
│  Protocol Foundations, Context Object, Conformance Tiers (0000)       │
│  Trust, Provenance & Freshness (0008) · Privacy & Consent (0015)     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. The spec catalog

| ID | Title | Plane | Namespace (`com.os.retailagent.shopping.*`) | Status | Maps to |
|----|-------|-------|----------------------------------------|--------|---------|
| **0000** | Protocol Foundations, Context & Conformance | 0 | `core` | 🔴 new — write first | — |
| **0001** | Eligibility & Visibility Semantics | 2 | `eligibility` | 🟢 draft published | Phase 1 |
| **0002** | Contextual Pricing (member + bulk) | 3 | `member_pricing`, `bulk_pricing` | 🟡 planned | README 0002 |
| **0003** | Fulfillment Feasibility | 4 | `fulfillment_constraints` | 🟡 planned | README 0003 |
| **0004** | Discovery, Catalog Semantics & Match | 1 | `discovery`, `catalog` | 🟡 planned | README 0004 |
| **0005** | Inventory & Availability | 1 | `inventory` | 🔴 new — **gap** | — |
| **0006** | Promotional Pricing & Stacking | 3 | `promo_pricing` | 🟡 split from 0002 | — |
| **0007** | Quote Integrity & Price Lock | 3 | `quote` | 🔴 new — **must-have** | Phase 5 (partial) |
| **0008** | Trust, Provenance & Freshness | 0 | `trust` | 🔴 new — **must-have** | — |
| **0009** | Loyalty & Rewards | 3 | `loyalty` | 🟡 planned | Phase 2 |
| **0010** | Subscriptions & Recurring | 3 | `subscription` | 🔴 new — **gap** | — |
| **0011** | Tax & Restricted / Regulated Goods | 2 | `tax`, `restricted` | 🔴 new — **gap** | — |
| **0012** | Cart Bridge & Checkout Handoff | 5 | `cart_bridge` | 🟡 planned | Phase 5 |
| **0013** | Intent Capture & Assisted Commerce (+ agent-reasoning trace) | 5 | `intent_capture` | 🟡 planned · **v1 (D1)** | Phase 3 |
| **0014** | Returns & Post-Purchase Policy | 5 | `returns` | 🔴 new — **gap** | — |
| **0015** | Privacy, Consent & Identity | 0 | `identity` | 🔴 new — cross-cutting | — |

🟢 done · 🟡 planned/known · 🔴 new (this plan adds it)

---

## 4. Conformance Tiers — the "retail tier" backbone

This is what makes the platform adoptable by a one-person boutique *and* a national grocery chain.
A merchant declares a **headline tier** (a summary of maturity) BACKED BY an authoritative
**`capabilities[]`** list of the extensions it actually supports; an agent negotiates against
`capabilities[]` and knows exactly which contracts to expect — and how to **degrade gracefully**
when a capability is absent. A merchant may list an individual higher-tier capability without
claiming the full nested tier.

> **Split axis (LOCKED, B1).** *Conformance tier* is a property of the **merchant's implementation
> maturity** (the ladder below). It is orthogonal to a **buyer's loyalty tier** (gold/silver/guest),
> which is a **`BuyerContext` claim owned by RAOS-0009** — never a rung on this ladder. Tier 3 is
> named **Member-aware**: it describes what the merchant *can do* (supports member/loyalty-aware
> pricing and earn preview), **not** who the buyer is. A guest can shop a Member-aware merchant.

| Tier | Name | Adds | What the *merchant can do* | Example retailer |
|------|------|------|----------------------------|------------------|
| **0** | Discoverable | 0000, 0004, 0008 | "An agent can find and correctly read my catalog." | Any store |
| **1** | Qualified | 0001, 0005, 0011 | "No dead-end carts — only eligible, in-stock items surface." | Boutique |
| **2** | Priced | 0002, 0006, 0007 | "The right price per buyer, and it's *honored* at checkout." | Wholesale |
| **3** | Member-aware | 0009, 0010 | "Supports member/loyalty-aware pricing, earn preview, and subscriptions." | Grocery |
| **4** | Assisted | 0003, 0012, 0013, 0014 | "Full commerce — fulfillment, handoff, intent, returns." | Grocery chain |

**Maps to `/for-merchants` service tiers** (Audit → … → Managed Pilot): Audit assesses current
conformance tier; each engagement tier moves a merchant up one conformance tier. This commercial
mapping is onto **conformance only** — never onto buyer loyalty tier. *(B1 locked.)*

---

## 5. Cross-cutting "must-haves" — good → great → must

These are the things that move RetailAgentOS from *a clever demo* to *infrastructure a retailer
won't operate without*. Each is either its own spec or a mandatory section in every spec.

| # | Must-have | Why retailers can't live without it | Where it lives |
|---|-----------|-------------------------------------|----------------|
| 1 | **Quote integrity** — the quoted price is the charged price | Retailers won't let agents quote if they can't trust the number. Kills "bait-and-switch" risk + chargebacks. | RAOS-0007 |
| 2 | **Inventory truth** — never recommend what isn't there | An agent confidently selling out-of-stock is worse than not selling. | RAOS-0005 |
| 3 | **Provenance & freshness** — signed, TTL'd data | Brand safety + anti-spoofing. A stale promo or a forged catalog is a legal/PR problem. | RAOS-0008 |
| 4 | **Graceful degradation** — partial support is first-class | A Tier-1 boutique and a Tier-4 grocer use the same agents. Agents must never break on absent extensions. | RAOS-0000 (mandatory) |
| 5 | **Explainable decisions** — every block/price carries a reason | Merchant debugging + buyer trust. *(Format gated on you — questions.md D1.)* | every spec's reason registry |
| 6 | **Privacy & consent** — buyer context is PII | GDPR/CCPA. Member tier, region, purchase history are personal data. | RAOS-0015 |
| 7 | **Versioning & deprecation** — specs evolve without breaking agents | Once agents depend on a contract, you can't move it silently. | RAOS-0000 (mandatory) |
| 8 | **Determinism** — same context + rules → same result, always | Auditability, testability, trust. No model in the decision loop. | RAOS-0000 (mandatory) |

---

## 6. Per-spec sub-agent briefs

> **Each spec is one sub-agent task.** A sub-agent owns its spec end-to-end and produces the full
> **Standard Deliverable Set** (§7). Briefs below give the *delta* — goal, dependencies, scope,
> and the **edge cases that must be answered** (these are the retail traps that separate a real
> spec from a toy). Anything not listed: follow the RAOS-0001 template.

### RAOS-0000 · Protocol Foundations, Context & Conformance  `[Plane 0 · write FIRST]`
- **Goal:** the meta-spec everything else imports. Define the shared envelope and rules of the game.
- **Depends on:** nothing.
- **In scope:** the canonical **BuyerContext** object (supersedes today's `PricingContext`; carries
  the orthogonal buyer **`loyaltyTier`** claim — gold/silver/guest — owned by RAOS-0009, distinct
  from conformance tier); the **core catalog model** (Merchant → Product → Variant; **single-currency
  USD for v1** with a `currency` field designed in as a seam — real multi-currency is **V2** per
  toggle C, so don't hardcode USD assumptions but don't build conversion/i18n now; units of measure); the **conformance-tier declaration** (`/.well-known/ucp` manifest = a headline `tier`
  number BACKED BY an authoritative **`capabilities[]`** list of `namespace@version`); **capability
  negotiation against `capabilities[]`** (not the ladder, so a merchant can support a higher-tier
  capability without claiming the full nested tier); **versioning & deprecation policy** (semver per
  namespace, additive-only codes); **determinism + "most-restrictive default" rule** for unknown
  context; **error & degradation semantics** (how an agent behaves when an extension is
  missing/errors/partial).
- **Edge cases:** unknown/missing context fields → most-restrictive; merchant's headline `tier`
  outruns its `capabilities[]` (negotiate on `capabilities[]`, treat the headline as advisory);
  buyer asserts a `loyaltyTier` without a trusted token (→ guest/most-restrictive; never a tier
  rung); two extensions both assert visibility
  (precedence); protocol-version skew between agent and merchant; an extension returns an
  unrecognized reason code (forward-compat: agent must not crash, treats unknown blocking code as
  `BLOCKED`).
- **DoD extra:** every other spec's "Inputs" section references this BuyerContext, not its own copy.

### RAOS-0001 · Eligibility & Visibility  `[Plane 2 · ✓ draft published]`
- **Status:** done — reference implementation in `src/lib/rules/eligibility.ts`.
- **Remaining work (small):** resolve the 5 open questions in §9 of the spec; migrate its inline
  context object to the 0000 BuyerContext once 0000 lands; absorb `REGION_RESTRICTED` resolution
  (already implemented this session). No new sub-agent unless 0000 forces a refactor.

### RAOS-0002 · Contextual Pricing (member + bulk)  `[Plane 3]`
- **Goal:** formalize the member + bulk pricing already in `src/lib/rules/pricing.ts`.
- **Depends on:** 0000, 0001 (eligibility gates whether a price is even shown).
- **In scope:** member price, teaser/locked price for unqualified buyers, bulk tiers, MOQ, quantity
  increments; the **`ComputedPriceState`** contract and **`priceSource`** provenance; every price
  carries an explicit **`currency`** field (USD for v1) as a forward seam — **multi-currency
  conversion/rounding is V2** (toggle C), not built now.
- **Out of scope:** promo stacking (→ 0006), the honoring guarantee (→ 0007).
- **Edge cases:** member price *higher* than a bulk tier (which wins → defer to 0006 precedence);
  teaser price shown to guest must never be addable to cart; per-customer purchase limits ("limit 2");
  tier boundary exactly met (`>=` vs `>`); negative/zero quantity; USD rounding (banker's vs
  half-up — pick one, spec it; multi-currency rounding deferred to V2); price of 0 (free sample) vs "call for price".

### RAOS-0003 · Fulfillment Feasibility  `[Plane 4]`
- **Goal:** deepen today's `fulfillment_constraints` from mode/region flags into real feasibility.
- **Depends on:** 0000, 0005 (availability per location), 0001 (region → visibility/eligibility).
- **In scope:** modes (ship/pickup/local-delivery/BOPIS), delivery windows, lead times, per-region
  availability, hazmat/oversize shipping restrictions, split-shipment signaling, pickup-location model.
- **Edge cases:** item available for pickup but not shipping to buyer's region; delivery window
  buyer requested is full; lead time exceeds buyer's "need by"; partial cart fulfillable (some lines
  ship, some pickup-only); region restricted *and* fulfillment restricted (reason precedence with
  0001's `REGION_RESTRICTED`); same-day cutoff time crossed mid-session.

### RAOS-0004 · Discovery, Catalog Semantics & Match  `[Plane 1]`
- **Goal:** how an agent *finds and ranks* the right item — Sara's Boutique's real gap.
- **Depends on:** 0000 (catalog model).
- **In scope:** merchant-declared **discoverability** (keywords, categories, semantic attributes,
  intent tags); **substitution/alternates** ("out of this, suggest that"); **bundles/kits &
  configurable products**; attribute normalization (size/color/material) so agents match across
  merchants; relevance/ranking signals the merchant can expose without leaking margin.
- **Edge cases:** synonym/intent mismatch ("tee" vs "t-shirt"); a bundle where one component is
  out-of-stock or ineligible (is the bundle still buyable?); configurable product with an invalid
  option combination; duplicate SKUs across variants; agent query in a language the catalog isn't in
  (→ 0015/i18n hook); merchant wants an item *findable* but not *recommendable* (discoverability ≠
  eligibility — keep them orthogonal).

### RAOS-0005 · Inventory & Availability  `[Plane 1 · NEW · must-have]`
- **Goal:** never let an agent recommend or sell what isn't there.
- **Depends on:** 0000, 0008 (freshness/TTL is load-bearing here).
- **In scope:** real-time stock state (in-stock/low/out/backorder/preorder), per-location quantity,
  **availability freshness/TTL**, soft **reservation** semantics (does adding to cart hold stock?),
  threshold signaling ("only 3 left").
- **Edge cases:** stock changes *between* recommend and add-to-cart (the classic race); backorder
  with an ETA vs hard out-of-stock; preorder/coming-soon (visible, not yet buyable); per-location
  availability where buyer's fulfillment choice changes stock (pickup store A has it, B doesn't);
  reservation expiry; oversell protection when two agents grab the last unit; "in stock" but
  fulfillment-blocked (compose with 0003).

### RAOS-0006 · Promotional Pricing & Stacking  `[Plane 3]`
- **Goal:** the hard one — sales, coupons, mix-and-match, **and the rules for combining them**.
- **Depends on:** 0000, 0002 (base contextual price), 0009 (loyalty interacts).
- **In scope:** sale/markdown, quantity promos (BOGO, mix-and-match, "3 for $5"), coupon codes
  (single-use, expiry, min-spend), and the **stacking & exclusivity model** (`stackable`,
  `exclusive`, precedence ladder). **Model LOCKED (B4): a priority-ladder model** (merchant
  declares precedence; one path wins) **with per-offer `stackable` + `exclusive` flags** so
  best-price and exclusivity are both expressible. **Loyalty burn (0009) is applied last**, after
  the ladder resolves.
- **Edge cases:** member price + bulk tier + promo + coupon all apply — deterministic resolution and
  a *visible* explanation of which applied and which were suppressed; coupon expired mid-session;
  promo ended (freshness → 0008); mix-and-match across different SKUs; promo that *raises* effective
  price for some quantities; stacking that would price below cost (merchant floor); per-customer
  promo limits; promo on an ineligible/out-of-stock item.

### RAOS-0007 · Quote Integrity & Price Lock  `[Plane 3 · NEW · must-have]`
- **Goal:** guarantee the price the agent showed is the price charged. The retailer-trust unlock.
- **Depends on:** 0000, 0008 (signing), all pricing specs (0002/0006/0009).
- **In scope:** a **quote token** binding {variant, quantity, buyer-context-hash, resolved price,
  **currency** (USD for v1; multi-currency is V2), applied offers, **TTL**}; honor-on-checkout
  contract; what invalidates a quote (TTL expiry, stock loss, context change); re-quote flow.
- **Edge cases:** quote presented after TTL expiry; underlying promo ended but quote still valid
  (honor or re-quote? — spec the merchant's choice); buyer context changed between quote and
  checkout (tier downgraded); partial honor (price holds, stock doesn't); currency/rounding must
  match exactly between quote and charge; replay/forgery of a quote token (→ 0008 signature).

### RAOS-0008 · Trust, Provenance & Freshness  `[Plane 0 · NEW · must-have]`
- **Goal:** let an agent (and a buyer) trust that catalog/price/stock data is authentic and current.
- **Depends on:** 0000.
- **In scope:** the **signed payload envelope** (issuer, signature, key id), **freshness/TTL** on
  every computed contract, data-staleness behavior, merchant identity verification, anti-spoofing.
  *(Crypto real vs simulated = questions.md B3/D2.)*
- **Edge cases:** stale-but-served data past TTL (degrade vs refuse); signature mismatch; clock skew
  between agent and merchant; key rotation mid-session; a merchant impersonation attempt; freshness
  per-field (price fresh, inventory stale).

### RAOS-0009 · Loyalty & Rewards  `[Plane 3 · Phase 2 · conformance Tier 3 "Member-aware"]`
- **Goal:** make membership *value* legible — earn/burn preview, points, member benefits.
- **Owns the buyer `loyaltyTier` claim (B1 locked):** the buyer's gold/silver/guest standing is a
  **`BuyerContext` claim defined by this spec**, orthogonal to the conformance ladder. Supporting
  this spec is what makes a merchant **conformance Tier 3 (Member-aware)** — i.e. it describes
  *merchant capability*, not buyer identity. The two axes must never be conflated.
- **Depends on:** 0000, 0002, 0006, 0015 (account-link identity), 0008.
- **In scope:** earn preview per line/cart, point balance (available vs pending), burn/redeem
  eligibility, member benefit summaries, account-linked state.
- **Edge cases:** earn on sale/promo items (often excluded); points pending vs spendable; redeem that
  exceeds balance; redeem on an already-discounted line (stacking → 0006); account *not* linked but
  buyer claims membership (trust → 0015); points expiry; partial redemption; tier benefits that
  change mid-cart (crossed a spend threshold).

### RAOS-0010 · Subscriptions & Recurring  `[Plane 3 · NEW · gap]`
- **Goal:** subscribe-and-save, recurring orders — huge for grocery + DTC.
- **Depends on:** 0000, 0002, 0007 (recurring price lock).
- **In scope:** subscription price vs one-time price, first-order discount, cadence (weekly/monthly),
  skip/pause/cancel semantics, recurring eligibility.
- **Edge cases:** first-order promo vs ongoing price divergence; price change between cycles (honor
  vs notify); item discontinued mid-subscription (substitute → 0004); skip after cutoff; proration;
  subscription of an age-restricted/regulated good (re-verify each cycle → 0011).

### RAOS-0011 · Tax & Restricted / Regulated Goods  `[Plane 2 · NEW · gap]`
- **Goal:** the *eligibility* side of tax & regulation (computation defers to checkout — see B5).
- **Depends on:** 0000, 0001 (extends eligibility), 0015 (age/identity).
- **In scope:** `taxTreatment` signal (inclusive/exclusive/exempt), tax-exempt buyer + resale cert
  (already partly in 0001), **restricted-goods eligibility** (age-restricted, region-legal,
  pharmacy/regulated), **purchase limits** (per-order/per-customer), the reason codes for each.
- **Edge cases:** alcohol legal in buyer's region but not shippable there; age unknown → most
  restrictive; tax-inclusive (EU) vs exclusive (US) display so agent quotes correctly; tax holiday;
  purchase-limit exceeded; resale-cert exemption interacting with promo; a regulated item visible but
  not shippable (compose 0001/0003); buyer claims tax-exempt without proof (→ 0015 trust).

### RAOS-0012 · Cart Bridge & Checkout Handoff  `[Plane 5 · Phase 5]`
- **Goal:** serialize the agent-built cart and hand off to the merchant's real checkout, intact.
- **Depends on:** 0000, 0007 (carry quote tokens), all of Plane 3.
- **In scope:** cart-state serialization, line-item quote-token carriage, handoff contract to UCP
  checkout, payment-handoff boundary (what RAOS carries vs what checkout owns).
- **Edge cases:** quote expired at handoff (re-quote vs reject); stock lost between cart and checkout;
  context changed at handoff; partial cart valid (proceed with subset?); idempotency of handoff
  (double-submit); applied offers/loyalty must survive serialization exactly.

### RAOS-0013 · Intent Capture & Assisted Commerce (+ agent-reasoning trace)  `[Plane 5 · v1 (D1)]`
- **Goal:** when checkout *isn't* the outcome — capture the lead instead of a dead end — **and**
  carry the agent-reasoning / explainability trace that explains every decision.
- **Status (D1 locked):** **v1**, not Phase 3 backlog. The trace is **per-audience**: a
  **merchant** business/ops-actionable view (why an item was blocked, what to fix), a **buyer**
  simplified plain-language "why," and a **developer** machine-readable JSON decision log. All three
  draw on the same substrate — the ordered list of `ReasonEntry` values with `source` namespaces
  (RAOS-0000 §8).
- **Depends on:** 0000, 0001 (blocked → capture path), 0015 (consent for contact).
- **In scope:** out-of-stock notify-me, B2B quote request / negotiation handoff, WhatsApp/lead-form
  routing, assisted-sales callback, the **agent action vocabulary** for non-checkout outcomes; the
  **per-audience trace surfaces** (merchant ops / buyer simplified / developer JSON).
- **Edge cases:** consent required before capturing contact info (→ 0015); routing when merchant
  supports no capture channel; duplicate lead suppression; capturing intent on a *blocked* item with
  a resolvable path (offer the path *and* capture); spam/abuse of notify-me.
- **⛔ GATED — trace *format* is NOT designed here.** D1 confirms 0013 (incl. the trace) is v1 and
  fixes the *audiences*, but the trace **schema / narration style / structure** is a **separate
  gated step** — do **not** design or implement it without explicit user sign-off (memory + §10).

### RAOS-0014 · Returns & Post-Purchase Policy  `[Plane 5 · NEW · gap]`
- **Goal:** agents must communicate return/warranty terms *before* purchase, or buyers revolt.
- **Depends on:** 0000.
- **In scope:** return window, final-sale flags, restocking fees, who-pays-return-shipping, warranty
  terms, exchange vs refund — all machine-readable at catalog time.
- **Edge cases:** final-sale item in a cart with returnable items (mixed policy display); promo/clearance
  often final-sale (compose 0006); region-specific statutory return rights (EU 14-day); restocking fee
  disclosure threshold; warranty registration requirement.

### RAOS-0015 · Privacy, Consent & Identity  `[Plane 0 · NEW · cross-cutting]`
- **Goal:** buyer context is PII — handle it lawfully and establish *trusted* identity.
- **Depends on:** 0000.
- **In scope:** consent model for using buyer context, PII minimization in payloads, account-linking
  trust (how a "wholesale/gold member" claim is verified → underpins 0002/0009/0011), data-retention
  signals, right-to-be-forgotten hooks.
- **Edge cases:** agent passes more PII than needed (minimization); buyer claims a tier without a
  trusted token (default to guest/most-restrictive); consent withdrawn mid-session; jurisdiction-
  specific consent (GDPR vs CCPA); pseudonymous vs authenticated buyer.

---

## 7. Standard Deliverable Set (every spec sub-agent produces ALL of these)

Consistency is the product. Each spec ships:

1. **`specs/00NN-<name>.md`** — following the **RAOS-0001 template exactly**: Abstract · Motivation/gap ·
   Scope (in/out) · Inputs (referencing 0000 BuyerContext) · Outputs (computed contracts) · **Reason-code
   registry** · Deterministic evaluation algorithm · **Worked examples across all 3 archetypes** ·
   **Open Questions / RFC** · "why this spec." Status: Draft · RFC.
2. **TypeScript types** in `src/lib/types/` (extend `extensions.ts` / `core.ts`).
3. **Reference implementation** — pure, deterministic functions in `src/lib/rules/` (the spec is real
   only if the Playground can run it).
4. **Playground wiring** — the new contract visible in `/demo` (business + technical view).
5. **On-site spec page** — `src/app/specs/00NN-<name>/page.tsx` (clone the 0001 page pattern: header,
   view toggle, reason registry table, worked examples, open questions) + a row in the `/specs` index +
   a row in `specs/README.md`'s table.
6. **Conformance mapping** — declare which **Tier** this spec belongs to and update merchant mock
   manifests (`src/lib/mock/merchants.ts`) for the archetypes that support it.
7. **Mock data** — extend `src/lib/mock/catalog.ts` with variants exercising every reason code and edge case.

---

## 8. Execution waves (dependency-ordered)

> Paced to the public build-log cadence — **ship fast and learn** (D3, locked). Each wave is gated by
> its predecessor's Plane-0/1 dependencies.

**Wave 0 — Foundation (unblocks everything).** Sequential, do first.
- `0000` Foundations & Conformance → then in parallel: `0008` Trust/Provenance, `0015` Privacy/Identity.
- Retro-fit `0001` onto the 0000 BuyerContext.

**Wave 1 — Truth & Discovery.** Parallelizable after Wave 0.
- `0005` Inventory · `0004` Discovery/Catalog · `0011` Tax & Restricted.

**Wave 2 — Price & Value.** After 0002 base lands, the rest parallelize.
- `0002` Contextual Pricing → then `0006` Promo/Stacking, `0007` Quote Lock (parallel) → `0009` Loyalty, `0010` Subscriptions.

**Wave 3 — Fulfillment.**
- `0003` Fulfillment Feasibility (needs 0005).

**Wave 4 — Outcomes & Handoff.**
- `0012` Cart Bridge · `0013` Intent Capture · `0014` Returns.

**v1 cut line (LOCKED, questions.md A2).** v1 is **spec-complete** for exactly six specs:
`0000` Foundations · `0001` Eligibility (done) · `0002` Contextual Pricing · `0005` Inventory ·
`0007` Quote Integrity · `0008` Trust/Provenance. **Everything else is backlog** until v1 proves
the spine. Note this set spans Wave 0 (`0000`, `0008`), Wave 1 (`0005`), and Wave 2 (`0002`, `0007`),
with `0001` already published — the waves below still run in dependency order; the cut line just marks
which of their outputs must ship in the ~8–10 week v1 window.

**Plus, in v1 by separate decisions:**
- **`0013`** Intent Capture **+ the per-audience agent-reasoning trace** is **v1** by D1 (the trace
  *format* stays gated — §6 brief, §10). This is the one v1 item outside the A2 six.

**Explicitly deferred to V2 (toggle C):**
- **Multi-currency / i18n** — v1 stays **single-currency USD**; design the `currency` field as a
  seam only. See `specs/TODO.md`.
- **Cross-merchant / marketplace cart** — v1 is **single-merchant**; marketplace cart is V2. See `specs/TODO.md`.

---

## 9. Definition of Done (program-level quality bar)

A spec is "done" (Draft·RFC ready to publish) when:
- [ ] All 7 items in the Standard Deliverable Set exist and the Playground runs the reference impl.
- [ ] `npm run build` passes (TypeScript clean) — heed the AGENTS.md note: this is **Next.js 16**,
      read `node_modules/next/dist/docs/` before touching routing/pages.
- [ ] Every reason code in the registry is exercised by at least one mock variant and one worked example.
- [ ] Determinism: same BuyerContext + same rules → identical output (no nondeterminism, no model in loop).
- [ ] Graceful degradation: documented agent behavior when this extension is absent or errors.
- [ ] Every "Edge case" listed in the brief is either handled in the algorithm or moved to Open Questions.
- [ ] Conformance tier declared and merchant manifests updated.
- [ ] Cross-links: `[[related-spec]]` references resolve; `/specs` index + `specs/README.md` updated.

---

## 10. Risks & gated decisions

- **Agent-reasoning trace: scope is v1, *format* is still GATED (D1).** D1 locks RAOS-0013 (incl. the
  trace) into **v1** and fixes the three audiences (merchant ops-actionable · buyer simplified ·
  developer JSON). It does **not** unlock the trace **schema/format** — that remains a separate gated
  step (memory + questions.md D1). No sub-agent designs or builds the trace format without explicit
  user sign-off.
- **Real vs simulated endpoint (D2) — LOCKED.** MCP stays **simulated**; 0007/0008 design the
  *contract* now and the real MCP server + transport (and real crypto) is the **next step once specs
  are finalized**. Tracked in [`specs/TODO.md`](./TODO.md) ("Real MCP endpoint").
- **Stacking precedence (B4) — LOCKED.** Priority-ladder model + per-offer `stackable`/`exclusive`
  flags; loyalty burn applied last. 0006 is unblocked on this decision.
- **Upstream-UCP intent (A1) — LOCKED.** Write **vendor-neutral as UCP upstream candidates**; the
  reference namespace is **`com.os.retailagent.shopping.*`** (never `ezyupload.*`). Each spec flags
  "proposed for UCP core." This is the established voice throughout this plan.

---

## 11. Scope toggles — locked (questions.md C)

All Section-C **spec** toggles are **IN**: `0005` Inventory, `0009` Loyalty, `0010` Subscriptions,
`0011` Tax & Restricted, `0012` Cart Bridge, `0013` Intent Capture, `0014` Returns, `0015` Privacy,
and Bundles/kits (within `0004`). The two non-spec toggles are both **OUT of v1 → V2** (decided 2026-06-07):

- **Multi-currency / i18n — OUT of v1 → V2.** v1 stays **single-currency USD**. Keep a `currency`
  field on the catalog/price model (`0000`), `ComputedPriceState` (`0002`), and the quote token
  (`0007`) as a **forward seam** — but no conversion, no per-currency rounding, no i18n now. See `specs/TODO.md`.
- **Cross-merchant / marketplace cart — OUT of v1 → V2.** v1 is **single-merchant** cart only.
  Marketplace / cross-merchant cart is deferred to V2; flag as future in cart-bridge work (`0012`). See `specs/TODO.md`.

---

*This plan executes on the **locked** answers in `/questions.md` (A1–A3, B1–B6, C toggles, D1–D3).
Multi-currency and marketplace cart are **OUT → V2** (§11, `specs/TODO.md`). The only open item is
the gated agent-reasoning trace *format* (§10).*
