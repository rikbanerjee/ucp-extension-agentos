# RAOS-0007 · Quote Integrity & Price Lock — Wiki

**Full spec:** [`../0007-quote-integrity.md`](../0007-quote-integrity.md)
**Code:** [`src/lib/rules/quote.ts`](../../src/lib/rules/quote.ts) ·
[`src/lib/extensions/evaluators/quote.ts`](../../src/lib/extensions/evaluators/quote.ts)
**Status:** Built · v1.0.0 · Tier 2
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

An agent quotes $19.99; checkout charges $24.99 because a flash sale ended in between. The
buyer abandons and disputes the charge — and retailers won't let agents quote prices at all
if this keeps happening.

## What UCP already gives you

A checkout handoff. It doesn't carry a binding commitment that the price shown will be the
price charged.

## What this spec adds

A **QuoteToken**: a variant, quantity, buyer-context hash, the fully resolved price, the
offers that produced it, and a TTL — wrapped in a RAOS-0008 signature. `issueQuote` produces
one from a completed (never-blocked) decision. `validateQuote` checks it at checkout time —
signature, then TTL/grace, then context match, then stock, then price recomputation — and
returns exactly one of `HONORED | REQUOTE_REQUIRED | REJECTED`, always with a reason.

## Minimal core (Tier 2 — the smallest version)

A short TTL (minutes) and a strict honor policy: if the quote expires, requote — no grace
window, no partial-honor logic yet. This alone gives a merchant the retailer-trust sentence:
"the price I showed is the price I'll charge, for the next N minutes."

## Layering up (higher-volume / B2B)

- **Grace windows:** `onExpiry: 'honor_grace'` — honor a quote briefly past TTL instead of
  forcing an immediate requote.
- **Partial honor:** `onStockLoss: 'partial'` — the price holds even if some stock doesn't.
- **B2B negotiation:** a context-hash mismatch (tier downgraded mid-session) forces a
  requote rather than silently re-pricing.

## Reason codes at a glance

`QUOTE_ISSUED`, `QUOTE_EXPIRED`, `QUOTE_CONTEXT_CHANGED`, `QUOTE_STOCK_LOST`,
`QUOTE_PARTIALLY_HONORED`, `QUOTE_FORGED`, `QUOTE_HONORED_GRACE`.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) —
in the TheCustomHub pilot, `issueQuote` is the last step before handoff to the existing Stripe
`createCheckoutSession`; the token is what makes that handoff trustworthy.
