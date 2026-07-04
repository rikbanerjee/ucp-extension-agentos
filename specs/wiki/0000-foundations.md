# RAOS-0000 · Protocol Foundations — Wiki

**Full spec:** [`../0000-foundations.md`](../0000-foundations.md)
**Code:** [`src/lib/types/context.ts`](../../src/lib/types/context.ts) ·
[`src/lib/types/reasons.ts`](../../src/lib/types/reasons.ts) ·
[`src/lib/rules/normalizeBuyerContext.ts`](../../src/lib/rules/normalizeBuyerContext.ts) ·
[`src/app/.well-known/ucp/route.ts`](../../src/app/.well-known/ucp/route.ts)
**Status:** Built · every other spec depends on this one
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

Every other spec needs to answer a merchant-reasoning question against *some* buyer, using
*some* vocabulary of reasons, degrading *some* consistent way when data is missing — without
this spec, each one would invent its own version of all three, and the whole thing stops
being a platform.

## What UCP already gives you

Nothing here — this spec is 100% RAOS, sitting directly on the UCP discovery pattern
(`/.well-known/ucp`). UCP doesn't have an opinion on buyer-context shape, reason codes, or
conformance; this spec is where RAOS supplies that opinion once, so nobody else has to.

## What this spec adds

1. **`BuyerContext`** — one shared object every extension evaluates against (customer type,
   membership tier, region, fulfillment mode, tax/resale flags, and a `trust` mode of
   `asserted` vs `signed`).
2. **The conformance ladder (0–4)** and the **`/.well-known/ucp` manifest** — a headline
   `tier` number backed by an authoritative `capabilities[]` list an agent negotiates against.
3. **Versioning rules** — semver per namespace, additive-only reason codes, never a silent
   breaking change.
4. **`ReasonEntry`** — the one shape every spec uses to explain a decision (`code`, `message`,
   `severity`, optional `requirements`, and which spec/`source` emitted it).
5. **The provenance/freshness envelope shape** (depth lives in RAOS-0008).

## Minimal core (smallest merchant, Tier 0)

A Tier-0 merchant needs almost nothing from this spec directly — just a `/.well-known/ucp`
manifest that says "I exist, here's my tier, here's what I support," and to pass a
`BuyerContext` (even a mostly-empty one) into every other extension it does implement.
**The one non-negotiable rule for every tier:** unknown or missing context defaults to the
*most restrictive* interpretation. A buyer claiming a privilege without a signed token gets
treated as a guest for any transaction-gating decision.

## Layering up (higher tiers)

Higher tiers don't add new foundation concepts — they add more `capabilities[]` entries to
the same manifest, and lean harder on the trust model (`trust.mode === 'signed'`) once
account-linking (RAOS-0015) is real. The foundation itself doesn't grow; it's deliberately
small and frozen so it stays a stable floor.

## Reason codes at a glance

This spec doesn't emit its own reason codes — it defines the *shape* every other spec's
codes use (`severity: BLOCK | CONDITION | INFO`, always with a `source` namespace).

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) for how
`BuyerContext` and the manifest route are consumed by `@retailagentos/engine` and by the
TheCustomHub pilot.
