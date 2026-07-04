# RAOS-0015 · Privacy, Consent & Identity — Wiki & Pending Work

**Status:** Not started · planned · Tier 0 (cross-cutting) · Plane 0
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0015 brief) · `MASTER-BUILD-PLAN.md` WP-15
**Depends on:** RAOS-0000 (Foundations, built) · unblocks RAOS-0013 routing, hardens
RAOS-0009 and RAOS-0011

## The one-sentence problem

`BuyerContext` carries membership tier, region, and purchase history — all personal data
under GDPR/CCPA — and today every claim in it ("this buyer is a gold member") is trusted with
no verification model at all.

## Why UCP doesn't solve this

UCP doesn't specify a consent model for buyer context, nor how a "wholesale member" or "gold
tier" claim gets verified rather than just asserted.

## Minimal core (build this first)

The **asserted-vs-signed distinction already exists** in RAOS-0000 (`trust.mode`) — this
spec's minimal job is just to make the consequence real: an asserted privilege claim
(membership tier, tax-exempt, resale certificate) is downgraded to guest/most-restrictive for
any transaction-gating decision unless it's signed. No consent UI, no retention policy yet —
just enforce the downgrade consistently everywhere RAOS-0009/0011 currently assume it.

## Layering up (build later)

- Consent model: per-purpose opt-in flags on `BuyerContext`.
- PII minimization: pipeline strips context fields a stage didn't declare it needs (a
  lint-style test: a stage receiving an undeclared field should fail).
- Account-linking trust: the actual signed buyer-token verification path (interface real,
  issuer simulated — same "simulate now, real later" pattern as RAOS-0008).
- Data retention signals + right-to-be-forgotten hook.
- GDPR-vs-CCPA worked examples; pseudonymous vs. authenticated buyer path.

## Pending tasks

- [ ] Write `specs/0015-privacy-consent.md`.
- [ ] Define per-purpose consent flags on `BuyerContext`.
- [ ] Implement per-stage field allowlists in the pipeline (PII minimization).
- [ ] Implement account-linking trust interface (issuer simulated).
- [ ] Reason codes: `CONSENT_REQUIRED`, `CONSENT_WITHDRAWN`, `CLAIM_UNVERIFIED`,
      `PII_MINIMIZED` (INFO).

## Why this one matters more than its tier number suggests

It's marked cross-cutting, not a headline tier, but RAOS-0009 (Loyalty) and RAOS-0011
(Restricted Goods) both currently *assume* a trust model this spec is supposed to deliver.
Building those two without this one means their account-linking and age-verification claims
stay permanently "simulated" with no real path forward.
