# RAOS-0010 · Subscriptions & Recurring Orders — Wiki & Pending Work

**Status:** Not started · planned · Tier 3 · Plane 3
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0010 brief) · `MASTER-BUILD-PLAN.md` WP-12
**Depends on:** RAOS-0007 (Quote Integrity, built — recurring price lock re-issues a quote
per cycle), RAOS-0009 (Loyalty, pending), RAOS-0011 (Restricted Goods, pending — re-verify
age each cycle)

## The one-sentence problem

Subscribe-and-save is table stakes for grocery and DTC, and there's no open spec defining the
recurring-price contract, first-order discount, or cadence semantics an agent needs to
recommend a subscription with confidence instead of guessing.

## Why UCP doesn't solve this

UCP models a one-time cart and checkout. It has no cadence concept, no recurring-price
contract, and no notion of what happens when a subscribed item's price or availability
changes between cycles.

## Minimal core (build this first)

A subscription price vs. one-time price and a simple cadence (`weekly` / `monthly`). That's
the whole mechanism a DTC merchant needs to offer "subscribe and save 10%" — skip/pause/
cancel semantics and first-order discounts can come later.

## Layering up (build later)

- First-order discount vs. ongoing price (and how they diverge over time).
- Skip/pause/cancel semantics, including a skip requested after a cutoff.
- Recurring **price lock**: re-issue a RAOS-0007 quote each cycle, with a merchant-declared
  `onPriceChange: 'honor' | 'notify' | 'cancel'`.
- Item discontinued mid-subscription → substitute (binds RAOS-0004, pending).
- Regulated goods (alcohol, etc.) must re-verify eligibility every cycle, not just at
  first order (binds RAOS-0011, pending).
- Proration on plan changes.

## Pending tasks

- [ ] Write `specs/0010-subscriptions.md`.
- [ ] Define subscription config shape + cadence enum.
- [ ] Implement as a PRICE-stage evaluator that composes with RAOS-0007's quote lifecycle.
- [ ] Mock data: grocery (subscribe-and-save staples) + boutique (recurring restock) archetypes.
- [ ] Reason codes: `SUBSCRIPTION_PRICE_APPLIED`, `FIRST_ORDER_DISCOUNT`,
      `CADENCE_UNAVAILABLE`, `SUBSCRIPTION_PRICE_CHANGED`,
      `SUBSCRIPTION_ITEM_DISCONTINUED`, `REVERIFICATION_REQUIRED`.

## Open questions

- Is a mid-subscription price increase always a `notify`, or can a merchant declare
  `honor`-forever for early subscribers? Not yet decided — affects the config shape.
