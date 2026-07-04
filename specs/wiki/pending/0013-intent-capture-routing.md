# RAOS-0013 (Part 2) · Intent Capture & Assisted Commerce — Wiki & Pending Work

**Status:** Not started · planned (the trace half of 0013 is built — see
[`../0013-decision-trace.md`](../0013-decision-trace.md))
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0013 brief) · `MASTER-BUILD-PLAN.md` WP-14
**Depends on:** RAOS-0001 (Eligibility, built — blocked → capture path), RAOS-0015
(Privacy/Identity, pending — consent gate)

## The one-sentence problem

Checkout isn't always the right outcome — an out-of-stock item, a bulk/custom order, a
question better answered by a human — and today those all dead-end into a generic contact
form instead of a structured path an agent can act on.

## Why UCP doesn't solve this

UCP assumes the outcome is always checkout. It has no vocabulary for "capture a lead
instead," "request a quote," or "route to WhatsApp" as first-class, agent-actionable
outcomes.

## Minimal core (build this first)

One path: out-of-stock **notify-me**, binding RAOS-0005's `OUT_OF_STOCK` resolution. A
structured request (buyer + variant + consent) instead of a dead link to a contact form. This
is the cheapest, most universally useful piece of this spec.

## Layering up (build later)

- B2B quote-request handoff, binding RAOS-0002's `CALL_FOR_PRICE` + MOQ negotiation — this is
  the actual differentiator (see the TheCustomHub reference implementation for a concrete
  example: "I need 25 custom robotics-team shirts").
- Lead-form / WhatsApp channel descriptors declared in merchant config.
- Assisted-sales callback routing.
- Duplicate-lead suppression (idempotency key) and spam/abuse handling (forward-reference to
  the reserved RAOS-0016 Agent Identity/Rate-Limits spec).

## Pending tasks

- [ ] Complete `specs/0013-intent-capture.md` §2+ (the routing sections — currently marked
      "Planned" in the spec file; §1 Decision Trace is already shipped).
- [ ] Define the agent action vocabulary for non-checkout outcomes.
- [ ] Implement consent-gating: no contact info captured without an explicit consent flag
      (blocks on RAOS-0015).
- [ ] Mock data: boutique (call-for-price → lead form, OOS → notify-me, consent required);
      wholesale (below-MOQ → B2B quote-request handoff).
- [ ] Reason codes: `INTENT_CAPTURED`, `CONSENT_REQUIRED`, `CHANNEL_UNAVAILABLE`,
      `DUPLICATE_INTENT_SUPPRESSED`.

## Note on scope history

This is deliberately split from the trace half of RAOS-0013. The trace (who sees what
explanation) was explicitly locked as v1 scope by the project owner; the routing half was
scoped at the same time but is separate, larger work. Don't merge them back into one build —
they have different dependency chains (trace ← 0000 only; routing ← 0001 + 0015).
