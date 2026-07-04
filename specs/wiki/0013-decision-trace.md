# RAOS-0013 (Part 1) · Decision Trace — Wiki

**Full spec:** [`../0013-intent-capture.md`](../0013-intent-capture.md) §1 (Decision Trace)
**Code:** [`src/lib/trace/`](../../src/lib/trace/) (`derive.ts`, `render.ts`, `types.ts`)
**Status:** Built · v0.1.0 · Tier 3
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.
**Pending half:** the intent-capture *routing* work (notify-me, quote requests) is
tracked separately in [`pending/0013-intent-capture-routing.md`](./pending/0013-intent-capture-routing.md)

## The one-sentence problem

The pipeline produces a complete, correct decision — but a developer, a merchant's ops team,
and a shopper need three completely different views of the *same* decision, and none of them
should see a version that was "helpfully" rewritten by a model.

## What UCP already gives you

Nothing — UCP doesn't produce a decision trace at all; it hands off to checkout and the
reasoning behind any block is invisible.

## What this spec adds

One substrate (`DecisionRecord`, produced by every pipeline run) and three pure renderers —
none of which invent data, all of which are deterministic:

- **Developer** — the full trace as stable, alphabetically-sorted JSON. Everything, always.
- **Merchant** — an ops-actionable table: what blocked the sale, which config field caused
  it, what to change. Only `BLOCK`/`CONDITION` reasons — INFO is too noisy for ops.
- **Buyer** — ≤2 plain-language sentences: can they buy it, and if not, what's next. A hard
  deny-list keeps merchant-internal fields (floor price, suppression internals) out.

## Minimal core (any tier)

Just the buyer trace. A single plain-language sentence explaining a block is the highest-value,
lowest-effort piece — it's the difference between an agent that says "no" and one that says
"no, but here's why and what would fix it."

## Layering up

Merchant and developer traces matter more as a catalog grows large enough that a human
can't eyeball every config change's effect. They're additive on top of the same substrate —
no new data is ever computed for them.

## Reason codes at a glance

None — this spec only *renders* reasons emitted by other specs; it never produces new ones.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) — the
engine package exports all three renderers; a shopping agent's chat UI is expected to call
`renderBuyerTrace`, not the developer JSON.
