# RetailAgentOS — Product Backlog

**Owner:** Rik Banerjee · **Status:** Living backlog · **Date:** June 2026
**Framework:** Value-vs-Effort matrix with P0/P1/P2 priority.
**Namespace baseline:** `com.os.retailagent.shopping.*` (per questions.md A1 — vendor-neutral, upstream-candidate)

---

## Executive Summary

The agentic commerce landscape has moved fast. As of June 2026:
- Google UCP is live with cart, catalog, and identity-linking (loyalty OAuth) — all major retailers are integrating.
- OpenAI/Stripe's ACP (Agentic Commerce Protocol) ships a discount extension and an MCP transport binding.
- Talon.One launched the Unified Incentives Protocol (UIP) in January 2026 — the first dedicated spec for loyalty and promos in agent commerce. It extends UCP.
- Voucherify is positioning as the API-first promotion engine for agents, with MCP integration and stacking logic.

**The gap RetailAgentOS fills is real and growing**: UCP/ACP give rails for checkout; they do not carry the merchant's *reasoning* — who qualifies, at which price, under what promo, with what delivery restriction, and *why*. UIP/Talon.One covers loyalty and discounts at the platform level but not at the individual-merchant declarative layer. RAOS fills the semantic, catalog-time, reason-code contract that sits above the rails and below the AI model.

**Top priorities for the three focus areas:**

1. **Loyalty (RAOS-0009)** — UCP Identity Linking is live but carries only OAuth-linked tier/balance. The earn-preview, tier-benefit visibility, and burn-eligibility contracts that agents need at *browse time* (before checkout) are unspecified. This is the immediate differentiator.

2. **Promo Pricing + Stacking (RAOS-0006)** — ACP has a discount extension RFC, Talon.One has a UCP discount extension, but neither specifies a *deterministic stacking model with reason codes* a merchant can declare on a per-offer basis. Unintended promo stacking is the #1 margin-leakage risk cited by retailers in agent commerce. RAOS-0006 with the priority-ladder + stackable/exclusive model is differentiated.

3. **Delivery Restrictions (RAOS-0003 + RAOS-0011)** — No existing protocol carries geo/zip-level delivery eligibility, age-restricted-good restrictions, or regulated-item purchase limits at catalog time. Every platform pushes this to checkout, which is exactly the dead-end problem RAOS solves. Cannabis/alcohol/tobacco compliance is a *live business problem* in 2026 with real legal exposure.

---

## Prioritization Framework

**Priority definitions:**
- **P0** — Unblocks other specs, directly differentiates vs UCP/ACP/UIP, or is a legal/trust blocker. Build in Wave 0 or Wave 1.
- **P1** — High visitor impact or directly maps to the three focus domains (loyalty, promo, delivery). Build in Wave 2–3.
- **P2** — Rounds out the platform, important for Tier 3/4 merchants. Wave 3+.

**Effort (T-shirt sizing):** S = <1 week one person, M = 1–2 weeks, L = 2–4 weeks, XL = 4+ weeks.

**Parity vs. Differentiation:**
- **Parity** = catching up to what UCP/ACP/UIP already ship.
- **Differentiation** = something none of the incumbents specify at the catalog-time, reason-code, per-merchant level.

---

## NOW — Wave 0 + Wave 1 (this month / next 4 weeks)

These are blockers or immediate public-launch credibility items.

### N1 · RAOS-0000 · Protocol Foundations & Conformance Tiers `P0 · L · Differentiation`

**Problem:** Every spec ships its own context object. Agents and implementers have no canonical envelope, no versioning contract, no graceful-degradation rule. Without this, RAOS is a collection of demos, not a platform.

**User/agent value:** A single `/.well-known/ucp` manifest declares `supportedTier` (0–4). An agent reads it once and knows exactly which contracts to expect, how to degrade if one is absent, and whether reason codes from this merchant are forward-compatible. Merchant implementers get a conformance checklist.

**Acceptance criteria:**
- [x] Canonical `BuyerContext` object defined (supersedes per-spec `PricingContext`) — `src/lib/types/context.ts` (WP-02)
- [x] `/.well-known/ucp` extension manifest shape + `supportedTier` field — `src/app/.well-known/ucp/route.ts` (WP-02)
- [x] Conformance Tier 0–4 declared in spec with the promise each tier makes — `specs/0000-foundations.md` §5
- [x] Versioning policy: semver per namespace, additive-only codes, no silent breaking changes — `specs/0000-foundations.md` §7.4
- [x] Determinism rule: same BuyerContext + same rules → same output, no model in loop — enforced in `src/lib/rules/**` (no Date.now() / Math.random())
- [x] Unknown-field degradation: unknown blocking code treated as `BLOCKED`; missing extension treated as lowest-common-denominator — `src/lib/rules/normalizeBuyerContext.ts` + pipeline degradation (WP-02)
- [x] All existing specs (0001 at minimum) migrated to reference 0000 BuyerContext — `src/lib/rules/eligibility.ts` uses `BuyerContext` (WP-02)
- [x] Namespace updated to `com.os.retailagent.shopping.*` throughout — completed in WP-02

**Dependencies:** None. Everything else depends on this.

**Market signal:** UCP's `/.well-known/ucp` is already the discovery mechanism Google uses. RAOS-0000 aligns the extension manifest with UCP's discovery pattern, making RAOS extensions discoverable to any UCP-aware agent.

---

### N2 · RAOS-0001 · Namespace migration + BuyerContext retrofit `P0 · S · Parity`

**Problem:** `com.ezyupload.shopping.*` appears in the published spec, the website, the TypeScript types, and the mock data. Questions.md A1 has a confirmed decision to move to `com.os.retailagent.shopping.*`. This is a credibility blocker before public launch this week.

**User/agent value:** Visitors reading the published spec see the correct vendor-neutral namespace. The namespace signals "upstream candidate" not "vendor product."

**Acceptance criteria:**
- [ ] `com.ezyupload.shopping.*` → `com.os.retailagent.shopping.*` across all files
- [ ] Spec page, README, TypeScript types, mock data all updated
- [ ] RAOS-0001 spec page on website updated
- [ ] No remaining `ezyupload` references in any public-facing content

**Dependencies:** Can be done independently of N1; should land before or simultaneously.

**Files to touch:** `src/app/specs/page.tsx`, `src/app/specs/0001-eligibility/page.tsx`, `src/app/architecture/page.tsx`, `src/lib/mock/merchants.ts`, `specs/README.md`, `specs/0001-eligibility.md`, `specs/PROGRAM-PLAN.md`.

---

### N3 · RAOS-0008 · Trust, Provenance & Freshness `P0 · M · Differentiation`

**Problem:** An agent has no way to know if the catalog/price/promo data it is reading is authentic, from the declared merchant, and current. Stale promo data and catalog spoofing are live threats as agentic commerce scales.

**User/agent value:** Every computed contract carries a signed envelope (issuer, signature, key ID, TTL). Agents can reject stale or unverified data. Merchants get brand-safety guarantees.

**Acceptance criteria:**
- [ ] Signed payload envelope schema defined (simulate crypto, spec the contract)
- [ ] TTL/freshness field on every computed contract
- [ ] Staleness behavior documented: degrade vs refuse, per-field freshness
- [ ] Anti-spoofing threat model described
- [ ] Key rotation pattern specified
- [ ] Reference implementation in `src/lib/rules/trust.ts`

**Dependencies:** RAOS-0000 (envelope references BuyerContext).

**Market signal:** ACP ships a signed quote token for price integrity. RAOS-0008 is the generalization: provenance on any contract, not just price.

---

### N4 · RAOS-0005 · Inventory & Availability `P0 · M · Parity`

**Problem:** An agent that confidently recommends an out-of-stock item is worse than not recommending at all. No existing spec carries real-time stock state with TTL at catalog time.

**User/agent value:** Agents never recommend what isn't there. Low-stock signals create urgency. Backorder/preorder states give buyers correct expectations.

**Acceptance criteria:**
- [ ] Stock states: `in_stock`, `low_stock`, `out_of_stock`, `backorder`, `preorder` defined
- [ ] Per-location quantity support (for BOPIS/pickup)
- [ ] Availability TTL (how fresh is this stock reading)
- [ ] Soft reservation semantics: does adding to cart hold stock?
- [ ] Threshold signal (`"onlyXLeft": 3`)
- [ ] Race condition documented: stock changes between recommend and add-to-cart
- [ ] Reference implementation in `src/lib/rules/inventory.ts`

**Dependencies:** RAOS-0000, RAOS-0008 (TTL is load-bearing).

---

## NOW — Loyalty, Promo, Delivery (the three focus domains)

### N5 · RAOS-0009 · Loyalty & Rewards — Browse-Time Earn/Burn Preview `P0 · L · Differentiation`

**Problem:** UCP Identity Linking (OAuth) lets an agent know a buyer's loyalty tier and balance *at checkout*. No spec defines what an agent can show a buyer at *browse time* — "you'd earn 240 points on this," "redeeming 500 points saves you $5," "gold members get free shipping on this item." That browse-time value visibility is what drives loyalty-aware purchase decisions, and it's the gap every loyalty platform (Voucherify, Talon.One, Yotpo) exposes at their API layer but no UCP extension carries as a catalog-time contract.

**User/agent value:**
- Buyers: "This agent actually knows my loyalty value, not just the price."
- Merchants: Loyalty becomes a browse-time differentiator, not a checkout surprise.
- Agents: A deterministic earn-preview and burn-eligibility contract to quote without an API call to the loyalty engine each time.

**Acceptance criteria:**
- [ ] `LoyaltyContext` (extends BuyerContext): point balance, available vs pending, tier, accountLinked flag
- [ ] `EarnPreview` per line item: points earned, multiplier, exclusions (e.g., sale items often excluded)
- [ ] `BurnEligibility` per line item: can points be redeemed, min redemption threshold, value
- [ ] Member benefit summary: tier-specific benefits visible at catalog time (free shipping, early access, etc.)
- [ ] Tier-progress signal: points to next tier (UCP loyalty extension carries this — align schema)
- [ ] Account-not-linked path: agent can show a teaser ("link account to see your points") without real values
- [ ] Stacking interaction: burn applied after promo (→ cross-reference RAOS-0006 precedence)
- [ ] Expiry signal: points expiring within 30 days surfaced
- [ ] Points-on-sale-items exclusion documented as an explicit reason code: `LOYALTY_EARN_EXCLUDED`
- [ ] Reason codes registry: `LOYALTY_EARN_EXCLUDED`, `REDEMPTION_BELOW_THRESHOLD`, `ACCOUNT_NOT_LINKED`, `TIER_BENEFIT_ACTIVE`
- [ ] Reference implementation in `src/lib/rules/loyalty.ts`
- [ ] TypeScript types in `src/lib/types/`
- [ ] Playground wiring and spec page

**Dependencies:** RAOS-0000, RAOS-0002 (base price), RAOS-0006 (stacking), RAOS-0015 (account link identity).

**Market signal:** Talon.One UIP loyalty extension (https://uip.dev/specification/ucp/loyalty) covers point balance and tier progression at checkout. RAOS-0009 is differentiated by: (a) browse-time earn preview, (b) per-item exclusion reason codes, (c) agent-teaser for unlinked accounts, (d) merchant-declared exclusion rules, not platform-inferred.

**Conformance tier:** Tier 3 (Loyal).

---

### N6 · RAOS-0006 · Promotional Pricing & Stacking `P0 · L · Differentiation`

**Problem:** ACP includes a discount extension RFC. Talon.One's UIP has a UCP discount extension. Neither specifies a *deterministic, merchant-declared stacking model with reason codes*. The #1 margin-leakage risk in agent commerce is unintended promo stacking — an agent applies member price + bulk tier + sale + coupon and the effective price falls below cost. Today that calculation is silently wrong or platform-specific.

**User/agent value:**
- Merchants: declare exactly which offers combine, which are exclusive, and what the floor is.
- Agents: a deterministic resolution they can explain ("your member discount applied; the coupon was excluded because it doesn't stack with sales").
- Buyers: no checkout surprises when the quoted price differs from what was shown.

**Acceptance criteria:**
- [ ] Offer types defined: `sale_markdown`, `quantity_promo` (BOGO, mix-and-match, "3 for $5"), `coupon` (single-use, expiry, min-spend), `flash_sale`
- [ ] Stacking model: `stackable: boolean`, `exclusive: boolean`, `priority: number` (merchant-declared per offer)
- [ ] Resolution algorithm: priority ladder (recommended default per questions.md B4) with stackable/exclusive flags, deterministic and documented
- [ ] `AppliedOffers[]` output: which applied, which were suppressed, and why
- [ ] Reason codes: `OFFER_EXCLUSIVE`, `OFFER_EXPIRED`, `OFFER_BELOW_MIN_SPEND`, `OFFER_PER_CUSTOMER_LIMIT`, `OFFER_SUPPRESSED_BY_PRIORITY`, `FLOOR_PRICE_PROTECTED`
- [ ] Promo freshness: each offer carries TTL (cross-reference RAOS-0008)
- [ ] Coupon mid-session expiry handling
- [ ] Per-customer promo limit tracking
- [ ] Price-below-cost floor: merchant can declare `floorPrice`; algorithm never goes below it
- [ ] Promo on ineligible/out-of-stock item: reason code
- [ ] Stacking interaction with loyalty burn (applied last, after promos)
- [ ] Reference implementation in `src/lib/rules/promos.ts`
- [ ] Playground wiring and spec page

**Dependencies:** RAOS-0000, RAOS-0002 (base contextual price).

**Market signal:** Voucherify explicitly calls unintended stacking the primary agent-commerce risk (https://www.voucherify.io/blog/agentic-commerce-optimize-incentives-loyalty-for-ai-agents). No open spec gives merchants a declarative, reason-code-annotated stacking model. This is the differentiated RAOS contribution.

**Conformance tier:** Tier 2 (Priced).

---

### N7 · RAOS-0011 · Restricted & Regulated Goods (Delivery Eligibility) `P0 · M · Differentiation`

**Problem:** No existing protocol carries geo/zip-level delivery eligibility, age-restricted-good restrictions (alcohol, cannabis, tobacco, pharmacy), or regulated-item purchase limits at catalog time. Cannabis delivery is legal in 23 US states as of 2026 with municipality-level rules; alcohol shipping is legal in ~40 states with carrier restrictions; PACT Act applies to vapes/hemp. Every platform pushes this to checkout — the exact dead-end that kills buyer trust in agents.

**User/agent value:**
- Buyers: never get routed into a checkout that will reject their item due to age or geography.
- Merchants: compliance signals surface at catalog time, reducing legal exposure.
- Agents: structured reason codes to explain a block and suggest alternatives.

**Acceptance criteria:**
- [ ] `RestrictedGoodsProfile` on a variant: `ageRestricted: boolean`, `minimumAge: number`, `regulatedCategory: enum` (alcohol | cannabis | tobacco | pharmacy | vape | none)
- [ ] `PurchaseLimit`: per-order and per-customer limits with reason code `PURCHASE_LIMIT_EXCEEDED`
- [ ] `TaxTreatment` signal: `inclusive` (EU/VAT), `exclusive` (US), `exempt` — carried at catalog time so agent quotes correctly
- [ ] Geo-eligibility: `restrictedRegions[]` (extends RAOS-0001 `REGION_RESTRICTED` into specific reason codes per regulatory class)
- [ ] Reason codes: `AGE_VERIFICATION_REQUIRED`, `REGION_NOT_LEGAL`, `CARRIER_RESTRICTION`, `PURCHASE_LIMIT_EXCEEDED`, `TAX_EXEMPT_UNVERIFIED`, `RESALE_CERT_REQUIRED` (re-use from 0001)
- [ ] Age unknown → most restrictive default (align with RAOS-0000 determinism rule)
- [ ] Resale-cert interaction with promo: documented
- [ ] Tax-exclusive vs inclusive display: agent quotes pre-tax with signal so buyer isn't surprised
- [ ] Regulated item visible but not shippable (compose RAOS-0001 visibility + RAOS-0003 fulfillment): reason precedence documented
- [ ] Reference implementation in `src/lib/rules/restricted.ts`

**Dependencies:** RAOS-0000, RAOS-0001 (extends eligibility), RAOS-0015 (age/identity verification).

**Market signal:** deepidv.com reports regulators in 2026 treat missing age verification as an offense in itself. Cannabis delivery zoning operates at municipality level. No open spec gives agents machine-readable restricted-goods eligibility. This is a genuine legal-compliance gap and a differentiation opportunity.

**Conformance tier:** Tier 1 (Qualified).

---

## NEXT — Wave 2 (following 4–6 weeks)

### X1 · RAOS-0002 · Contextual Pricing (Member + Bulk) `P1 · M · Parity`

**Problem:** An agent quoting list price to a wholesale member is the most cited agent-commerce failure case. Member pricing and bulk tier selection need to be evaluated at catalog time, not at checkout.

**Acceptance criteria:**
- [ ] Member price, teaser price (shown to unqualified), guest price
- [ ] Bulk tier table (quantity breaks, MOQ, quantity increments)
- [ ] `ComputedPriceState` contract with `priceSource` provenance field
- [ ] Teaser: agent can show "members pay $X" without enabling checkout at that price for non-members
- [ ] Currency rounding policy declared (banker's rounding, half-up — pick one)
- [ ] Per-customer purchase limit ("limit 2")
- [ ] Price 0 (free sample) vs "call for price" differentiated
- [ ] Reference implementation in `src/lib/rules/pricing.ts`

**Dependencies:** RAOS-0000.
**Conformance tier:** Tier 2 (Priced).

---

### X2 · RAOS-0007 · Quote Integrity & Price Lock `P1 · M · Differentiation`

**Problem:** "The price the agent showed will be the price charged at checkout" is the single biggest retailer trust unlock. Without it, retailers won't let agents quote prices. ACP ships a signed quote token — RAOS-0007 is the RAOS generalization that covers the full pricing contract (member + bulk + promo + loyalty burn).

**Acceptance criteria:**
- [ ] Quote token: binds {variant, quantity, buyer-context-hash, resolved price, applied offers, TTL}
- [ ] Honor-on-checkout contract: merchant declares if they honor, re-quote, or reject expired tokens
- [ ] Invalidation conditions: TTL expiry, stock loss, context change
- [ ] Re-quote flow: agent re-requests with same context, gets fresh token
- [ ] Partial honor: price holds but stock doesn't
- [ ] Replay/forgery protection (→ RAOS-0008 signature)
- [ ] Reference implementation in `src/lib/rules/quote.ts`

**Dependencies:** RAOS-0000, RAOS-0008, RAOS-0002, RAOS-0006.
**Conformance tier:** Tier 2 (Priced).

---

### X3 · RAOS-0003 · Fulfillment Feasibility `P1 · L · Differentiation`

**Problem:** An agent confirming shipping to Hawaii for a local-delivery-only item is the Fresh Corner Market failure case. Fulfillment mode and region restrictions need to surface at catalog time, not at checkout.

**Acceptance criteria:**
- [ ] Fulfillment modes: `ship`, `pickup`, `local_delivery`, `BOPIS`
- [ ] Delivery windows, lead times, per-region availability
- [ ] Hazmat/oversize shipping restrictions
- [ ] Split-shipment signal: some lines ship, some pickup-only
- [ ] Pickup location model
- [ ] Same-day cutoff time crossed mid-session: reason code `CUTOFF_PASSED`
- [ ] Compose with RAOS-0011 regulated goods: item visible but not shippable
- [ ] Reason codes: `FULFILLMENT_MODE_UNAVAILABLE`, `REGION_NOT_SERVED`, `HAZMAT_RESTRICTION`, `CUTOFF_PASSED`, `OVERSIZE_RESTRICTION`
- [ ] Reference implementation in `src/lib/rules/fulfillment.ts`

**Dependencies:** RAOS-0000, RAOS-0005 (availability per location), RAOS-0001.
**Conformance tier:** Tier 4 (Assisted).

---

### X4 · RAOS-0004 · Discovery, Catalog Semantics & Match `P1 · L · Parity`

**Problem:** Sara's Boutique's core gap — beautiful products, invisible to agents because she has no machine-readable discoverability semantics. Agents can't match "personalized gift for dad" to her catalog.

**Acceptance criteria:**
- [ ] Merchant-declared `discoverabilityProfile`: keywords, categories, semantic attributes, intent tags
- [ ] Substitution/alternates: out-of-stock item can declare "suggest this instead"
- [ ] Bundle/kit schema: component-level eligibility and availability
- [ ] Attribute normalization: size/color/material across merchants
- [ ] Discoverability ≠ eligibility: item can be findable but not recommandable
- [ ] Multi-language hook (design without implementing multi-currency)

**Dependencies:** RAOS-0000.
**Conformance tier:** Tier 0 (Discoverable).

---

### X5 · RAOS-0015 · Privacy, Consent & Identity `P1 · M · Cross-cutting`

**Problem:** Buyer context is PII. Membership tier, region, purchase history — all personal data under GDPR/CCPA. Loyalty and member pricing depend on trusted identity claims. Without this spec, every loyalty/pricing spec is built on unverified assertions.

**Acceptance criteria:**
- [ ] Consent model for using buyer context (opt-in per use-case)
- [ ] PII minimization: agents pass only what's needed
- [ ] Account-linking trust: how "gold member" claim is verified (spec for OAuth, simulate as assertion)
- [ ] Data retention signal, right-to-be-forgotten hook
- [ ] Jurisdiction-specific consent (GDPR vs CCPA)
- [ ] Pseudonymous vs authenticated buyer path

**Dependencies:** RAOS-0000.
**Conformance tier:** Tier 0 (cross-cutting).

---

## LATER — Wave 3–4 (strategic bets, post-v1 validation)

### L1 · RAOS-0010 · Subscriptions & Recurring Orders `P2 · L`

**Problem:** Subscribe-and-save is table stakes for grocery and DTC. No open spec defines the recurring-price contract, first-order discount, or cadence semantics agents need to recommend subscriptions confidently.

**Acceptance criteria:** Subscription price vs one-time, first-order discount, cadence (weekly/monthly/custom), skip/pause/cancel semantics, recurring eligibility. Price-change notification between cycles. Item discontinued mid-subscription → substitute (RAOS-0004).

**Dependencies:** RAOS-0000, RAOS-0002, RAOS-0007 (recurring price lock), RAOS-0011 (re-verify age each cycle).

---

### L2 · RAOS-0012 · Cart Bridge & Checkout Handoff `P2 · L`

**Problem:** The last mile — serializing an agent-built cart and handing it to real checkout with all quote tokens intact.

**Acceptance criteria:** Cart-state serialization, quote-token carriage per line item, handoff contract to UCP checkout, idempotency, partial-cart handling.

**Dependencies:** RAOS-0000, RAOS-0007, all Plane 3 specs.

---

### L3 · RAOS-0013 · Intent Capture & Assisted Commerce `P2 · M`

**Problem:** When checkout isn't the outcome — out-of-stock notify-me, B2B quote request, WhatsApp handoff. The agent-reasoning trace format is gated (questions.md D1) — do not build without sign-off.

**Dependencies:** RAOS-0000, RAOS-0001, RAOS-0015.

---

### L4 · RAOS-0014 · Returns & Post-Purchase Policy `P2 · M`

**Problem:** Agents quoting a product without communicating return policy are setting up post-purchase revolts. Machine-readable return terms at catalog time.

**Acceptance criteria:** Return window, final-sale flags, restocking fees, who-pays-return-shipping, warranty, exchange vs refund. Region-specific statutory rights (EU 14-day).

**Dependencies:** RAOS-0000.

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stacking precedence (B4) is unresolved | High — blocks RAOS-0006 | Proceed on recommended default: priority ladder + stackable/exclusive flags. Flag in spec as "open question, default applies." |
| Agent-reasoning trace format gated (D1) | Medium — blocks parts of RAOS-0013 | Do not build the trace. Build intent capture routing without it. |
| UCP Identity Linking (OAuth) for loyalty identity | Medium — RAOS-0009 needs it | Spec for OAuth (b), simulate as assertion (a) in playground. |
| `ezyupload` namespace in published content | High — credibility risk at launch | Address as N2, this week, before public share. |
| Real vs simulated endpoint (D2) | Low (currently) | Confirmed: still simulated. Design quote/trust contracts now; real crypto waits. |
| Talon.One UIP ships a loyalty UCP extension | Medium — partial parity | RAOS-0009 differentiates on browse-time earn preview and per-item exclusion reason codes that UIP does not specify. Monitor UIP evolution. |

---

## Competitive Mapping

| Capability | UCP (Google) | ACP (OpenAI/Stripe) | Talon.One UIP | Voucherify | **RAOS (this project)** |
|---|---|---|---|---|---|
| Catalog discovery rails | ✓ | ✓ | — | — | RAOS-0004 |
| Eligibility at catalog time | — | — | — | — | **RAOS-0001 (shipped)** |
| Member pricing | Identity Linking (checkout) | — | Partial | API | RAOS-0002 |
| Promo/discount definition | Checkout extension | Discount RFC | UCP extension | API-first | **RAOS-0006 (with reason codes + stacking)** |
| Deterministic stacking model | — | — | — | Partial | **RAOS-0006 (differentiated)** |
| Loyalty earn/burn at browse time | — | — | Checkout only | API | **RAOS-0009 (differentiated)** |
| Loyalty tier benefits at browse time | OAuth at checkout | — | — | — | **RAOS-0009 (differentiated)** |
| Delivery/geo restrictions at catalog time | — | — | — | — | **RAOS-0003 + RAOS-0011 (differentiated)** |
| Age/regulated-goods eligibility | — | — | — | — | **RAOS-0011 (differentiated)** |
| Quote integrity / price lock | — | Signed token | — | — | RAOS-0007 |
| Signed provenance + TTL | — | Partial (ACP token) | — | — | RAOS-0008 |
| Conformance tiers | Basic | — | — | — | **RAOS-0000 (0–4, differentiated)** |
| Open spec, reason codes, worked examples | Partial | GitHub RFC | Partial | Docs | **RAOS (full spec series)** |

---

*Sources consulted:*
- *https://www.shopify.com/blog/agentic-commerce*
- *https://github.com/agentic-commerce-protocol/agentic-commerce-protocol*
- *https://docs.stripe.com/agentic-commerce/acp*
- *https://ucp.dev/*
- *https://uip.dev/specification/ucp/loyalty*
- *https://www.talon.one/blog/introducing-the-unified-incentives-protocol*
- *https://www.voucherify.io/blog/agentic-commerce-optimize-incentives-loyalty-for-ai-agents*
- *https://chainstoreage.com/when-ai-agents-shop-us-how-will-loyalty-programs-keep*
- *https://www.deepidv.com/media/articles/age-verification-alcohol-cannabis-tobacco-digital-compliance-2026*
