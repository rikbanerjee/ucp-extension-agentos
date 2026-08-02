# RAOS-0001 · Eligibility & Visibility Semantics

**Extension namespace:** `com.os.retailagent.shopping.eligibility`
**Status:** Draft · Request for Comment
**Version:** 1.1.0
**Layer:** RetailAgentOS extension on top of UCP (Universal Commerce Protocol)
**Reference implementation:** [`src/lib/rules/eligibility.ts`](../src/lib/rules/eligibility.ts) — runnable in the [Playground](../src/app/demo/page.tsx)
**Author:** Rik Banerjee · rikbanerjee007@gmail.com

> This is an open draft. The point is to be argued with. If a reason code, a status, or a
> field is wrong, that's the most useful thing you can tell me. See §9.

---

## 1. Abstract

This spec defines a machine-readable way for a merchant to declare **who may see a product**
and **who may buy it, and why** — evaluated against a buyer's context at *catalog time*, before
a cart is ever built. It produces two computed outputs an AI agent (or any UI) can act on:
`Visibility` (surface it or not) and `Eligibility` (can this buyer purchase, and if not, what
would fix it).

The defining feature is **reasons**. Eligibility is not a boolean. Every decision carries a
structured reason code, a human message, and — where a path exists — the requirement that
would resolve it. An agent can therefore *explain* a block and *guide* a buyer toward
qualifying, instead of failing silently at checkout.

---

## 2. Motivation — the gap this closes

UCP standardizes the rails: discovery, catalog, cart, checkout handoff. It does not carry the
merchant's **reasoning** about who is allowed to buy what. Today that logic lives deep in the
commerce backend and only fires at checkout. The result, when an AI agent is the one shopping:

- A wholesale-only SKU is surfaced to a guest, who hits a wall at checkout.
- An agent builds a cart for a buyer who was never eligible — dead end.
- A buyer who *could* qualify (link an account, upload a resale certificate) is simply blocked,
  with no path shown.

The core idea of this spec — and of RetailAgentOS generally — is **move merchant reasoning from
checkout-time to catalog-time, with machine-readable reasons attached.** This extension is the
first and most reusable instance of that idea.

---

## 3. Scope

**In scope:** declaring visibility and purchase-eligibility rules on a product variant;
evaluating them against buyer context; emitting computed, reasoned results.

**Out of scope (other specs):** price computation (`ext.bulk_pricing`, `ext.member_pricing`,
`ext.promo_pricing`), and deep fulfillment logic (`ext.fulfillment_constraints`). This spec
*consumes* a fulfillment signal for visibility/eligibility but does not define fulfillment
semantics.

---

## 4. Inputs

### 4.1 Eligibility rules (merchant-declared, attached to a variant)

```jsonc
{
  "eligibilityRules": {
    "hideFromGuests": true,            // optional — hide entirely from guest buyers
    "requireWholesale": true,          // optional — purchase requires a wholesale/b2b account
    "requiredTier": "reseller_plus",   // optional — minimum membership tier
    "requireResaleCertificate": true  // optional — resale certificate must be on file
  }
}
```

All fields are optional. A variant with no `eligibilityRules` is `VISIBLE` and `ELIGIBLE` to
everyone (see §7 for the one asymmetry that follows from this in the reference implementation).

### 4.2 Buyer context (the evaluation environment)

This spec consumes the `BuyerContext` object defined in **RAOS-0000 §4** — not an
inline context type of its own. Every extension in the RetailAgentOS series evaluates against
the same `BuyerContext`; RAOS-0001 uses the following fields:

| Field | Type | RAOS-0001 usage |
|---|---|---|
| `customerType` | `guest \| member \| wholesale \| b2b` | `hideFromGuests`, `requireWholesale` gates |
| `membershipTier` | `none \| gold \| reseller_plus \| distributor` | `requiredTier` comparison (ordered ladder) |
| `marketRegion` | `string` | `REGION_RESTRICTED` check via `fulfillmentConstraints.restrictedRegions` |
| `fulfillmentMode` | `shipping \| pickup \| local_delivery` | `FULFILLMENT_UNAVAILABLE` check |
| `resaleCertificateOnFile` | `boolean` | `requireResaleCertificate` gate |
| `trust.mode` | `asserted \| signed` | For transaction-gating stages, asserted privilege claims are downgraded (RAOS-0000 §7.2). Eligibility is a transaction-gating stage. |

Fields an agent doesn't supply are normalized to their **most-restrictive** defaults before
evaluation (`normalizeBuyerContext`, RAOS-0000 §4.3): unknown `customerType` → `guest`,
unknown `marketRegion` → treat region-gated items as restricted.

The full `BuyerContext` shape (including `loyaltyTier`, `accountLinked`, `taxExempt`, and
the `trust` envelope) is defined in [`src/lib/types/context.ts`](../src/lib/types/context.ts).
RAOS-0001 does not read `loyaltyTier`, `accountLinked`, or `taxExempt` — those are consumed
by RAOS-0009 and RAOS-0011 respectively.

---

## 5. Outputs (the contracts agents consume)

### 5.1 `ComputedVisibility`

```jsonc
{
  "status": "VISIBLE | HIDDEN",
  "reason": "This product is not visible to guests."   // present when HIDDEN
}
```

`HIDDEN` means *do not surface this item to this buyer at all.* An agent must not recommend,
quote, or add a `HIDDEN` item to a cart.

### 5.2 `ComputedEligibility`

```jsonc
{
  "status": "ELIGIBLE | CONDITIONAL | BLOCKED",
  "reasons": [
    {
      "code": "WHOLESALE_ONLY",
      "message": "This product requires a wholesale account.",
      "severity": "BLOCK",                             // RAOS-0000 §8.1 — replaces blocking bool
      "source": "com.os.retailagent.shopping.eligibility",  // owning namespace
      "blocking": true,                                // @deprecated — derived: severity !== 'INFO'
      "requirements": [
        { "type": "customer_type", "value": "wholesale" }
      ]
    }
  ]
}
```

Reason entries use the unified `ReasonEntry` shape from RAOS-0000 §8. The `blocking` field
is still emitted (derived from `severity !== 'INFO'`) but is **deprecated** — consumers
should read `severity` instead. See §6 and the changelog (§11).

**Status semantics:**

- **`ELIGIBLE`** — no restrictions. The agent may proceed freely.
- **`CONDITIONAL`** — purchase is not allowed *right now*, but at least one reason carries a
  `requirements[]` path the buyer could satisfy (link an account, upgrade tier, upload a
  certificate). The agent should surface the path, not a dead end.
- **`BLOCKED`** — purchase is not possible in this context and there is no resolvable path the
  agent can offer (e.g. region restriction, unavailable fulfillment mode). The agent should
  stop and explain.

**Status is derived from reasons (RAOS-0000 §8.1):**
- `BLOCK` severity + no `requirements[]` → `BLOCKED`
- `BLOCK` or `CONDITION` severity + a non-empty `requirements[]` → `CONDITIONAL`
- `INFO` only, or no reasons → `ELIGIBLE`

**`requirements[]` types:** `customer_type`, `membership_tier`, `tax_exempt`,
`resale_certificate`, `moq`, `quantity_increment`.

---

## 6. Reason code registry

The registry is the heart of interoperability — two systems agree on codes, not on prose.
Messages are localizable; codes are stable. Each entry uses the unified `ReasonEntry` shape
(RAOS-0000 §8): `code`, `message`, `severity`, `source`, `requirements?`, and the deprecated
`blocking` field derived from `severity`.

| Code | Meaning | Severity | Source namespace | Resolvable? |
|------|---------|----------|-----------------|-------------|
| `HIDDEN_PRODUCT` | Item is not visible in this context (guest visibility gate) | `BLOCK` | `…eligibility` | No |
| `REGION_RESTRICTED` | Not available in the buyer's market region | `BLOCK` | `…eligibility` | No |
| `WHOLESALE_ONLY` | Requires a wholesale or B2B account | `BLOCK` | `…eligibility` | Yes — become a wholesale account |
| `RESALE_CERTIFICATE_REQUIRED` | Resale certificate must be on file | `BLOCK` | `…eligibility` | Yes — upload certificate |
| `TIER_RESTRICTION` | Requires a higher membership tier | `BLOCK` + `requirements[]` → derives `CONDITIONAL` | `…eligibility` | Yes — upgrade tier |
| `FULFILLMENT_UNAVAILABLE` | Not available for the requested fulfillment mode | `BLOCK` | `…eligibility` | No (in this mode) |
| `REGION_POLICY_UNDECLARED` | Merchant has not declared `servesRegions` (added 2026-08-01, OQ-2 — §9.6) | `INFO` | `…eligibility` | No — merchant-side conformance gap, not buyer-resolvable |

**Deprecated field:** The `blocking` boolean field on each reason entry is **deprecated as
of v1.1.0**. It is still emitted, derived as `severity !== 'INFO'`, with
`@supersededBy: severity`. It will be removed in the next major version per the RAOS-0000 §7.4
deprecation contract.

*Codes are namespaced under `com.os.retailagent.shopping.eligibility`. New codes should be
additive; never repurpose an existing code's meaning.*

---

## 7. Evaluation algorithm

Deterministic. Same context + same rules → same result, every time. No model in the loop.

1. **Visibility first.** If `hideFromGuests` and `customerType == guest` → `HIDDEN` (guest
   gate). If the variant's `fulfillmentConstraints.restrictedRegions` includes the buyer's
   `marketRegion` → `HIDDEN` (region gate). Otherwise `VISIBLE`.
2. **If `HIDDEN` (guest gate)** → eligibility is `BLOCKED` with `HIDDEN_PRODUCT` reason.
   Stop.
3. **If `HIDDEN` (region gate)** → eligibility is `BLOCKED` with `REGION_RESTRICTED` reason.
   Stop.
4. **If the variant has no `eligibilityRules`** → return `ELIGIBLE` immediately. The region
   and fulfillment checks in steps 1–3 have already passed; no further rules apply.
5. **Otherwise evaluate each rule, accumulating reasons:**
   - `requireWholesale` and buyer is not `wholesale`/`b2b` → add `WHOLESALE_ONLY` (`BLOCK`).
   - `requireResaleCertificate` and `resaleCertificateOnFile === false` → add
     `RESALE_CERTIFICATE_REQUIRED` (`BLOCK` + `requirements[]`).
   - `requiredTier` not met (using ordered ladder `none < gold < reseller_plus < distributor`)
     → add `TIER_RESTRICTION` (`BLOCK` + `requirements[]` → status derives to `CONDITIONAL`).
   - `fulfillmentConstraints.availableModes` is set and `fulfillmentMode` not in it → add
     `FULFILLMENT_UNAVAILABLE` (`BLOCK`).
6. **Derive final status** per RAOS-0000 §8.1 (see §5.2 above).

### Known reference-implementation asymmetry (pinned, WP-00)

Step 4 above introduces a **deliberate asymmetry** between `calculateVisibility` and
`calculateEligibility` in the reference implementation:

- **`calculateVisibility`** returns `VISIBLE` immediately for variants with no
  `eligibilityRules`, skipping the region check entirely. A variant without
  `eligibilityRules` is therefore *always* visible — region-hiding does not apply.
- **`calculateEligibility`** catches `REGION_RESTRICTED` regardless of `eligibilityRules`,
  because the region check runs before the early-return (steps 1–3 precede step 4).

The practical consequence is that `FULFILLMENT_UNAVAILABLE` is currently **unreachable** for a
variant with no `eligibilityRules`: the function returns `ELIGIBLE` at step 4 before
evaluating fulfillment mode. `REGION_RESTRICTED` is always reachable (handled in step 3).

This is a **known quirk of the reference implementation**, not a design intention. It will be
corrected when the evaluation logic is refactored into the formal VISIBILITY and ELIGIBILITY
pipeline stages (ARCH §3–§5). It is documented here so that consumers of the reference
implementation are not surprised, and so the pipeline-stage refactor has a clear acceptance
criterion: after the refactor, a variant without `eligibilityRules` that is region-restricted
must return `HIDDEN` / `BLOCKED [REGION_RESTRICTED]`, matching the behavior for variants that
carry `eligibilityRules`.

---

## 8. Worked examples (the three archetypes)

### Atlas Wholesale — gated, qualification-first SKU
Rules: `{ hideFromGuests: true, requireWholesale: true, requireResaleCertificate: true }`

- **Guest buyer** → `VISIBLE: HIDDEN` → `Eligibility: BLOCKED [HIDDEN_PRODUCT]`.
  *Agent never surfaces it.*
- **Wholesale buyer, no resale cert** → `VISIBLE` → `Eligibility: BLOCKED
  [RESALE_CERTIFICATE_REQUIRED]` with `requirements: [{ resale_certificate: true }]`.
  *Agent: "I can show this, but you'll need a resale certificate on file. Want to upload one?"*
- **Wholesale buyer, resale cert on file** → `VISIBLE` → `Eligibility: ELIGIBLE`.
  *Agent proceeds.*

### Fresh Corner Market — region & fulfillment sensitive
Variant has `fulfillmentConstraints.restrictedRegions: ['HI']` and
`fulfillmentConstraints.availableModes: ['pickup', 'local_delivery']`, with `eligibilityRules`
set (so the fulfillment-mode check is reachable).

- **Buyer in HI** → `HIDDEN` → `Eligibility: BLOCKED [REGION_RESTRICTED]`.
  *Agent explains — "This product is not available in HI." — doesn't silently drop.*
- **Buyer requesting `shipping`** → `VISIBLE` → `Eligibility: BLOCKED [FULFILLMENT_UNAVAILABLE]`.
  *Agent doesn't promise shipping it can't deliver.*

### Sara's Boutique — discovery-led, open DTC
No `eligibilityRules`.

- **Any buyer** → `VISIBLE`, `ELIGIBLE`. *Clean payload, no gates — an agent recommends
  freely.* (This archetype's gap is *discoverability*, addressed by a future spec, not
  eligibility.) Note: per the asymmetry in §7, region checking does not apply to variants
  without `eligibilityRules` in the current reference implementation.

---

## 9. Open questions — Request for Comment

These are genuine forks. Tell me I'm wrong.

1. **`blocking` vs. status coherence. — RESOLVED (2026-06-10)**
   The incoherence (emitting `TIER_RESTRICTION` with `blocking: true` while resolving status
   to `CONDITIONAL`) is resolved by the RAOS-0000 §8.1 severity model. `blocking` is now a
   *derived* boolean (`severity !== 'INFO'`), not an authored field. The status derivation rule
   is: `BLOCK` severity + `requirements[]` → `CONDITIONAL` status (the resolution path exists,
   so the buyer isn't fully stopped). This is implemented in `deriveEligibilityStatus` in
   `src/lib/types/reasons.ts`. The `blocking` field is deprecated with `supersededBy: severity`
   per RAOS-0000 §7.4.

2. **Is `CONDITIONAL` worth keeping as a distinct status? — RESOLVED (2026-06-10)**
   Resolved together with OQ#1. Three states are kept (`ELIGIBLE | CONDITIONAL | BLOCKED`)
   because they serve agents differently: `CONDITIONAL` carries an actionable resolution path
   the agent can surface; `BLOCKED` means stop and explain with no path. Collapsing to two
   states would require the agent to inspect `requirements[]` to distinguish them — three states
   is more expressive and the derivation from `severity + requirements[]` is deterministic and
   cheap (RAOS-0000 §8.1).

3. **`REGION_RESTRICTED` placement.** Region restriction surfaces as a *visibility* `HIDDEN`
   result (the item disappears) **and** as the eligibility reason code `REGION_RESTRICTED`
   (so agents can explain it). Is a region-restricted item correctly `HIDDEN`, or should it
   be `VISIBLE` with `BLOCKED` eligibility? Hidden means the agent never surfaces it; blocked
   means the agent sees it but can't transact. Which is more useful for agent behavior? Open
   for comment.

4. **Unknown-context defaulting for transaction-gating stages. — RESOLVED (2026-06-10)**
   Per RAOS-0000 §7.2, **transaction-gating stages** (Eligibility, Price, Quote) default
   to the **most-restrictive** interpretation for unknown or untrusted context. Untrusted
   privilege claims (`membershipTier`, `loyaltyTier`, `taxExempt`, `resaleCertificateOnFile`)
   are downgraded when `trust.mode === 'asserted'`. The normalization is implemented in
   `src/lib/rules/normalizeBuyerContext.ts`.

   The **discovery-side default** (should visibility default open, risking surfacing something
   a buyer can't buy, or strict, risking under-surfacing?) is **not yet resolved** — it is an
   open question at the RAOS-0000 §11 level as well. Comment welcome.

5. **Tier hierarchy.** It's currently an ordered list (`none < gold < reseller_plus <
   distributor`). Should tiers be a partial order / capability set instead of a strict ladder?

6. **Region-policy fork (`servesRegions` allowlist) — RESOLVED (2026-08-01, OQ-2).**
   `regionAllowlist.ts` documented, by design, that "adapters call `checkServesRegion`
   themselves," with the canonical fold into this spec deferred and TheCustomHub named as the
   eventual forcing case. The 2026-08-01 Track B pilot audit forced it: `evaluateOffer` in
   isolation did not block a GB buyer from an unserved-region merchant — region gating existed
   only because the pilot's own server pre-checked manually, outside the engine (a
   `BLOCK`-severity safety rule living outside the single decision implementation). Full
   findings: `specs/reference-implementation/thecustomhub/04-pilot-evidence.md` §8 OQ-2.

   **The fork:** what should `calculateEligibility`/`evaluateOffer` do when a merchant profile
   has not declared `servesRegions`? Three options were on the table:
   - **(a) Undeclared → block all regions** (the literal reading of RAOS-0000 §7.2's
     most-restrictive-default rule, extended from `BuyerContext` to a merchant's own config).
     Rejected: §7.2 is explicitly scoped to buyer context (unknown/untrusted claims *about the
     buyer*), not a merchant's own unset config field. Extending it here by fiat — rather than
     by a documented decision — is exactly the undocumented scope creep this spec exists to
     prevent. It would also have meant every merchant profile not yet carrying `servesRegions`
     (all of them, pre-2026-08-01) instantly sells to nobody.
   - **(b) Undeclared → not enforced, silently** (the pre-fix status quo). Rejected: this is
     the audit's own finding, restated as a permanent default — it targets neither silence nor
     permissiveness, it ratifies both.
   - **(c) Three-state, undeclared is loud but non-blocking — CHOSEN.** Non-empty array →
     enforced allowlist. `[]` → declared, literally, "serves nowhere" — blocks all (this falls
     out of `checkServesRegion`'s existing contract for free). `undefined` → does not block, but
     is made loud: a new `REGION_POLICY_UNDECLARED` (`INFO`, additive, reuses no existing code)
     surfaces on the `/.well-known/ucp` manifest (`buildManifest`, RAOS-0000 — see its §13
     changelog), and Tier 1 "Qualified" conformance now requires the field be declared.

   **Amendment on top of (c), decided the same day:** rather than rely on runtime discipline to
   keep the undeclared state rare, `servesRegions: string[]` is now **required** (non-optional)
   on `MerchantProfile` — TypeScript refuses to compile a profile that omits it. This converts
   the failure mode from "runtime silent sale into an unserved region" to "compile error at
   integration time," which is a stronger guarantee than (a) without (a)'s blast radius:
   existing fixtures break at *construction* (a mechanical one-line add per fixture — see the
   engine 0.2.0 changelog for the full list) rather than at *behavior* (every prior fixture's
   marketRegion suddenly getting blocked). The three-state runtime handling in
   `calculateEligibility`/`evaluateOffer` is kept as-is: it is the backstop for the callers the
   TypeScript type cannot reach — a JS consumer, or a profile deserialized from JSON with no
   validation layer in front of it. Required-field prevents; three-state-plus-Tier-1-gating
   makes it loud for the paths types can't reach.

   **Where the allowlist is enforced:** folded into `evaluateOffer`
   (`src/lib/extensions/pipeline.ts`), NOT into `calculateEligibility`. `servesRegions` is a
   merchant-level invariant — true or false once per merchant, not once per variant — so it is
   checked as a short-circuit before the per-variant evaluator chain runs, reusing the existing
   `REGION_RESTRICTED` code via `checkServesRegion`. This mirrors the existing `TRUST_SIMULATED`
   central-attachment pattern (RAOS-0008) for the same reason: a fact that doesn't vary per
   variant shouldn't be re-derived per variant. `calculateEligibility`'s signature is unchanged;
   `checkServesRegion` remains exported for adapters that want a cheaper pre-check before ever
   constructing an `EvaluateOfferInput`, but it is no longer the *only* enforcement point.

   **Emission timing — manifest-build time, not per-evaluation.** `REGION_POLICY_UNDECLARED` is
   attached once by `buildManifest()` when `servesRegions` is undefined, not re-emitted on every
   `evaluateOffer` call. Rationale: the fact ("this merchant hasn't declared a region policy")
   never varies per product or per evaluation — repeating it in every `DecisionRecord.reasons`
   (as derived by `src/lib/trace/derive.ts`) would mean one identical `INFO` entry per SKU per
   catalog listing, pure trace noise with no new information on the 2nd through Nth occurrence.
   Manifest-build time is also where an agent (or a conformance checker) can see the gap
   *before* evaluating a single offer, rather than discovering it product-by-product.

   **What broke / what didn't:** the required-field change broke construction (not behavior) of
   every hand-authored `MerchantProfile` fixture across the codebase — mechanical, one line
   each. Zero golden fixtures changed: `golden.test.ts` calls `calculateEligibility` and friends
   directly, never `evaluateOffer` or `buildManifest`, so neither the allowlist short-circuit
   nor the manifest-build reason code can appear there; `REGION_POLICY_UNDECLARED` is
   consequently excluded from golden reason-code coverage the same way
   `CATALOG_UNREACHABLE_REASON_CODES` excludes an unreachable code, and is covered instead by
   `src/lib/projections/__tests__/projections.test.ts` and
   `src/lib/extensions/__tests__/pipeline.test.ts`.

If you have an opinion on any of these, email me or reply on the build-log post. This is being
built in the open precisely so the answers come from people who run real catalogs.

---

## 10. Why this is the first spec

Of all the merchant-reasoning gaps, **eligibility-with-reasons is the most reusable** — it
applies to wholesale gating, age restriction, region rules, membership, regulated goods, and
more. Prove it cleanly here, on real archetypes, and it becomes a candidate to propose upstream
into UCP itself.

The mission: a small retailer can't build this. But if the spec exists and is open, the
platform they already use can implement it once — and every merchant on that platform inherits
agent-readiness for free. The spec is the leverage.

---

## 11. Changelog

### v1.2.0 — 2026-08-01 (OQ-2: region-policy fork resolved)

**Additive changes:**

- **New reason code `REGION_POLICY_UNDECLARED`** (`INFO`, additive — §6 registry table).
  Emitted by `buildManifest()` (RAOS-0000) at manifest-build time, not per-evaluation, when a
  merchant profile has not declared `servesRegions`.
- **§9.6 Open Question resolved:** the region-allowlist fold, deferred since the A3 helper
  (`checkServesRegion`) shipped, is now folded into `evaluateOffer` as a merchant-level
  short-circuit — see §9.6 for the full fork write-up, the three options considered, and why
  (c) plus the required-field amendment was chosen over (a) and (b).
- **`MerchantProfile.servesRegions: string[]` is now REQUIRED** (was absent from the type
  entirely before this pilot; RAOS-0000 §13 changelog covers the manifest-surfacing half).

**Breaking change (engine 0.2.0, not this spec's severity contract):** `evaluateOffer` now
blocks a buyer whose `marketRegion` is outside a merchant's declared `servesRegions` — behavior
that did not exist before. A merchant that declares `servesRegions` and relied on
`evaluateOffer` alone not enforcing it (i.e. was depending on the pre-fix gap) will see new
`REGION_RESTRICTED` blocks. No existing reason code was repurposed; `REGION_POLICY_UNDECLARED`
is additive per RAOS-0000 §7.4.

### v1.1.0 — 2026-06-10 (WP-03 retrofit)

**Additive changes:**

- **§4.2 Inputs:** The inline buyer-context object is replaced with a reference to the
  RAOS-0000 §4 `BuyerContext` — the single, shared evaluation environment all extensions
  consume. A per-field usage table documents which fields RAOS-0001 reads and why. The
  `loyaltyTier` and `trust` fields are now visible in context (they were added in WP-02).
- **§5.2 / §6 Reason code registry:** Each `ReasonEntry` now carries `severity` (replaces
  the ambiguous `blocking` bool) and `source` (owning namespace for trace attribution).
  The registry table adds `Severity` and `Source namespace` columns.
- **`blocking` deprecated:** The `blocking` boolean field is still emitted (derived as
  `severity !== 'INFO'`) but marked deprecated with `supersededBy: severity` per
  RAOS-0000 §7.4. It will be removed in the next major version.
- **OQ#1 and OQ#2 resolved** (2026-06-10): the `blocking` / `CONDITIONAL` incoherence is
  resolved by the RAOS-0000 §8.1 severity model.
- **OQ#4 partially resolved** (2026-06-10): transaction-gating most-restrictive default is
  resolved; discovery-side default remains open.
- **§7 algorithm:** Expanded to document the known reference-implementation asymmetry for
  variants without `eligibilityRules` (visibility skips region check; `FULFILLMENT_UNAVAILABLE`
  unreachable in that path). Documented as a known quirk slated for the pipeline-stage refactor.

**No breaking changes.** All six reason codes are unchanged. `ComputedVisibility` and
`ComputedEligibility` shapes are unchanged. Existing consumers reading `blocking` continue to
work; the field is preserved for ≥1 major.

### v0.1.0 — 2026-05 (initial draft)

Initial draft published for comment. Six reason codes, three worked examples (B&T Wholesale /
Fresh Corner Market / Sara's Boutique), five open questions.

---

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md) for the full
set and how to contribute.*
