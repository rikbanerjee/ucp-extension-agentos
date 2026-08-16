# RAOS-0003 · Fulfillment Feasibility

**Extension namespace:** `com.os.retailagent.shopping.fulfillment_constraints`
**Status:** Draft · Request for Comment
**Version:** 1.1.0
**Layer:** RetailAgentOS extension on top of UCP (Universal Commerce Protocol)
**Reference implementation:** [`src/lib/rules/fulfillment.ts`](../src/lib/rules/fulfillment.ts) — runnable in the [Playground](../src/app/demo/page.tsx)
**Author:** Rik Banerjee · rikbanerjee007@gmail.com

> This is an open draft. The point is to be argued with. §9 is written specifically for people
> who operate real fulfillment networks (Instacart, DoorDash, Uber, and similar) — if a fork
> there is wrong, that is the most useful thing you can tell me.

---

## 1. Abstract

This spec defines a machine-readable way for a merchant to declare **whether an item can
actually reach a given buyer** — evaluated at catalog time, before a cart is ever built. "Can
this reach this buyer at all" is a **Tier 1 — "no dead-end carts" — question**, on the same
footing as eligibility (RAOS-0001) and stock (RAOS-0005): an agent that recommends an item it
cannot fulfill has built exactly the dead-end cart Tier 1 exists to prevent. It produces one
computed output an AI agent can act on: `ComputedFulfillmentFeasibility` — feasible, or blocked
with a structured, resolvable-or-not reason.

Fulfillment feasibility is deliberately narrower than "fulfillment" in general. It answers
**"can we get this to you," deterministically, from data already on hand** — mode, region,
carrier restrictions, lead time, and same-day cutoff. It does **not** answer "is there capacity
right now" (live delivery-window slots) — see §3 Scope for why that line is drawn where it is.

---

## 2. Motivation — the gap this closes, and why it moved to Tier 1

An agent confirms shipping to Hawaii for a local-delivery-only item, or promises same-day
pickup after the cutoff has passed, because nothing at catalog time carries fulfillment
*feasibility* — only fulfillment *intent* (a buyer's stated `fulfillmentMode`). UCP's checkout
handoff assumes fulfillment "works itself out downstream." It does not carry modes, windows,
lead times, or region-service-area data an agent needs *before* recommending.

**Why Tier 4 → Tier 1 (promoted 2026-08-12):** this spec originally shipped as part of Tier 4
("Assisted — full commerce"), alongside cart handoff, intent capture, and returns. That placement
told the highest-value adopters — grocery, last-mile, anyone whose core business IS "can we get
this to you" — that reachability was a late-stage nicety, behind loyalty programs and
subscriptions. For a last-mile network, it is the opposite: reachability is not an enhancement to
commerce, it is a precondition for commerce. Burying it at Tier 4 also meant Tier 1 ("no
dead-end carts") was, in a specific and important sense, incomplete — an item can be perfectly
eligible and perfectly in stock and still be a dead-end cart if it cannot reach the buyer. Tier 1
now names all three failure modes explicitly: eligible (0001), in stock (0005), reachable (0003).

**The architectural consequence of this promotion** is not just a tier-table edit — it forced a
real decision about *where in the pipeline* feasibility runs, because every reason code in this
spec's v1 scope is a `BLOCK`-severity, non-resolvable, dead-end-cart reason exactly like
eligibility's, yet the pre-existing `FULFILLMENT` pipeline stage ran *after* `PRICE`. See §2 of
the STAGE_ORDER decision below (also recorded in `src/lib/extensions/contract.ts`).

---

## 3. Scope

**In scope (deterministic, from injected inputs only):**

- **Mode feasibility** — is the buyer's requested `fulfillmentMode` one this variant supports.
- **Variant-level region reach** — can THIS SPECIFIC ITEM reach the buyer's region, distinct
  from whether the merchant does business there at all (RAOS-0001 §9.6's `servesRegions`).
- **Carrier restrictions** — hazmat and oversize items that a standard parcel carrier cannot
  move, deterministically restricted to pickup/local_delivery.
- **Lead time vs. need-by** — can the merchant realistically fulfill by the buyer's stated
  deadline, given a declared minimum lead time.
- **Same-day cutoff** — has the merchant-local cutoff hour for same-day fulfillment passed.

**Explicitly OUT of scope for v1 — named, with the tier and reason:**

- **`DELIVERY_WINDOW_FULL` (live slot capacity).** Whether a specific delivery window has open
  capacity right now is **not deterministic from injected inputs** — it depends on a live query
  against a routing/dispatch system whose answer can differ between two calls with byte-identical
  inputs one second apart. Every code in this spec must pass the test "same `(variant, context,
  now)` → same answer, always" (RAOS-0000 §7.1). A capacity query fails that test by
  construction. This is not a permanent exclusion — it is the natural home for §5's
  provider-delegation extension point (designed, not built) once a provider partner is live.
- **Split-shipment planning.** Deciding which lines of a multi-item cart ship together vs.
  separately is a cart-level planning problem, not a single-variant feasibility check — it
  belongs with RAOS-0012 (Cart Bridge & Checkout Handoff), which has the whole cart in view. This
  spec answers "is this ITEM reachable"; split-shipment answers "how do these items ship
  together," a strictly later question.
- **Pickup-location selection UI, delivery-window selection UI.** Presentation concerns, not
  feasibility computation. RAOS-0005's per-location inventory (`LOCATION_OUT_OF_STOCK`) already
  covers "is there stock at the location the buyer picked"; this spec covers "can THIS variant
  reach the buyer at all," a prerequisite question, not a duplicate of it.

**Do not ship a reason code you cannot test.** Every code below has a deterministic fixture; the
two that cannot be produced from the static catalog grid (`LEAD_TIME_EXCEEDS_NEED_BY`,
`CUTOFF_PASSED`) have dedicated synthetic-input tests instead (§6, §10).

**Relationship to RAOS-0001:** RAOS-0001 §3 has always scoped fulfillment semantics out of
itself ("consumes a fulfillment signal... does not define fulfillment semantics"). Prior to this
spec, the reference implementation didn't honor that scope line — it evaluated
`fulfillmentConstraints.availableModes`/`restrictedRegions` inline inside `calculateEligibility`.
This spec is where that logic actually moves. See §8 and `specs/0001-eligibility.md` §11
changelog for the full migration write-up.

**Relationship to RAOS-0005 (Inventory):** RAOS-0005 answers "is there stock" (including
per-location stock for BOPIS); this spec answers "can this item reach this buyer at all,
mode/region/carrier/time permitting" — independent questions that can each block independently.
An item can be in stock and unreachable, or reachable and out of stock.

**Relationship to RAOS-0011 (Restricted Goods, pending):** age/jurisdiction-restricted goods
(alcohol, cannabis) are an ELIGIBILITY concern (who may buy) that happens to correlate with
regions, not a fulfillment-reach concern (can we physically get it there). `CARRIER_RESTRICTION`
in the original wiki stub is deliberately NOT a code in this spec's v1 — hazmat/oversize (real
physical shipping constraints) are; regulatory restriction is RAOS-0011's, when it ships. The
precedence rule in §8's worked examples covers what happens when both fire on the same item.

---

## 4. Inputs

### 4.1 Fulfillment constraints (merchant-declared, attached to a variant)

```jsonc
{
  "fulfillmentConstraints": {
    "availableModes": ["pickup", "local_delivery"], // optional — modes this variant supports
    "restrictedRegions": ["HI", "AK"],               // optional — regions THIS VARIANT cannot reach
    "hazmat": true,                                  // optional — not shippable by parcel carrier
    "oversize": true,                                // optional — not shippable by parcel carrier
    "leadTimeDays": 3,                                // optional — minimum days to fulfill
    "cutoffHourLocal": 14                             // optional — merchant-local same-day cutoff hour (0-23)
  }
}
```

All fields are optional and independent — a variant may set any subset. A variant with no
`fulfillmentConstraints` is `FEASIBLE` for every buyer (see §7), preserving the implicit
behavior of every pre-RAOS-0003 catalog variant.

`availableModes` and `restrictedRegions` are the SAME field names and shapes RAOS-0001 shipped
originally — this spec did not reshape them, only relocated which evaluator reads and reasons
about them (§8).

### 4.2 Buyer context (the evaluation environment)

This spec consumes the `BuyerContext` object defined in **RAOS-0000 §4**, adding one new field
this spec introduced (RAOS-0000 §13 changelog):

| Field | Type | RAOS-0003 usage |
|---|---|---|
| `fulfillmentMode` | `shipping \| pickup \| local_delivery` | `availableModes`, `hazmat`/`oversize` (both restricted to non-`shipping` modes), `cutoffHourLocal` (same-day modes only) gates |
| `marketRegion` | `string` | `restrictedRegions` check |
| `needByDate` | `string` (optional, `'YYYY-MM-DD'`) | `leadTimeDays` comparison |

`needByDate` is **new** (§4.3.1 below) and **optional**. RAOS-0003 does not read
`customerType`, `membershipTier`, `loyaltyTier`, `resaleCertificateOnFile`, `taxExempt`, or
`trust` — those are RAOS-0001/0009/0011's concerns, orthogonal to reachability.

### 4.3 Merchant timezone (new shared field, RAOS-0000 §13 changelog)

`CUTOFF_PASSED` and `LEAD_TIME_EXCEEDS_NEED_BY` require a merchant-local clock — "order by 3pm"
is meaningless without a timezone to evaluate it against. `MerchantProfile.timezone: string`
(an IANA identifier, e.g. `'America/Los_Angeles'`) is now **required** on `MerchantProfile`.

**Why required, not optional-with-a-default:** this follows the exact precedent RAOS-0001 §9.6
set for `servesRegions` — both are merchant-level invariants (true once per merchant, not once
per variant), and both protect against the SAME failure shape this spec exists to fix: a silent
default standing in for a real declaration. Defaulting an undeclared timezone to UTC would mean
a merchant whose actual cutoff is "3pm Pacific" silently gets evaluated against a UTC clock —
exactly the kind of wrong-but-quiet failure ("promises same-day pickup after cutoff has passed")
this spec's motivation names. Required + a TypeScript compile error converts that failure mode
from "wrong at runtime, discovered by an angry buyer" to "won't build." Every hand-authored
`MerchantProfile` fixture in the codebase needed a mechanical one-line addition as a result —
the same, accepted-under-Decision-B blast radius `servesRegions` had.

### 4.3.1 `BuyerContext.needByDate` — a deliberate exception to most-restrictive defaulting

RAOS-0000 §7.2/§4.3 default unknown/missing context to the **most-restrictive** interpretation.
The naive reading applied to `needByDate` would be: absent ⇒ treat as the most urgent possible
deadline ⇒ always block on lead time. That is wrong, not merely inconvenient — it would mean
every buyer who simply hasn't stated a deadline (the overwhelming majority) gets blocked on
every lead-time-constrained item, and it would break every existing fixture in the codebase that
predates this field. `needByDate` is therefore, deliberately, the **opposite**: absent means "no
deadline asserted ⇒ never blocks on lead time." This mirrors the RAOS-0001 §9.6 discipline of
documenting an exception explicitly rather than silently extending a general rule past where it
was designed to reach.

---

## 5. Outputs (the contracts agents consume)

### 5.1 `ComputedFulfillmentFeasibility`

```jsonc
{
  "status": "FEASIBLE | BLOCKED",
  "reasons": [
    {
      "code": "FULFILLMENT_MODE_UNAVAILABLE",
      "message": "This product is not available for shipping.",
      "severity": "BLOCK",
      "source": "com.os.retailagent.shopping.fulfillment_constraints",
      "blocking": true
    }
  ]
}
```

**Deliberately two-state**, unlike `ComputedEligibility`'s three (`ELIGIBLE | CONDITIONAL |
BLOCKED`). Every RAOS-0003 v1 reason code is `BLOCK` severity with **no** `requirements[]`
resolution path (§6) — there is no buyer-side action ("upgrade tier," "upload a certificate")
that resolves "this item cannot physically reach you." A `CONDITIONAL`-equivalent state would
never be reachable in v1 and would be actively misleading (implying a resolution path exists
when none does). Reintroduce a third state only if a future, genuinely resolvable code is added
(none is currently planned — every candidate in §3's out-of-scope list is a live-capacity
concern, not a resolvable one).

Reason entries use the unified `ReasonEntry` shape from RAOS-0000 §8 — identical to RAOS-0001's
`EligibilityReason`.

---

## 6. Reason code registry

| Code | Meaning | Severity | Resolvable? |
|------|---------|----------|-------------|
| `FULFILLMENT_MODE_UNAVAILABLE` | Not available for the requested fulfillment mode | `BLOCK` | No |
| `REGION_NOT_SERVED` | This specific variant cannot reach the buyer's region, though the merchant generally serves it | `BLOCK` | No |
| `HAZMAT_RESTRICTION` | Hazmat-classified item, not shippable by parcel carrier | `BLOCK` | No (in `shipping` mode) |
| `OVERSIZE_RESTRICTION` | Exceeds standard parcel dimensions, not shippable by parcel carrier | `BLOCK` | No (in `shipping` mode) |
| `LEAD_TIME_EXCEEDS_NEED_BY` | Cannot be fulfilled by the buyer's stated deadline given the declared lead time | `BLOCK` | No |
| `CUTOFF_PASSED` | The merchant-local same-day cutoff has passed for a same-day-capable mode | `BLOCK` | No |

All six codes are namespaced under `com.os.retailagent.shopping.fulfillment_constraints`. New
codes should be additive; never repurpose an existing code's meaning (RAOS-0000 §7.4).

**`FULFILLMENT_MODE_UNAVAILABLE` is a rename, not a new concept.** It replaces RAOS-0001's
`FULFILLMENT_UNAVAILABLE`, which is deprecated (not re-emitted — see `specs/0001-eligibility.md`
§6/§11 for the "no dual-emit" reasoning). Same meaning; new owning namespace and name.

**`REGION_NOT_SERVED` is a deliberately DISTINCT code from RAOS-0001's `REGION_RESTRICTED`,**
not a rename. `REGION_RESTRICTED` (unchanged, RAOS-0001 §9.6) means "this merchant does not do
business in this region at all" — a merchant-level, evaluated-once-per-merchant fact
(`MerchantProfile.servesRegions`). `REGION_NOT_SERVED` means "the merchant generally serves this
region, but this specific item cannot reach it" — a variant-level, evaluated-per-item fact (e.g.
a merchant that ships nationwide except a hazardous-materials item that cannot legally cross a
state's carrier restrictions). Collapsing these into one code would lose exactly the distinction
an agent needs to explain correctly: "we don't do business here" is a fundamentally different
buyer conversation than "this ONE item can't reach you, everything else in your cart can."

**Neither code is resolvable.** Unlike RAOS-0001's `WHOLESALE_ONLY` or
`RESALE_CERTIFICATE_REQUIRED`, there is no buyer-side action that resolves a reachability block
— a buyer cannot "upgrade" their region or "become" a non-hazmat shipment. The agent's correct
behavior is to explain, not to offer a path.

---

## 7. Evaluation algorithm

Deterministic. Same `(variant, context, now, merchantTimezone)` → same result, every time. No
model in the loop.

1. **If the variant has no `fulfillmentConstraints`** → return `FEASIBLE` immediately, no
   reasons. (Preserves implicit behavior for every pre-RAOS-0003 variant — mirrors RAOS-0005's
   convention for variants without an `inventory` config.)
2. **Otherwise evaluate each configured check, accumulating ALL applicable reasons** (does not
   stop at the first — an agent should see every blocker in one pass, mirroring RAOS-0001's
   accumulation pattern):
   - `availableModes` is set and `context.fulfillmentMode` is not in it → add
     `FULFILLMENT_MODE_UNAVAILABLE` (`BLOCK`).
   - `restrictedRegions` includes `context.marketRegion` → add `REGION_NOT_SERVED` (`BLOCK`).
   - `hazmat` is true and `context.fulfillmentMode === 'shipping'` → add `HAZMAT_RESTRICTION`
     (`BLOCK`).
   - `oversize` is true and `context.fulfillmentMode === 'shipping'` → add
     `OVERSIZE_RESTRICTION` (`BLOCK`).
   - `leadTimeDays` is set AND `context.needByDate` is asserted (§4.3.1 — absent never blocks):
     compute the merchant-local calendar date at `now` (via `merchantTimezone`), add
     `leadTimeDays`; if that date is later than `needByDate` → add
     `LEAD_TIME_EXCEEDS_NEED_BY` (`BLOCK`). An unparseable `needByDate` or an unresolvable
     `merchantTimezone` OMITS this check (fail-degraded per RAOS-0000 §7.3), never fabricates a
     block from malformed input.
   - `cutoffHourLocal` is set AND `context.fulfillmentMode` is `pickup` or `local_delivery`
     (cutoff is a same-day-fulfillment concept only — irrelevant to `shipping`): compute the
     merchant-local hour at `now`; if `>= cutoffHourLocal` → add `CUTOFF_PASSED` (`BLOCK`). An
     unresolvable `merchantTimezone` OMITS this check.
3. **Derive final status:** any reason present → `BLOCKED`; no reasons → `FEASIBLE`. (Simpler
   than RAOS-0000 §8.1's general three-state derivation because every v1 code is `BLOCK` with no
   `requirements[]` — see §5.1.)

### Determinism note: timezone conversion without a `Date` object

`now` (injected Unix epoch ms) is converted to a merchant-local calendar date/hour using
`Intl.DateTimeFormat` fed the raw epoch number directly — never wrapped in `new Date(...)`, which
this codebase's determinism lint forbids inside `src/lib/rules`/`src/lib/extensions` (RAOS-0000
§7.1, MASTER-BUILD-PLAN §1.3). Calendar-date arithmetic (`today + leadTimeDays`) uses a pure,
allocation-free Gregorian civil-calendar↔epoch-day algorithm (Howard Hinnant's
`days_from_civil`/`civil_from_days`) rather than constructing a `Date` and calling
`setDate`/`getTime`. See the doc comment in `src/lib/rules/fulfillment.ts` for the full
rationale and a verified example.

---

## 8. Worked examples (the three archetypes)

### Fresh Corner Market — mode, region, lead time, and cutoff (grocery)

**Fresh Organic Bananas** (`v_g_003_1`): `availableModes: ['pickup', 'local_delivery']`,
`restrictedRegions: ['HI', 'AK']`.

- **Buyer requests `shipping`** → `FEASIBLE` check fails → `BLOCKED
  [FULFILLMENT_MODE_UNAVAILABLE]`. *Agent doesn't promise shipping it can't deliver.*
- **Buyer in HI, any mode** → `BLOCKED [REGION_NOT_SERVED]`. *Agent explains — "this specific
  item cannot be fulfilled in HI" — even though Fresh Corner Market generally serves HI
  (`servesRegions` includes `'HI'`, RAOS-0001 §9.6). Two different reasons, two different
  buyer conversations.*
- **Buyer in CA, mode `pickup`** → `FEASIBLE`. Same item, no blockers.

**Custom Celebration Cake** (`v_g_fulfill_001_1`, `leadTimeDays: 3`): a buyer asserting
`needByDate` two days out, evaluated against a `now` where the merchant-local calendar date +
3 days lands after the buyer's need-by date → `BLOCKED [LEAD_TIME_EXCEEDS_NEED_BY]`. A buyer
asserting no `needByDate` at all (the common case) → `FEASIBLE` — the check never fires without
an asserted deadline (§4.3.1).

**Hot Deli Party Tray** (`v_g_fulfill_002_1`, `cutoffHourLocal: 14`): a `pickup` request
evaluated at a `now` past 2pm America/New_York → `BLOCKED [CUTOFF_PASSED]`. The same request for
`shipping` mode never triggers this check — cutoff is a same-day concept, irrelevant to a
multi-day shipping promise.

**This is also the BOPIS demonstration referenced in the wiki intent doc:** Fresh Corner Market's
bananas are the mode/region showcase; the two new grocery variants extend that with the
time-based checks the wiki's "layering up" section named as next.

### Atlas Wholesale — carrier restrictions (hazmat/oversize freight)

**Industrial Degreaser Solvent** (`v_w_fulfill_001_1`, `hazmat: true`): a `shipping` request →
`BLOCKED [HAZMAT_RESTRICTION]`. A `pickup` or `local_delivery` request → `FEASIBLE`. *Agent
explains why a parcel carrier can't move this, and that pickup is available.*

**Commercial Convection Oven** (`v_w_fulfill_002_1`, `oversize: true`): same shape,
`OVERSIZE_RESTRICTION` instead. Both variants also carry `eligibilityRules: { hideFromGuests:
true, requireWholesale: true }` — a guest buyer sees `HIDDEN_PRODUCT` (RAOS-0001) before ever
reaching a feasibility question; see the precedence note below.

### Precedence when eligibility AND feasibility both block (the §3 open question, now decided)

`STAGE_ORDER` is `VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE`
(`src/lib/extensions/contract.ts`; see that file's doc comment for the full architectural
write-up). **Decision: first-blocking-stage governs.** Both reasons still fire and both appear
in `DecisionRecord.reasons`, but `src/lib/trace/derive.ts`'s `governingReason` — the single
reason surfaced as *the* explanation — picks the first `BLOCK` in stage order. Since
`ELIGIBILITY` runs before `FEASIBILITY`, a guest buyer hitting a hazmat, wholesale-only item
sees `HIDDEN_PRODUCT` (visibility/eligibility) govern, not a carrier-restriction message the
buyer couldn't act on anyway (they're not even a wholesale account yet). "Who is allowed to buy
this at all" governing over "can we physically get it to this specific buyer" is the more useful
ordering for an agent's explanation — it addresses the buyer's most fundamental blocker first.
Tested in `src/lib/rules/__tests__/fulfillment.test.ts`
("evaluateOffer — ELIGIBILITY precedence over FEASIBILITY").

### Sara's Boutique — discovery-led, open DTC

No `fulfillmentConstraints` on any variant. Every buyer, every mode → `FEASIBLE`, no reasons.
*Clean payload — this archetype's gap is discoverability (a future spec), not reachability.*

---

## 4.4 v1.1 — quick-commerce additions (2026-08-16)

Motivated by the `/guided/platform` late-night NYC pizza scenario: v1.0's cutoff/lead-time checks
answer "past 2pm, no more same-day pickup" and "3 days out, too late for the deadline" — both
day-or-hour granularity. Quick commerce needs minute granularity ("accepting until 12:30 AM,"
"ready in 16 minutes, need it by midnight") and a real weekly schedule, not a single cutoff hour.
All additions below are **optional and additive** — a merchant/variant that declares none of them
sees byte-identical v1.0 behavior (see `packages/engine/CHANGELOG.md` 0.4.0 entry for the full
diff).

### 4.4.1 Merchant operating schedule — `MerchantProfile.serviceSchedule?`

```ts
type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface LocalTimeRange {
  opensAt: string;  // 'HH:mm', merchant-local
  closesAt: string; // 'HH:mm'; closesAt <= opensAt means the interval crosses midnight
}

interface DailyServiceHours {
  day: DayOfWeek;
  intervals: LocalTimeRange[]; // multiple per day supported (lunch + dinner)
}

interface ServiceScheduleException {
  date: string;              // 'YYYY-MM-DD', merchant-local
  closed?: boolean;          // overrides weekly for this date
  intervals?: LocalTimeRange[]; // replaces (not merges with) weekly's intervals for this date
}

interface ServiceSchedule {
  weekly: DailyServiceHours[];
  exceptions?: ServiceScheduleException[];
  orderAcceptanceBufferMinutes?: number; // minutes before closesAt that order ACCEPTANCE ends
}
```

**Deviation from the sketch in the work-package brief:** the brief's sketch used a single
top-level `exceptions?` array keyed by date, matched by exact string equality against the
merchant-local calendar date — implemented exactly as sketched, no changes needed. The one
addition beyond the sketch is `orderAcceptanceBufferMinutes` living on `ServiceSchedule` itself
(not per-interval) — a single per-merchant "how long before physical close does the kitchen stop
taking new orders" buffer was sufficient to fully answer the demo scenario correctly.

**Required, not optional-with-a-default?** Unlike `MerchantProfile.timezone`/`servesRegions`,
`serviceSchedule` is **optional**. Those two are true-once-per-merchant invariants every merchant
must have an answer for; a schedule is a genuinely new capability most non-quick-commerce
merchants in this codebase's fixtures have no use for, and RAOS-0000 §7.4's blast-radius
discipline argues against forcing every existing `MerchantProfile` fixture to grow one. Absence
OMITS `STORE_CLOSED`/`ORDER_ACCEPTANCE_ENDED` — this is not "default to open," it is declining to
assert a claim the merchant never made (§7.3 fail-degraded discipline, same shape as every other
optional field in this spec).

### 4.4.2 Preparation time — `FulfillmentConstraints.preparationTimeMinutes?`

Per-variant (an item fact, not a merchant fact — two dishes from the same kitchen can have
different prep times). Feeds `PREPARATION_EXCEEDS_NEED_BY` and `INSUFFICIENT_TIME_BEFORE_CLOSE`.

### 4.4.3 Exact deadline — `BuyerContext.needByAt?`

An ISO 8601 timestamp with an explicit offset (`Z` or `±HH:mm` — no bare local-time strings).
Same deliberate-exception-to-most-restrictive-defaulting shape as `needByDate` (§4.3.1): absence
never blocks. **Scope decision:** `needByAt` feeds ONLY the two new v1.1 checks. It does **not**
retroactively change `LEAD_TIME_EXCEEDS_NEED_BY`, which remains keyed to `needByDate` exclusively
— that check is day-granularity by design (§9.3) and deriving a calendar date from `needByAt`
would just reproduce what `needByDate` already expresses. A caller that wants both check families
to see its deadline should assert both fields.

### 4.4.4 New reason codes

| Code | Meaning | Gate |
|------|---------|------|
| `STORE_CLOSED` | Not open at the requested instant, per `serviceSchedule` | `pickup`/`local_delivery` only |
| `ORDER_ACCEPTANCE_ENDED` | Still open, but past `closesAt − orderAcceptanceBufferMinutes` | `pickup`/`local_delivery` only |
| `PREPARATION_EXCEEDS_NEED_BY` | `now + preparationTimeMinutes` is after `needByAt` | `pickup`/`local_delivery` only |
| `INSUFFICIENT_TIME_BEFORE_CLOSE` | `now + preparationTimeMinutes` is after the schedule's close | `pickup`/`local_delivery` only |

All four are gated to same-day modes — same rationale as v1.0's `cutoffHourLocal`: whether the
store is open right now, or can finish an order before its own close, is not a fact a multi-day
shipping promise depends on. All four are `BLOCK` severity, non-resolvable, same shape as every
other v1.0 code. None duplicates an existing code's meaning: `CUTOFF_PASSED` is a single fixed
hour a merchant declares once; `STORE_CLOSED`/`ORDER_ACCEPTANCE_ENDED` read a full weekly schedule
with exceptions — a materially richer, and optional, superset a merchant can adopt independently
of the older, simpler cutoff-hour field (both may be declared; both evaluate independently).

### 4.4.5 What stays explicitly out of the deterministic engine

Live courier capacity, routing, and delivery ETA remain platform/provider inputs, never RAOS
engine computations — see §9.1 (unchanged from v1.0) and the new
`specs/work-packages/RAOS-0003-quick-commerce-provider-signals.md` work-package brief, which
documents (but does not build) the provider-signal shape the `/guided/platform` demo's fictional
`PlatformFulfillmentSignal` data mirrors.

### 4.4.6 The "keep accepting for N more minutes" customer constraint

The NYC demo's shopper constraint ("only show stores that will keep accepting orders for at least
another 30 minutes") is modeled as a **platform/discovery comparison**, not a new `BuyerContext`
field or engine check: the merchant exposes its acceptance-cutoff fact (`serviceSchedule` +
`orderAcceptanceBufferMinutes`, evaluated via `ORDER_ACCEPTANCE_ENDED`); the platform compares that
signal against its own `minimumAcceptanceWindowMinutes: 30` shopper-intent value and the fixed
scenario clock. This deliberately avoids conflating a shopper *preference* with a merchant
*capability* — see the RAOS-0004 roadmap note below and
`specs/wiki/pending/0004-discovery-match.md`.

---

## 9. Open questions — Request for Comment

These are genuine forks. If you operate a fulfillment network, this section is written for you —
tell me I'm wrong.

### 9.1 The provider-delegation extension point (designed, not built)

**This is the central open question of this spec.** Decision A (this WP) ships **merchant-owned
feasibility only**: the merchant declares `fulfillmentConstraints` and RAOS computes
reachability from it. That is the right v1 scope — it needs no third-party integration and is
fully deterministic. But it is not how feasibility actually works for a fulfillment network. A
merchant says "I stock milk." Instacart, DoorDash, or Uber says "I can deliver it to this
address in two hours" — a fact the merchant does not have and cannot assert, because it depends
on driver availability, routing, and real-time capacity none of that merchant's systems can see.
RAOS currently has **no third-party fulfillment-provider actor** — only merchant and buyer. This
subsection designs the extension point that would let a provider assert feasibility on a
merchant's behalf. It is explicitly **designed, not built** — nothing here ships in this WP.

**1. How does a merchant declare "feasibility for mode X is asserted by provider P"?**

Proposed manifest shape (a new, optional field on the per-capability entry the merchant already
publishes at `/.well-known/ucp` — RAOS-0000 §6):

```jsonc
{
  "namespace": "com.os.retailagent.shopping.fulfillment_constraints",
  "version": "1.0.0",
  "delegatedProviders": [
    {
      "mode": "local_delivery",
      "providerId": "instacart",
      "assertionEndpoint": "https://api.instacart.com/raos/v1/feasibility",
      "trustMode": "signed"
    }
  ]
}
```

An agent that sees `delegatedProviders` for the mode it's evaluating knows to query the named
endpoint for a feasibility assertion INSTEAD of, or as well as, evaluating the merchant's own
`fulfillmentConstraints` for that mode — the merchant-declared config becomes the fallback for
modes the provider doesn't cover, not the sole source of truth. This is the same shape as the
existing capability negotiation (RAOS-0000 §6.1: "negotiate on `capabilities[]`, never on the
ladder") extended one level deeper: negotiate on *which actor* answers a given mode, not only on
whether the capability exists at all.

**Open fork:** should this live on the manifest (discovery-time, cacheable, matches how every
other capability negotiates) or be resolved per-evaluation (freshest, but defeats the whole
point of a cacheable manifest for a fast-moving signal)? Leaning: manifest for WHO to ask,
per-evaluation for the actual answer (§9.1.3 below) — the two questions have different
staleness tolerances and shouldn't share one cache lifetime.

**2. Who signs the assertion, and how does it compose with RAOS-0008's trust/provenance
envelope?**

A provider assertion is **third-party data** — the merchant is not the one asserting it, and
the buyer's agent has no independent way to verify a provider actually said what the merchant's
manifest claims it said, unless the assertion itself is signed. This maps directly onto
RAOS-0000 §9's `trustMode` distinction: `asserted` (the merchant's word that Instacart said X, no
independent verification) vs `signed` (a token or payload signed by the provider's own key,
verifiable against a `keyId` the provider publishes — the same `issuer`/`keyId`/`signature`
shape RAOS-0008 already defines for merchant-signed envelopes, `MerchantKey`/`verifyEnvelope`).

**The fork:** a provider assertion should almost certainly ship as `trustMode: 'signed'` from
day one, not `'asserted'` — unlike a buyer's self-reported membership tier (where `'asserted'`
is an acceptable, if downgraded, default per RAOS-0000 §7.2), a provider's capacity claim
directly gates whether the agent tells the buyer "yes, we can deliver this" and money changes
hands on the strength of that claim. An unsigned, agent-relayed "Instacart said yes" is a much
riskier thing to act on than a buyer's own loyalty-tier claim, precisely because the buyer has no
incentive to lie about their OWN identity claims the way a compromised or careless intermediary
might misrepresent a third party's claim. Recommend: `RAOS-0003 requires trustMode: 'signed' for
any `delegatedProviders` entry; a manifest that declares delegation with `trustMode: 'asserted'`
should be treated as **not delegated** (fall back to merchant-declared `fulfillmentConstraints`)
rather than trusted at a lower bar than the stakes warrant. Open for comment — is that too
strict for a v1 pilot integration where a provider hasn't stood up signing infrastructure yet?

**3. Freshness — a two-hour delivery promise is far more perishable than a shipping policy.**

RAOS-0000 §9's freshness envelope (`computedAt` + `ttlSeconds`) already exists for exactly this
kind of decay, and RAOS-0003's own `STAGE_TTL_DEFAULTS['FEASIBILITY'] = 3600` (one hour) is
calibrated for merchant-DECLARED config — mode/region/hazmat/oversize/lead-time/cutoff are all
static, catalog-level facts that don't change minute to minute. A provider's live capacity
answer is nothing like that: "I can deliver in 2 hours" can go stale in minutes as drivers pick
up other orders. A single TTL default cannot serve both. **Proposed:** a delegated-provider
assertion carries its OWN `freshness.ttlSeconds`, provider-declared (likely on the order of
60–300 seconds, not 3600), riding in the SAME envelope shape but overriding the stage default for
that specific reason entry. **What an agent does with a stale one:** per RAOS-0000 §7.3
(fail-degraded, never fail-open) — a stale provider assertion should degrade to "unknown,"
which for a feasibility question means falling back to the merchant's own declared
`fulfillmentConstraints` (if any) rather than either (a) trusting a stale "yes" (could promise
something no longer true) or (b) hard-blocking on staleness alone (could wrongly deny a still-true
"yes" over a caching artifact). Open for comment: is "fall back to merchant config" the right
degrade target, or should a stale provider assertion instead surface as its own `INFO`/`CONDITION`
reason ("delivery estimate may be outdated, confirm before purchase") so the agent can choose?

**4. What breaks in the current model if the provider disagrees with the merchant?**

Today, `fulfillmentConstraints` is the ONLY source of truth for a given variant/mode — there is
no mechanism for two answers to exist simultaneously, so "the provider disagrees with the
merchant" is not a state the current type system or evaluation algorithm can even represent. Two
concrete disagreement shapes to design for:

- **Merchant says feasible, provider says not feasible** (e.g. merchant declares
  `availableModes: ['local_delivery']` generally, but the provider's live routing says this
  specific address is outside today's delivery radius). This is the common, expected case —
  provider data is MORE current and MORE granular (address-level, not region-level) than
  merchant-declared config, so provider-says-no should win when a delegated provider exists for
  that mode. This is a straightforward override, not really a "disagreement" to reconcile.
- **Merchant says NOT feasible (a declared restriction), provider says feasible anyway** — e.g. a
  merchant declared `restrictedRegions` conservatively before onboarding a delivery provider that
  can actually reach that region. This is the harder case: should a provider be able to OVERRIDE a
  merchant's own declared restriction? Recommend: **no** — a merchant-declared restriction is
  closer to a business/legal decision (a merchant may have declared a region restricted for
  reasons a delivery-capability provider cannot see — a licensing or compliance reason, not a
  logistics one) than a capacity fact, and RAOS-0003 in general treats a merchant's own
  declarations as authoritative over provider inference (mirrors RAOS-0001 §9.6's servesRegions
  being merchant-authoritative, not inferred). A provider narrows what's possible; it should not
  widen past what the merchant explicitly declared impossible. Open for comment: is that too
  conservative for a merchant who genuinely just has a stale restriction they forgot to update?

**Summary of what's designed vs. what's decided:** the manifest shape, the trust-mode
requirement, and the freshness-override mechanism are proposals, open for comment. The
merchant-restriction-wins-over-provider-optimism rule is a stronger recommendation but still
open. NONE of this is built — Decision A ships merchant-owned feasibility only; this subsection
exists so a provider partner reading this spec has something concrete to react to before any of
it is implementation-locked.

### 9.2 Should `HAZMAT_RESTRICTION`/`OVERSIZE_RESTRICTION` ever be resolvable?

v1 treats both as unconditionally non-resolvable in `shipping` mode — there's no `requirements[]`
path (§5.1). Is that right for every case, or does a merchant sometimes offer a HAZMAT-rated
carrier upcharge that WOULD make shipping possible for a fee? If so, that's a `requirements[]`
entry this spec doesn't have a `Requirement.type` for yet (RAOS-0000 §8's registry currently
lists `customer_type | membership_tier | tax_exempt | resale_certificate | moq |
quantity_increment` — none fit "pay a hazmat surcharge"). Left as a genuinely open fork rather
than guessed at, per this WP's "do not ship a reason code you cannot test" discipline — no
catalog variant or test exercises a resolvable hazmat path in v1.

### 9.3 Is calendar-date lead time granular enough?

`leadTimeDays` compares whole merchant-local calendar dates, not hours. A `leadTimeDays: 1` item
ordered at 11:58pm merchant-local and one ordered at 12:02am the same lead-time-day both get
"tomorrow" as their earliest date, even though the first buyer effectively got almost zero lead
time and the second got nearly a full day. Is day-granularity sufficient for v1, or does this
need to compose with `cutoffHourLocal` (treat "past cutoff" as consuming a lead-time day)? Not
composed in v1 — the two checks are independent. Open for comment from anyone who has actually
run a lead-time-sensitive fulfillment operation.

---

## 10. Why this spec

Fulfillment feasibility is the other half of "no dead-end carts." RAOS-0001 proved a buyer can be
ineligible; RAOS-0005 proved an item can be out of stock; this spec proves an item can be
unreachable — three independent, composable ways the SAME cart line can be a dead end, each with
its own reason code an agent can explain rather than silently drop. Promoting it to Tier 1
alongside those two specs, rather than leaving it at Tier 4 behind loyalty and returns, says
plainly that reachability is not a nice-to-have for the merchants who most need this spec — it is
the whole business. §9.1's provider-delegation design is the mechanism by which that becomes true
beyond a single merchant's own declared config: the day a fulfillment network is willing to sign
a feasibility assertion, this spec has a documented seam ready for it.

---

## 11. Changelog

### v1.1.0 — 2026-08-16 (quick-commerce additions, `/guided/platform` NYC pizza scenario)

Additive only. New optional `MerchantProfile.serviceSchedule`, new optional
`FulfillmentConstraints.preparationTimeMinutes`, new optional `BuyerContext.needByAt`. Four new
reason codes: `STORE_CLOSED`, `ORDER_ACCEPTANCE_ENDED`, `PREPARATION_EXCEEDS_NEED_BY`,
`INSUFFICIENT_TIME_BEFORE_CLOSE` — all gated to same-day modes, all `BLOCK`/non-resolvable, same
shape as v1.0's codes. See §4.4 above for the full design write-up and
`packages/engine/CHANGELOG.md` 0.4.0 for the engine-package diff. Live courier/routing/ETA signals
remain explicitly out of scope — designed (not built) in
`specs/work-packages/RAOS-0003-quick-commerce-provider-signals.md`.

### v1.0.0 — 2026-08-12 (initial draft, Tier 1 promotion)

Initial draft. Promoted directly to Tier 1 at inception (prior placement in the program plan was
Tier 4/Plane 4 — see `specs/PROGRAM-PLAN.md` §6 and `specs/wiki/pending/0003-fulfillment.md` for
the historical scope reference). Six reason codes (`FULFILLMENT_MODE_UNAVAILABLE`,
`REGION_NOT_SERVED`, `HAZMAT_RESTRICTION`, `OVERSIZE_RESTRICTION`,
`LEAD_TIME_EXCEEDS_NEED_BY`, `CUTOFF_PASSED`), three worked archetypes, one substantial Open
Question (§9.1, the provider-delegation extension point). Deterministic-only scope; live
delivery-window capacity explicitly deferred (§3).

**Contract changes accompanying this version (breaking, engine 0.3.0):**

- `STAGE_ORDER` reordered: new `FEASIBILITY` stage inserted between `ELIGIBILITY` and `PRICE`
  (`src/lib/extensions/contract.ts`).
- `BuyerContext.needByDate?: string` added (RAOS-0000 §13 changelog).
- `MerchantProfile.timezone: string` added, REQUIRED (RAOS-0000 §13 changelog).
- `FulfillmentConstraints` extended: `hazmat`, `oversize`, `leadTimeDays`, `cutoffHourLocal`
  added (additive); `availableModes`/`restrictedRegions` unchanged in shape, relocated in
  ownership from RAOS-0001.
- RAOS-0001's `FULFILLMENT_UNAVAILABLE` deprecated (no dual-emit) and `REGION_RESTRICTED`
  narrowed in meaning — see `specs/0001-eligibility.md` §11 v2.0.0 entry for the full write-up.

---

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md) for the full
set and how to contribute.*
