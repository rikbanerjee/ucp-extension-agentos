# RAOS-0003 · Fulfillment Feasibility — Wiki

**Full spec:** [`../0003-fulfillment.md`](../0003-fulfillment.md)
**Code:** [`src/lib/rules/fulfillment.ts`](../../src/lib/rules/fulfillment.ts) ·
[`src/lib/extensions/evaluators/fulfillment.ts`](../../src/lib/extensions/evaluators/fulfillment.ts)
**Status:** Built · v1.0.0 · Tier 1 (promoted from Tier 4 on 2026-08-12)
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — 352/352
`vitest` (excl. `marketing/`), `npx tsc --noEmit -p .` clean, as of 2026-08-12. Engine bumped to
**0.3.0** — see `packages/engine/CHANGELOG.md` for the breaking-change list.

## The one-sentence problem

An agent confirms shipping to Hawaii for a local-delivery-only item, or promises same-day pickup
after the cutoff has passed — because nothing at catalog time carries fulfillment *feasibility*,
only fulfillment *intent*.

## What UCP already gives you

The checkout handoff assumes fulfillment "works itself out downstream." It doesn't carry modes,
windows, lead times, or region-service-area data an agent needs *before* recommending.

## What this spec adds

One computed output, evaluated per buyer per variant, before a cart is ever built:
**`ComputedFulfillmentFeasibility`** — `FEASIBLE`, or `BLOCKED` with one or more structured,
non-resolvable reasons (unlike eligibility, there is no buyer-side action that fixes
unreachability — the agent's job is to explain, not offer a path).

Deliberately narrower than "fulfillment" in general: it answers **"can we get this to you,"
deterministically, from data already on hand** — mode, region, carrier restrictions, lead time,
same-day cutoff. It does not answer "is there capacity right now" (live delivery-window slots) —
that fails determinism by construction and is named as the eventual home for the
provider-delegation extension point (§9.1, designed not built).

## Minimal core (Tier 1 — why this moved)

"Can this reach this buyer at all" is a dead-end-cart question on the same footing as eligibility
(0001) and stock (0005) — an agent that recommends an item it cannot fulfill has built exactly the
dead-end cart Tier 1 exists to prevent. Previously this spec shipped at Tier 4 ("Assisted"),
behind loyalty and returns, which told the highest-value adopters (grocery, last-mile) that
reachability was a late-stage nicety. Promoted directly to Tier 1 at inception (2026-08-12).

## Layering up (grocery, wholesale)

- **Grocery (Fresh Corner Market):** mode + region (bananas showcase), plus lead-time-vs-need-by
  (custom cake) and same-day cutoff (deli tray).
- **Wholesale (Atlas Wholesale):** hazmat/oversize carrier restrictions on freight items that
  also carry `eligibilityRules` — see the precedence note below.
- **Networked (future, designed not built):** a fulfillment provider (Instacart, DoorDash, Uber)
  asserts feasibility on the merchant's behalf instead of a static declaration — §9.1 of the spec.

## The `STAGE_ORDER` decision

Every v1 reason code here is `BLOCK`-severity and dead-end-cart, so a new `FEASIBILITY` stage now
runs **before** `PRICE`: `VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE`.
The old `FULFILLMENT` stage is kept, empty, reserved for a future shipping-*cost* concern that
genuinely depends on `PRICE`/weight. **Precedence when both ELIGIBILITY and FEASIBILITY block:**
first-blocking-stage governs — an eligibility block is the surfaced explanation over a feasibility
block when both fire (both still appear in the full trace). See `specs/0003-fulfillment.md` §8.

## Reason codes at a glance

`FULFILLMENT_MODE_UNAVAILABLE` (renamed from RAOS-0001's `FULFILLMENT_UNAVAILABLE`, not
re-emitted), `REGION_NOT_SERVED` (distinct from 0001's merchant-level `REGION_RESTRICTED`),
`HAZMAT_RESTRICTION`, `OVERSIZE_RESTRICTION`, `LEAD_TIME_EXCEEDS_NEED_BY`, `CUTOFF_PASSED`.

**Deferred, not shipped in v1:** `DELIVERY_WINDOW_FULL` (live slot capacity — not deterministic)
and `SPLIT_SHIPMENT_REQUIRED` (a cart-level planning concern → RAOS-0012).

## Breaking contract changes (affects other specs)

- `BuyerContext.needByDate?: string` — optional, additive, deliberate exception to
  most-restrictive defaulting (absent never blocks).
- `MerchantProfile.timezone: string` — required, breaking (same precedent as `servesRegions`).
- Both recorded in `specs/0000-foundations.md` §13.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md). Mock
data: Fresh Corner Market (grocery) carries the mode/region/lead-time/cutoff showcase; Atlas
Wholesale carries the hazmat/oversize showcase.

## History

This page supersedes the captured-intent stub formerly at `specs/wiki/pending/0003-fulfillment.md`
(removed 2026-08-12 once built, per the same convention as 0001/0005/0007/0008/0013). Build
history: [`specs/PROGRAM-PLAN.md`](../PROGRAM-PLAN.md) §6 and
[`specs/work-packages/RAOS-0003-fulfillment-brief.md`](../work-packages/RAOS-0003-fulfillment-brief.md)
(the agent brief this was built from).
