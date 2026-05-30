# RAOS-0001 · Eligibility & Visibility Semantics

**Extension namespace:** `com.ezyupload.shopping.eligibility`
**Status:** Draft · Request for Comment
**Version:** 0.1.0
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
everyone.

### 4.2 Buyer context (the evaluation environment)

```jsonc
{
  "customerType": "guest | member | wholesale | b2b",
  "membershipTier": "none | gold | reseller_plus | distributor",
  "marketRegion": "US | CA | NY | HI | ...",      // region / jurisdiction code
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "accountLinked": false,
  "taxExempt": false,
  "resaleCertificateOnFile": false
}
```

Context is supplied by the agent on behalf of the buyer. Fields an agent doesn't know default
to the most restrictive interpretation (e.g. unknown `customerType` is treated as `guest`).

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
      "code": "WHOLESALE_ONLY",                    // machine-readable, from the registry (§6)
      "message": "This product requires a wholesale account.",  // human-readable
      "blocking": true,                            // does this reason prevent purchase now?
      "requirements": [                            // optional — what would resolve it
        { "type": "customer_type", "value": "wholesale" }
      ]
    }
  ]
}
```

**Status semantics:**

- **`ELIGIBLE`** — no restrictions. The agent may proceed freely.
- **`CONDITIONAL`** — purchase is not allowed *right now*, but at least one reason carries a
  `requirements[]` path the buyer could satisfy (link an account, upgrade tier, upload a
  certificate). The agent should surface the path, not a dead end.
- **`BLOCKED`** — purchase is not possible in this context and there is no resolvable path the
  agent can offer (e.g. region restriction, unavailable fulfillment mode). The agent should
  stop and explain.

**`requirements[]` types:** `customer_type`, `membership_tier`, `tax_exempt`,
`resale_certificate`, `moq`, `quantity_increment`.

---

## 6. Reason code registry

The registry is the heart of interoperability — two systems agree on codes, not on prose.
Messages are localizable; codes are stable.

| Code | Meaning | Default status contribution | Resolvable? |
|------|---------|------------------------------|-------------|
| `HIDDEN_PRODUCT` | Item is not visible in this context (maps a `HIDDEN` visibility into eligibility) | `BLOCKED` | No |
| `WHOLESALE_ONLY` | Requires a wholesale or B2B account | `BLOCKED` | Yes — become a wholesale account |
| `RESALE_CERTIFICATE_REQUIRED` | Resale certificate must be on file | `BLOCKED` | Yes — upload certificate |
| `TIER_RESTRICTION` | Requires a higher membership tier | `CONDITIONAL` | Yes — upgrade tier |
| `FULFILLMENT_UNAVAILABLE` | Not available for the requested fulfillment mode | `BLOCKED` | No (in this mode) |
| `REGION_RESTRICTED` *(proposed)* | Not available in the buyer's region | `BLOCKED` | No |

*Codes are namespaced under `com.ezyupload.shopping.eligibility`. New codes should be additive;
never repurpose an existing code's meaning.*

---

## 7. Evaluation algorithm

Deterministic. Same context + same rules → same result, every time. No model in the loop.

1. **Visibility first.** If `hideFromGuests` and `customerType == guest` → `HIDDEN`. If the
   variant's fulfillment constraints restrict the buyer's region → `HIDDEN`. Otherwise
   `VISIBLE`.
2. **If `HIDDEN`** → eligibility is `BLOCKED` with a single `HIDDEN_PRODUCT` reason. Stop.
3. **Otherwise evaluate each rule, accumulating reasons:**
   - `requireWholesale` and buyer is not `wholesale`/`b2b` → add `WHOLESALE_ONLY` (blocking).
   - `requireResaleCertificate` and no certificate on file → add `RESALE_CERTIFICATE_REQUIRED`
     (blocking).
   - `requiredTier` not met → add `TIER_RESTRICTION`.
   - fulfillment mode not in the variant's available modes → add `FULFILLMENT_UNAVAILABLE`
     (blocking).
4. **Resolve final status:** `BLOCKED` if any unresolvable blocking reason is present;
   otherwise `CONDITIONAL` if any reasons exist; otherwise `ELIGIBLE`.

---

## 8. Worked examples (the three archetypes)

### B&T Wholesale — gated, qualification-first SKU
Rules: `{ hideFromGuests: true, requireWholesale: true, requireResaleCertificate: true }`

- **Guest buyer** → `VISIBLE: HIDDEN` → `Eligibility: BLOCKED [HIDDEN_PRODUCT]`.
  *Agent never surfaces it.*
- **Wholesale buyer, no resale cert** → `VISIBLE` → `Eligibility: BLOCKED
  [RESALE_CERTIFICATE_REQUIRED]` with requirement `{ resale_certificate: true }`.
  *Agent: "I can show this, but you'll need a resale certificate on file. Want to upload one?"*
- **Wholesale buyer, resale cert on file** → `VISIBLE` → `Eligibility: ELIGIBLE`.
  *Agent proceeds.*

### Fresh Corner Market — region & fulfillment sensitive
Variant restricted in `HI`, available only via `pickup`/`local_delivery`.

- **Buyer in HI** → `HIDDEN` (`This product is not available in HI.`).
- **Buyer requesting `shipping`** → `Eligibility: BLOCKED [FULFILLMENT_UNAVAILABLE]`.
  *Agent doesn't promise shipping it can't deliver.*

### Sara's Boutique — discovery-led, open DTC
No `eligibilityRules`.

- **Any buyer** → `VISIBLE`, `ELIGIBLE`. *Clean payload, no gates — an agent recommends
  freely.* (This archetype's gap is *discoverability*, addressed by a future spec, not
  eligibility.)

---

## 9. Open questions — Request for Comment

These are genuine forks. Tell me I'm wrong.

1. **`blocking` vs. status coherence.** The reference implementation currently emits
   `TIER_RESTRICTION` with `blocking: true` while resolving status to `CONDITIONAL`. That's
   incoherent: if a reason is resolvable (upgrade tier), is it really "blocking"? **Proposed
   fix:** `blocking` describes only the *current* state (purchase is blocked right now);
   `CONDITIONAL` vs `BLOCKED` is derived from whether a `requirements[]` path exists. Should
   `blocking` even be a field, or is it fully derivable from `requirements`? *Leaning: derive
   it.*
2. **Is `CONDITIONAL` worth keeping as a distinct status,** or should agents just read
   `BLOCKED` + the presence of `requirements[]`? Three states is more expressive; two is
   simpler to implement. Which serves agents better?
3. **`REGION_RESTRICTED` placement.** Region restriction currently surfaces as a *visibility*
   `HIDDEN` reason rather than an eligibility code. Should region be a first-class eligibility
   reason code so agents can explain it, rather than the item silently vanishing?
4. **Unknown-context defaulting.** Spec says "default to most restrictive." Is that right for
   discovery (you'd under-surface), or should visibility default open and eligibility default
   strict?
5. **Tier hierarchy.** It's currently an ordered list (`none < gold < reseller_plus <
   distributor`). Should tiers be a partial order / capability set instead of a strict ladder?

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

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md) for the full
set and how to contribute.*
