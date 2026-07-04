# RAOS-0003 · Fulfillment Feasibility — Wiki & Pending Work

**Status:** Not started · planned · Tier 4 · Plane 4
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0003 brief) · `MASTER-BUILD-PLAN.md` WP-13
**Depends on:** RAOS-0005 (Inventory, built) · RAOS-0011 (Restricted Goods, pending)

## The one-sentence problem

An agent confirms shipping to Hawaii for a local-delivery-only item, or promises same-day
pickup after the cutoff has passed — because nothing at catalog time carries fulfillment
feasibility, only fulfillment *intent*.

## Why UCP doesn't solve this

UCP's checkout handoff assumes fulfillment works itself out downstream. It doesn't carry
modes, windows, lead times, or region-service-area data an agent needs *before* recommending.

## Minimal core (build this first)

Just the fulfillment **modes** a merchant supports (`ship`, `pickup`, `local_delivery`,
`BOPIS`) as a flat per-variant flag, plus one reason code: `FULFILLMENT_MODE_UNAVAILABLE`.
That alone stops the Fresh Corner Market failure case (confirming shipping on a pickup-only
item) without needing windows, lead times, or hazmat logic yet.

## Layering up (build later)

- Delivery windows + lead times + per-region availability.
- Hazmat/oversize shipping restrictions.
- Split-shipment signal (some lines ship, some are pickup-only).
- Same-day cutoff time crossed mid-session (`CUTOFF_PASSED`).
- Compose with RAOS-0011: a regulated item can be visible but not shippable — reason
  precedence between `REGION_RESTRICTED` (0001) and `CARRIER_RESTRICTION` (0011) needs to be
  documented, not just implemented.

## Pending tasks

- [ ] Write `specs/0003-fulfillment.md` following the RAOS-0001 template.
- [ ] Define `FulfillmentConstraints` config shape in `src/lib/types/`.
- [ ] Implement `src/lib/rules/fulfillment.ts` as a FULFILLMENT-stage evaluator.
- [ ] Mock data: grocery archetype becomes the BOPIS showcase (store A vs store B stock,
      per PROGRAM-PLAN §5).
- [ ] Wire into Playground + spec page.
- [ ] Reason codes: `FULFILLMENT_MODE_UNAVAILABLE`, `REGION_NOT_SERVED`,
      `HAZMAT_RESTRICTION`, `CUTOFF_PASSED`, `OVERSIZE_RESTRICTION`, `SPLIT_SHIPMENT_REQUIRED`,
      `DELIVERY_WINDOW_FULL`, `LEAD_TIME_EXCEEDS_NEED_BY`.

## Open questions

- Precedence when an item is both region-restricted (0001/0011) and fulfillment-restricted —
  does the first-blocking-stage govern, or does a specific stage always win? Needs a decision
  before this spec is written, not after.
