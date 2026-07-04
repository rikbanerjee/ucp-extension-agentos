# RAOS-0006 · Promotional Pricing & Stacking — Wiki & Pending Work

**Status:** Not started · planned · Tier 2 · Plane 3
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0006 brief) · `MASTER-BUILD-PLAN.md` WP-09 ·
`PRODUCT-BACKLOG.md` N6 (flagged as the **#1 differentiation gap** vs. ACP/UCP/Talon.One)
**Depends on:** RAOS-0002 (Contextual Pricing, built — `AppliedOffer` shape already frozen
for this spec to populate)

## The one-sentence problem

Member price + bulk tier + sale + coupon all apply to one line, and today the result is
either silently wrong or platform-specific — unintended promo stacking is the #1
margin-leakage risk retailers cite in agent commerce.

## Why UCP doesn't solve this

Neither UCP nor ACP nor Talon.One's UIP specify a *deterministic, merchant-declared* stacking
model with reason codes. They have discount extensions; none of them tell an agent exactly
which offers combine, which are exclusive, and why one was suppressed.

## Minimal core (build this first)

The **priority ladder** (already locked as the model, questions.md B4): merchant declares a
`priority` per offer; the pipeline walks the ladder, applies each offer if it's `stackable`
with everything applied so far, and stops applying once an `exclusive` offer is applied. No
floor price, no per-customer limits yet — just: one deterministic order, one explanation of
what applied and what didn't.

## Layering up (build later)

- `floorPrice` protection — never let stacking price a line below merchant-declared cost.
- Per-customer promo limits.
- Coupon mid-session expiry (freshness via RAOS-0008).
- Mix-and-match across different SKUs (a cart-scoped offer, not a per-line one).
- Loyalty burn (RAOS-0009) applied *last*, after the ladder resolves — this spec reserves that
  slot but doesn't build it.

## Pending tasks

- [ ] Write `specs/0006-promo-stacking.md` following the RAOS-0001 template.
- [ ] Implement `src/lib/rules/promos.ts`: collect candidates → drop expired/ineligible →
      sort by priority → walk the ladder → enforce floor → emit applied + suppressed.
- [ ] Resolve RAOS-0002's open question (member vs. bulk precedence) by making both ladder
      entries — default ladder must reproduce today's member→bulk→promo last-wins for
      backward compatibility.
- [ ] Mock data: grocery archetype is the stacking showcase (weekly ad + coupon + member
      price + floor, all on one SKU).
- [ ] Playground: an "offer ladder" visual showing applied vs. suppressed rungs.
- [ ] Reason codes: `OFFER_APPLIED`, `OFFER_EXCLUSIVE`, `OFFER_EXPIRED`,
      `OFFER_BELOW_MIN_SPEND`, `OFFER_PER_CUSTOMER_LIMIT`, `OFFER_SUPPRESSED_BY_PRIORITY`,
      `OFFER_NOT_STACKABLE`, `FLOOR_PRICE_PROTECTED`, `PROMO_ON_INELIGIBLE_ITEM`.

## Why this one's worth prioritizing

Every other spec in the pending list rounds out coverage; this one is a genuine competitive
differentiator nobody else has specified this precisely. If only one pending spec gets built
next, the backlog analysis says it should be this one.
