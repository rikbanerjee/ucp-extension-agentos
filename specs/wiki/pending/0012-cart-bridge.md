# RAOS-0012 · Cart Bridge & Checkout Handoff — Wiki & Pending Work

**Status:** Not started · planned · Tier 4 · Plane 5
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0012 brief) · `MASTER-BUILD-PLAN.md` WP-18
**Depends on:** RAOS-0007 (Quote Integrity, built), all Plane 3 pricing specs

## The one-sentence problem

Everything upstream (eligibility, price, quote) can be perfectly correct, and it's all
worthless if the agent-built cart can't be handed to the merchant's real checkout with every
quote token, applied offer, and reasoning trace intact.

## Why UCP doesn't solve this

UCP defines a checkout handoff shape but doesn't specify how a *multi-line, reasoning-rich*
cart — with per-line quote tokens and applied offers — survives serialization into that
handoff without losing anything.

## Minimal core (build this first)

Single-line cart serialization: one variant, one quote token, one handoff payload. Prove that
a quote token survives serialize → deserialize → revalidate with an identical
`DecisionRecord` before worrying about multi-line carts or partial-cart edge cases.

## Layering up (build later)

- Multi-line cart-state serialization, one `QuoteToken` per line.
- Idempotency key on handoff (protect against double-submit).
- Expired-quote-at-handoff flows: requote vs. reject, per each line's RAOS-0007 honor policy.
- Partial-cart proceed option (some lines valid, some not — does checkout proceed with the
  subset?).
- Loyalty/offers must survive serialization byte-exact, not just "close enough."

## Pending tasks

- [ ] Write `specs/0012-cart-bridge.md`.
- [ ] Define cart-serialization payload shape (carries reasoning + locked prices; checkout
      owns payment/tax computation — the explicit boundary line).
- [ ] Implement handoff contract + idempotency key handling.
- [ ] Test: serialize → deserialize → revalidate → identical `DecisionRecord`s.
- [ ] Reason codes: `HANDOFF_READY`, `HANDOFF_QUOTE_EXPIRED`, `HANDOFF_PARTIAL`,
      `HANDOFF_DUPLICATE_SUPPRESSED`.

## Scope note

**Single-merchant cart only.** Cross-merchant/marketplace cart is explicitly V2 — see
`specs/TODO.md`. Don't let this spec's design accidentally assume multi-merchant carts.
