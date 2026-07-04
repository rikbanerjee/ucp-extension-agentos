# RAOS-0009 · Loyalty & Rewards — Wiki & Pending Work

**Status:** Not started · planned · Tier 3 (Member-aware) · Plane 3
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0009 brief) · `MASTER-BUILD-PLAN.md` WP-11 ·
`PRODUCT-BACKLOG.md` N5 (#2 differentiation gap)
**Depends on:** RAOS-0002 (Pricing, built), RAOS-0006 (Promo Stacking, pending — burn applies
after the ladder), RAOS-0015 (Privacy/Identity, pending — account-link trust)

## The one-sentence problem

UCP's Identity Linking tells an agent a buyer's loyalty tier and balance *at checkout* — but
nothing tells the agent, *before* checkout, "you'd earn 240 points on this" or "redeeming 500
points saves you $5." That browse-time value visibility is what actually drives a
loyalty-aware purchase decision.

## Why UCP doesn't solve this

UCP Identity Linking is checkout-time only. Existing loyalty platforms (Voucherify,
Talon.One, Yotpo) expose earn/burn at their own API layer, but no UCP extension carries it as
a catalog-time contract an agent can quote without an extra API round-trip.

## Minimal core (build this first)

One number: an **earn preview** per line item ("you'd earn N points"), with a simple
exclusion flag for sale items (`LOYALTY_EARN_EXCLUDED`). No burn, no tier-progress, no
benefit summary yet — just enough for an agent to say "this earns points" or "this doesn't,
because it's on sale."

## Layering up (build later)

- Burn/redeem eligibility (min threshold, value) — applied *after* RAOS-0006's promo ladder,
  never before.
- Member benefit summaries (free shipping, early access) visible at browse time.
- Tier-progress signal ("120 points to gold").
- Unlinked-account teaser: `accountLinked: false` shows a "link your account to see your
  points" message with no real values — this is also the key trust demo for RAOS-0000 §7.2
  (asserted-vs-signed privilege downgrade).
- Points-expiry signal (within 30 days).

## Pending tasks

- [ ] Write `specs/0009-loyalty.md`.
- [ ] Define `LoyaltyContext` (extends BuyerContext), `EarnPreview`, `BurnEligibility` types.
- [ ] Implement `src/lib/rules/loyalty.ts` as a PRICE-stage advisory evaluator + a burn hook
      inside RAOS-0006's ladder (step 6, reserved but not built yet).
- [ ] Mock data: grocery manifest gains `…loyalty`; showcase = earn preview with a sale-item
      exclusion, burn after the promo ladder, unlinked-account teaser, expiring points.
- [ ] Reason codes: `LOYALTY_EARN_PREVIEW`, `LOYALTY_EARN_EXCLUDED`,
      `REDEMPTION_BELOW_THRESHOLD`, `REDEMPTION_EXCEEDS_BALANCE`, `ACCOUNT_NOT_LINKED`,
      `TIER_BENEFIT_ACTIVE`, `POINTS_EXPIRING_SOON`.

## Open questions

- What happens to benefit visibility when a cart crosses a spend threshold mid-session —
  recompute immediately, or only at next evaluation? Not yet decided.
