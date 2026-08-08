# RetailAgentOS — The Problem I Solved

**One line:** AI shopping agents can find your catalog. They can't understand your rules. I built the missing layer — in the open, as upstream-candidate specs, with a running reference implementation.

---

## The problem

AI shopping agents are already active, and commerce protocols (UCP, ACP) give them rails: discovery, catalog, cart, checkout handoff. But a merchant's *reasoning* — who may see this item, who qualifies to buy it, at what price, under which promotion, fulfillable where — lives locked in backend code and only fires at checkout.

Agents hit that reasoning like a wall:

- **Dead-end carts.** The agent builds a cart, checkout rejects it, nobody learns why.
- **Wrong quotes.** The price the agent showed the buyer isn't the price the store charges.
- **Gated SKUs surfaced to unqualified buyers.** Member pricing, wholesale minimums, regional restrictions — invisible until failure.
- **Silent invisibility.** Client-rendered storefronts that agents can't parse at all.

Every failure is a lost sale for the merchant and eroded trust in the agent. And no existing protocol carries this layer: UCP gives the rails, ACP gives checkout, neither carries the merchant's reasoning.

## What I built

**RetailAgentOS: the merchant reasoning layer for agentic commerce.** It moves merchant reasoning from checkout-time to catalog-time — deterministic, versioned, machine-readable, with a reason attached to every decision.

Concretely, verified in the repo today:

- **A real discovery surface.** A live `/.well-known/ucp` endpoint serving tier + capability manifests — and the manifest is load-bearing: absent capability → documented degraded behavior, tested.
- **A deterministic decision pipeline.** Registered, staged, fault-isolated (Visibility → Eligibility → Price → Fulfillment → Quote). Same context + same rules → byte-identical output, enforced by ~130 golden-fixture tests (96% line coverage on the rules layer). No model in the decision loop.
- **A reason code on every decision.** Every block, condition, and applied price carries a structured code with severity and owning namespace. Agents *explain* — "declined: doesn't ship to your region, here's what would unblock it" — instead of failing.
- **Honest trust.** Asserted buyer claims are visibly downgraded to most-restrictive; wherever cryptography isn't real yet, the word SIMULATED renders on screen.
- **Proof across retail models.** Three merchant archetypes — boutique DTC, B2B wholesale, grocery — run on one protocol surface with radically different computed outcomes.
- **Published as open RFCs.** Two specs published (Foundations, Eligibility & Visibility), fourteen more catalogued across six architectural planes — designed to be proposed upstream, not held as a walled product.

## Why it matters — for each audience

**If you're a merchant:** your store's rules — who qualifies, what price, what's in stock, what ships where — become something an agent gets *right* instead of guesses at. Structured declines protect your brand; correct quotes protect your conversion; machine-readable rules make you visible in agentic search at all. Agent-readiness is the new SEO, and it's tiered the same way: this layer is how the long tail inherits it without building it.

**If you're a protocol maintainer or platform:** this is the extension layer the rails don't carry, proven runnable before it's proposed. Deterministic semantics, a uniform reason vocabulary, golden-fixture conformance — implement it once at the platform level and every merchant on your platform inherits agent-readiness for free. The specs are open and the reference implementation is the argument.

## What makes this credible

Rigor over adjectives. The project publishes its own scorecard of what's built, what's specified, and what's next — verified against the code, updated as work lands. The claim that survives due diligence today is narrow and strong:

> **The only open, runnable, deterministic, reason-coded merchant-reasoning architecture in the agentic-commerce conversation — published as upstream-candidate RFCs, not a walled product.**

## What's next (in flight)

A live pilot with a real merchant (TheCustomHub): a real agent discovers a product, gets a correct quote, and completes a real Stripe checkout — with the out-of-region case declined with a reason instead of a failed cart. Then: promotional stacking semantics (the #1 gap no protocol specs), and tax/restricted-goods semantics (the layer with real legal exposure that nobody covers).

---

**Manifesto:** *Towards a machine-readable merchant — where every visibility, eligibility, price, and fulfillment decision is a contract an agent can read, act on, and explain.*

**Contact:** Rik Banerjee · rikbanerjee007@gmail.com
