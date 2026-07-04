# RAOS-0002 · Contextual Pricing (Member + Bulk) — Wiki

**Full spec:** [`../0002-contextual-pricing.md`](../0002-contextual-pricing.md)
**Code:** [`src/lib/rules/pricing.ts`](../../src/lib/rules/pricing.ts)
**Status:** Built · v1.0.0 · Tier 2
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

A gold member gets quoted the public price because the agent doesn't know a member price
exists; a wholesale buyer orders below MOQ and hits a wall at checkout with zero explanation.

## What UCP already gives you

A single catalog price per item. UCP has no concept of "who gets what price" or "what
quantity unlocks a better price" — that logic lives in the backend and only fires at checkout.

## What this spec adds

A `ComputedPriceState` contract: one resolved unit price, with full provenance — which offers
applied (`AppliedOffer[]`), which were evaluated but lost (`suppressedOffers[]`), and why. A
price is never just a number here; an agent can always show *why* it's $X.

Two namespaces ship together: **`member_pricing`** (member price, teaser price for
unqualified buyers, per-customer purchase limits) and **`bulk_pricing`** (MOQ, quantity
increments, volume tiers).

## Minimal core (Tier 2 — the smallest version that matters)

One member price and one public price. If a buyer isn't a member, show the public price with
a teaser ("members pay $X") — display-only, never addable at that price (addability is
RAOS-0001's job, not this spec's). That single rule already stops the #1 cited
agent-commerce failure: quoting list price to someone who qualifies for better.

## Layering up (wholesale, grocery)

- **Wholesale:** add bulk volume tiers, MOQ enforcement, quantity-increment validation, and
  per-customer purchase limits (`limit 2`).
- **Any tier:** `callForPrice` for items that can't be instant-priced (bespoke, bulk-custom) —
  this is the seam RAOS-0013's intent-capture flow plugs into.

Promotional pricing (sales, coupons, BOGO) is deliberately **not** here — that's RAOS-0006.
This spec exists so 0006 and 0007 (quote lock) have a stable `AppliedOffer` shape to bind
against; it was frozen early on purpose to avoid reshaping it twice.

## Minimal-core rounding rule

Half-up to the cent, USD-only in v1 (multi-currency is a deliberate V2 seam, not built now).

## Reason codes at a glance

`MEMBER_PRICE_APPLIED`, `TEASER_LOCKED`, `BULK_TIER_APPLIED`, `BELOW_MOQ`,
`QUANTITY_INCREMENT_MISMATCH`, `PURCHASE_LIMIT_EXCEEDED`, `CALL_FOR_PRICE`.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) —
TheCustomHub's `compareAtPrice` field and its custom/bulk-quote flow map directly onto this
spec's promo-baseline and `callForPrice` concepts.
