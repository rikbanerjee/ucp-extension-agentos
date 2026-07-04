# RAOS-0014 · Returns & Post-Purchase Policy — Wiki & Pending Work

**Status:** Not started · planned · Tier 4 · Plane 5
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0014 brief) · `MASTER-BUILD-PLAN.md` WP-16
**Depends on:** RAOS-0000 (Foundations, built) only — otherwise independent

## The one-sentence problem

An agent that quotes a product without communicating the return policy is setting up a
post-purchase revolt — "final sale" and "30-day returns" are both invisible at catalog time
today, and buyers find out the hard way.

## Why UCP doesn't solve this

UCP carries product and price; it has no return-policy field at all, statutory or
merchant-declared.

## Minimal core (build this first)

One field: `finalSale: boolean`, surfaced as a `FINAL_SALE` condition that must be
acknowledged at add-to-cart. That's the single highest-value fix — it stops the most common
post-purchase complaint (buyer didn't know it was final sale) with almost no modeling effort.

## Layering up (build later)

- Full return window, restocking fees, who-pays-return-shipping, warranty terms,
  exchange-vs-refund.
- Region-specific statutory rights that extend beyond the merchant's stated policy (e.g. EU's
  14-day statutory floor) — surfaced as `STATUTORY_RIGHTS_EXTEND_POLICY`.
- Mixed-policy cart display (some lines final-sale, some not).
- Composition with RAOS-0006: clearance/promo items are often final-sale by default — this
  needs to be an explicit rule, not an assumption.

## Pending tasks

- [ ] Write `specs/0014-returns.md`.
- [ ] Define `ComputedReturnPolicy` per-line + cart-level mixed-policy summary contract.
- [ ] Implement as an INFO-stage contract (advisory, never blocks a sale by itself — only
      requires acknowledgment for final-sale).
- [ ] Reason codes: `FINAL_SALE` (CONDITION at add — must be acknowledged),
      `RESTOCKING_FEE_APPLIES`, `STATUTORY_RIGHTS_EXTEND_POLICY`,
      `WARRANTY_REGISTRATION_REQUIRED`.

## Open questions

- Restocking-fee disclosure threshold (does every fee need surfacing, or only above some
  dollar amount)? Not yet decided.
