# ARCH · UCP Extension Architecture + MCP Integration for RetailAgentOS

**Status:** Draft architecture · for review
**Author role:** Platform Architecture
**Date:** 2026-06-06
**Scope:** (1) How vendors/merchants extend UCP on RetailAgentOS via a first-class *extension* mechanism, and (2) how MCP exposes that extended commerce surface to AI shopping agents.
**Companion docs:** [`specs/PROGRAM-PLAN.md`](./PROGRAM-PLAN.md) (spec catalog, conformance tiers, waves), [`questions.md`](../questions.md) (locked decisions), RAOS-0001 (`src/app/specs/0001-eligibility`).

> **Verification note (per AGENTS.md):** This repo runs **Next.js 16.2.6** with App-Router Route Handlers. All transport recommendations in §6 were checked against `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — `route.ts` handlers, Web `Request`/`Response`, typed `RouteContext<'/path'>`, and the "Route Handlers are not cached by default; only `GET` may opt into caching" rule. No framework behavior is assumed from general training.

---

## 0. Executive summary & key decisions

RetailAgentOS today is a **set of pure, deterministic rule functions** (`src/lib/rules/*`) operating over a **flat, optional-field variant model** (`src/lib/types/core.ts`) with a **single monolithic context object** (`PricingContext`). Extensions exist as a *concept* — there is a `UcpExtension` descriptor type and per-merchant extension lists in `src/lib/mock/merchants.ts` — but there is **no runtime extension contract**: the rule engine hard-codes which fields it reads, in what order, and a context flag (`activeExtensions: string[]`) is declared but never enforced. There is no registration, no isolation, no versioned interface, and no negotiation. The "extension" is documentation, not a seam.

**This document proposes turning that concept into a real seam**, then layering MCP on top of it. The headline decisions:

| # | Decision | Recommendation | Why |
|---|----------|----------------|-----|
| D1 | **Namespace (locked)** | `com.os.retailagent.shopping.*` is the canonical base namespace everywhere; the prior predecessor namespace is fully deprecated and removed. Keep the namespace vendor-neutral in spec *prose* (questions.md A1 = upstream-candidate). | A1 is answered and the migration is **DONE** — specs, types, mock data, and architecture pages now carry the canonical namespace (see §8 R1, closed). |
| D2 | **Extension contract** | Define an **`UcpExtension<TInput, TOutput>` interface** (declare → contribute-context → evaluate → fold reasons) with a stable `namespace@semver`. Extensions are pure, deterministic, side-effect-free evaluators. | Matches the program's hard constraint: determinism, no model in the loop, additive-only reason codes (PROGRAM-PLAN §5 #7/#8). |
| D3 | **Registry & negotiation** | A **capability registry** keyed by namespace; a merchant manifest declares a **headline `tier` number BACKED BY an à-la-carte `capabilities[]` list**; agents negotiate via `/.well-known/ucp` (RAOS-0000) against `capabilities[]`, not the ladder. | Graceful degradation is a first-class requirement; agents must not break on absent extensions, and negotiation must work even when a merchant's support is *not* perfectly nested (PROGRAM-PLAN §5 #4). |
| D3b | **Split-axis conformance model (locked, B1)** | **Two orthogonal concepts.** (1) **Conformance Tiers 0–4** = a property of the *merchant's implementation maturity*, cumulative/nested: `0 Discoverable · 1 Qualified · 2 Priced · 3 Member-aware · 4 Assisted`. (2) **Buyer loyalty tier** (gold/silver/guest) = a *buyer claim* carried in `BuyerContext` (RAOS-0009). The two NEVER share an axis. | A merchant's *maturity* and a *buyer's* loyalty standing are different facts. Collapsing them (the old "Loyal" Tier-3) confused "what the merchant can do" with "who the buyer is." Tier 3 is renamed **Member-aware** = the merchant *supports* member/loyalty-aware pricing & earn preview, regardless of who is shopping. |
| D4 | **Composition / precedence** | A **fixed evaluation pipeline** (Visibility → Eligibility → Price → Fulfillment → Quote) with declared precedence *within* a stage. No extension may reorder the pipeline. | Determinism + auditability. Cross-extension precedence (e.g. promo stacking) is owned by the stage, not by individual extensions. |
| D5 | **MCP shape** | **One MCP server** ("RetailAgentOS Shopping") exposing a small **tool** surface (actions) + **resource** surface (read-only catalog/manifest), where every tool is a thin adapter over the same UCP extension pipeline. | MCP and UCP must not diverge. The MCP tool *is* a UCP evaluation; one source of truth. |
| D6 | **Auth model** | Buyer context travels as a **signed `BuyerContext` token** (questions.md B6 = (b), simulated now); MCP server authenticates the *agent* (client credential) and carries the buyer token as a tool argument / session binding. | Member pricing, loyalty, tax-exemption all hinge on *trusting* the buyer claim. Design real, simulate for demo (B6). |
| D7 | **Quote integrity bridge** | MCP `checkout` handoff carries **RAOS-0007 quote tokens**; the MCP layer never re-prices independently. | "The price the agent showed is the price charged" is the retailer-trust unlock (B2 = Yes). |

**Gated / NOT designed here (respecting memory + questions.md D1):** the **agent-reasoning / explainability trace format** (RAOS-0013-adjacent, Phase 3). This document defines *where* such a trace would attach (§6.6) but **does not specify its schema, audience, or narration style**. That requires a dedicated decision with the user. See §8 R7 and the explicit call-out box in §6.6.

---

## 1. Current-state summary: how UCP is modeled today

### 1.1 The object model (`src/lib/types/`)
- **`core.ts`** — `MerchantProfile` (capabilities + extensions descriptors + endpoints), `Product → Variant`, `CartLine`. The `Variant` is the **extension carrier**: every extension's input config is an *optional field* on the variant (`memberPricing?`, `bulkPricing?`, `eligibilityRules?`, `promoPricing?`, `fulfillmentConstraints?`). Adding an extension today = adding an optional field here.
- **`extensions.ts`** — defines both the **input configs** (`EligibilityRules`, `MemberPricing`, `BulkPricing`, `FulfillmentConstraints`, `PromoPricing`) and the **computed output contracts** (`ComputedVisibility`, `ComputedEligibility`, `ComputedPriceState`, `CartValidationResult`). Also defines the **single context object `PricingContext`** (customer type, tier, region, fulfillment mode, flags, and an unused `activeExtensions: string[]`).

### 1.2 The rule engine (`src/lib/rules/`)
- **`eligibility.ts`** — `calculateVisibility()` then `calculateEligibility()`. Pure functions. Hard-codes the order: guest gate → wholesale → resale cert → tier. Emits structured `EligibilityReason[]` with codes (`HIDDEN_PRODUCT`, `REGION_RESTRICTED` [merchant-level `servesRegions` only, RAOS-0001 §9.6], `WHOLESALE_ONLY`, `RESALE_CERTIFICATE_REQUIRED`, `TIER_RESTRICTION`). Region (variant-level) and fulfillment-mode checks MOVED to RAOS-0003's `fulfillment.ts` (2026-08-12, engine 0.3.0) — see `specs/0001-eligibility.md` §11 changelog.
- **`pricing.ts`** — `getApplicablePrice()`. Hard-codes precedence **member → bulk → promo (last wins)**. This is exactly the precedence questions.md B4 wants to make *declarable* (default: priority ladder + `stackable`/`exclusive` flags).
- **`cartValidation.ts`** — composes the above per line into a `CartValidationResult`.

### 1.3 The "extension" concept as it exists
- `UcpExtension` descriptor (`id`, `name`, `version`, `namespace`, `description`, `required`) in `core.ts`.
- Per-merchant **declared** extension lists in `merchants.ts` (boutique = pricing_context + eligibility; wholesale adds bulk_pricing; grocery adds promo_pricing + fulfillment_constraints). This is a real, usable **manifest** — it just isn't *enforced* by the engine.
- The three archetypes (`m_boutique_001`, `m_wholesale_002`, `m_grocery_003`) already model tier differences via which extensions they list.

### 1.4 Where extension points exist vs. are missing

| Concern | Exists today | Missing (the gap this doc closes) |
|---------|--------------|-----------------------------------|
| Input carrier | ✅ optional fields on `Variant` | A *typed contract* binding a namespace to its input/output |
| Output contracts | ✅ `Computed*` types | A uniform `ExtensionResult` envelope (reasons + provenance + freshness) |
| Manifest / declaration | ✅ per-merchant extension list | A `/.well-known/ucp` discovery doc: headline `tier` + authoritative `capabilities[]` (RAOS-0000) |
| Negotiation | ❌ (`activeExtensions` unused) | Agent ↔ merchant capability negotiation + version skew handling |
| Registration | ❌ hard-coded calls | A registry: namespace → evaluator, ordered into a pipeline |
| Isolation | ❌ all rules share one module/context | Per-extension fault isolation; one failing extension degrades, not crashes |
| Versioning | ⚠️ `version` string on descriptor, not enforced | semver-per-namespace, additive-only codes, deprecation policy |
| Multi-tenancy | ⚠️ merchant-scoped data, shared engine | Tenant config overrides + per-tenant enablement without code change |
| Determinism guarantee | ✅ pure functions | Formalized: same `(BuyerContext, manifest, catalog)` → identical output |

---

## 2. Target architecture: layers

```
┌───────────────────────────────────────────────────────────────────────┐
│  AGENT TIER                                                            │
│  AI shopping agent (Claude/other) ── speaks MCP ──┐                    │
└───────────────────────────────────────────────────┼───────────────────┘
                                                     │ MCP (tools+resources)
┌────────────────────────────────────────────────────▼──────────────────┐
│  MCP ADAPTER  (RetailAgentOS Shopping MCP server)                      │
│  thin: auth agent · carry BuyerContext token · map tool→pipeline call  │
│  NEVER re-prices, NEVER re-evaluates eligibility itself                 │
└────────────────────────────────────────────────────┬──────────────────┘
                                                     │ in-process call
┌────────────────────────────────────────────────────▼──────────────────┐
│  UCP EXTENSION PIPELINE  (the platform contract — §3,§4,§5)            │
│  Negotiate → resolve manifest → run ordered stages over BuyerContext   │
│   Stage: Visibility → Eligibility → Price → Fulfillment → Quote        │
│  Each stage = one or more registered UcpExtension evaluators           │
└──────┬───────────────────┬───────────────────┬───────────────┬─────────┘
       │                   │                   │               │
┌──────▼─────┐     ┌───────▼──────┐    ┌───────▼──────┐ ┌──────▼───────┐
│ eligibility│     │ member/bulk/ │    │ fulfillment  │ │ quote/trust  │
│  (0001)    │     │ promo (0002/6)│    │  (0003)      │ │ (0007/0008)  │
└────────────┘     └──────────────┘    └──────────────┘ └──────────────┘
       │  registered by namespace, semver-pinned, pure & deterministic  │
┌──────────────────────────────────────────────────────────────────────┐
│  FOUNDATION (RAOS-0000)                                                │
│  BuyerContext · core catalog model · conformance tiers · versioning   │
│  determinism + most-restrictive-default · degradation semantics       │
└──────────────────────────────────────────────────────────────────────┘
```

The crucial architectural line: **MCP is an adapter, not a second brain.** Every shopping decision is computed once, by the UCP extension pipeline. MCP translates agent intents into pipeline calls and translates pipeline results back into MCP tool results. This guarantees an agent using MCP and a UI using the Playground see *identical* decisions — which is the whole "the Playground proves the spec" thesis (PROGRAM-PLAN §7.3).

---

## 3. The UCP extension contract

### 3.1 Design goals (first principles)
1. **Stable, minimal seam.** An extension author touches *only* their evaluator + their input/output types. They never edit the pipeline, the context, or another extension.
2. **Deterministic & pure.** No I/O, no clock, no randomness inside an evaluator. Freshness/time is *injected* via context (so `RAOS-0008` TTLs and `RAOS-0007` quote expiry stay testable).
3. **Additive-only evolution.** New reason codes and fields may be added; existing ones never change meaning (PROGRAM-PLAN §5 #7).
4. **Fail-degraded, never fail-open or crash.** A throwing/timeout/unknown-code extension yields a documented degraded result, not an exception that breaks the agent (PROGRAM-PLAN §5 #4; RAOS-0000 forward-compat rule).

### 3.2 The interface (conceptual — not implementation)

An extension is a value implementing this contract. (Types shown for precision; this doc does **not** write the code — see PROGRAM-PLAN §7 for who builds it.)

```ts
// proposed: src/lib/extensions/contract.ts
interface UcpExtension<TConfig, TResult extends ExtensionResult> {
  namespace: string;          // "com.os.retailagent.shopping.eligibility"
  version: string;            // semver, e.g. "1.1.0"
  stage: PipelineStage;       // VISIBILITY | ELIGIBILITY | FEASIBILITY | PRICE | FULFILLMENT | QUOTE
                               // (FEASIBILITY added 2026-08-12 by RAOS-0003 — see
                               // src/lib/extensions/contract.ts STAGE_ORDER doc comment
                               // for the reordering decision and its justification)
  priority: number;           // ordering WITHIN a stage (lower = earlier)
  reasonCodes: readonly string[]; // the registry this extension owns

  // read merchant config off the variant (the optional field carrier)
  readConfig(variant: Variant): TConfig | undefined;

  // pure evaluation — receives the SHARED context + prior-stage results
  evaluate(input: {
    config: TConfig;
    context: BuyerContext;       // RAOS-0000 canonical, supersedes PricingContext
    priorResults: StageResults;  // read-only view of earlier stages
    now: number;                 // INJECTED time — never Date.now() inside
  }): TResult;
}

interface ExtensionResult {
  namespace: string;
  reasons: ReasonEntry[];        // structured, coded — superset of EligibilityReason
  provenance?: Provenance;       // RAOS-0008: issuer, keyId, signature (simulated now)
  freshness?: { computedAt: number; ttlSeconds: number }; // RAOS-0008
}
```

**Why this shape:**
- `readConfig(variant)` keeps the *carrier* (optional fields on `Variant`) but hides it behind the extension, so the pipeline doesn't hard-code field names (today's coupling in `eligibility.ts`/`pricing.ts`).
- `priorResults` lets `Price` see `Eligibility` (don't price a blocked item), and `Quote` see everything — *without* extensions calling each other. Composition flows one direction.
- `now` injected → determinism holds even for TTL/quote logic.
- `reasonCodes` declared up front → the registry can be assembled statically and validated (every code exercised by a mock — PROGRAM-PLAN §9).

### 3.3 The unified reason envelope
Today `ComputedEligibility` carries `EligibilityReason[]` and pricing carries free-form `appliedOfferState` strings. **Recommendation:** lift to one `ReasonEntry` shape across all stages so an agent parses one vocabulary:

```ts
interface ReasonEntry {
  code: string;            // namespaced-stable, e.g. "TIER_RESTRICTION"
  message: string;         // localizable prose (never the contract)
  severity: 'BLOCK' | 'CONDITION' | 'INFO';  // replaces ambiguous `blocking` bool
  requirements?: Requirement[]; // the resolution path, if any
  source: string;          // owning namespace — for the trace + debugging
}
```

This also resolves **RAOS-0001 open question #1/#2** (the incoherent `blocking:true` + `CONDITIONAL` status): `severity` is the state; `BLOCKED` vs `CONDITIONAL` is *derived* from whether any `requirements[]` resolution path exists. Recommend folding that derivation into the Eligibility stage and dropping the standalone `blocking` boolean. (Flag this as a breaking change to the 0001 output → handle via §7 versioning.)

---

## 4. Lifecycle, registration, discovery, versioning

### 4.1 Lifecycle of an extension call

```
 register (boot)        negotiate (per session)     evaluate (per request)
 ───────────────        ───────────────────────     ──────────────────────
 namespace→evaluator    agent reads /.well-known/ucp  pipeline runs enabled
 added to registry,     → merchant manifest +          stages in fixed order,
 grouped by stage,      tier + capabilities[] versions each extension pure,
 sorted by priority     → agent computes the SUBSET     degraded on error,
                        from capabilities[] it trusts   folds ReasonEntry[]
```

### 4.2 Registration (the registry)
A single registry maps `namespace → UcpExtension`. At boot, extensions self-describe (stage + priority + reasonCodes). The pipeline is *derived*, not hand-written:

```
Registry.register(eligibilityExt)      // stage ELIGIBILITY, priority 10
Registry.register(memberPricingExt)    // stage PRICE,       priority 10
Registry.register(bulkPricingExt)      // stage PRICE,       priority 20
Registry.register(promoPricingExt)     // stage PRICE,       priority 30
...
Pipeline = Registry.byStage()   // ordered, deterministic
```
This replaces the hard-coded call sites in `eligibility.ts`/`pricing.ts`. Adding RAOS-0009 loyalty = register one evaluator; no pipeline edit.

### 4.3 Discovery & negotiation (RAOS-0000 surface)
- **`/.well-known/ucp`** (a Next.js 16 `route.ts` GET handler, `dynamic` left default so it is request-evaluated for per-tenant manifests) returns: protocol version, a **headline `tier` number (0–4)**, and the **à-la-carte `capabilities[]` list** that actually backs it — each capability being a supported extension with `namespace@version`.
- **Headline `tier` + `capabilities[]` (the locked B1 manifest shape).** The `tier` is a human/marketing-friendly *summary* of maturity; `capabilities[]` is the *authoritative* machine surface. **Agents negotiate against `capabilities[]`, never against the ladder number.** This decouples negotiation from perfect nesting: a merchant may support an individual Tier-3 capability (e.g. `member_pricing`) without claiming the full nested Tier 3 — they simply list that capability and keep a lower headline `tier`. The ladder describes *typical* maturity; `capabilities[]` describes *actual* support.

  ```jsonc
  // GET /.well-known/ucp  (illustrative)
  {
    "protocol": "1.0",
    "tier": 2,                       // headline maturity summary (0–4)
    "capabilities": [               // AUTHORITATIVE — agents negotiate on THIS
      { "namespace": "com.os.retailagent.shopping.eligibility",     "version": "1.0.0" },
      { "namespace": "com.os.retailagent.shopping.member_pricing",  "version": "1.0.0" },
      { "namespace": "com.os.retailagent.shopping.quote",           "version": "1.0.0" }
      // a Tier-2 merchant MAY additionally list a Tier-3 capability
      // (e.g. ...loyalty) here without raising the headline tier.
    ]
  }
  ```
- The agent computes which **stages it can trust** from `capabilities[]` and degrades gracefully for absent ones (e.g. no `PRICE` capability listed → agent shows base price, doesn't promise member pricing) — regardless of the headline `tier`.
- **Buyer loyalty tier is NOT here.** The manifest describes *merchant capability*. Whether *this buyer* is gold/silver/guest is an orthogonal **`BuyerContext` claim owned by RAOS-0009** (§5.1) — it travels with the request, not the manifest, and is never a rung on the conformance ladder.
- **Version skew:** agent and merchant compare `namespace@major`. Same major = compatible (additive minor/patch). Different major = agent falls back to the highest shared major or treats the capability as absent. Unknown reason code → treated as `BLOCK` (RAOS-0000 forward-compat: never crash).

### 4.4 Versioning & deprecation policy
- **semver per namespace.** Minor/patch = additive only (new optional config field, new reason code, new requirement type). Major = breaking (removed/renamed code, changed semantics).
- **Additive-only reason codes** — never repurpose a code's meaning (already stated on the 0001 page; promote to platform rule).
- **Deprecation path:** a code/field marked `deprecated` stays emitted for ≥1 major with a `supersededBy` pointer; agents reading the new code ignore the old. This is the migration mechanism for the `blocking`→`severity` change (§3.3) and the `PricingContext`→`BuyerContext` rename (§5).

---

## 5. Multi-tenancy, isolation, and the context object

### 5.1 BuyerContext supersedes PricingContext (RAOS-0000)
Today `PricingContext` is overloaded — it carries buyer identity *and* the misnamed `activeExtensions`. Recommendation:
- Rename/lift to **`BuyerContext`** (buyer-scoped facts only: customerType, **buyer loyalty tier (gold/silver/guest)**, region, fulfillment mode, consent flags, the *signed identity claim*). This is PII (RAOS-0015) — minimize fields, carry only what a stage needs.
- **Buyer loyalty tier vs. conformance tier — do not conflate (locked B1, D3b).** The `loyaltyTier` field here (gold/silver/guest) is a **buyer claim owned by RAOS-0009**. It answers *"who is shopping."* It is **never** a rung on the conformance ladder, which answers *"what the merchant can do."* A guest buyer at a **Member-aware (conformance Tier-3)** merchant is normal: the merchant *supports* member-aware pricing/earn-preview; this particular buyer simply has no member claim. Keep the two on separate axes everywhere — in types, in payloads, and in prose.
- Move `activeExtensions` *out* of buyer context and into the **negotiated session manifest** (it's a merchant/agent fact, not a buyer fact). This removes a real modeling bug.

### 5.2 Tenant isolation & overrides
- **Data isolation:** catalog/config is already merchant-scoped (`merchantId` on Product/Variant). Keep tenant data partitioned by `merchantId`; the pipeline must never read across tenants in one evaluation.
- **Config override hierarchy (proposed):** `platform default → merchant manifest → variant-level config`. A merchant enables a stage by listing the extension in its manifest; per-variant optional fields tune it. No tenant can change *another* tenant's behavior or the pipeline order.
- **Fault isolation:** each extension's `evaluate` runs guarded. A throw/timeout produces a degraded `ExtensionResult` (`severity: BLOCK` for safety-critical stages like Eligibility — most-restrictive default; `INFO`/omit for advisory stages like Loyalty). One vendor's bad extension cannot break the agent for the tenant — let alone other tenants.

### 5.3 Eligibility/rules engine interaction (the concrete refactor)
The existing `calculateEligibility` becomes the **Eligibility-stage evaluator(s)**, unchanged in logic but:
1. reads `BuyerContext` not `PricingContext`,
2. emits `ReasonEntry` (with `severity`) not `EligibilityReason` (with `blocking`),
3. is *registered*, not called directly.
The existing precedence in `pricing.ts` (member→bulk→promo) becomes **declared `priority` within the PRICE stage** + per-offer `stackable`/`exclusive` flags (questions.md B4 default). This makes the "last wins" behavior *explicit and declarable* instead of implicit in call order — and is where RAOS-0006 stacking precedence plugs in.

> **Resolved (B1 — LOCKED):** the tier model is ratified as a **split axis** (D3b). **Conformance Tiers 0–4** (`0 Discoverable · 1 Qualified · 2 Priced · 3 Member-aware · 4 Assisted`) describe *merchant maturity* and are cumulative/nested. **Buyer loyalty tier** (gold/silver/guest) is an orthogonal `BuyerContext` claim (RAOS-0009), never a conformance rung. The manifest publishes a headline `tier` BACKED BY an authoritative `capabilities[]` list (§4.3), so negotiation never depends on perfect nesting. The commercial `/for-merchants` service tiers (Audit → Managed Pilot) map onto **conformance only**, never onto buyer loyalty.

---

## 6. MCP integration architecture

### 6.1 Why one server, thin
A single **"RetailAgentOS Shopping" MCP server** exposes the platform to agents. It is deliberately thin: it authenticates the agent, carries the buyer token, and maps each tool call to a pipeline evaluation. It holds **no commerce logic** — that lives in §3–5. This keeps one source of truth and means MCP automatically inherits every new UCP extension without new tools (a loyalty stage shows up inside `evaluate_offer`, not as a new tool).

Transport: an HTTP/streamable MCP endpoint implemented as a Next.js 16 **App-Router `route.ts`** handler (POST for the MCP message channel). Verified against the route-handler doc: handlers use Web `Request`/`Response`, are **not cached** for non-GET, and read runtime data via `headers()`/request body — exactly the dynamic, per-request behavior an MCP endpoint needs. Read-only GET resource fetches *may* opt into caching but should stay request-time while data is mock/simulated.

### 6.2 Resources (read-only, addressable)
Resources are the "nouns" — safe, cacheable, no side effects:

| Resource URI | Backs onto | Purpose |
|--------------|-----------|---------|
| `raos://merchant/{id}/manifest` | `/.well-known/ucp` | headline `tier` (0–4) **+ authoritative `capabilities[]`** (`namespace@version`) — negotiation reads `capabilities[]`, not the ladder |
| `raos://merchant/{id}/catalog` | `catalog.ts` | products/variants (the carrier model) |
| `raos://merchant/{id}/product/{pid}` | catalog | single product + variants |
| `raos://spec/{nnnn}` | `specs/` | the spec text itself — agents can read the contract they're using |
| `raos://reason-registry` | assembled from extensions | every reason code + meaning + resolvability |

Exposing the reason registry and specs *as resources* is high-leverage: an agent can introspect the contract it's transacting against — directly serving the "communication artifact" goal in project memory.

### 6.3 Tools (actions) — the shopping agent surface
Each tool is an adapter over a pipeline stage (or the full pipeline). Minimal, composable:

| Tool | Maps to | Input (besides BuyerContext token) | Output |
|------|---------|-----------------------------------|--------|
| `browse_catalog` | Discovery (0004) + Visibility (0001) | merchantId, query/filters | only **VISIBLE** items, with per-item visibility provenance |
| `evaluate_offer` | full pipeline for one variant | merchantId, variantId, quantity | Visibility + Eligibility + Price + Fulfillment, each with `ReasonEntry[]` |
| `check_eligibility` | Eligibility stage only | merchantId, variantId | `ComputedEligibility` + resolution paths |
| `build_cart` / `validate_cart` | `cartValidation.ts` | lines[] | per-line `CartValidationResult` (eligibility + price + messages) |
| `get_quote` | Quote stage (0007) | cart or line | signed quote token {price, offers, TTL} |
| `begin_checkout` | Cart Bridge (0012) | cart + quote tokens | UCP checkout handoff payload (carries quotes intact) |
| `capture_intent` | Intent Capture (0013) | variantId, channel, consent | notify-me / B2B-quote routing (consent-gated, RAOS-0015) |

**Design rules for the tool surface:**
- Tools return the **same `Computed*` / `ReasonEntry` contracts** the Playground renders — no MCP-specific reshaping.
- `browse_catalog` never returns `HIDDEN` items (visibility is enforced server-side; the agent can't accidentally surface a gated SKU).
- `evaluate_offer` is the workhorse and the safest default: it returns a *complete, explainable* decision an agent can act on or narrate.
- Mutations (`build_cart`, `begin_checkout`) are explicit, idempotent (idempotency key on handoff — RAOS-0012 edge case), and **price-authoritative only via quote tokens** (no re-pricing in MCP).

### 6.4 How MCP maps onto UCP extensions (one feeds the other)
```
agent calls  evaluate_offer(merchant, variant, qty, buyerToken)
                       │
        MCP adapter ───┤ 1. authenticate agent (client credential)
                       │ 2. verify buyerToken → BuyerContext (B6: simulated now)
                       │ 3. resolve merchant manifest (negotiation, §4.3)
                       ▼
        UCP pipeline ──► Visibility ▸ Eligibility ▸ Price ▸ Fulfillment ▸ Quote
                       │   (only stages the merchant supports; rest degraded)
                       ▼
        MCP adapter ◄── ExtensionResult[] folded into ONE explainable payload
                       │ (Computed* contracts + ReasonEntry[] + provenance/TTL)
                       ▼
            agent  ◄── decides: recommend / show path / capture intent / stop
```
A **new UCP extension automatically widens MCP**: register a loyalty evaluator in the PRICE/INFO stage and `evaluate_offer` starts returning earn/burn previews — no new tool, no MCP redeploy of logic. This is the core leverage of the thin-adapter decision (D5).

### 6.5 Auth model
- **Agent authentication:** the MCP client (the agent) presents a credential to the server (client-credentials / API key for demo; OAuth client creds for real). Establishes *which agent* is calling — for rate limiting, abuse control (RAOS-0013 notify-me spam edge case), and audit.
- **Buyer authorization:** the *buyer's* claims (member, gold tier, tax-exempt, region) ride as a **signed `BuyerContext` token** passed per call or bound to the MCP session. Per questions.md **B6 = (b), simulated now**: design the signed-token verification path (issuer, keyId, signature → trusted claims), but accept agent-asserted context in demo mode behind a `trustMode: 'asserted' | 'signed'` flag. Untrusted/absent claims → **default to guest / most-restrictive** (RAOS-0000 rule; resolves 0001 OQ#4 on the safe side for transaction stages).
- **Consent & PII (RAOS-0015):** the buyer token carries only minimized PII; `capture_intent` requires an explicit consent flag before any contact info is accepted. Trust boundary: the merchant trusts the *signature*, not the agent's word.

### 6.6 The reasoning-trace attachment point — GATED, NOT DESIGNED HERE

> ⛔ **GATED DECISION — do not implement without user sign-off.**
> Project memory and `questions.md` D1 explicitly hold the **agent-reasoning / explainability trace format** for direct discussion with the user. This architecture defines only *where* such a trace would attach: the pipeline already produces an **ordered list of `ReasonEntry[]` with `source` namespaces**, which is the natural substrate for a trace. An MCP `evaluate_offer` result *could* carry an optional `trace` field, and the Payload Inspector has a reserved Phase-3 tab for it.
> **This document deliberately does not specify** the trace's schema, audience (merchant-debug vs buyer-plain-language vs developer-JSON), narration style (first-person vs structured steps), or whether it needs fields beyond the existing computed data. Those are the exact open questions in `questions.md` D1 and the memory TODO. **Raise them with the user before any sub-agent builds the trace.**

---

## 7. Backward compatibility & migration

| Change | Breaking? | Migration path |
|--------|-----------|----------------|
| Predecessor namespace → `com.os.retailagent.shopping.*` | Yes (namespace) | **DONE** — one-shot rename completed across `merchants.ts`, spec pages, SVG, and prose while still pre-1.0 (R1 closed). `com.os.retailagent.shopping.*` is now the locked, in-effect base namespace. |
| `PricingContext` → `BuyerContext` | Yes (type) | Type alias `PricingContext = BuyerContext` for one minor; move `activeExtensions` to session manifest; update rule fns. |
| `EligibilityReason.blocking` → `ReasonEntry.severity` | Yes (output) | Emit both for ≥1 major (`blocking` derived from `severity`); mark `blocking` deprecated `supersededBy: severity`. Resolves 0001 OQ#1. |
| Hard-coded rule calls → registry | No (internal) | Pure refactor; outputs identical. Lowest-risk first step. |
| Single module → staged pipeline | No (internal) | Behavior-preserving; add tests asserting identical output on current mocks before/after. |

**Sequencing principle:** do the *non-breaking* internal refactors (registry, pipeline, `now`-injection) **first** — they change no contract and de-risk everything after. Do the *breaking* contract changes (namespace, BuyerContext, severity) as a deliberate pre-1.0 batch, since the spec series is still Draft·RFC and consumer count is near zero — the cheapest moment to break.

---

## 8. Risks & trade-offs

| ID | Risk / trade-off | Severity | Mitigation |
|----|------------------|----------|------------|
| R1 | **Stale namespace** — *(CLOSED)* code, RAOS-0001 page, and the discovery SVG previously carried the deprecated namespace, contradicting locked decision A1. | Resolved | Rename completed (§7 row 1) before MCP work cemented it into tool descriptors/resources; `com.os.retailagent.shopping.*` is now canonical. Remaining stray references, if any, are non-public-facing and tracked separately. |
| R2 | **Over-engineering the pipeline** for stages that don't exist yet. A 5-stage registry for what is today 2 rule files could be speculative complexity. | Med | Build the seam, but only register the extensions that exist (eligibility, pricing). Stages are an *ordering convention*, cheap; don't build loyalty/quote machinery until those specs land (v1 = 0000/0001/0002/0005/0007/0008 per A2). |
| R3 | **MCP and UCP drifting** into two implementations of "can this buyer buy." | High | Architectural rule D5: MCP tools are pure adapters; add a test that an MCP `evaluate_offer` result is byte-identical to the Playground pipeline result for the same inputs. |
| R4 | **Determinism break** if any extension reads `Date.now()`/IO (quote TTL, freshness). | High | `now` injected via context (§3.2); lint/review rule: no `Date`/`fetch`/`Math.random` in `src/lib/extensions/*`. |
| R5 | **Trust theater** — signed tokens simulated (B6) may be mistaken for real security. | Med | Label `trustMode: 'asserted'` loudly in payloads/UI; design the real verification interface now so the swap is mechanical (D2 still simulated per questions.md D2). |
| R6 | **Tier-model conflation** — *(CLOSED, B1 locked)* the old single-axis model put buyer "Loyal" status on the conformance ladder, conflating merchant maturity with buyer identity. | Resolved | Split into two orthogonal axes (D3b, §5.1): conformance Tier-3 renamed **Member-aware** (merchant capability); buyer loyalty tier moved to a `BuyerContext`/RAOS-0009 claim. Manifest publishes headline `tier` + authoritative `capabilities[]` so negotiation never depends on perfect nesting. |
| R7 | **Reasoning-trace scope creep** — a sub-agent designs the trace format unprompted. | High (process) | §6.6 gate; memory TODO; do not proceed without user sign-off on audience + format. |
| R8 | **Cross-merchant cart** out of scope (questions.md C) but MCP makes it tempting. | Low | Keep MCP tools single-merchant-scoped; flag marketplace cart as explicitly future. |

---

## 9. Phased rollout

Aligned to PROGRAM-PLAN §8 waves and the v1 cut line (A2: Foundations 0000, Eligibility 0001, Contextual Pricing 0002, Inventory 0005, Quote 0007, Trust 0008).

- **Phase A — Namespace + internal seam (no contract change).** Namespace rename to `com.os.retailagent.shopping.*` is **DONE** (R1 closed). Introduce the registry + staged pipeline + `now`-injection as a behavior-preserving refactor of `eligibility.ts`/`pricing.ts`/`cartValidation.ts`. Add before/after equivalence tests on existing mocks. *Lowest risk, unblocks all else.*
- **Phase B — RAOS-0000 contract.** Land `BuyerContext` (incl. the orthogonal buyer `loyaltyTier` claim, §5.1), the `ExtensionResult`/`ReasonEntry` envelope (`severity` replaces `blocking`), the `/.well-known/ucp` manifest as **headline `tier` + authoritative `capabilities[]`** (B1 locked, §4.3), negotiation + degradation semantics, versioning policy. Retro-fit 0001 onto it (resolves 0001 OQ#1/#2/#4). B1 tier model is ratified (split axis, Member-aware rename) — no pause needed.
- **Phase C — MCP read surface.** Stand up the thin MCP server (Next.js 16 `route.ts`). Ship **resources** first (`manifest`, `catalog`, `spec`, `reason-registry`) and read-only tools (`browse_catalog`, `check_eligibility`, `evaluate_offer`). Agent auth = client credential; buyer = `trustMode: 'asserted'`. Add the MCP↔Playground equivalence test (R3).
- **Phase D — Value + quote stages.** Register Contextual Pricing (0002) into the PRICE stage with declarable precedence (B4); add Inventory (0005) freshness inputs; add Quote (0007) + Trust/Provenance (0008) envelope (simulated crypto, D2). MCP gains `get_quote`, `validate_cart`. This is the retailer-trust unlock (B2).
- **Phase E — Outcomes (mostly backlog).** `begin_checkout` (Cart Bridge 0012), `capture_intent` (Intent Capture 0013, consent-gated). **Agent-reasoning trace remains GATED (§6.6) — separate user discussion, not part of this rollout.**

---

## 10. Open questions for the user

1. **B1 tier model: RESOLVED (locked).** Split axis adopted — conformance Tiers 0–4 (`3` renamed **Member-aware**) describe merchant maturity; buyer loyalty tier is an orthogonal `BuyerContext`/RAOS-0009 claim; manifest = headline `tier` + authoritative `capabilities[]`; `/for-merchants` maps onto conformance only. No longer an open question.
2. **D1 reasoning trace:** the trace's audience, format, and whether it needs new fields — gated, needs your input before anyone builds it.
3. **Breaking-change batch timing:** confirm it's acceptable to do the namespace + `BuyerContext` + `severity` breaks now as a pre-1.0 batch (recommended — cheapest moment).
4. **`severity` vs three-status (0001 OQ#2):** endorse deriving `BLOCKED`/`CONDITIONAL` from `requirements[]` presence + a single `severity` field, dropping the `blocking` boolean?
5. **MCP buyer-token issuer:** for the eventual real (non-simulated, D2) path — is the issuer an account-link/OAuth provider, the merchant, or a RetailAgentOS identity service (RAOS-0015)?
```
