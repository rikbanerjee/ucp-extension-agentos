# Why the manifest/region-allowlist fix matters for agentic fulfillment

**Status:** reference note, not a spec. Cites and summarizes `specs/0000-foundations.md`,
`specs/0001-eligibility.md` §9.6, and commit `1891ad3` (2026-08-02).
**Audience:** (1) a future coding agent picking up this codebase who needs the *why*, not just
the diff; (2) external readers at companies building agentic fulfillment (Instacart-style
"agent shops/orders for the buyer" products) who want a concrete instance of a trust-boundary
bug in this problem space.
**Written:** 2026-08-11.

---

## 1. The one-sentence version

An AI agent placing an order on a buyer's behalf can only be as trustworthy as the gap between
**what a merchant's manifest declares** and **what the merchant's engine actually enforces** —
this repo had a real, tested instance of that gap (found via a partner pilot audit, not
hypothetically), and this doc records what it was, how it was fixed, and why the fix is the
generalizable part.

---

## 2. The problem class, not just the bug

Agentic commerce adds a step that human shopping doesn't have: an agent must decide, *before*
committing a buyer to an order, whether that order is even possible — will this merchant serve
this buyer's region, in this fulfillment mode, for this item. A human tolerates finding out at
checkout ("sorry, we don't ship to Hawaii") and shrugging. An unattended agent doesn't have that
luxury — it needs the true answer up front, structured enough to act on (retry elsewhere,
explain to the buyer, or stop).

That pre-checkout truth normally lives in one of two places:
- **Declared** — a manifest / capabilities document the agent reads once, up front.
- **Enforced** — the actual decision engine that evaluates a specific order.

If those two ever disagree, the agent either sees a false negative (manifest under-declares —
missed sales) or, worse, a **false positive**: the manifest (or the absence of any check) implies
"this will work," the agent commits the buyer, and the order fails or — worse — silently
succeeds somewhere it shouldn't have. That second failure mode is exactly what this repo's
2026-08-02 fix addresses.

---

## 3. What was actually broken (TheCustomHub Track B pilot audit, 2026-08-01)

Two defects, both about **declared vs. enforced** drifting apart:

### 3.1 The manifest under-declared (`buildManifest` was a lossy pass-through)

`src/lib/projections/manifest.ts` used to be `return profile.manifest` — a bare pass-through.
`MerchantProfile.endpoints` (catalog/cart/checkout URLs) and `MerchantProfile.servesRegions`
were never copied into the object served at `/.well-known/ucp`, even when the merchant had
both configured. An agent reading the manifest — the one document that's supposed to make a
merchant's tier-0 "Discoverable" claim true — could not find where to transact, and could not
tell which regions were served. The manifest was *incomplete*, not wrong, but incomplete is
its own failure mode: an agent can't act on a fact it was never given.

### 3.2 The engine under-enforced (region gating lived outside the shared engine)

`checkServesRegion()` (`src/lib/rules/regionAllowlist.ts`) existed and was correct — but nothing
in the shared engine called it. The **only** thing enforcing region eligibility was a manual
pre-check the TheCustomHub pilot had bolted onto their own server, outside `evaluateOffer()`.
Any other integration calling the shared engine directly — which is the entire point of a shared
engine — got **no region enforcement at all**. `evaluateOffer()` alone would not block a buyer
in an unserved region. That's the concrete, demoable version of "the agent successfully placed
an order the merchant never actually wanted to fulfill."

---

## 4. The fix, and why each piece is the generalizable part

| Change | File | Why it's not merely a patch |
|---|---|---|
| `buildManifest()` composes `endpoints` + `servesRegions` into the manifest instead of passing `profile.manifest` through untouched | `src/lib/projections/manifest.ts` | Makes the manifest *complete by construction* — `buildManifest(profile)` is now sufficient on its own; no caller has to reach back into the profile for facts the manifest should have carried. |
| `MerchantProfile.servesRegions: string[]` is now a **required** field (TypeScript, not a runtime convention) | `src/lib/types/core.ts` | Converts "a merchant forgot to declare where it ships" from a silent runtime gap into a compile error. Prevention beats detection. |
| Region allowlist enforced as a short-circuit **inside** `evaluateOffer()`, not left to adapter-side pre-checks | `src/lib/extensions/pipeline.ts` | Every caller of the shared engine now gets region enforcement whether or not they remembered to write their own pre-check. This is the fix for the actual pilot defect — enforcement moved from "one partner's bespoke code" to "the shared decision surface." |
| Undeclared `servesRegions` (only reachable via a JS/JSON profile that bypasses the TS type) is **not silently permissive** — it emits a one-time `REGION_POLICY_UNDECLARED` (`INFO`) reason at manifest-build time, and Tier 1 conformance now requires the field | `manifest.ts`, conformance scoreboard | Backstops the callers the type system can't reach. Loud-but-non-blocking beats both "silently blocks everyone" (breaks every existing merchant) and "silently enforces nothing" (the original bug). |
| `checkServesRegion()` stays exported | `src/lib/rules/regionAllowlist.ts` | Adapters that want a cheaper pre-check (e.g. inside `BuyerContextResolver.resolve`, before ever constructing an `EvaluateOfferInput`) can still short-circuit early — it's now *an* enforcement point, not the *only* one. |

Full reasoning, the three options considered for the undeclared-state fork, and why option (c)
was chosen: `specs/0001-eligibility.md` §9.6 (OQ-2). Manifest half: `specs/0000-foundations.md`
§13 changelog.

---

## 5. Before / after — the actual manifest payload

Input `MerchantProfile` (abbreviated; full fixture in
`src/lib/projections/__tests__/projections.test.ts`):

```jsonc
{
  "merchantId": "thecustomhub-001",
  "endpoints": {
    "catalog": "https://thecustomhub.com/ucp/catalog",
    "cart": "https://thecustomhub.com/ucp/cart",
    "checkout": "https://thecustomhub.com/ucp/checkout"
  },
  "servesRegions": ["US", "CA"],
  "manifest": { "protocol": "1.0", "tier": 2, "capabilities": [ /* ... */ ], "keys": [ /* ... */ ] }
}
```

**Before** — `GET /.well-known/ucp` (`buildManifest` was a bare pass-through):

```jsonc
{
  "protocol": "1.0",
  "tier": 2,
  "capabilities": [ /* ... */ ],
  "keys": [ /* ... */ ]
  // no "endpoints" — agent cannot locate catalog/cart/checkout
  // no "servesRegions" — agent cannot pre-filter unserved buyers
}
```

**After** — `GET /.well-known/ucp` (verified snapshot,
`src/lib/projections/__tests__/__snapshots__/projections.test.ts.snap`):

```jsonc
{
  "protocol": "1.0",
  "tier": 2,
  "capabilities": [ /* ... */ ],
  "keys": [ /* ... */ ],
  "endpoints": {
    "catalog": "https://thecustomhub.com/ucp/catalog",
    "cart": "https://thecustomhub.com/ucp/cart",
    "checkout": "https://thecustomhub.com/ucp/checkout"
  },
  "servesRegions": ["US", "CA"]
}
```

**Undeclared case** (runtime-only backstop):

```jsonc
{
  "reasons": [{
    "code": "REGION_POLICY_UNDECLARED",
    "message": "This merchant has not declared which regions it serves (servesRegions is absent). evaluateOffer will not block on region for this merchant until it is declared.",
    "severity": "INFO",
    "source": "com.os.retailagent.shopping.eligibility"
  }]
}
```

---

## 6. Worked example — the block an agent now actually gets

Grocery/regional-fulfillment archetype ("Fresh Corner Market", `specs/0001-eligibility.md` §8):
`fulfillmentConstraints.restrictedRegions: ['HI']`, `availableModes: ['pickup', 'local_delivery']`.

- Agent evaluates an order for a buyer in Hawaii →
  `ComputedVisibility: HIDDEN` → `ComputedEligibility: BLOCKED [REGION_RESTRICTED]`.
  The agent gets a structured reason to relay, not a silent drop or a checkout-time surprise.
- Agent requests `fulfillmentMode: "shipping"` on an item only available for pickup/local
  delivery → `BLOCKED [FULFILLMENT_UNAVAILABLE]`. The agent never promises a mode the merchant
  can't fulfill.

Reason codes are namespaced under `com.os.retailagent.shopping.eligibility` and are meant to be
the shared vocabulary two independent systems (a merchant's engine and a buyer's agent) agree on
— see the full registry in `specs/0001-eligibility.md` §6.

---

## 7. Why this generalizes beyond one pilot

The mechanism here — a merchant-level invariant (`servesRegions`) evaluated **once** at the top
of `evaluateOffer()` as a short-circuit, rather than re-derived per variant or left to adapter
discretion — mirrors the existing `TRUST_SIMULATED` central-attachment pattern (RAOS-0008) for
the same reason: a fact that doesn't vary per product shouldn't be re-checked per product, and a
fact the merchant is responsible for shouldn't be enforced only by the integration that happened
to remember to check it.

For any company building agentic fulfillment at the scale of many merchants (Instacart-style
marketplace aggregation, or any agent-facing checkout layer), the transferable claim is:

> **Declaration and enforcement must be the same code path, or they will drift.** A capability
> that's merely documented (in a manifest, a partner doc, a Slack thread) and separately
> re-implemented per integration *will* diverge — not through malice, but because "remembered to
> pre-check" doesn't scale across N integrations. The fix here converts a per-partner convention
> into a compile-time-required field plus a single shared enforcement point.

---

## 8. Pointers for a future agent picking this up

- The full open-question writeup (three options considered, why (c) was chosen) is
  `specs/0001-eligibility.md` §9.6 — read it before touching `servesRegions` semantics again.
- The pilot audit that surfaced both defects: `specs/reference-implementation/thecustomhub/04-pilot-evidence.md` §8 (OQ-1, OQ-2).
- Tests exercising this exact fix: `src/lib/extensions/__tests__/pipeline.test.ts`,
  `src/lib/rules/__tests__/regionAllowlist.test.ts`,
  `src/lib/projections/__tests__/projections.test.ts` (55 tests, all green as of 2026-08-11).
- The engine was bumped to `0.2.0` for this change — it's a breaking change (required field,
  manifest shape, `evaluateOffer` behavior), not additive. See `packages/engine/package.json`
  and the RAOS-0001 §11 changelog (v1.2.0 entry) before assuming backward compatibility.
- Related, resolved memory context: conformance-tier model split (`decision_tier_model.md`),
  repo scope for dev-vs-marketing docs (`decision_repo_scope.md`) — this file belongs in `docs/`
  under the "dev work stays in git" rule, not `marketing/`.
