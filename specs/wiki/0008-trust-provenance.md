# RAOS-0008 · Trust, Provenance & Freshness — Wiki

**Full spec:** [`../0008-trust-provenance.md`](../0008-trust-provenance.md)
**Code:** [`src/lib/rules/trust.ts`](../../src/lib/rules/trust.ts) ·
[`src/lib/extensions/pipeline.ts`](../../src/lib/extensions/pipeline.ts) (central envelope attachment)
**Status:** Built · v1.0.0 · Tier 0 (Foundation)
**Verification:** see [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) — tests pass (328/328) as of 2026-07-04; coverage % and `npm run build` were not re-confirmed this pass.

## The one-sentence problem

An agent that confidently quotes a price set three hours ago, or accepts a payload from a
spoofed merchant endpoint, is a liability, not an asset — and nothing in UCP tells an agent
whether data is *current* or *authentic*.

## What UCP already gives you

Nothing on this axis. UCP describes the rails, not whether a specific response can be
trusted or is stale.

## What this spec adds

Answers to three questions, on every computed contract:
1. **Is this from who it claims to be from?** A signed envelope (issuer, key ID, signature).
   Crypto is **simulated** by design in v1 — every simulated envelope visibly says
   `SIMULATED` — but the interface (`signEnvelope`/`verifyEnvelope`) is real, so swapping in
   real crypto later is a one-function change, not a redesign.
2. **Is it still current?** Per-stage TTL defaults (price 300s, inventory 60s, eligibility
   3600s), with a staleness behavior matrix: refuse for quote-stage data, degrade-and-flag for
   advisory data.
3. **Can I trust the key?** Key rotation via a `keys[]` list on the merchant manifest, ±60s
   clock-skew tolerance.

## Minimal core (any tier — this one isn't optional)

Every merchant gets this by default: the pipeline attaches the envelope centrally (one change
in `pipeline.ts`, not per-evaluator), so there is no "opt out of provenance." The minimal
version is just: trust the simulated signature, respect the default TTLs, and show
`TRUST_SIMULATED` honestly rather than pretending it's real.

## Layering up

The only thing that changes with scale is *swapping simulated crypto for real crypto*
(WP-19, once a real MCP transport exists) — nothing about the contract shape changes. This is
intentional: the seam was built to make that swap mechanical.

## Reason codes at a glance

`DATA_STALE`, `SIGNATURE_INVALID`, `ISSUER_UNKNOWN`, `KEY_EXPIRED`, `CLOCK_SKEW_SUSPECTED`,
`TRUST_SIMULATED`.

## Reference implementation

See [`../reference-implementation/README.md`](../reference-implementation/README.md) — the
engine package exports `signEnvelope`/`verifyEnvelope` unchanged; a real merchant integration
consumes them as-is until real transport work replaces the simulated signature.
