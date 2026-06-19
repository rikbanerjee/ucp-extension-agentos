# RAOS-0002 · Contextual Pricing (Member + Bulk)

**Extension namespaces:**
- `com.os.retailagent.shopping.member_pricing`
- `com.os.retailagent.shopping.bulk_pricing`

**Status:** Draft · Request for Comment
**Version:** 1.0.0
**Conformance Tier:** 2 · Priced
**Plane:** 3 · Price & Value
**Layer:** RetailAgentOS extension on top of UCP (Universal Commerce Protocol)
**Reference implementation:** [`src/lib/rules/pricing.ts`](../src/lib/rules/pricing.ts) — runnable in the [Playground](../src/app/demo/page.tsx)
**Author:** Rik Banerjee · rikbanerjee007@gmail.com
**Depends on:** RAOS-0000 (BuyerContext, ReasonEntry, determinism), RAOS-0001 (eligibility gates access before price is shown)

> This is an open draft. The point is to be argued with. If a reason code, a status,
> or a field is wrong, that's the most useful thing you can tell me. See §9.

---

## 1. Abstract

This spec defines how a merchant declares **contextual pricing** — price values that vary by
buyer identity and order quantity — and how an agent computes the applicable price at
catalog time, before a cart is built. It produces a `ComputedPriceState` contract: a single
unit price with full provenance (which offers applied, which were suppressed, and why).

The defining feature is **offer transparency**. A price is not just a number. Every applied
discount carries a structured `AppliedOffer` record; every evaluated-but-superseded discount
appears in `suppressedOffers[]` with the reason it lost. An agent can therefore show a buyer
exactly why their price is $X, not just state it.

Two pricing namespaces ship in this spec:
- **`…member_pricing`** — member prices, teaser prices, and per-customer purchase limits.
- **`…bulk_pricing`** — MOQ enforcement, quantity increments, and volume tiers.

Promotional pricing (sale markdowns, coupons, BOGO) is **out of scope** — it belongs to
RAOS-0006 (Promo & Stacking). This spec provides the forward-compatible `AppliedOffer` shape
that RAOS-0006 and RAOS-0007 (Quote Integrity) will bind.

---

## 2. Motivation — the gap this closes

UCP carries a catalog price. It does not carry **who gets what price**. Today that logic fires
at checkout. The result when an AI agent is shopping:

- A gold member is quoted the public price because the agent doesn't know member prices are
  available.
- A wholesale buyer orders below MOQ and hits a wall at checkout with no explanation.
- A guest sees an item they cannot add but no teaser explaining how to qualify.
- An agent quotes a price that was correct one moment but doesn't know which offers were
  stacked — the quote token can't bind what it can't see.

The core idea: **move price reasoning from checkout-time to catalog-time, with machine-readable
offer records attached.**

---

## 3. Scope

**In scope:**
- Member pricing (per tier, per buyer identity)
- Teaser prices for unqualified buyers (display-only — addability is RAOS-0001's job)
- Bulk volume tiers, MOQ enforcement, quantity increment validation
- Per-order purchase limits (`purchaseLimit`)
- `callForPrice` — price must be requested (intent capture, RAOS-0013)
- `basePrice: 0` — valid free price (distinct from `callForPrice`)
- Rounding policy (half-up to cents, USD-only in v1)
- The `AppliedOffer` / `SuppressedOffer` shape as a forward-compatible container for RAOS-0006/0007
- Structured reason codes for every pricing decision

**Out of scope:**
- Promotional pricing, sale markdowns, coupons, BOGO — RAOS-0006
- The honoring guarantee — RAOS-0007 (Quote Integrity & Price Lock)
- Multi-currency rounding — V2 (toggle C, single-currency USD in v1)
- Stacking rules and precedence ladder — RAOS-0006 (resolves Open Question §9.1)
- Loyalty earn/burn preview — RAOS-0009

---

## 4. Inputs

### 4.1 Variant config (merchant-declared)

```json
{
  "memberPricing": {
    "available": true,
    "memberPrice": 28.00,          // price for qualified members
    "teaserPrice": 28.00,          // display-only price for unqualified buyers
    "requiredTier": "gold",        // minimum membershipTier to qualify
    "purchaseLimit": 2             // max units at this price per order (optional)
  },
  "bulkPricing": {
    "available": true,
    "moq": 10,                     // minimum order quantity (hard block if violated)
    "quantityIncrement": 5,        // quantity must be a multiple of this
    "purchaseLimit": 500,          // max units per order (optional)
    "tiers": [
      { "minQuantity": 10, "maxQuantity": 49, "price": 380.00 },
      { "minQuantity": 50, "maxQuantity": 99, "price": 350.00 },
      { "minQuantity": 100, "price": 310.00 }
    ]
  },
  "callForPrice": true             // when true, price must be requested (RAOS-0013)
}
```

All fields are optional. A variant with no pricing config uses `basePrice` for all buyers.

`basePrice: 0` is a valid free price and does NOT trigger `callForPrice`.

### 4.2 Buyer context (RAOS-0000 §4)

This spec reads from the canonical `BuyerContext`:
- `customerType` — guest/member/wholesale/b2b (gates member pricing access)
- `membershipTier` — 'none' | 'gold' | 'reseller_plus' | 'distributor' (tier comparison for `requiredTier`)

Full `BuyerContext` shape: see RAOS-0000 §4.

### 4.3 Quantity

An integer representing the requested cart-line quantity. Passed as a separate input by the
pipeline (not part of `BuyerContext`). Zero or negative quantities → `BELOW_MOQ` (BLOCK).

---

## 5. Outputs — the contracts agents consume

### 5.1 `ComputedPriceState` (v2)

```typescript
interface ComputedPriceState {
  unitPrice: number;            // final price in dollars — half-up rounded to cents
  currency: 'USD' | string;    // always 'USD' in v1 (seam for V2 multi-currency)
  priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';
  appliedOffers: AppliedOffer[];
  suppressedOffers: SuppressedOffer[];
  teaser?: { message: string; price: number };  // display-only for unqualified buyers

  // @deprecated — one minor, use appliedOffers instead
  appliedOfferState?: string;   // description of last applied offer
  isMemberPrice: boolean;       // true when appliedOffers has a 'member' entry
  appliedTier?: PriceTier | PromoTier;
}
```

### 5.2 `AppliedOffer` — the load-bearing forward shape

**This shape is the contract RAOS-0006 (stacking ladder) and RAOS-0007 (quote token) bind.
Do not bikeshed it after shipping — field additions are additive per RAOS-0000 §7.4.**

```typescript
interface AppliedOffer {
  offerId: string;           // stable, deterministic identifier for this offer
  type: 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier' | string; // extensible
  namespace: string;         // owning namespace (trace attribution)
  priority: number;          // evaluation order within the stacking ladder (RAOS-0006)
  stackable: boolean;        // whether this offer can combine with others
  exclusive: boolean;        // whether this offer seals the stacking set
  unitPriceAfter: number;    // unit price after this offer applied
  description: string;       // human-readable offer description
}
```

`type` is an extensible string union — consumers must not crash on unknown values.
RAOS-0006 will add 'promo_sale' and 'promo_tier'; RAOS-0002 emits 'member' and 'bulk_tier'.

Priority values in this spec: member = 10, bulk = 20, promo = 30.
RAOS-0006 makes `stackable`/`exclusive` live; RAOS-0002 sets both to `false`.

### 5.3 `SuppressedOffer`

```typescript
interface SuppressedOffer extends Omit<AppliedOffer, 'unitPriceAfter'> {
  suppressedBy: string;   // offerId of the winning offer
  reason: string;         // machine-readable suppression reason
}
```

### 5.4 Reason entries (RAOS-0000 §8)

The pricing stage emits `ReasonEntry` values alongside the price state. Agents read these
to understand why the price is what it is; the Playground surfaces them in the price breakdown.

---

## 6. Reason code registry

| Code | Namespace | Severity | Resolvable | Description |
|------|-----------|----------|------------|-------------|
| `MEMBER_PRICE_APPLIED` | `…member_pricing` | INFO | — | Member pricing applied to this buyer. |
| `TEASER_LOCKED` | `…member_pricing` | CONDITION | Upgrade tier | Guest/unqualified buyer sees a teaser price but cannot add. Addability is RAOS-0001's concern — this code signals the teaser display path. |
| `BULK_TIER_APPLIED` | `…bulk_pricing` | INFO | — | A volume tier was matched and applied. |
| `BELOW_MOQ` | `…bulk_pricing` | BLOCK | Increase quantity | Quantity is below the minimum order quantity. Cannot proceed. |
| `QUANTITY_INCREMENT_MISMATCH` | `…bulk_pricing` | BLOCK | Adjust quantity | Quantity is not a multiple of the required increment. |
| `PURCHASE_LIMIT_EXCEEDED` | `…member_pricing` / `…bulk_pricing` | BLOCK | Reduce quantity | Quantity exceeds the per-order purchase limit for this pricing config. |
| `CALL_FOR_PRICE` | `…member_pricing` | CONDITION | Submit intent capture | Price is not published — must be requested. Resolution: RAOS-0013 intent capture. |

**Notes:**
- `BELOW_MOQ` and `QUANTITY_INCREMENT_MISMATCH` were previously surfaced as UI message strings
  in `cartValidation.ts`. As of v1.0.0 they are lifted to `ReasonEntry` codes emitted by the
  pricing stage; the UI messages are derived from the reason entry's `.message` field for
  backward compat.
- `PURCHASE_LIMIT_EXCEEDED` is owned by this spec for the generic per-order limit. Regulated-
  goods per-customer limits are owned by RAOS-0011.
- RAOS-0006 will add suppression-specific codes (`OFFER_SUPPRESSED_BY_PRIORITY`,
  `OFFER_NOT_STACKABLE`, `FLOOR_PRICE_PROTECTED`, etc.) to the `SuppressedOffer.reason` vocabulary.

---

## 7. Deterministic evaluation algorithm

```
Given: variant, quantity, context (BuyerContext), now (injected — not used in this spec)

1. REJECT invalid quantity (≤ 0):
   emit BELOW_MOQ (BLOCK), return unitPrice=0.

2. CHECK callForPrice:
   if variant.callForPrice === true:
     emit CALL_FOR_PRICE (CONDITION), return unitPrice=0, appliedOffers=[].
   Note: basePrice=0 does NOT trigger this path.

3. START with unitPrice = roundHalfUp(variant.basePrice), priceSource = 'base'.

4. MEMBER PRICING (priority 10) — if variant.memberPricing.available:
   a. If buyer qualifies (customerType !== 'guest' AND membershipTier >= requiredTier):
      - If memberPrice is set: apply memberPrice, add AppliedOffer{type:'member', priority:10}.
      - Emit MEMBER_PRICE_APPLIED (INFO).
      - If purchaseLimit set AND quantity > purchaseLimit: emit PURCHASE_LIMIT_EXCEEDED (BLOCK).
   b. Else if teaserPrice and requiredTier are set:
      - Emit TEASER_LOCKED (CONDITION) with requirements[{type:'membership_tier', value:requiredTier}].
      - Set priceState.teaser = { message, price }. unitPrice is NOT changed.

5. BULK PRICING (priority 20) — if variant.bulkPricing.available:
   a. If quantity < moq: emit BELOW_MOQ (BLOCK).
   b. If quantity % quantityIncrement ≠ 0: emit QUANTITY_INCREMENT_MISMATCH (BLOCK).
   c. If purchaseLimit set AND quantity > purchaseLimit: emit PURCHASE_LIMIT_EXCEEDED (BLOCK).
   d. Find the highest applicable tier where quantity >= tier.minQuantity (and <= tier.maxQuantity
      if set). Tier boundary is INCLUSIVE: quantity >= minQuantity qualifies.
   e. If a tier matches:
      - Suppress any prior AppliedOffer (move to suppressedOffers with reason 'SUPERSEDED_BY_BULK_TIER').
      - Apply tier price, add AppliedOffer{type:'bulk_tier', priority:20}.
      - Emit BULK_TIER_APPLIED (INFO).

6. PROMO PRICING (priority 30) — owned by RAOS-0006; evaluated here for WP-02 back-compat:
   a. If salePrice set: suppress prior offer, apply salePrice.
   b. If promo tiers and quantity meets a threshold: suppress prior offer, apply promo tier price.
   NOTE: RAOS-0006 will take over this phase and introduce the full stacking ladder.

7. ROUND all applied prices via roundHalfUp (half-up to cents, IEEE-754-safe).

8. BUILD deprecated compat fields:
   - isMemberPrice = appliedOffers.some(o => o.type === 'member')
   - appliedOfferState = appliedOffers[last].description (or undefined)
   - appliedTier = raw tier object for the last applied tier offer

9. RETURN ComputedPriceState.
```

**Rounding policy:** half-up to cents, USD-only in v1. Implementation uses the IEEE-754-safe
formula `Math.round((price + Number.EPSILON) * 100) / 100` to avoid the well-known
`1.005 * 100 = 100.4999...` binary representation trap. Multi-currency rounding is V2.

**Determinism:** Same (variant, quantity, context) → same output. No `Date.now()`,
`Math.random()`, `fetch()`, or `new Date()` inside `src/lib/rules/pricing.ts`.

---

## 8. Worked examples — all three archetypes

### 8.1 Sara's Boutique — member teaser (DTC)

**Variant:** Exclusive Member Tote, `basePrice: 42.00`, `memberPricing.memberPrice: 28.00`, `requiredTier: 'gold'`, `teaserPrice: 28.00`

| Buyer | qty | unitPrice | priceSource | Reasons emitted |
|-------|-----|-----------|-------------|-----------------|
| Guest | 1 | 42.00 | base | TEASER_LOCKED (CONDITION) — teaser shows $28.00, but cannot add |
| Member / gold | 1 | 28.00 | member | MEMBER_PRICE_APPLIED (INFO) |
| Member / none (below tier) | 1 | 42.00 | base | TEASER_LOCKED (CONDITION) |

**agent behavior note:** When `TEASER_LOCKED` fires, the agent shows the teaser price as context
("Gold members get this for $28") but does NOT attempt to add to cart. Cart-add is blocked by
RAOS-0001 eligibility, not by this spec.

---

### 8.2 Atlas Wholesale — MOQ + tier boundary (B2B)

**Variant:** Industrial Coffee Beans 50lb Case, `basePrice: 400.00`, `bulkPricing.moq: 10`, `quantityIncrement: 5`, `tiers: [10→$380, 50→$350, 100→$310]`

| Buyer | qty | unitPrice | priceSource | Reasons emitted |
|-------|-----|-----------|-------------|-----------------|
| Wholesale | 5 | 400.00 | base | BELOW_MOQ (BLOCK, min=10) |
| Wholesale | 7 | 400.00 | base | BELOW_MOQ (BLOCK, min=10) + QUANTITY_INCREMENT_MISMATCH (BLOCK, incr=5) |
| Wholesale | 10 | 380.00 | bulk_tier | BULK_TIER_APPLIED (INFO) — tier boundary exactly met |
| Wholesale | 49 | 380.00 | bulk_tier | BULK_TIER_APPLIED (INFO) — still within 10–49 band |
| Wholesale | 50 | 350.00 | bulk_tier | BULK_TIER_APPLIED (INFO) — next tier boundary exactly met |
| Wholesale | 100 | 310.00 | bulk_tier | BULK_TIER_APPLIED (INFO) |

**Tier boundary semantics:** `quantity >= minQuantity` — inclusive at both ends. A buyer ordering
exactly 10 qualifies for the 10+ tier; exactly 50 qualifies for the 50+ tier.

---

### 8.3 Atlas Wholesale — member-vs-bulk last-wins conflict (B2B)

**Variant:** Paper Cups, `basePrice: 65.00`, `memberPricing.memberPrice: 58.00 (requiredTier: gold)`, `bulkPricing.moq: 10, tiers: [10–29→$60, 30+→$48]`

| Buyer | qty | unitPrice | priceSource | suppressedOffers | Notes |
|-------|-----|-----------|-------------|-----------------|-------|
| Wholesale/gold | 1 | 65.00 | base | — | below MOQ, member threshold met but bulk doesn't run |
| Wholesale/gold | 10 | 60.00 | bulk_tier | member ($58) | Bulk ($60) runs second and WINS even though member price ($58) was lower. Last-wins documented behavior — see §9.1. |
| Wholesale/gold | 30 | 48.00 | bulk_tier | member ($58) | Bulk correctly undercuts member here |
| Wholesale/none | 10 | 60.00 | bulk_tier | — | No member pricing (tier not met) |

**Open Question §9.1:** Should bulk win when its price is HIGHER than the member price?
Today's last-wins semantics say yes. Final precedence (best-for-buyer) is deferred to the
RAOS-0006 stacking ladder.

---

### 8.4 Fresh Corner Market — member price with rounding (Grocery)

**Variant:** Organic Whole Milk, `basePrice: 4.99`, `memberPricing.memberPrice: 3.995 (requiredTier: gold)`

| Buyer | qty | unitPrice | priceSource | Notes |
|-------|-----|-----------|-------------|-------|
| Guest | 1 | 4.99 | base | |
| Member/gold | 1 | **4.00** | member | $3.995 → $4.00 (half-up rounding) |

The rounding formula `Math.round((3.995 + Number.EPSILON) * 100) / 100 = 4.00` produces the
correct half-up result despite IEEE-754 floating-point binary representation.

---

### 8.5 Sara's Boutique — purchase limit (DTC)

**Variant:** Limited Drop Sneakers, `memberPricing.memberPrice: 150.00, requiredTier: gold, purchaseLimit: 2`

| Buyer | qty | valid | Reasons |
|-------|-----|-------|---------|
| Member/gold | 1 | yes | MEMBER_PRICE_APPLIED (INFO) |
| Member/gold | 2 | yes | MEMBER_PRICE_APPLIED (INFO) — at limit |
| Member/gold | 3 | no | MEMBER_PRICE_APPLIED (INFO) + PURCHASE_LIMIT_EXCEEDED (BLOCK) |

---

### 8.6 Sara's Boutique — free sample and call-for-price (DTC)

**Free sample** (`basePrice: 0`, no `callForPrice`):
- `unitPrice: 0`, `priceSource: 'base'`, no reason codes.
- This is a valid $0 price. Do NOT conflate with call-for-price.

**Call-for-price bespoke print** (`callForPrice: true`, `basePrice: 0`):
- Emits `CALL_FOR_PRICE` (CONDITION), `unitPrice: 0`.
- Resolution: agent routes buyer to intent capture (RAOS-0013 forward-ref).
- Agent must NOT display "$0" — it should display "Price on request."

---

## 9. Open Questions — Request for Comment

### 9.1 Member price higher than bulk tier: last-wins or best-for-buyer?

**Background:** In today's last-wins implementation, bulk tier always overrides member price
when the quantity threshold is met — even when the bulk price is *higher* than the member
price (see §8.3). This is the behavior inherited from the pre-WP-04 `pricing.ts`.

**Options:**
- A. Keep last-wins forever. Simple. Predictable. Merchant should design their pricing so
  bulk never exceeds member at the same tier.
- B. Best-for-buyer at each step: if bulk > member, keep member (and vice versa).
- C. Defer entirely to the RAOS-0006 stacking ladder: member and bulk become named ladder
  entries with declared priorities; the merchant sets the ladder.

**Resolution:** Option C is the natural extension point — RAOS-0006 will make member/bulk
ladder positions merchant-configurable. Until then, last-wins is documented behavior.
Final precedence resolution → Open Question for RAOS-0006.

### 9.2 `callForPrice` and eligibility interaction

When `callForPrice: true`, the pricing stage emits `CALL_FOR_PRICE` (CONDITION). But
eligibility (RAOS-0001) runs first. Should eligibility also signal call-for-price, or is it
strictly the pricing stage's concern? Currently it is pricing-only.

### 9.3 `purchaseLimit` scope: per-order vs per-customer

This spec defines `purchaseLimit` as a per-order (cart) limit, not a cumulative per-customer
limit across multiple orders. A per-customer enforcement would require session/order history —
that belongs with RAOS-0011 (regulated goods) which owns identity-linked purchase history.
Is the per-order scope correct here, or should this spec's `purchaseLimit` be renamed to
`perOrderLimit` to avoid confusion?

### 9.4 Teaser and eligibility cross-reference

The spec says: a teaser price is display-only; cart-add is blocked by RAOS-0001. But what if
a variant has a teaser and the buyer IS eligible via RAOS-0001 (e.g., guest can add non-member
items)? The teaser should only appear for the specific member pricing path, not apply broadly.
The current implementation is correct; this question documents the intent explicitly.

---

## 10. Why this spec now

Pricing is the most visible merchant-reasoning gap after eligibility. An agent that can't
explain "why $X" is not useful for wholesale buyers negotiating or loyalty members expecting
their discount. More importantly, RAOS-0007 (Quote Integrity) requires a stable `AppliedOffer`
shape to bind in the quote token — shipping that shape here, before 0007, ensures we don't
redesign the contract under load.

The `AppliedOffer` shape with `priority`, `stackable`, and `exclusive` fields present from
day one (even though RAOS-0002 sets them to fixed defaults) means RAOS-0006's stacking ladder
is an additive evolution, not a breaking change. The spec is the leverage.
