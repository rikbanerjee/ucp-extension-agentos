# RAOS-0005 · Inventory & Availability — Wiki

**Full spec:** [`../0005-inventory.md`](../0005-inventory.md)
**Code:** [`src/lib/rules/inventory.ts`](../../src/lib/rules/inventory.ts) ·
[`src/lib/extensions/evaluators/inventory.ts`](../../src/lib/extensions/evaluators/inventory.ts)
**Status:** Built · v1.0.0 · Tier 1
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

An agent that confidently recommends an out-of-stock item is worse than one that recommends
nothing — and UCP carries a catalog, not a live stock signal.

## What UCP already gives you

The product listing exists; UCP doesn't carry real-time stock state, staleness, or
reservation semantics.

## What this spec adds

Two things UCP has no concept of:
- **A mandatory freshness TTL** on every availability read (60s default — the shortest TTL in
  the whole pipeline, shorter than price at 300s or eligibility at 3600s, because stock is the
  most time-sensitive fact a merchant has).
- **Soft reservation semantics** — adding to cart can place a timed hold; an expired hold
  triggers `RESERVATION_EXPIRED` instead of a silent oversell.

## Minimal core (Tier 1 — the smallest version)

One field: `state` (`in_stock | low_stock | out_of_stock | backorder | preorder`). That alone
stops an agent from ever recommending something that isn't there. No location data, no
reservation policy needed yet — just declare the state and set `reservationPolicy: 'none'`.

## Layering up (grocery, wholesale)

- **Grocery (BOPIS):** `perLocation` quantity breakdown so "store A has it, store B doesn't"
  reaches the agent when the buyer's fulfillment mode is pickup.
- **Wholesale:** `backorderEta` for large orders that aren't hard-out but aren't immediate
  either.
- **Any tier under real concurrency:** `reservationPolicy: 'soft_hold'` with a TTL — this is
  the two-agents-one-unit race the Playground has a dedicated simulator for.

## Reason codes at a glance

`OUT_OF_STOCK`, `LOW_STOCK`, `BACKORDER_AVAILABLE`, `PREORDER_NOT_YET_BUYABLE`, `STOCK_STALE`,
`LOCATION_OUT_OF_STOCK`, `RESERVATION_EXPIRED`.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) —
TheCustomHub's `inventoryQty` + `inStock` fields map directly to this spec's `state` +
`quantityAvailable`, with a `lowStockThreshold` derived at adapter time.
