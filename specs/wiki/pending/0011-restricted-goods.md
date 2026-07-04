# RAOS-0011 · Tax & Restricted/Regulated Goods — Wiki & Pending Work

**Status:** Not started · planned · Tier 1 · Plane 2
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0011 brief) · `MASTER-BUILD-PLAN.md` WP-10 ·
`PRODUCT-BACKLOG.md` N7 (real legal exposure, not just a nice-to-have)
**Depends on:** RAOS-0001 (Eligibility, built — this spec extends it), RAOS-0015
(Privacy/Identity, pending — age/identity verification)

## The one-sentence problem

No existing protocol carries geo/zip-level delivery eligibility, age-restricted-good rules
(alcohol, cannabis, tobacco, pharmacy), or regulated-item purchase limits at catalog time —
every platform pushes this to checkout, which is a legal-exposure dead end, not just a bad
buyer experience.

## Why UCP doesn't solve this

UCP's rails don't encode regulatory state at all. Cannabis delivery legality varies by
municipality; alcohol shipping legality varies by state and carrier; none of that reaches an
agent before it recommends the item.

## Minimal core (build this first)

One field: `regulatedCategory` (`alcohol | cannabis | tobacco | vape | pharmacy | none`) plus
one gate: **age unknown → most restrictive (BLOCK)**, per RAOS-0000's determinism rule. That
alone stops an agent from recommending a regulated item to an unverified buyer. Region
legality and purchase limits can layer on after.

## Layering up (build later)

- `legalRegions[]` — region-based legality, separate from ordinary shipping regions.
- `carrierRestricted` — legal in the buyer's region but not shippable there (visible,
  pickup-only resolution — composes with RAOS-0003, pending).
- `purchaseLimit` (per-order / per-customer) for regulated items specifically (shares
  mechanics with RAOS-0002's generic purchase limit, but owns the regulated-goods case).
- `taxTreatment` signal (`inclusive` / `exclusive` / `exempt_eligible`) — carries the signal
  only; actual tax computation stays a checkout concern (locked decision, B5).
- Verified-age claim (`ageVerified: { minimumAgeMet }`) riding the trust envelope, never a raw
  birthdate.

## Pending tasks

- [ ] Write `specs/0011-restricted-goods.md`.
- [ ] Define `restrictedGoods` config shape + `taxTreatment` field.
- [ ] Implement `src/lib/rules/restricted.ts` as an ELIGIBILITY-stage evaluator, ordered
      after RAOS-0001.
- [ ] Mock data: grocery archetype gains a beer SKU with age-verification + region + limit
      scenarios; wholesale gains a tax-exempt signed-vs-asserted demo.
- [ ] Reason codes: `AGE_VERIFICATION_REQUIRED`, `REGION_NOT_LEGAL`, `CARRIER_RESTRICTION`,
      `PURCHASE_LIMIT_EXCEEDED`, `TAX_EXEMPT_UNVERIFIED`, `TAX_TREATMENT_NOTE`.

## Why this one's worth prioritizing

Unlike most pending specs, this one carries real legal exposure today (2026 regulators treat
missing age verification as an offense in itself) — it's unblocked right now (depends only on
the already-built RAOS-0001) and arguably shouldn't wait behind 0006.
