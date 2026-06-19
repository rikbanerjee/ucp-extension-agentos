# RAOS-0005 · Inventory & Availability

**Namespace:** `com.os.retailagent.shopping.inventory`
**Status:** Draft · RFC
**Version:** 1.0.0
**Plane:** 1 · Discovery & Truth
**Tier:** 1 · Qualified
**Date:** June 2026
**Reference implementation:** `src/lib/rules/inventory.ts`, `src/lib/extensions/evaluators/inventory.ts`

---

## Abstract

An AI agent that confidently sells an out-of-stock item is worse than an agent that doesn't sell at all. This spec defines how a merchant declares inventory state at catalog time — in-stock, low-stock, out-of-stock, backorder, or preorder — and how an agent computes availability before recommending or adding to cart.

Two properties UCP does not carry are added:

- **Freshness envelope** — a mandatory TTL on every availability computation. Inventory is the most time-sensitive data in the pipeline (default 60 s, shorter than pricing at 300 s or eligibility at 3600 s per RAOS-0008).
- **Soft reservation semantics** — an add-to-cart action can place a timed hold on stock. An expired hold triggers a re-evaluation signal before checkout (`RESERVATION_EXPIRED`).

---

## Motivation — the gap this closes

- An agent recommends an item; the buyer adds it; checkout rejects with "out of stock." The agent had no way to know.
- Two agents race for the last unit. First checkout wins; second fails. The agent can't explain why.
- A backorder item shows as "unavailable" with no ETA. The agent can't tell the buyer when to expect it.
- A buyer wants store pickup; the item is at store A but not store B. No location-level signal reaches the agent.
- Stale inventory data (cached at recommending time) is served at checkout — prices are fresh, stock figures are 10 minutes old.

---

## 1. Conformance

A merchant implementing RAOS-0005 MUST:
- Declare the `com.os.retailagent.shopping.inventory` extension in their manifest.
- Set `inventory.state` on every variant where availability matters.
- Set `inventory.reservationPolicy` to either `none` or `soft_hold`.
- NOT call `Date.now()` or `new Date()` inside `src/lib/rules/**` or `src/lib/extensions/**`. All time is the injected `now` parameter.

A merchant SHOULD:
- Set `inventory.dataTtlSeconds` to the real freshness window of their stock feed.
- Set `inventory.dataFetchedAt` when the catalog entry was last refreshed from live stock data.
- Set `inventory.quantityAvailable` and `inventory.lowStockThreshold` when urgency signaling is desired.

---

## 2. Config shape — `InventoryConfig`

Placed in `variant.extensions["com.os.retailagent.shopping.inventory"]`.

```typescript
interface InventoryConfig {
  /** Stock state declared by the merchant. */
  state: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';

  /** Optional — enables `onlyXLeft` signaling on ComputedAvailability. */
  quantityAvailable?: number;

  /** Optional — per-location breakdown for BOPIS / pickup-mode filtering. */
  perLocation?: Array<{
    locationId: string;
    quantity: number;
  }>;

  /** Backorder ETA (ISO date string). Carried in requirements[] on the reason code. */
  backorderEta?: string;

  /** Preorder release date (ISO date string). Carried in requirements[] on the reason code. */
  preorderReleaseDate?: string;

  /**
   * Quantity at or below which LOW_STOCK is emitted.
   * Default: 5.
   */
  lowStockThreshold?: number;

  /**
   * 'none'      — no reservation semantics (RESERVATION_EXPIRED never fires).
   * 'soft_hold' — caller may inject InventoryHold[]; expiry triggers RESERVATION_EXPIRED.
   */
  reservationPolicy: 'none' | 'soft_hold';

  /** TTL for soft holds in seconds. Default: 900 (15 min). */
  reservationTtlSeconds?: number;

  /**
   * Unix millisecond timestamp when this inventory record was fetched from the live system.
   * Omit if data is being fetched live; defaults to the injected `now`.
   */
  dataFetchedAt?: number;

  /**
   * How long the fetched inventory is considered fresh, in seconds.
   * Default: 60. Set lower for high-turnover items.
   */
  dataTtlSeconds?: number;
}
```

### Variants without inventory config

Variants that do not declare the `com.os.retailagent.shopping.inventory` extension are treated as **always in-stock**, with no availability reasons emitted. This preserves the implicit behavior of all pre-RAOS-0005 catalog data.

---

## 3. Output shape — `ComputedAvailability`

```typescript
interface ComputedAvailability {
  state: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder' | 'preorder';

  /** Present when quantityAvailable <= lowStockThreshold. */
  onlyXLeft?: number;

  /** Passed through from config. Present when perLocation was declared. */
  perLocation?: Array<{ locationId: string; quantity: number }>;

  /**
   * Mandatory freshness envelope.
   * computedAt = injected `now` — NEVER Date.now().
   */
  freshness: {
    computedAt: number;
    ttlSeconds: number;
  };
}
```

`ComputedAvailability` rides on the `DecisionRecord` alongside the eligibility and price outputs. RAOS-0007 (Quote Integrity) and RAOS-0003 (Fulfillment Feasibility) read it downstream.

---

## 4. Reason code registry

| Code | Severity | Meaning | Resolvable? |
|------|----------|---------|-------------|
| `OUT_OF_STOCK` | BLOCK | Item is out of stock. Cannot be added to cart. | Yes — notify-me (RAOS-0013 forward-ref) |
| `LOW_STOCK` | INFO | Quantity at or below `lowStockThreshold`. Agent should surface urgency ("Only 3 left"). | No — advisory |
| `BACKORDER_AVAILABLE` | CONDITION | On backorder, but orderable. ETA in requirements[]. | Yes — acknowledge ETA |
| `PREORDER_NOT_YET_BUYABLE` | CONDITION | Visible for preorder, not yet addable. Release date in requirements[]. | Yes — wait for release date |
| `STOCK_STALE` | CONDITION | Inventory TTL has expired. Agent must re-fetch before acting. Does not block. | Yes — re-fetch |
| `LOCATION_OUT_OF_STOCK` | CONDITION | Pickup requested; some locations have zero stock. Available locationIds in requirements[]. | Yes — select available location |
| `RESERVATION_EXPIRED` | BLOCK | Soft hold has expired. Must re-evaluate before checkout. | Yes — re-evaluate, re-add if still in stock |

**RESERVATION_EXPIRED** is a synthetic-only code in the golden fixture grid. It requires injecting an expired `InventoryHold` via `setInventoryHolds()`, which the static catalog fixture grid cannot do. It is exercised in `src/lib/rules/__tests__/inventory.test.ts` with synthetic hold state.

---

## 5. Evaluation algorithm

Deterministic. Same (config, context, holds, now) always produces the same result. No model inference in the loop.

```
function evaluateInventory(variant, context, holds, now):

  1. No inventory config → return ComputedAvailability{state:'in_stock'}, reasons=[], blocked=false.

  2. Freshness check:
     fetchedAt = config.dataFetchedAt ?? now
     expiry    = fetchedAt + (config.dataTtlSeconds ?? 60) * 1000
     if now > expiry → emit STOCK_STALE (CONDITION)
     // staleness is a warning, not a block — continue evaluation

  3. Reservation expiry check:
     for each hold in holds:
       if now > hold.heldAt + hold.ttlSeconds * 1000 → emit RESERVATION_EXPIRED (BLOCK), return early

  4. State dispatch:
     out_of_stock → emit OUT_OF_STOCK (BLOCK, resolution='notify-me')
     backorder    → emit BACKORDER_AVAILABLE (CONDITION, include ETA in requirements if set)
     preorder     → emit PREORDER_NOT_YET_BUYABLE (CONDITION, include release date in requirements if set)
     in_stock / low_stock:
       if quantityAvailable set and quantityAvailable <= (lowStockThreshold ?? 5):
         emit LOW_STOCK (INFO), set onlyXLeft = quantityAvailable

  5. Per-location check (pickup mode only):
     if config.perLocation is set and context.fulfillmentMode === 'pickup':
       allZero = perLocation.every(l => l.quantity === 0)
       if allZero  → emit OUT_OF_STOCK (BLOCK)
       else if some zero locations exist → emit LOCATION_OUT_OF_STOCK (CONDITION,
                                                 requirements = available locationIds)

  6. Return ComputedAvailability{state, onlyXLeft?, perLocation?} with freshness{computedAt=now, ttlSeconds}
```

---

## 6. Soft reservation semantics

### createSoftHold

```typescript
function createSoftHold(
  variantId: string,
  quantity: number,
  now: number,
  ttlSeconds: number = 900
): InventoryHold
```

Called when a buyer adds to cart (when `reservationPolicy === 'soft_hold'`). The caller stores and passes the returned `InventoryHold` as input on subsequent evaluations.

### isHoldActive

```typescript
function isHoldActive(hold: InventoryHold, now: number): boolean
// Returns true if hold.heldAt + hold.ttlSeconds * 1000 >= now
```

### Reservation expiry flow

```
t=0     Agent A: add to cart → createSoftHold{heldAt:0, ttl:900s}
t=899s  Agent A: checkout → isHoldActive=true → proceed
t=901s  Agent B: add to cart → evaluateInventory with expired hold
                              → RESERVATION_EXPIRED (BLOCK)
                              → Agent B must re-evaluate
```

### The oversell race

Two agents simultaneously evaluating the same last unit both receive identical, deterministic output — both see in_stock. RAOS-0005 is not the race arbiter.

The checkout system (RAOS-0012) is responsible for the atomic stock decrement. RAOS-0005's role is to surface the re-evaluation signal (`RESERVATION_EXPIRED`) so agents are forced to re-check before checkout. The checkout system rejects the second call and the agent surfaces the resulting availability.

### Determinism invariant

The evaluator never stores holds in module state between calls. Each call reads holds from the injected parameter. The module-level `_activeHolds` slot in `evaluators/inventory.ts` is consumed and reset after each `evaluate()` call — it is a minimal shim pending a future pipeline `sideInputs` slot (see Open Question #2).

---

## 7. Worked examples

### Grocery — per-location BOPIS (Fresh Corner Market)

**Variant:** Artisan Sourdough · `perLocation: [{locationId:'store_A', quantity:4}, {locationId:'store_B', quantity:0}]`

| Buyer scenario | Reason codes | Outcome |
|---|---|---|
| Shipping buyer | None | `in_stock` — no location filtering |
| Pickup buyer (any location) | `LOCATION_OUT_OF_STOCK` (CONDITION) | Available at store_A; buyer selects |
| Pickup buyer (all locations zero) | `OUT_OF_STOCK` (BLOCK) | Not addable |

**Variant:** Stale stock data · `dataFetchedAt: 1000, dataTtlSeconds: 60`
At `now >= 61000`: `STOCK_STALE` (CONDITION) — agent must re-fetch.

---

### Wholesale — backorder with ETA (Atlas Wholesale)

**Variant:** Paper Napkins · `state: 'backorder', backorderEta: '2026-08-15'`

| Scenario | Reason codes | Outcome |
|---|---|---|
| Wholesale buyer queries availability | `BACKORDER_AVAILABLE` (CONDITION, ETA in requirements) | Orderable, buyer acknowledged ETA |
| Hard OOS (different variant) | `OUT_OF_STOCK` (BLOCK) | Not addable, notify-me resolution |

---

### Boutique — preorder (Sara's Boutique)

**Variant:** Spring 2027 Collection Tee · `state: 'preorder', preorderReleaseDate: '2027-03-01'`

| Scenario | Reason codes | Outcome |
|---|---|---|
| Any buyer before 2027-03-01 | `PREORDER_NOT_YET_BUYABLE` (CONDITION) | Visible, not addable, release date surfaced |

---

### Reservation expiry — two agents, one unit (Grocery)

**Variant:** In-stock, `reservationPolicy: 'soft_hold', reservationTtlSeconds: 900, quantityAvailable: 1`

| Time | Event | Result |
|---|---|---|
| t=0 | Agent A adds to cart | `createSoftHold{heldAt:0, ttl:900s}` — hold active |
| t=899s | Agent A checkout | `isHoldActive=true` — proceed |
| t=901s | Agent B tries to add | `RESERVATION_EXPIRED` (BLOCK) — B must re-evaluate |
| t=0, both agents simultaneously | Both evaluate | Both see `in_stock` (deterministic). Checkout system arbitrates. |

---

## 8. Golden fixture constants

The reference golden fixture suite uses `GOLDEN_NOW = 100_000` (100 s past Unix epoch).

This value is chosen so that:
- `v_g_inv_002_1` (`dataFetchedAt=1000, dataTtlSeconds=60`) correctly triggers `STOCK_STALE` (expires at 61,000 ms; 100,000 > 61,000 ✓)
- All other inventory variants default `dataFetchedAt` to `now=100,000`, so they expire at 160,000 ms and remain fresh during fixture generation (100,000 < 160,000 ✓)

---

## 9. Extension manifest entry

```json
{
  "id": "ext.inventory",
  "name": "Inventory & Availability",
  "version": "1.0.0",
  "namespace": "com.os.retailagent.shopping.inventory",
  "description": "Real-time stock state, per-location quantity, availability TTL, and soft reservation semantics.",
  "required": true,
  "tier": 1
}
```

---

## 10. Open questions — Request for Comment

### OQ#1 — Per-location vs buyer-location mapping

Currently the spec surfaces the full `perLocation[]` array and emits `LOCATION_OUT_OF_STOCK` when the buyer is in pickup mode and some locations have zero stock. But the spec does not know which `locationId` corresponds to the buyer's physical location — that mapping is RAOS-0003's (Fulfillment Feasibility) concern.

**Proposed:** defer precise location-to-region mapping to RAOS-0003. RAOS-0005 surfaces the full `perLocation` array and the CONDITION code; 0003 refines it with location feasibility. This keeps 0005 independent of fulfillment logic.

**What we need:** input from multi-location grocery operators or BOPIS integrations. Is surfacing the array sufficient, or does RAOS-0005 need to be more specific?

---

### OQ#2 — Reservation holds as pipeline input vs module-level shim

The evaluator uses `setInventoryHolds()` to inject hold state before `evaluateOffer()`. This works but is an awkward shim. Should the pipeline support an "evaluation context" bag that extensions can read without needing module-level state?

**Proposed:** the shim is intentional and documented. The pipeline could grow a `sideInputs` slot in a future RAOS-0000 revision. Until then, the holds-slot pattern is the minimal approach. The determinism invariant is preserved: the holds are set immediately before `evaluateOffer()` and cleared after use.

---

### OQ#3 — Should preorder items be blocked or conditionally addable?

Currently `PREORDER_NOT_YET_BUYABLE` is CONDITION severity — the item is visible and the reason is surfaced, but the item is not blocked. A merchant may want to accept preorders (add to cart OK) vs not (block until release).

**Proposed:** the agent interprets CONDITION as "resolvable." A merchant implementing preorder acceptance would mark it as such via intent-capture (RAOS-0013 forward-ref). Open for comment on whether a more explicit `preorderAcceptsOrders: boolean` flag belongs in the config.

---

### OQ#4 — Atomic reservation protocol

Two agents grabbing the last unit is a real problem. The spec documents this as a checkout-time concern with reservation TTL as mitigation. But should RAOS-0005 define a more explicit "claim" step (vs "soft hold") where the checkout system atomically decrements and confirms?

**Proposed:** the atomic stock decrement is intentionally in the checkout system (RAOS-0012). RAOS-0005 surfaces the re-evaluation signal (`RESERVATION_EXPIRED`) and the TTL as the agent-facing mitigation. The checkout claim protocol is a RAOS-0012 concern.

**What we need:** input from operators who have seen agent-driven oversell incidents at scale.

---

## 11. Why this spec now

Inventory truth is must-have #2 in the program (after quote integrity). An agent that confidently sells an out-of-stock item destroys buyer trust faster than any other failure mode.

The freshness TTL makes this spec load-bearing for RAOS-0007 (Quote Integrity): a quote token is only as trustworthy as its inventory signal, and stale inventory at quote-time is a liability. Shipping this before 0007 means 0007 can bind `ComputedAvailability` directly.

---

## Related specs

- **RAOS-0000** — Protocol Foundations, BuyerContext shape, determinism rule
- **RAOS-0001** — Eligibility (runs before inventory in the ELIGIBILITY stage, priority 10)
- **RAOS-0003** — Fulfillment Feasibility (location feasibility, pickup routing — downstream of 0005)
- **RAOS-0007** — Quote Integrity (binds ComputedAvailability to the quote token)
- **RAOS-0012** — Cart Bridge & Checkout Handoff (atomic stock decrement, the oversell arbiter)
- **RAOS-0013** — Intent Capture (out-of-stock notify-me, the BLOCK resolution path)

---

*Draft status. Namespace and shapes will change as this is pressure-tested in public.*
*Feedback: rikbanerjee007@gmail.com*
