# RAOS-0007 · Quote Integrity & Price Lock

**Extension namespace:** `com.os.retailagent.shopping.quote`
**Status:** Draft · Request for Comment
**Version:** 1.0.0
**Conformance Tier:** 2 · Priced
**Plane:** 3 · Price & Value
**Reference implementation (WP-07):**
- Types → [`src/lib/types/quote.ts`](../src/lib/types/quote.ts)
- Pure logic → [`src/lib/rules/quote.ts`](../src/lib/rules/quote.ts)
- Pipeline evaluator → [`src/lib/extensions/evaluators/quote.ts`](../src/lib/extensions/evaluators/quote.ts)

Runnable in the [Playground](../src/app/demo/page.tsx) — "Quote → time-travel → checkout" card.
**Author:** Rik Banerjee · rikbanerjee007@gmail.com
**Depends on:**
- RAOS-0000 (BuyerContext, ReasonEntry, determinism)
- RAOS-0002 (AppliedOffer shape bound by the quote token)
- RAOS-0005 (inventory rules called during validation)
- RAOS-0008 (signEnvelope / verifyEnvelope — the signing seam)

> The point of this spec is to be argued with. If an honor-policy clause, a
> reason code, or a validation step is wrong for your use case, that is the
> most useful thing you can tell me. See §11 Open Questions.

---

## 1. Abstract

RAOS-0007 is the retailer-trust unlock: the price an AI agent shows a buyer is
the price the buyer will be charged.

A **QuoteToken** binds a variant, a quantity, a buyer-context hash, the fully
resolved unit price, the applied offers that produced it, and a TTL — all
covered by a RAOS-0008 provenance envelope. A merchant who honors a QuoteToken
at checkout has made a machine-readable, auditable commitment.

`issueQuote` produces a token from a completed DecisionRecord (ELIGIBLE and
priced — never from a BLOCKED line). `validateQuote` checks the token at
checkout time: signature first, then TTL/grace, then context hash, then stock,
then price recomputation. The outcome is one of three values:
`HONORED | REQUOTE_REQUIRED | REJECTED`, with structured reasons.

The merchant's `HonorPolicy` declares how each invalidation path resolves —
whether an expired quote is honored through a grace window, whether a
context-change forces a requote, whether a partial stock loss is a partial
honor or a hard reject. Both paths (honor and requote) are first-class,
demonstrated in the Playground.

---

## 2. Motivation

Without a quote token:

- An agent quotes `$19.99` at browse-time; the checkout charges `$24.99`
  (a flash sale ended). The buyer abandons and disputes.
- A B2B buyer negotiates a price with an agent; the price is not locked and
  changes before they click "purchase."
- A retailer cannot audit the pricing commitment the agent made. The quote
  token plus its signed envelope IS the evidence bundle.

With a QuoteToken, the agent can tell the buyer: "This price is locked for
10 minutes. If anything changes, I will re-quote before you commit."

---

## 3. Scope

**In scope:**
- `QuoteToken` shape: all fields bound to a specific price moment
- `HonorPolicy`: merchant-declared behavior on expiry, stock loss, context change
- `issueQuote(decisionRecord, now)` → QuoteToken
- `validateQuote(token, validationInputs, now)` → `QuoteValidationResult`
- Deterministic `quoteId` derivation (zero randomness, idempotent within TTL bucket)
- Deterministic `buyerContextHash` (stable hash of normalized BuyerContext)
- Partial-honor semantics for stock loss with `onStockLoss: 'partial'`
- Grace-window semantics for expiry with `onExpiry: 'honor_grace'`
- RAOS-0008 signature on the quote payload (tamper-evident)
- RAOS-0008 `verifyEnvelope` as first validation step (forgery detection)
- RAOS-0005 `evaluateInventory` called during validation for stock check

**Out of scope:**
- Promotional stacking within the quote (RAOS-0006 — quote binds the final
  `appliedOffers[]` array, whatever offers were applied when it was issued)
- Cart-level multi-line quoting (each line has its own QuoteToken — RAOS-0012
  carries them together at handoff)
- Payment commitment (RAOS-0007 carries price; payment terms are RAOS-0019)
- Multi-currency rounding (V2 toggle C; v1 is USD half-up per RAOS-0002)
- Merchant-facing quote API (simulated — WP-19)

---

## 4. Inputs

### 4.1 `DecisionRecord` (from pipeline.ts)

`issueQuote` reads from a completed `DecisionRecord` that must have:
- `stages.ELIGIBILITY` — at least one eligible result (no BLOCK reasons)
- `stages.PRICE` — a `ComputedPriceState` output with `unitPrice` and
  `appliedOffers[]`
- `normalizedContext` — the normalized BuyerContext used in evaluation
- `envelope` — provenance envelope from the pipeline (signing key lookup)

A DecisionRecord with any BLOCK-severity reason in the ELIGIBILITY stage MUST
NOT be quoted. `issueQuote` returns null in this case (never issue a dead quote).

### 4.2 `HonorPolicy` (merchant-declared in capability config)

```jsonc
{
  "onExpiry":    "honor_grace",  // 'honor_grace' | 'requote' | 'reject'
  "graceSeconds": 120,           // Only relevant when onExpiry === 'honor_grace'
  "onStockLoss": "partial",      // 'partial' | 'reject'
  "onContextChange": "requote"   // always 'requote' (spec only path)
}
```

Declared by the merchant in their capability config for `ext.quote`. Different
merchants may (and should) declare different policies to cover both honor paths.
The Playground demo uses:
- **Wholesale B**: `onExpiry: 'requote'`, `onStockLoss: 'reject'`
- **Grocery C**: `onExpiry: 'honor_grace' (120s)`, `onStockLoss: 'partial'`

### 4.3 Injected `now`

Unix epoch milliseconds. Never `Date.now()` inside `src/lib/rules/**`.

---

## 5. Outputs

### 5.1 `QuoteToken`

```typescript
interface QuoteToken {
  quoteId: string;             // deterministic — see §7.2
  merchantId: string;
  variantId: string;
  quantity: number;
  buyerContextHash: string;    // stable hash of normalized BuyerContext
  unitPrice: number;           // final unit price at issue time
  currency: 'USD' | string;    // always 'USD' in v1
  appliedOffers: AppliedOffer[]; // bound exactly as shipped from RAOS-0002
  issuedAt: number;            // now at issue time (Unix ms)
  ttlSeconds: number;          // from HonorPolicy or merchant-configured default
  honorPolicy: HonorPolicy;   // snapshot of merchant policy at issue time
  envelope: ProvenanceEnvelope; // RAOS-0008 signed envelope over the token payload
}
```

### 5.2 `QuoteValidationResult`

```typescript
interface QuoteValidationResult {
  outcome: 'HONORED' | 'REQUOTE_REQUIRED' | 'REJECTED';
  reasons: ReasonEntry[];
  honoredQuantity?: number;    // present when QUOTE_PARTIALLY_HONORED
}
```

---

## 6. Reason code registry

| Code | Namespace | Severity | Resolvable? | Fixture-reachable? |
|------|-----------|----------|-------------|-------------------|
| `QUOTE_ISSUED` | `…quote` | INFO | — | Yes — all quoted variants |
| `QUOTE_EXPIRED` | `…quote` | BLOCK | Yes — requote | Synthetic-only |
| `QUOTE_CONTEXT_CHANGED` | `…quote` | BLOCK | Yes — requote | Synthetic-only |
| `QUOTE_STOCK_LOST` | `…quote` | BLOCK | Yes — notify-me / requote | Synthetic-only |
| `QUOTE_PARTIALLY_HONORED` | `…quote` | CONDITION | Yes — accept partial | Synthetic-only |
| `QUOTE_FORGED` | `…quote` | BLOCK | No | Synthetic-only |
| `QUOTE_HONORED_GRACE` | `…quote` | INFO | — | Synthetic-only |

**Synthetic-only codes (RAOS-0007 §6 note):**

Quote validation requires two `now` values (issue time and validation time), a
context mutation between them, and/or a stock change — none of which are
representable in the static catalog × context-grid golden fixture format. Every
code except `QUOTE_ISSUED` is therefore synthetic-only.

`QUOTE_ISSUED` is reachable from the golden fixture grid: for merchants that
list the `ext.quote` capability (wholesale and grocery), `issueQuote` runs as
part of the QUOTE stage and emits `QUOTE_ISSUED` INFO.

All synthetic-only codes have dedicated unit tests in
`src/lib/rules/__tests__/quote.test.ts`.

---

## 7. Deterministic algorithm

### 7.1 Context hash

```
buyerContextHash(normalizedContext):
  1. Extract the fields that define buyer privilege for pricing:
     { customerType, loyaltyTier, membershipTier, marketRegion,
       fulfillmentMode, taxExempt, resaleCertificateOnFile, trustMode }
  2. Stable-sort keys → JSON.stringify (same canonicalization as trust.ts).
  3. djb2Hash(canonicalized string) → 8-hex-char string.
  NOTE: Reuses canonicalizePayload + djb2 from trust.ts — no second hasher.
```

### 7.2 QuoteId derivation (deterministic, idempotent within TTL bucket)

```
quoteId(merchantId, variantId, quantity, contextHash, ttlSeconds, issuedAt):
  bucket = floor(issuedAt / (ttlSeconds * 1000))
  payload = `${merchantId}|${variantId}|${quantity}|${contextHash}|${bucket}`
  quoteId = 'q_' + djb2Hash(payload).toString(16).padStart(8, '0') + '_' + bucket.toString(16)
```

**Idempotency guarantee:** same (merchant, variant, qty, contextHash) within
the same TTL bucket → same quoteId. A second call with identical inputs and
`issuedAt` in the same bucket does not produce a new token — the caller
receives the same quoteId and can return the cached token. This prevents
"quote farming" attacks where an agent rapidly issues many tokens for the
same item.

**Quantity sensitivity:** changing quantity changes contextHash only if
contextHash covers quantity. By spec, quantity is NOT part of the context hash
(it is a separate input dimension). Different quantities produce different
quoteIds because `quantity` appears as a distinct term in the payload string.

### 7.3 issueQuote — full algorithm

```
issueQuote(decisionRecord, honorPolicy, now):

  1. CHECK eligibility: if any reason in decisionRecord.reasons has severity
     BLOCK, return null. (Never quote a blocked line.)

  2. EXTRACT price output from decisionRecord.stages.PRICE. If no PRICE stage
     result, return null. (Never quote an unpriced line.)

  3. BUILD contextHash = buyerContextHash(decisionRecord.normalizedContext).

  4. BUILD quoteId = quoteId(merchantId, variantId, quantity, contextHash,
     ttlSeconds, now).

  5. EXTRACT merchant key from decisionRecord.envelope (keyId + issuer).

  6. BUILD token payload (all fields except envelope):
     { quoteId, merchantId, variantId, quantity, buyerContextHash,
       unitPrice, currency, appliedOffers, issuedAt: now,
       ttlSeconds, honorPolicy }

  7. SIGN payload: envelope = signEnvelope(token_payload, keyId, now, issuer,
     ttlSeconds) — reusing RAOS-0008 signEnvelope.

  8. RETURN QuoteToken = { ...token_payload, envelope }.
```

### 7.4 validateQuote — full algorithm (deterministic check order)

The check order is deterministic and non-negotiable. A forgery check happens
FIRST so a tampered token never proceeds to business-logic checks.

```
validateQuote(token, { context, variant, merchant, now }):

  1. SIGNATURE CHECK (RAOS-0008):
     verifyEnvelope(token.envelope, now, merchant.manifest.keys,
                    token_payload_without_envelope)
     → if !valid AND code !== 'DATA_STALE': return REJECTED + QUOTE_FORGED.
     (DATA_STALE from an expired envelope is handled in step 2, not here.)

  2. TTL / GRACE CHECK:
     elapsed = (now - token.issuedAt) / 1000
     expired = elapsed > token.ttlSeconds
     if expired:
       if honorPolicy.onExpiry === 'honor_grace':
         withinGrace = elapsed <= token.ttlSeconds + honorPolicy.graceSeconds
         if withinGrace: emit QUOTE_HONORED_GRACE (INFO), continue.
         else: return REQUOTE_REQUIRED + QUOTE_EXPIRED.
       elif honorPolicy.onExpiry === 'requote': return REQUOTE_REQUIRED + QUOTE_EXPIRED.
       elif honorPolicy.onExpiry === 'reject':  return REJECTED + QUOTE_EXPIRED.

  3. CONTEXT HASH CHECK:
     currentHash = buyerContextHash(normalize(context))
     if currentHash !== token.buyerContextHash:
       return REQUOTE_REQUIRED + QUOTE_CONTEXT_CHANGED.
     (onContextChange is always 'requote' per spec — no merchant override.)

  4. STOCK CHECK (RAOS-0005):
     availability = evaluateInventory({ variant, context, holds:[], now })
     available = availability.quantityAvailable ?? Infinity
     if availability.state === 'out_of_stock' OR available < token.quantity:
       if honorPolicy.onStockLoss === 'partial':
         honoredQty = max(0, available)
         if honoredQty > 0:
           return HONORED + QUOTE_PARTIALLY_HONORED(honoredQty).
         else:
           return REJECTED + QUOTE_STOCK_LOST.
       elif honorPolicy.onStockLoss === 'reject':
         return REJECTED + QUOTE_STOCK_LOST.

  5. PRICE RECOMPUTATION CHECK:
     recompute getApplicablePrice(variant, token.quantity, context, now)
     if roundHalfUp(recomputed.unitPrice) !== token.unitPrice:
       return REQUOTE_REQUIRED + QUOTE_CONTEXT_CHANGED.
     (Price drift between issue and validation triggers a requote — this covers
     promo-ended cases for merchants that don't use grace-window policy.)

  6. RETURN { outcome: 'HONORED', reasons: [grace reason if applicable] }.
```

### 7.5 Rounding policy

Half-up to cents, as per RAOS-0002. The SAME formula is used in both
`issueQuote` and step 5 of `validateQuote`. A half-cent boundary value must
produce the same integer cents in both paths — verified in unit tests.

```
roundHalfUp(price): Math.round((price + Number.EPSILON) * 100) / 100
```

---

## 8. Worked examples

### 8.1 Atlas Wholesale — context-downgrade requote

**Scenario:** A wholesale buyer with `membershipTier: 'distributor'` obtains a
quote at `t=0`. Between issue and checkout, their tier is downgraded to `'none'`
(their signed token expired and they re-asserted without signing). The context
hash at validation time differs.

**HonorPolicy:** `{ onExpiry: 'requote', onStockLoss: 'reject', onContextChange: 'requote' }`

**Issue (t=0):**
```jsonc
// normalizedContext.membershipTier = 'distributor', trustMode = 'signed'
// buyerContextHash computed → 'a1b2c3d4'
// unitPrice = $310.00 (distributor tier)
{
  "quoteId": "q_fa3c2e01_abcdef",
  "variantId": "v_w_001_1",
  "quantity": 100,
  "buyerContextHash": "a1b2c3d4",
  "unitPrice": 310.00,
  "currency": "USD",
  "issuedAt": 1718000000000,
  "ttlSeconds": 600
}
```

**Validate (t=300s, context now asserted, tier downgraded to 'none'):**
```jsonc
// normalizeBuyerContext({ membershipTier: 'none', trust: 'asserted' })
// → membershipTier downgraded to 'none', new hash 'e5f6a7b8'
// Step 3: 'a1b2c3d4' !== 'e5f6a7b8'
{
  "outcome": "REQUOTE_REQUIRED",
  "reasons": [{ "code": "QUOTE_CONTEXT_CHANGED", "severity": "BLOCK",
    "message": "Buyer context has changed since this quote was issued. Requote required." }]
}
```

---

### 8.2 Fresh Corner Market — promo-ended, quote honored (grocery path)

**Scenario:** A weekly-ad price of `$3.99` was in effect when the quote was
issued. The promo ends before checkout. Grocery uses `onExpiry: 'honor_grace'`
with `graceSeconds: 120`.

**HonorPolicy:** `{ onExpiry: 'honor_grace', graceSeconds: 120, onStockLoss: 'partial', onContextChange: 'requote' }`

**Issue (t=0), TTL=300s:**
```jsonc
{
  "quoteId": "q_1234abcd_00000000",
  "unitPrice": 3.99,
  "issuedAt": 1718000000000,
  "ttlSeconds": 300
}
```

**Validate at t=350s (quote expired 50s ago, within 120s grace):**
- Step 1: Signature valid.
- Step 2: elapsed=350 > ttlSeconds=300; graceWindow=300+120=420; 350 ≤ 420.
  → emit `QUOTE_HONORED_GRACE` (INFO), continue.
- Steps 3–5: pass.
```jsonc
{
  "outcome": "HONORED",
  "reasons": [{ "code": "QUOTE_HONORED_GRACE", "severity": "INFO",
    "message": "Quote honored within grace window (50s past TTL, 120s grace)." }]
}
```

**Validate at t=430s (outside grace window):**
- Step 2: elapsed=430 > ttlSeconds=300; 430 > 420 grace expiry.
  → `REQUOTE_REQUIRED + QUOTE_EXPIRED`.

---

### 8.3 Fresh Corner Market — promo-ended, requote path (wholesale path)

**Same scenario but Atlas Wholesale** uses `onExpiry: 'requote'`. The quote
expires and the promo has ended — a fresh price would be higher.

**Validate at t=350s (50s past TTL=300s):**
- Step 2: expired; onExpiry='requote' → REQUOTE_REQUIRED + QUOTE_EXPIRED.

No grace — the buyer must get a new quote at the current (higher) price.

---

### 8.4 Replayed token with edited unitPrice — QUOTE_FORGED

An agent receives a valid QuoteToken and edits `unitPrice` from `$310.00` to
`$1.00`. The RAOS-0008 signature covers the entire token payload.

**Validate:**
- Step 1: `verifyEnvelope(token.envelope, now, keys, modified_payload)`
  → expectedSignature ≠ token.envelope.provenance.signature
  → `REJECTED + QUOTE_FORGED`.

---

### 8.5 Partial stock honor (grocery path)

**Scenario:** Buyer requested qty=6 of Organic Whole Milk. Only 3 units remain.
**HonorPolicy:** `onStockLoss: 'partial'`.

**Validate:**
- Steps 1–3: pass.
- Step 4: `availability.quantityAvailable = 3`, `token.quantity = 6`, `3 < 6`.
  → `onStockLoss = 'partial'`, `honoredQty = 3 > 0`.
```jsonc
{
  "outcome": "HONORED",
  "honoredQuantity": 3,
  "reasons": [{ "code": "QUOTE_PARTIALLY_HONORED", "severity": "CONDITION",
    "message": "Only 3 units available of 6 requested. Price honored for 3." }]
}
```

---

## 9. Pipeline integration — QUOTE stage

The QUOTE evaluator registers in the `QUOTE` stage at priority 10. It reads
a `QuoteConfig` from the variant (the merchant's `HonorPolicy` for this
merchant×variant combination) and runs `issueQuote` only when the ELIGIBILITY
stage produced no BLOCK reasons.

The evaluator output is a `QuoteToken | null` (null when the line is blocked
or unpriced). The `QUOTE_ISSUED` INFO reason is emitted when a token is
successfully issued; no reason is emitted when the line is skipped (no
capability or blocked).

Because QUOTE is a `SAFETY_CRITICAL` stage (per `pipeline.ts` STAGE_CLASS),
an evaluator error degrades to BLOCK, not to omit — an unhandled exception
blocks the QUOTE stage rather than silently dropping the token.

---

## 10. Conformance

Tier 2 — Priced. A merchant at Tier 2 MUST list the quote capability in its
`capabilities[]` to honor quote tokens at checkout.

**Merchant-declared capability entry example:**
```jsonc
{
  "id": "ext.quote",
  "namespace": "com.os.retailagent.shopping.quote",
  "version": "1.0.0",
  "honorPolicy": {
    "onExpiry": "honor_grace",
    "graceSeconds": 120,
    "onStockLoss": "partial",
    "onContextChange": "requote"
  }
}
```

Both Atlas Wholesale and Fresh Corner Market declare the quote capability in
their manifests with intentionally **different** HonorPolicies so the Playground
can demonstrate both honor and requote paths:

- **Wholesale B**: `onExpiry: 'requote'`, `onStockLoss: 'reject'` — strict,
  B2B-oriented. An expired quote always needs a fresh one; stock loss is a hard block.
- **Grocery C**: `onExpiry: 'honor_grace' (120s)`, `onStockLoss: 'partial'` —
  consumer-friendly. A recently-expired quote is honored in the grace window;
  partial stock yields a partial honor.

---

## 11. Open questions — Request for Comment

1. **Should `onContextChange` be merchant-configurable?** Currently spec'd as
   always `'requote'`. A merchant with a very loose policy might want to honor
   through minor context changes (e.g., fulfillment mode switch from shipping to
   pickup for the same region). Leaning: keep as always-requote for v1 (safe
   default); add merchant override in a minor version once real usage patterns
   emerge.

2. **TTL default for quotes.** The spec leaves `ttlSeconds` to be declared by the
   merchant in their HonorPolicy (or defaults to a sensible value — currently 600s
   in the implementation). Should there be a RAOS-0007 floor (e.g. min 60s) and
   ceiling (e.g. max 86400s = 1 day)? Leaning: yes, a floor/ceiling prevents
   pathological TTLs, but the values need real usage data.

3. **quoteId collision probability.** The djb2 hash is 32-bit; under high-traffic
   scenarios with many different inputs, collision probability within a bucket
   becomes non-trivial (birthday bound at ~65k tokens). Should quoteId include the
   full hex hash rather than 8 characters? The implementation uses 8 hex chars for
   readability but real deployments might want a cryptographic hash here. Leaning:
   acceptable for v1 simulation; real WP-19 MCP uses a 64-bit hash or UUID.

4. **Partial honor acknowledgment flow.** When `QUOTE_PARTIALLY_HONORED` fires, the
   agent must display "3 of 6 units available — honor for 3?" and get explicit
   buyer acknowledgment before proceeding. This acknowledgment flow is outside the
   scope of the quote protocol (it is an agent UX concern) but should be documented
   as a required step in the cart bridge (RAOS-0012).

5. **Price drift in step 5 → REQUOTE_REQUIRED or HONORED?** Currently spec'd as
   REQUOTE_REQUIRED. A more generous merchant policy might say: honor the quoted
   (lower) price even if the current price is higher. This is an `onPriceDrift`
   policy that could be added to `HonorPolicy`. Deferred to a minor version.

6. **Evidence bundle.** A QuoteToken + its ProvenanceEnvelope is the complete audit
   trail for a pricing dispute. RAOS-0012 (Cart Bridge) should carry the QuoteToken
   in its handoff payload as the dispute evidence. Forward-ref noted in the RAOS-0012
   brief; not blocking here.

---

## 12. Why this spec

Quote integrity is the piece that makes agent-assisted commerce safe for
retailers. Without it, a retailer cannot let an agent quote prices — the gap
between "agent said $X" and "checkout charged $Y" is a chargeback and a
trust problem.

With QuoteToken, the agent carries a signed, TTL'd, context-locked commitment.
The retailer controls the honor policy. The buyer gets a plain explanation
when the price changes. And the QuoteToken itself is the evidence bundle for
any dispute.

**v1 completeness:** when this spec lands, the v1 six specs are complete:
`0000 Foundations · 0001 Eligibility · 0002 Pricing · 0005 Inventory ·
0007 Quote Integrity · 0008 Trust`. An agent can now discover a merchant,
check eligibility and stock, get a contextual price, lock it in a signed
quote, and know exactly what invalidates it. The spec is not aspirational —
the Playground runs it.

---

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md) for the full set and how to contribute.*
