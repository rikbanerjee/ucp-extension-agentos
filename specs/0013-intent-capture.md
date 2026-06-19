---
spec: RAOS-0013
title: "Intent Capture, Assisted Commerce & Decision Trace"
version: 0.1.0
status: "Draft · RFC"
tier: 3
namespace: "com.os.retailagent.shopping.trace"
date: "June 2026"
---

# RAOS-0013 · Intent Capture, Assisted Commerce & Decision Trace

**Namespace:** `com.os.retailagent.shopping.trace`
**Version:** 0.1.0 · Draft · RFC · June 2026
**Tier:** 3 · Member-aware

---

## Section 1 — Decision Trace

### 1.1 Why this exists

The UCP pipeline (`evaluateOffer`) produces a `DecisionRecord` — a complete substrate
containing every reason code emitted, every stage result, and provenance metadata.
That substrate is machine-readable by nature. RAOS-0013 §1 defines how to **render**
that substrate for three distinct audiences: developers debugging a pipeline run,
merchants investigating a catalog configuration issue, and buyers reading a purchase
decision in plain language.

None of the renderers augment the record. They are pure transformations of the
`DecisionRecord` — same record always produces the same rendered output.

---

### 1.2 The three-audience rendering contract

| Audience | Function | Output shape | Visibility |
|---|---|---|---|
| Developer | `renderDeveloperTrace(trace)` | Stable, alphabetically sorted JSON string | Full trace — all fields, all reasons |
| Merchant | `renderMerchantTrace(trace)` | `MerchantTraceRow[]` table | BLOCK + CONDITION reasons only; config hints |
| Buyer | `renderBuyerTrace(trace)` | `BuyerTraceView` card | Deny-listed — no internal fields |

**Developer trace** — intended for agent developers and platform integrators debugging
a pipeline evaluation. The full `DecisionTrace` is JSON-serialized with stable,
alphabetically-sorted key order at every nesting level. Round-trip safe: parsing and
re-rendering the JSON produces identical output.

```json
// Example developer trace (abbreviated)
{
  "computedAt": 0,
  "envelope": { "issuer": "...", "keyId": "k1", "trustMode": "asserted", ... },
  "governingReason": {
    "reason": { "code": "TIER_RESTRICTION", "severity": "BLOCK", ... },
    "resolutionPath": "Requires membership tier: gold"
  },
  "inputsHash": "a3f7c2d1",
  "isTransactable": false,
  "offerStatus": "BLOCKED",
  "reasons": [ ... ],
  "stageVerdicts": [ ... ],
  "traceSchema": "1.0.0",
  "unitPrice": null
}
```

**Merchant trace** — intended for a merchant's operations team viewing why a
configuration is blocking or conditioning a sale. Only reasons with severity `BLOCK`
or `CONDITION` appear (INFO reasons are advisory and too noisy for an ops view).
Each row includes: `stage | status | code | message | actionHint`. The `actionHint`
is derived from a hardcoded lookup table (no LLM, deterministic). A `PASS` row is
returned when there are no actionable reasons.

| Stage | Status | Code | Message | Action Hint |
|---|---|---|---|---|
| ELIGIBILITY | BLOCK | TIER_RESTRICTION | This item requires gold membership... | Review eligibilityRules.requiredTier in your catalog config |
| — | PASS | NO_ISSUES | All pipeline stages passed. | No action required. |

**Buyer trace** — intended for end-buyer display, for example in a shopping agent's
chat interface. This renderer is the most restricted — it applies a hard deny-list
(see §1.3) and returns only three fields: `canPurchase`, `headline`, and optionally
`detail` and `nextStep`.

```json
// Example buyer trace — blocked
{
  "canPurchase": false,
  "headline": "This item is only available to wholesale customers.",
  "nextStep": "Contact us for wholesale pricing"
}

// Example buyer trace — available
{
  "canPurchase": true,
  "headline": "Available for purchase",
  "detail": "Price: $45.00"
}
```

---

### 1.3 Buyer audience deny-list

The following fields must **never** appear in the output of `renderBuyerTrace`.
This is enforced by construction (only whitelisted fields are written) and
verified by unit tests that `JSON.stringify(result)` does not contain any of
these as JSON object keys:

- `floor`
- `margin`
- `cost`
- `suppressed` (including `suppressedOffers`)
- `inputsHash`
- `computedAt`
- `keyId`
- `signature`
- `source`
- `appliedOffers`

The rationale: buyers should see a decision, not the merchant's pricing model.
Internal fields like `floor`, `margin`, `cost`, and provenance metadata are
commercially sensitive and must not be surfaced in buyer-facing output.

---

### 1.4 `traceSchema` versioning approach

The `traceSchema` field on `DecisionTrace` carries the version of the trace shape.
Currently `'1.0.0'`. Consumers should:

- Parse the `traceSchema` field before reading any fields.
- Treat unknown top-level fields as additive (forward-compatible).
- Treat a missing `traceSchema` field as a pre-1.0.0 shape.

`traceSchema` bumps on breaking field removals or renames. Additive field additions
are compatible within the same major version (RAOS-0000 §7.4 policy).

---

### 1.5 Implementation notes

The trace is derived from the `DecisionRecord` produced by `evaluateOffer`:

```typescript
import { evaluateOffer } from '@/lib/extensions';
import { buildDecisionTrace } from '@/lib/trace/derive';
import { renderDeveloperTrace, renderMerchantTrace, renderBuyerTrace } from '@/lib/trace/render';

const record = evaluateOffer({ merchant, variant, quantity, context, now });
const trace  = buildDecisionTrace(record);

const devJson    = renderDeveloperTrace(trace);   // string (JSON)
const merchantRows = renderMerchantTrace(trace);  // MerchantTraceRow[]
const buyerView  = renderBuyerTrace(trace);       // BuyerTraceView
```

`buildDecisionTrace` is a pure function — it does not call `Date.now()`,
`Math.random()`, or any I/O. The determinism invariant holds end-to-end.

---

## Section 2 — Intent Capture & Routing

Planned — WP-14. See MASTER-BUILD-PLAN.md WP-14 brief.

When checkout is not the outcome, the agent needs an action vocabulary:
out-of-stock notify-me, B2B quote request, WhatsApp/lead-form routing, wishlist.
These are non-checkout assisted commerce flows. The full intent capture and routing
contract will be defined in WP-14. The namespace `com.os.retailagent.shopping.intent`
(distinct from `…trace`) will own that surface.

---

## Changelog

| Version | Date | Notes |
|---|---|---|
| 0.1.0 | June 2026 | Decision trace section (WP-08). Intent capture routing — planned WP-14. |

---

## Open Questions

1. **Should the `traceSchema` be a separate field on `DecisionRecord` or only on
   the rendered output?** Current: only on rendered output (the DecisionTrace and
   developer JSON). Leaning: keep it on the rendered output only — the record is
   not a versioned API surface.

2. **Should the merchant renderer expose the stage the reason came from as a
   structured field (PipelineStage enum) or as a display string?** Current: string.
   A typed PipelineStage would let tools filter by stage. Deferred to first
   consumer integration.

3. **Buyer trace: is `canPurchase: true` on a CONDITIONAL trace correct?** Per the
   current spec, CONDITIONAL means a resolution path exists — the offer is
   transactable. Some agents may want to surface CONDITIONAL as "not yet available"
   to avoid a confusing UX. Open for RFC.

---

> **Owner review required** before this spec page is published publicly.
> Trace schema and sample renderings are ready for review.
