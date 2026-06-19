# RAOS-0008 · Trust, Provenance & Freshness

**Extension namespace:** `com.os.retailagent.shopping.trust`
**Status:** Draft · Request for Comment
**Version:** 1.0.0
**Layer:** Plane 0 · Foundation · Tier 0 · Discoverable
**Reference implementation (WP-06):**
- Signing + verification → [`src/lib/rules/trust.ts`](../src/lib/rules/trust.ts)
- Envelope types → [`src/lib/types/envelope.ts`](../src/lib/types/envelope.ts)
- Merchant key manifest → [`src/lib/mock/merchants.ts`](../src/lib/mock/merchants.ts)
- Central envelope attachment → [`src/lib/extensions/pipeline.ts`](../src/lib/extensions/pipeline.ts)

Runnable in the [Playground](../src/app/demo/page.tsx).
**Author:** Rik Banerjee · rikbanerjee007@gmail.com
**Companion docs:** [`specs/0000-foundations.md`](./0000-foundations.md) §9 (the envelope shape), [`specs/ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md) §3–§5

> This spec deepens the provenance + freshness envelope defined at contract level in
> RAOS-0000 §9. If the rules around staleness behavior, key rotation, or clock-skew
> tolerance are wrong for your use case, that is the most useful thing you can tell me.
> See §11 Open Questions.

---

## 1. Abstract

RAOS-0008 operationalizes the provenance and freshness envelope that RAOS-0000 §9 fixed the
shape of. It answers three questions every trust-conscious agent must ask:

1. **Is this data from who it claims to be from?** — The signed payload envelope: issuer, key
   identifier, and a deterministic signature. Crypto is **simulated** in v1 (B3/D2 locked);
   the interface is real and the swap to true crypto is mechanical.
2. **Is this data still current?** — Per-stage TTL defaults (price 300s, inventory 60s,
   eligibility 3600s), merchant-overridable. Staleness has a behavior matrix: refuse for
   QUOTE-stage data, degrade+flag for advisory data.
3. **Can I trust the key?** — Key rotation: the merchant manifest carries `keys[]`
   `{keyId, validFrom, validTo}`. A verifier picks by keyId; an expired key is a `KEY_EXPIRED`
   BLOCK. Clock-skew tolerance ±60s.

Every simulated envelope carries `trustMode: 'asserted'` and the word `SIMULATED` is visible
in every payload view. This is the contract for WP-19 (real MCP): the seam is the
`signEnvelope` / `verifyEnvelope` interface in `src/lib/rules/trust.ts`. Replacing the
simulated hash with a real HMAC or ECDSA signature requires changing one function body, not
the caller contract.

---

## 2. Motivation

An AI shopping agent that confidently quotes a price that was set three hours ago, or that
accepts a payload from a spoofed merchant endpoint, is a liability — not an asset. The two
failure modes are distinct:

- **Staleness:** correct data, wrong time. A promotion ended; a flash-sale price is still
  being served. The agent shows $19.99; the checkout charges $24.99. Buyer abandons.
- **Spoofing / tampering:** wrong data, wrong issuer. A malicious agent feeds the pipeline a
  crafted `ComputedPriceState` with an impossibly low price. Without a signature, the pipeline
  has no way to detect tampering.

RAOS-0000 §9 reserved the envelope shape. This spec makes it load-bearing.

---

## 3. Scope

**In scope:**
- `signEnvelope(payload, keyId, now, merchant)` → signed `ProvenanceEnvelope`
- `verifyEnvelope(envelope, now, merchantKeys)` → `TrustVerificationResult` with a reason code
- Per-stage TTL defaults and the staleness behavior matrix
- Merchant manifest `keys[]` shape and key rotation semantics
- Clock-skew tolerance ±60s
- Threat model: four attack vectors mapped to envelope fields
- Central envelope attachment in the pipeline (one change, not per-evaluator)
- Reconciliation with WP-05 (inventory) existing freshness usage

**Out of scope:**
- Real cryptographic primitives — simulated by design (D2 locked until WP-19)
- Per-buyer trust claims — those live on `BuyerContext.trust` (RAOS-0000 §4.2)
- Multi-issuer PKI hierarchies — single per-merchant key set for v1
- Key revocation beyond `validTo` expiry — CRL/OCSP is post-v1

---

## 4. Inputs

### 4.1 Payload to sign

Any structured object that can be canonicalized (stable-key-order JSON serialization). In
practice: the `ExtensionResult.output` or a `DecisionRecord` sub-slice.

### 4.2 Merchant key manifest (`keys[]`)

Declared on the `UcpManifest` alongside `capabilities[]`:

```jsonc
{
  "protocol": "1.0",
  "tier": 2,
  "capabilities": [ ... ],
  "keys": [
    {
      "keyId": "k1",
      "validFrom": 1700000000000,  // Unix ms — inclusive
      "validTo":   1800000000000   // Unix ms — exclusive; null means no expiry
    }
  ]
}
```

**Key rotation:** a merchant may carry multiple keys simultaneously. `verifyEnvelope` selects
the key whose `keyId` matches the envelope's `provenance.keyId`. If the key's `validTo < now`,
emit `KEY_EXPIRED` (BLOCK). If no key matches `keyId`, emit `ISSUER_UNKNOWN` (BLOCK).

### 4.3 Injected `now`

Unix epoch milliseconds. Never `Date.now()` inside `src/lib/rules/**`. The injected `now` is
the reference clock for all freshness and key-expiry computations.

---

## 5. Outputs

### 5.1 `ProvenanceEnvelope` (extended shape)

The envelope defined in RAOS-0000 §9, extended with RAOS-0008 fields:

```jsonc
{
  "provenance": {
    "issuer":    "https://api.boutique-a.test",
    "keyId":     "k1",
    "signature": "sim:3a9f2c1d",   // SIMULATED — deterministic hash of canonicalized payload + keyId
    "trustMode": "asserted"         // always "asserted" while crypto is simulated
  },
  "freshness": {
    "computedAt": 1718000000000,    // injected now
    "ttlSeconds": 300               // per-stage default, merchant-overridable
  }
}
```

> **SIMULATED label:** while crypto is not real, `trustMode` is always `'asserted'` and the
> prefix `sim:` is prepended to the signature value. The Playground Payload Inspector renders
> the SIMULATED badge whenever `trustMode === 'asserted'`. This ensures no consumer mistakes
> the simulation for real security.

### 5.2 `TrustVerificationResult`

```jsonc
{
  "valid":     true,
  "code":      "TRUST_SIMULATED",   // the reason code, or null if fully valid + real crypto
  "severity":  "INFO",
  "message":   "Envelope verified (simulated — crypto not real).",
  "stale":     false,               // true when now > computedAt + ttlSeconds * 1000
  "ageSeconds": 42                  // now - computedAt, in whole seconds
}
```

---

## 6. Reason code registry

| Code | Namespace | Meaning | Severity | Resolvable? | Fixture-reachable? |
|------|-----------|---------|----------|-------------|--------------------|
| `TRUST_SIMULATED` | `…trust` | Crypto is simulated; envelope was not cryptographically verified. Always emitted while simulated. | INFO | No (advisory only) | Yes — all variants |
| `DATA_STALE` | `…trust` | Data has exceeded its TTL. For advisory stages: degrade and flag. For QUOTE stage: refuse. | CONDITION | Yes — re-fetch / re-evaluate | Yes — stale-toggle fixture |
| `SIGNATURE_INVALID` | `…trust` | Signature does not match canonicalized payload. Most-restrictive: treat as BLOCK. | BLOCK | No | Synthetic only |
| `ISSUER_UNKNOWN` | `…trust` | `keyId` not found in merchant's `keys[]`. Cannot verify provenance. | BLOCK | No | Synthetic only |
| `KEY_EXPIRED` | `…trust` | Key found but `validTo < now` (±60s skew allowance). Rotate to new key. | BLOCK | Yes — key rotation | Synthetic only |
| `CLOCK_SKEW_SUSPECTED` | `…trust` | `computedAt` differs from `now` by more than ±60s but signature otherwise matches. | CONDITION | Yes — re-synchronize clock | Synthetic only |

**Synthetic-only codes:** `SIGNATURE_INVALID`, `ISSUER_UNKNOWN`, `KEY_EXPIRED`,
`CLOCK_SKEW_SUSPECTED` cannot be produced from the static catalog fixture grid (they require
injected mis-signed payloads, missing keys, or expired keys). Each has dedicated unit tests
in `src/lib/rules/__tests__/trust.test.ts`.

**`DATA_STALE`** is fixture-reachable via the stale-data toggle in the Playground (which
advances `now` past the TTL) and via a dedicated `now` offset in the golden fixture generation.

---

## 7. Deterministic algorithm

### 7.1 Canonicalization

```
canonicalize(payload): string
  1. Deep-sort all object keys lexicographically (stable, recursive).
  2. Serialize with JSON.stringify (no whitespace).
  3. Append keyId as a suffix: `${json}|${keyId}`.
  Result: a deterministic string. Same object structure → same string.
```

### 7.2 Simulated signing

```
signEnvelope(payload, keyId, now, issuer): ProvenanceEnvelope
  1. canonical = canonicalize(payload, keyId)
  2. signature = 'sim:' + djb2Hash(canonical).toString(16).padStart(8, '0')
     where djb2Hash is: h=5381; for each char: h = ((h<<5)+h+charCode)>>>0
  3. return {
       provenance: { issuer, keyId, signature, trustMode: 'asserted' },
       freshness: { computedAt: now, ttlSeconds: <stage-default> }
     }
```

### 7.3 Verification

```
verifyEnvelope(envelope, now, merchantKeys): TrustVerificationResult
  1. Freshness: ageSeconds = floor((now - envelope.freshness.computedAt) / 1000)
     stale = now > envelope.freshness.computedAt + envelope.freshness.ttlSeconds * 1000
  2. If stale → include DATA_STALE in result.
  3. Clock skew: if |ageSeconds| > 60 + envelope.freshness.ttlSeconds → CLOCK_SKEW_SUSPECTED.
  4. Key lookup: key = merchantKeys.find(k => k.keyId === envelope.provenance.keyId)
     if !key → return { valid: false, code: 'ISSUER_UNKNOWN', severity: 'BLOCK' }
  5. Key expiry: if key.validTo != null && key.validTo < (now - 60_000) → KEY_EXPIRED
  6. Simulated signature check: re-compute expected signature; if mismatch → SIGNATURE_INVALID
  7. If no blocking errors → return { valid: true, code: 'TRUST_SIMULATED', severity: 'INFO' }
```

### 7.4 Per-stage TTL defaults

| Stage | Default TTL | Rationale |
|-------|------------|-----------|
| ELIGIBILITY | 3600s (1h) | Eligibility rules change infrequently; member tiers are stable within a session |
| PRICE | 300s (5m) | Price data is time-sensitive; promotions can end at any minute |
| INVENTORY | 60s (1m) | Inventory is the most volatile signal; must be fresh before cart add |
| VISIBILITY | 3600s (1h) | Same as eligibility — visibility rules are stable |
| QUOTE | 0s (verify at use) | Quotes use their own `ttlSeconds`; freshness check is at verification time |

Merchant-overridable per-capability via future `ttlSeconds` config on the capability entry.
For v1, defaults are declared in code constants in `trust.ts`.

### 7.5 Staleness behavior matrix

| Stage class | Data stale | Behavior |
|-------------|-----------|---------|
| QUOTE | any | **Refuse** — emit `DATA_STALE` BLOCK; do not issue/honor quote |
| ELIGIBILITY | stale | **Degrade + flag** — emit `DATA_STALE` CONDITION; continue with stale data; agent should re-fetch |
| PRICE | stale | **Degrade + flag** — emit `DATA_STALE` CONDITION; show stale price with freshness warning |
| INVENTORY | stale | **Degrade + flag** — emit `DATA_STALE` CONDITION (WP-05 also emits `STOCK_STALE` — these are reconciled: `STOCK_STALE` is the inventory-domain code; `DATA_STALE` is the trust-domain code) |
| VISIBILITY | stale | **Degrade + flag** — advisory only |

---

## 8. Worked examples

### 8.1 Sara's Boutique — DTC, standard signing

**Context:** Guest buyer, Boutique A, variant `v_b_001_1`, `now = 1718000000000`

```jsonc
// Envelope attached by pipeline (central attachment):
{
  "provenance": {
    "issuer": "https://api.boutique-a.test",
    "keyId": "k1",
    "signature": "sim:4a7f0c2b",  // SIMULATED
    "trustMode": "asserted"
  },
  "freshness": {
    "computedAt": 1718000000000,
    "ttlSeconds": 3600             // ELIGIBILITY stage default
  }
}
// Reason emitted:
{ "code": "TRUST_SIMULATED", "severity": "INFO",
  "message": "Envelope computed (crypto simulated — not cryptographically verified).",
  "source": "com.os.retailagent.shopping.trust" }
```

### 8.2 Atlas Wholesale — key rotation mid-session

**Setup:** Manifest carries two keys. Request was signed with `k1` (still valid); `k2` is the
new key with a future `validFrom`.

```jsonc
// Merchant manifest keys[]:
[
  { "keyId": "k1", "validFrom": 1700000000000, "validTo": 1800000000000 },
  { "keyId": "k2", "validFrom": 1750000000000, "validTo": null }
]
// Envelope signed with k1 at t=1718000000000:
{ "provenance": { "keyId": "k1", "trustMode": "asserted" ... } }
// At t=1801000000000 (k1 expired):
// verifyEnvelope → KEY_EXPIRED (BLOCK)
// { code: 'KEY_EXPIRED', severity: 'BLOCK',
//   message: 'Signing key k1 has expired. Re-issue envelope with key k2.' }
```

### 8.3 Fresh Corner Market — stale inventory data

**Context:** Inventory fetched at `t=1718000000000`, TTL=60s. Agent evaluates at
`t=1718000120000` (120s later = 2× TTL).

```jsonc
// Pipeline envelope:
{ "freshness": { "computedAt": 1718000000000, "ttlSeconds": 60 } }
// verifyEnvelope at t=1718000120000:
// stale = true (120s > 60s)
// Reasons emitted:
[
  { "code": "TRUST_SIMULATED", "severity": "INFO", ... },
  { "code": "DATA_STALE", "severity": "CONDITION",
    "message": "Inventory data is 120s old (TTL 60s). Re-fetch before acting.",
    "source": "com.os.retailagent.shopping.trust" }
]
```

### 8.4 Threat model

| Attack vector | Description | Defeated by |
|--------------|-------------|-------------|
| **Spoofed merchant** | A malicious agent presents a crafted payload claiming to be from a known merchant | `verifyEnvelope` checks `keyId` against the merchant's published `keys[]`. Unknown key → `ISSUER_UNKNOWN` BLOCK. |
| **Replayed envelope** | A valid envelope from an earlier evaluation is replayed with a new payload | `computedAt` + TTL: replayed envelopes expire. At QUOTE stage: all stale envelopes are refused. |
| **Stale promo served as fresh** | A promotional price computed 10 minutes ago is served with a fresh-looking timestamp | `computedAt` comes from injected `now` (never wall-clock). The injected `now` is the pipeline's reference; manipulating it is detectable against the agent's own clock (CLOCK_SKEW_SUSPECTED). |
| **Tampered price** | The `unitPrice` field is modified after signing | `signEnvelope` canonicalizes the entire payload including `unitPrice`. A single-character change → different signature → `SIGNATURE_INVALID` BLOCK. |

---

## 9. Pipeline integration — central envelope attachment

The envelope attaches **once** in `src/lib/extensions/pipeline.ts`, not per-evaluator. This
ensures:
- No evaluator needs to import `trust.ts` — they remain pure domain logic.
- Every stage result in the `DecisionRecord` has `provenance` and `freshness`.
- The `TRUST_SIMULATED` reason is emitted once per evaluation, not once per evaluator.

### 9.1 Reconciliation with WP-05 (inventory) freshness

WP-05 (`inventory.ts`) already emits `STOCK_STALE` (CONDITION) when inventory data exceeds
its TTL, and `ComputedAvailability.freshness` carries the per-item `computedAt` + `ttlSeconds`.

WP-06 adds an **outer envelope** at the pipeline level. These are not duplicates:

- **`ComputedAvailability.freshness`** (RAOS-0005): the freshness of the *inventory data
  payload* — when the stock count was last fetched from the source of truth. This is
  item-specific and merchant-controlled.
- **`ExtensionResult.freshness`** (RAOS-0008, outer): the freshness of the *evaluation result*
  — when the pipeline computed this decision. This is evaluation-time and pipeline-controlled.

Both are preserved. No deduplication. The `TRUST_SIMULATED` reason is emitted once per
evaluation at the pipeline level; `STOCK_STALE` remains the inventory-domain signal emitted
by the inventory evaluator for item-level data staleness.

---

## 10. Conformance

Tier 0 — Discoverable. All three merchant archetypes must declare the `ext.trust` capability
in their manifests and carry `keys[]`. This is the foundation capability: an agent cannot
trust any catalog data from a merchant that doesn't declare trust semantics.

---

## 11. Open questions — Request for Comment

1. **Real crypto seam — which algorithm?** The interface is real; the implementation is
   simulated. WP-19 swaps the simulation. The obvious choices are HMAC-SHA256 (symmetric,
   shared secret per merchant) or ECDSA-P256 (asymmetric, public key published in manifest).
   ECDSA is better for decentralized verification; HMAC is simpler for platform-signed
   manifests. *Leaning: HMAC-SHA256 for v1, ECDSA forward-ref for v2.*

2. **Per-field freshness vs per-result freshness.** The envelope today attaches to each
   `ExtensionResult`. A richer model would attach per field (price is fresh, inventory is
   stale). The WP-05 `ComputedAvailability.freshness` is already per-result. Should the
   pipeline expose per-field freshness via a `fieldFreshness: Record<string, Freshness>`
   slot on the envelope? *Leaning: defer to WP-07 (quote integrity) which needs this most.*

3. **Clock-skew tolerance ±60s — is this enough?** Distributed systems typically allow ±30s;
   banking systems allow ±5s. Agents in a cloud environment can have clock drift of a few
   seconds; mobile agents in intermittent connectivity can have more. ±60s may be generous
   for high-stakes data (QUOTE). *Open: tighten to ±30s for QUOTE, ±60s for advisory.*

4. **Freshness on the `DecisionRecord` root vs per-stage.** Currently the central envelope
   attaches to each `ExtensionResult` (per-stage, per-evaluator). The `DecisionRecord` already
   carries `computedAt`. Should it also carry a root-level `envelope` that summarizes the
   trust posture of the entire evaluation? *Leaning: add in WP-08 when trace rendering lands.*

5. **`DATA_STALE` vs `STOCK_STALE` disambiguation.** `DATA_STALE` (RAOS-0008) is the trust
   namespace signal. `STOCK_STALE` (RAOS-0005) is the inventory namespace signal. Both can fire
   in the same evaluation. Should agents treat them as additive, or does one supersede the
   other? *Leaning: additive — different namespaces, different concerns. Agents that read both
   get richer information.*

If you have a view on any of these — especially if you've dealt with clock-skew in a
real distributed-catalog environment — email me or reply on the build-log post.

---

## 12. Why this spec is Tier 0

Freshness and provenance are not premium features. An agent that doesn't know whether its data
is current or authenticated cannot safely act. This spec is Tier 0 because:

- Every other spec produces data that can go stale. Without RAOS-0008, there is no
  protocol-level way to signal staleness to the agent.
- Trust downgrade (RAOS-0000 §7.2) is already implemented; the signing seam makes the
  downgrade mechanical and auditable.
- WP-07 (Quote Integrity) directly depends on the signature seam: a quote token is only as
  tamper-resistant as the envelope it carries.

The TTL defaults (price 300s, inventory 60s, eligibility 3600s) are themselves a data model
— they encode the merchant's implicit promise about how fresh their data is. Making that
promise explicit is Tier 0 work.

---

*Part of the RetailAgentOS open spec series. See [specs/README.md](./README.md) for the full
set and how to contribute.*
