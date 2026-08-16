# RAOS-0001 · Eligibility & Visibility — Wiki

**Full spec:** [`../0001-eligibility.md`](../0001-eligibility.md)
**Code:** [`src/lib/rules/eligibility.ts`](../../src/lib/rules/eligibility.ts)
**Status:** Built · v1.1.0
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

An agent shows a wholesale-only product to a guest, or builds a cart for a buyer who was
never allowed to buy it — a dead end that UCP's rails have no way to prevent, because
nothing in the rails carries *who's allowed to buy this, and why not*.

## What UCP already gives you

The catalog listing itself — the product exists, has a price, has a description. UCP has no
concept of "hidden from this buyer" or "visible but not purchasable."

## What this spec adds

Two computed outputs, evaluated per buyer per variant, before a cart is ever built:
- **Visibility** — should this even be shown to this buyer?
- **Eligibility** — can this buyer purchase it, and if not, exactly what would fix that?

The defining feature is **reasons, never booleans**. Every block carries a structured code, a
human message, and — if a path exists — the requirement that resolves it
(`requiredTier: 'gold'`, `requireResaleCertificate: true`, etc.). An agent can explain a block
and guide the buyer, instead of just failing.

## Minimal core (Tier 1 — a boutique)

Most small merchants need exactly one rule: `hideFromGuests` on a handful of SKUs (early-access
drops, wholesale-only items). That's it — one boolean per variant, one evaluator, and the buyer
either sees the item or doesn't. This alone gets a merchant to Tier 1 ("no dead-end carts").

## Layering up (wholesale, grocery)

- **Wholesale (Tier 2):** add `requireWholesale`, `requiredTier` (an ordered membership ladder:
  `gold < reseller_plus < distributor`), and `requireResaleCertificate` — qualification-gated
  commerce.
- **Grocery / regulated (Tier 1 composing with 0003/0011):** region-based restriction
  (`REGION_RESTRICTED`) composes with feasibility gates from [0003](0003-fulfillment.md) so a
  regulated item can be visible but not shippable everywhere.

Nothing here changes as tiers go up — the same evaluator, the same reason-code shape, just more
rules declared on more variants.

## Reason codes at a glance

`HIDDEN_PRODUCT`, `REGION_RESTRICTED`, `WHOLESALE_ONLY`, `RESALE_CERTIFICATE_REQUIRED`,
`TIER_RESTRICTION`.

`FULFILLMENT_UNAVAILABLE` is **deprecated** (engine 0.3.0) — fulfillment-mode feasibility moved
out of eligibility into its own FEASIBILITY stage; see
[0003 · Fulfillment Feasibility](0003-fulfillment.md), which supersedes it with
`FULFILLMENT_MODE_UNAVAILABLE`.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) — TheCustomHub
pilot uses this spec's `REGION_RESTRICTED` path (as an allowlist, `servesRegions: ['US','CA']`)
to gate a Canadian shopper without hiding the product from a US one.
