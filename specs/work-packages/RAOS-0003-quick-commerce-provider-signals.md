# RAOS-0003 · Quick-Commerce Provider Signals — Work-Package Brief (design note, not built)

**Status:** Proposed extension point. Nothing in this document is implemented in the
deterministic RAOS engine. It exists so the boundary between "what RAOS computes" and "what a
platform/provider must supply" stays explicit as the `/guided/platform` NYC late-night pizza demo
makes that boundary visible in a concrete customer story.

**Relationship to other specs:** this is the quick-commerce-flavored instance of the
provider-delegation extension point already designed (not built) in
[`specs/0003-fulfillment.md`](../0003-fulfillment.md) §9.1. That section addresses the general
case (any fulfillment provider, any mode). This brief narrows it to the specific signals a
quick-commerce / instant-retail platform (Instacart-, DoorDash-, Uber-Eats-shaped) needs, using
the exact shape prototyped as demo data in
[`src/lib/demo/platformSignals.ts`](../../src/lib/demo/platformSignals.ts).

**Do not assign this to RAOS-0016.** That number is reserved for Agent Identity & Rate Limits.

---

## 1. The actor this introduces: the platform/provider

RAOS today has two actors: merchant and buyer. A quick-commerce platform is a third, distinct
actor that:

- discovers candidate merchants for a shopper's request,
- holds live courier-capacity, routing, and ETA data no merchant system can see,
- ranks candidates and owns the final checkout,
- decides how to treat a merchant it cannot verify (this brief's §5).

RAOS's job is NOT to become this actor. RAOS's job is to make merchant-declared facts legible
enough that a platform can combine them with its own live signals confidently — see the
responsibility boundary in `specs/0003-fulfillment.md` §4.4 and the `/guided/platform` demo's
Scene 4 ("RetailAgentOS explains what the merchant can support. The platform decides what to
show.").

## 2. The signal shape

```ts
interface PlatformFulfillmentSignal {
  providerId: string;
  merchantId: string;
  serviceable: boolean | 'unknown';
  courierCapacity: 'available' | 'limited' | 'unavailable' | 'unknown';
  pickupEtaMinutes?: number;
  deliveryEtaMinutes?: number;
  estimatedArrivalAt?: string;   // ISO 8601 with offset
  observedAt: number;             // epoch-ms this was true as of
  expiresAt: number;              // epoch-ms this stops being trustworthy
}
```

This is the reference shape prototyped (as fictional demo data, never engine input) in
`src/lib/demo/platformSignals.ts`. A real integration would populate this from live dispatch
systems; RAOS never fetches it and never computes it.

## 3. Live serviceability, courier capacity, ETA — why these stay OUT of the deterministic engine

RAOS-0000 §7.1's determinism contract requires "same `(variant, context, now)` → same answer,
always." A live courier-capacity query fails that test by construction — two calls one second
apart, byte-identical inputs, can return different answers, because the answer depends on state
(driver assignments, live demand) the engine's injected inputs do not and should not carry. This
is the same reasoning `specs/0003-fulfillment.md` §3 already applied to exclude
`DELIVERY_WINDOW_FULL` from v1 scope — this brief is that same boundary, restated for the
quick-commerce shape of the problem (courier dispatch instead of delivery-window slots).

## 4. Freshness and expiry

`observedAt`/`expiresAt` ride the same envelope shape RAOS-0000 §9 already uses for merchant-fact
freshness, but with a MUCH shorter tolerance: a live courier-ETA claim is good for minutes, not
the hour-scale TTL that's correct for a merchant's declared hours or price. A platform integration
should treat an expired signal as **unknown**, not as a stale "yes" — falling back to whatever the
merchant's own declared facts support (typically: show the merchant, but without a guaranteed
arrival promise), never either (a) trusting a stale claim or (b) hard-blocking on staleness alone.
This mirrors the fail-degraded discipline RAOS-0000 §7.3 already applies everywhere else in this
codebase.

## 5. Provider provenance and the merchant-truth boundary

A platform signal is the platform's own claim, not the merchant's — it should never be folded into
a `DecisionRecord.reasons` entry as if RAOS emitted it, and never displayed to a business user
without a distinguishable source tag (`platform_live`, per the `EvidenceSource` union already
prototyped in `src/lib/demo/platformQuickCommerceScenario.ts`). Concretely:

- **RAOS-verified merchant, no platform signal at all** (this brief's Corner Slice archetype in
  the demo): correctly renders `unknown`, not `blocked` — the platform simply hasn't dispatched
  there before. See §6 below.
- **RAOS-verified merchant + a platform signal that disagrees** (e.g. RAOS says the merchant is
  accepting orders, but the platform's live courier read says no capacity right now): the
  platform signal should govern the CUSTOMER-FACING promise (delivery ETA, "can we get this to you
  right now") — it is more current and more granular than a merchant's own declared hours — but it
  must never overwrite or suppress the RAOS merchant fact itself. Two facts, two provenances,
  shown side by side (exactly Scene 4's "RetailAgentOS facts" vs. "platform facts" columns).

## 6. Unknown-data policy (shared with the discovery roadmap, §7 below)

Three states, never collapsed into two:

- **BLOCKED** — the supplied facts prove the request cannot proceed (e.g. RAOS says
  `STORE_CLOSED`).
- **UNKNOWN** — insufficient fresh information exists to verify the promise (no RAOS integration,
  no platform signal, or an expired one).
- **VERIFIED** — supplied merchant + platform facts together support the promise.

A platform MAY choose, as its own policy, to exclude UNKNOWN candidates from a
time-guaranteed result set (exactly what `/guided/platform`'s Corner Slice does) — but that
exclusion is a **platform ranking/presentation decision**, not something RAOS computes or asserts.
RAOS never converts UNKNOWN into BLOCKED on its own initiative.

## 7. RAOS-0004 (discovery/match) roadmap implications — documented, not built

The demo's "only show stores that will keep accepting orders for at least another 30 minutes"
constraint is a shopper-stated **discovery-time filter**, not a merchant capability — see
`specs/0003-fulfillment.md` §4.4.6. A future RAOS-0004 would need to standardize:

- matching structured shopper intent (product, budget, need-by, minimum acceptance window) against
  the RAOS + platform facts assembled here,
- a documented, reusable "minimum acceptance window" comparison (merchant's declared
  acceptance-cutoff fact vs. a shopper-declared minimum-remaining-window preference) — NOT folded
  into `BuyerContext` as a new merchant-facing field, since it is the platform doing the comparing,
  not the merchant asserting it,
- data-completeness signals a platform can rank on (a candidate with 8/8 verified facts vs. one
  with 2/8) — not designed here, flagged as the natural next question,
- explicit platform ownership of final candidate ranking (unchanged from this brief's §1 — RAOS
  never ranks).

Not built. `specs/wiki/pending/0004-discovery-match.md` is the intended home for whichever of
these gets picked up first.

## 8. RAOS-0012 (cart bridge / checkout handoff) roadmap implications — documented, not built

When a shopper commits to a recommended candidate (Midnight Crust, in the demo), the eventual
checkout handoff needs to carry, at minimum:

- the selected merchant + item/variant,
- a quote token (RAOS-0007) if one was issued,
- the RAOS merchant-decision reference (which facts were verified, when),
- the platform's delivery-promise reference (which signal, `observedAt`/`expiresAt`),
- platform-calculated charges (fees, tax, tip) — clearly NOT RAOS-computed,
- pre-submit validation that the quote/signal pair hasn't expired between recommendation and
  checkout,
- final checkout/order submission, which stays entirely platform-owned.

This demo's `CheckoutSummary` component (`src/components/guided/platform/CheckoutSummary.tsx`)
shows a plausible RENDERED shape of this handoff — it is not wired to an actual RAOS-0007 quote
token or a cross-merchant checkout flow. No claim of cross-merchant checkout being implemented
should be inferred from it.

---

*Part of the RetailAgentOS open spec series. See [`../README.md`](../README.md).*
