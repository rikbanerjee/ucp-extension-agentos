# RAOS-0000 · Protocol Foundations, Context & Conformance

**Extension namespace:** `com.os.retailagent.shopping.core`
**Status:** Draft · Request for Comment
**Version:** 0.1.0
**Layer:** RetailAgentOS foundation on top of UCP (Universal Commerce Protocol)
**Reference implementation (WP-02):**
- `BuyerContext` + trust model → [`src/lib/types/context.ts`](../src/lib/types/context.ts)
- `ReasonEntry` + `deriveEligibilityStatus` → [`src/lib/types/reasons.ts`](../src/lib/types/reasons.ts)
- Provenance + freshness envelope → [`src/lib/types/envelope.ts`](../src/lib/types/envelope.ts)
- Most-restrictive defaults + trust downgrade → [`src/lib/rules/normalizeBuyerContext.ts`](../src/lib/rules/normalizeBuyerContext.ts)
- `/.well-known/ucp` manifest endpoint → [`src/app/.well-known/ucp/route.ts`](../src/app/.well-known/ucp/route.ts)
- Manifest shape + archetype data → [`src/lib/mock/merchants.ts`](../src/lib/mock/merchants.ts) · [`src/lib/types/core.ts`](../src/lib/types/core.ts)

Runnable in the [Playground](../src/app/demo/page.tsx).
**Author:** Rik Banerjee · rikbanerjee007@gmail.com
**Companion docs:** [`specs/ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md) (the extension contract & staged pipeline this spec sits under), [`specs/PROGRAM-PLAN.md`](./PROGRAM-PLAN.md)

> This is the meta-spec every other RAOS spec imports. It defines the shared
> envelope and the rules of the game — the context object, the conformance
> ladder, the manifest, versioning, reasons, and degradation. It is an open
> draft. If a rule here is wrong, that's the most useful thing you can tell me.
> See §11.

---

## 1. Abstract

RAOS-0000 defines the **shared substrate** every other RetailAgentOS spec builds
on. It is deliberately small and deliberately load-bearing. Five things live here
and nowhere else:

1. **`BuyerContext`** — the single, buyer-scoped object every extension evaluates
   against (supersedes today's overloaded `PricingContext`). It carries the
   orthogonal buyer **`loyaltyTier`** claim and the signed-token trust model.
2. **The conformance-tier ladder (0–4)** and the **`/.well-known/ucp` manifest**:
   a headline `tier` number BACKED BY an authoritative `capabilities[]` list.
   Conformance is *not* buyer loyalty.
3. **The versioning contract** — semver per namespace, additive-only reason
   codes, and the fail-degraded (never fail-open, never crash) rule.
4. **The unified `ReasonEntry`** shape with `severity`, and how the reason-code
   registry works across all specs.
5. **The provenance & freshness envelope** (TTL + signature fields) at the
   contract level — depth deferred to RAOS-0008.

This spec does **not** redesign the `UcpExtension` evaluator contract or the
staged pipeline (Visibility → Eligibility → Price → Fulfillment → Quote); those
are owned by [`ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md) §3–§5
and referenced here in §8.

---

## 2. Motivation — why a foundation spec exists

Each RAOS spec answers one merchant-reasoning question (who may see this, who may
buy it, at what price). But every one of them needs the *same* primitives: a
buyer to evaluate against, a way to declare which contracts a merchant supports,
a vocabulary of reasons, a rule for what an agent does when something is missing
or stale, and a promise that the contract won't shift under a consumer's feet.

If each spec invented its own copy of those primitives, the series would not be a
platform — it would be a pile of incompatible extensions. The whole leverage of
RetailAgentOS is that a platform implements the substrate **once** and every
merchant on it inherits agent-readiness. RAOS-0000 *is* that substrate. Every
other spec's "Inputs" section references the `BuyerContext` defined here, not its
own.

---

## 3. Scope

**In scope:** the `BuyerContext` object; the core catalog model reference
(Merchant → Product → Variant); the conformance-tier ladder; the
`/.well-known/ucp` manifest shape and capability negotiation; the versioning &
deprecation policy; the determinism + most-restrictive-default rule; the unified
`ReasonEntry` envelope and reason-code registry mechanics; the provenance &
freshness envelope at the contract level; error & degradation semantics.

**Out of scope (other specs / docs):** the `UcpExtension` evaluator interface and
staged pipeline (→ [`ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md));
the cryptographic depth of signing/freshness (→ RAOS-0008); the definition of the
buyer `loyaltyTier` claim and its earn/burn semantics (→ RAOS-0009); PII handling
and consent (→ RAOS-0015); the agent-reasoning / explainability **trace** format
(**gated** — see §11 and the call-out box; do not design it without sign-off).

---

## 4. The `BuyerContext` object

`BuyerContext` is the evaluation environment. It carries **buyer-scoped facts
only** — who is shopping, on what terms. Merchant facts (which extensions are
active) do **not** live here; they live in the negotiated session manifest (§6).

```jsonc
{
  "customerType": "guest | member | wholesale | b2b",
  "loyaltyTier": "guest | silver | gold",     // consumer loyalty — RAOS-0009 (orthogonal axis)
  "membershipTier": "none | gold | reseller_plus | distributor", // B2B account standing — RAOS-0001 (orthogonal axis)
  "marketRegion": "US | CA | NY | HI | ...",  // region / jurisdiction code
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "accountLinked": false,
  "taxExempt": false,
  "resaleCertificateOnFile": false,
  "trust": {                                  // how much to believe the above
    "mode": "asserted | signed",              // B6: simulated as 'asserted' now
    "issuer": "https://id.example.test",      // present when mode == 'signed'
    "keyId": "k1",
    "signature": "base64…"                    // verified envelope → trusted claims
  }
}
```

### 4.1 `loyaltyTier` is **not** a conformance tier (locked, B1)

The `loyaltyTier` field (`guest`/`silver`/`gold`) answers **"who is shopping."**
It is a **buyer claim owned by RAOS-0009** and is **never** a rung on the
conformance ladder (§5), which answers **"what the merchant can do."** A `guest`
buyer at a **Member-aware (conformance Tier 3)** merchant is normal: the merchant
*supports* member-aware pricing; this particular buyer simply has no member claim.
Keep the two axes separate everywhere — in types, in payloads, and in prose.

> `membershipTier` (the B2B/account ladder `none < gold < reseller_plus <
> distributor` used by RAOS-0001 eligibility) is a *separate, orthogonal* axis
> again, scoped to account standing. RAOS-0009 owns the consumer `loyaltyTier`;
> RAOS-0001 owns `membershipTier`. The two are **orthogonal — neither subsumes the
> other** — and are deliberately **not** merged: a B2B distributor may also be a
> gold consumer-loyalty member, and either field can move without the other. Both
> are also distinct from the conformance tier (§5), giving a three-axis identity
> model (locked OQ#1, 2026-06-07).

### 4.2 Trust model (B6 — signed token, simulated as asserted)

A buyer claim is only as good as its provenance. RAOS-0000 defines a
`trust` envelope on the context:

- **`mode: 'signed'`** — claims arrived in a signed buyer-context token (an
  OAuth-style identity assertion). The merchant trusts the **signature**, not the
  agent's word. The verification path (issuer → keyId → signature → trusted
  claims) is specified now.
- **`mode: 'asserted'`** — claims are agent-asserted with no signature. This is
  the **simulated demo default** (B6). An asserted claim that would *grant*
  privilege (member pricing, tax exemption, a loyalty tier) must be treated as
  **untrusted → fall back to guest / most-restrictive** for any transaction-gating
  decision (§7.2). Asserted claims may still be used for *discovery* convenience.

The crypto itself is simulated (B3/D2); RAOS-0008 owns the real envelope. The
point of specifying `trust` here is that the swap from simulated to real is
mechanical — no consumer contract changes.

### 4.3 Unknown / missing fields → most-restrictive

Any field an agent doesn't supply defaults to its **most-restrictive**
interpretation (unknown `customerType` → `guest`; unknown `loyaltyTier` →
`guest`; unknown `marketRegion` → treat region-gated items as restricted). See
§7.1 for the determinism rule this implements.

---

## 5. Conformance tiers (the split axis, locked B1)

A **conformance tier** is a property of the **merchant's implementation
maturity**. It is cumulative/nested and describes *what the merchant's catalog can
do for an agent* — not who the buyer is.

| Tier | Name | Adds | What the *merchant can do* | Example archetype |
|------|------|------|----------------------------|-------------------|
| **0** | Discoverable | 0000, 0004, 0008 | "An agent can find and correctly read my catalog." | Any store |
| **1** | Qualified | 0001, 0005, 0011 | "No dead-end carts — only eligible, in-stock items surface." | Boutique |
| **2** | Priced | 0002, 0006, 0007 | "The right price per buyer, and it's *honored* at checkout." | Wholesale |
| **3** | Member-aware | 0009, 0010 | "Supports member/loyalty-aware pricing, earn preview, subscriptions." | Grocery |
| **4** | Assisted | 0003, 0012, 0013, 0014 | "Full commerce — fulfillment, handoff, intent, returns." | Grocery chain |

> **Tier 3 is "Member-aware," not "Loyal."** It describes merchant *capability*
> (the merchant supports member-aware pricing and earn preview), **not** the
> buyer's loyalty standing. A guest can shop a Member-aware merchant. The buyer's
> gold/silver/guest standing is the orthogonal `BuyerContext.loyaltyTier` claim
> (§4.1, RAOS-0009).

**Conformance ≠ buyer loyalty.** This is the single most important rule in this
section. The two are different facts on different axes and must never share one.

---

## 6. The `/.well-known/ucp` manifest & negotiation

A merchant publishes a manifest at **`/.well-known/ucp`**: a **headline `tier`
number** (a human/marketing-friendly *summary* of maturity) **BACKED BY an
authoritative `capabilities[]` list** of the extensions it actually supports.

```jsonc
// GET /.well-known/ucp  (illustrative — Fresh Corner Market, the grocery archetype)
{
  "protocol": "1.0",
  "tier": 4,                       // headline maturity summary (0–4) — ADVISORY
  "capabilities": [                // AUTHORITATIVE — agents negotiate on THIS
    { "namespace": "com.os.retailagent.shopping.pricing_context",          "version": "1.2.0" },
    { "namespace": "com.os.retailagent.shopping.eligibility",              "version": "1.1.0" },
    { "namespace": "com.os.retailagent.shopping.promo_pricing",            "version": "1.0.0" },
    { "namespace": "com.os.retailagent.shopping.fulfillment_constraints",  "version": "1.0.0" },
    { "namespace": "com.os.retailagent.shopping.intent_capture",           "version": "0.8.0" }
  ]
}
```

### 6.1 Negotiate on `capabilities[]`, never on the ladder

The `tier` number is **advisory**. Agents compute which **stages they can trust**
from `capabilities[]` — by `namespace@version` — and **degrade gracefully** for
absent ones. This decouples negotiation from perfect nesting:

- A **Tier-2 merchant MAY list an individual Tier-3 capability** (e.g.
  `…loyalty`) in `capabilities[]` without raising its headline `tier`. The
  ladder describes *typical* maturity; `capabilities[]` describes *actual*
  support.
- If a merchant's headline `tier` **outruns** its `capabilities[]` (claims Tier 3
  but lists no member-pricing capability), the agent **negotiates on
  `capabilities[]`** and treats the headline as advisory only. No capability =
  not supported, regardless of the number.

### 6.2 Version skew

Agent and merchant compare `namespace@major`:

- **Same major** → compatible (minor/patch are additive-only, §7).
- **Different major** → the agent falls back to the highest shared major, or
  treats the capability as **absent** (and degrades, §7.3).

### 6.3 Buyer loyalty is **not** in the manifest

The manifest describes *merchant capability*. Whether *this buyer* is
gold/silver/guest is the orthogonal `BuyerContext.loyaltyTier` claim (§4.1) — it
rides with the request, not the manifest, and is never a manifest field or a
ladder rung.

---

## 7. The rules of the game

### 7.1 Determinism

Same `(BuyerContext, manifest, catalog)` → **identical output**, always. No model
in the decision loop; no I/O, clock, or randomness *inside* an evaluator. Time is
**injected** (a `now` value) so that TTL/quote logic (RAOS-0007/0008) stays
testable and deterministic. This is what makes every decision auditable and what
lets the Playground *prove* a spec.

### 7.2 Most-restrictive default

When context is unknown, missing, or untrusted (§4.2/§4.3), the decision defaults
to the **most-restrictive** interpretation for any **transaction-gating** stage
(Eligibility, Price, Quote). An untrusted "I'm a gold member" never *grants*
member pricing. (For pure *discovery*, a spec may choose a less restrictive
default — flagged as an open question in RAOS-0001 OQ#4.)

### 7.3 Fail-degraded — never fail-open, never crash

An extension that throws, times out, returns an unknown reason code, or is absent
must yield a **documented degraded result**, not an exception that breaks the
agent:

- **Safety-critical stages** (Eligibility) degrade to **`BLOCK`** (most-restrictive).
- **Advisory stages** (Loyalty preview) degrade to **omit / `INFO`** — the agent
  shows base behavior without the advisory.
- **Unknown reason code** → the agent treats an unknown *blocking* code as
  `BLOCK` (forward-compat: never crash on a code it doesn't recognize).

### 7.4 Versioning & deprecation contract

- **semver per namespace.** Minor/patch = **additive only** (a new optional config
  field, a new reason code, a new requirement type). Major = breaking
  (removed/renamed code, changed semantics).
- **Additive-only reason codes** — never repurpose a code's meaning. New
  understanding = a new code, never a redefinition of an old one.
- **Deprecation path** — a code or field marked `deprecated` stays emitted for
  **≥1 major** with a `supersededBy` pointer; consumers reading the new field
  ignore the old. This is the migration mechanism for the
  `EligibilityReason.blocking` → `ReasonEntry.severity` change (§8.1) and the
  `PricingContext` → `BuyerContext` rename.

---

## 8. The unified reason envelope & registry

Today each spec carries its own reason shape (RAOS-0001's `EligibilityReason`,
pricing's free-form `appliedOfferState` strings). RAOS-0000 lifts these to **one
`ReasonEntry` shape** across every stage, so an agent parses **one vocabulary**.

```jsonc
{
  "code": "TIER_RESTRICTION",       // namespaced-stable, from the owning registry
  "message": "Requires gold membership tier.",   // localizable prose, never the contract
  "severity": "BLOCK | CONDITION | INFO",          // replaces the ambiguous `blocking` bool
  "requirements": [                                // the resolution path, if any
    { "type": "membership_tier", "value": "gold" }
  ],
  "source": "com.os.retailagent.shopping.eligibility"  // owning namespace
}
```

### 8.1 `severity` replaces `blocking`

`severity` is the state; `BLOCKED` vs `CONDITIONAL` is **derived** from whether a
`requirements[]` resolution path exists:

- **`BLOCK`** + no resolvable `requirements[]` → the item is `BLOCKED` (stop and
  explain).
- **`BLOCK`/`CONDITION`** + a resolvable `requirements[]` path → `CONDITIONAL`
  (surface the path, don't dead-end).
- **`INFO`** → advisory only; never gates a transaction.

This resolves RAOS-0001 OQ#1/#2 (the incoherent `blocking: true` +
`CONDITIONAL` status). The standalone `blocking` boolean is **deprecated** and
migrates per §7.4 (emit both for ≥1 major, `blocking` derived from `severity`,
`supersededBy: severity`).

### 8.2 How the registry works

Every reason code is **owned by exactly one namespace** and declared in that
spec's reason-code registry table. A code is `{ code, meaning, default severity,
resolvable? }`. The platform assembles a global registry by union of all
namespaces' tables (exposed as a resource — `raos://reason-registry`). Rules:

- Codes are namespaced and **additive-only** (§7.4).
- Every code must be **exercised by at least one mock variant and one worked
  example** (PROGRAM-PLAN §9 DoD).
- An agent encountering an unknown code degrades per §7.3.

---

## 9. Provenance & freshness envelope (contract level only)

Every computed contract may carry a **provenance + freshness** envelope so an
agent (and a buyer) can trust that data is authentic and current. RAOS-0000
fixes the **shape**; **RAOS-0008 owns the depth** (real signing, key rotation,
clock-skew, per-field freshness).

```jsonc
{
  "provenance": {
    "issuer": "https://api.grocery-c.test",
    "keyId": "k1",
    "signature": "base64…",          // crypto SIMULATED now (B3/D2)
    "trustMode": "asserted | signed" // label loudly so simulated ≠ real security
  },
  "freshness": {
    "computedAt": 1717718400,        // injected `now`, not Date.now()
    "ttlSeconds": 300                // past this, data is stale — degrade or re-fetch
  }
}
```

- **Determinism preserved:** `computedAt` comes from the **injected** `now`
  (§7.1), never an in-evaluator clock.
- **Staleness behavior** (serve-stale vs refuse), signature verification, key
  rotation, and per-field freshness are **deferred to RAOS-0008**. This spec only
  guarantees the envelope *exists and has this shape*.

---

## 10. The extension contract & pipeline (reference, not redesigned)

The *evaluator* contract — `UcpExtension<TConfig, TResult>` (declare →
read config → evaluate → fold reasons), the registry, and the fixed staged
pipeline **Visibility → Eligibility → Price → Fulfillment → Quote** — is defined
in [`ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md) §3–§5. RAOS-0000
does not restate or redesign it. The relationship:

- An extension's `evaluate` receives the **`BuyerContext`** defined here (§4), an
  injected `now` (§7.1), and a read-only view of prior-stage results.
- It returns an `ExtensionResult` whose `reasons[]` are **`ReasonEntry`** values
  (§8) and which may carry the **provenance/freshness** envelope (§9).
- Composition flows one direction (Price may read Eligibility; nothing reorders
  the pipeline). Determinism (§7.1) and degradation (§7.3) are enforced by the
  pipeline, not by individual extensions.

In short: this spec defines the **nouns and rules**; the ARCH doc defines the
**machine that runs them**.

---

## 11. Open questions — Request for Comment

These are genuine forks. Tell me I'm wrong.

1. **Three-axis identity — RESOLVED (2026-06-07).** `BuyerContext` keeps both
   `loyaltyTier` (consumer loyalty, RAOS-0009) *and* `membershipTier` (B2B account
   standing, RAOS-0001) as **two distinct, orthogonal fields**. *Decision: keep
   separate* — together with the conformance tier this is a deliberate three-axis
   identity model (conformance tier = merchant maturity · consumer loyalty ·
   B2B account standing); neither field subsumes the other, and each is owned by a
   different spec. They are not collapsed into one capability-set claim.
2. **`severity` three-state vs two-state.** RAOS-0000 standardizes
   `BLOCK | CONDITION | INFO` and derives `BLOCKED`/`CONDITIONAL` from
   `requirements[]`. Is `CONDITION` worth keeping as a distinct severity, or
   should agents just read `BLOCK` + presence of `requirements[]`? (Mirrors
   RAOS-0001 OQ#2 at the platform level.)
3. **Headline `tier` — keep it at all?** If agents must negotiate on
   `capabilities[]` and the headline is purely advisory, does publishing a `tier`
   number add value or invite the exact conflation we're trying to kill? *Leaning:
   keep it as a human/marketing summary, clearly labeled advisory.*
4. **Most-restrictive default for discovery.** §7.2 makes transaction stages
   default strict. Should *discovery* default open (risking surfacing something a
   buyer can't buy) or strict (risking under-surfacing)? (Mirrors RAOS-0001 OQ#4.)
5. **Where does `trust.mode` live — context or envelope?** The trust signal
   appears on both `BuyerContext.trust` (§4.2) and the provenance envelope (§9).
   Is one canonical and the other a view, or are they genuinely different (buyer
   claim trust vs data-payload trust)? *Leaning: genuinely different — keep both.*

> ⛔ **GATED — not an open question here.** The **agent-reasoning /
> explainability trace** format (audience, narration style, schema; RAOS-0013 /
> questions.md D1) is **deliberately not designed in this spec.** RAOS-0000
> provides only the *substrate* a trace would draw on — the ordered list of
> `ReasonEntry` values with `source` namespaces (§8). Do **not** design or
> implement the trace format without explicit user sign-off.

If you have an opinion on any of these, email me or reply on the build-log post.
This is being built in the open precisely so the answers come from people who run
real catalogs.

---

## 12. Why this is spec 0000

Everything else imports this. The leverage of RetailAgentOS is that the substrate
is implemented **once** and every merchant inherits it. If the `BuyerContext` is
clean, the manifest negotiates on the right axis, reasons share one vocabulary,
and versioning never breaks a consumer silently — then every spec above this one
is a small, safe addition rather than a fresh negotiation of first principles.

A foundation you can't see is doing its job. This spec is that foundation.

---

## 13. Changelog

### 2026-08-01 — OQ-1 fix: `endpoints` and `servesRegions` on the manifest (P0)

**Defect (found by the TheCustomHub Track B pilot audit, `04-pilot-evidence.md` §8):**
`buildManifest()` was a bare pass-through (`return profile.manifest`). `UcpManifest`
carried only `protocol`, `tier`, `capabilities[]`, `keys?` — `MerchantProfile
.endpoints` was silently dropped, and `servesRegions` existed on neither type even
though the TheCustomHub integration brief instructed the merchant to set it. Proved
live against `thecustomhub.com/.well-known/ucp`: an agent reading a conformant RAOS
manifest could not locate the catalog/cart/checkout endpoints or tell which regions
the merchant serves. **§6's Tier 0 claim — "an agent can find and correctly read my
catalog" — was not achievable as specified.**

**Fix:** `UcpManifest` (§6, `src/lib/types/core.ts`) gained `endpoints` and
`servesRegions?`. `MerchantProfile` gained `servesRegions?: string[]`.
`buildManifest()` (`src/lib/projections/manifest.ts`) no longer returns
`profile.manifest` by reference; it composes a new object from
`profile.manifest` + `profile.endpoints` + `profile.servesRegions`.

**Where the fields live — the decision this changelog exists to record:**
`endpoints`/`servesRegions` were added to `UcpManifest` itself, projected by
`buildManifest`, rather than assembled ad hoc at each discovery handler. Rationale:
the entire architectural point of `buildManifest` existing (see its original doc
comment, now corrected) is that callers depend on the *function*, not on knowing
where the pieces live inside a `MerchantProfile`. Composing `endpoints` at the
handler instead would mean every handler re-implements the same assembly — which
is exactly the kind of drift that let this defect ship in the first place (the
TheCustomHub `raos-mcp` server hand-rolled its own manifest rather than calling
`buildManifest`). `buildManifest(profile)` is now sufficient on its own: a caller
holding only its return value can serve a complete `/.well-known/ucp` response.

**`servesRegions` stays three-state on purpose.** `undefined` (the field is absent)
means the merchant has not declared a region allowlist; `[]` means the merchant
declared, literally, "serves nowhere"; a non-empty array is the allowlist. This
changelog entry does **not** resolve what `calculateEligibility` (RAOS-0001) should
*do* with the undeclared state — that is a separate, still-open fork (see
`04-pilot-evidence.md` §8 OQ-2 and its write-up). This entry only makes the
manifest capable of exposing the distinction once RAOS-0001 decides.

**Not changed:** the `tier`/`capabilities[]` negotiation contract (§6.1–§6.2) is
unaffected — `endpoints`/`servesRegions` are discovery data, not capability
negotiation surface, and agents still negotiate on `capabilities[]` alone.

---

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md)
for the full set and how to contribute.*
