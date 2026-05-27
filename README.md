# UCP Retail Semantics Extension Demo

This project is a reference demo for a simple idea:

**UCP is the foundation, but many real retail decisions happen before checkout can even be valid.**

This demo does not attempt to replace or redefine the Universal Commerce Protocol (UCP). Instead, it shows how a merchant can layer richer retail semantics on top of the core UCP model so that an AI shopping agent can reason about visibility, contextual pricing, eligibility, promos, and bulk ordering before handing off to downstream flows.

## Why this exists

Core UCP already provides the broad shape of interoperable commerce:
- merchant discovery
- profile-based capability declaration
- endpoint negotiation
- downstream transaction handoff

What it does not fully model is the pre-checkout decision logic that often determines whether a product can be shown, priced, or purchased in the first place. This project explores that missing extension layer.

It is designed as a communication artifact as much as a technical prototype. It exists to be useful for architecture conversations, protocol discussions, and as a reference path for future upstream proposals.

## Core thesis

A shopping agent often needs to answer questions like these before it can safely proceed:
- Is this item visible to this buyer?
- Is the displayed price valid for this context?
- Does a weekly sale or promotion apply?
- Is this quantity valid for wholesale ordering?
- Does this item require additional qualification such as resale status?
- Is this item available in the buyer's region or fulfillment mode?

Those are not checkout problems alone. They are retail semantics problems. This demo shows how those semantics can be expressed as vendor-scoped extensions on top of UCP.

## What belongs to core UCP

In this project, core UCP means:
- The `/.well-known/ucp` profile
- Merchant identity and endpoint discovery
- Declared capabilities
- Downstream handoff to checkout or transactional flows

## What this demo adds

This project introduces vendor-scoped retail semantics extensions that allow agents to understand complex rules. It demonstrates:
- **Pricing context**: The buyer's region, fulfillment mode, and account qualifications.
- **Eligibility**: Structured reasoning for why an item is hidden, conditional, or blocked.
- **Promo pricing / applied offer state**: Mix-and-match thresholds, sale pricing, and human-readable promo explanations.
- **Bulk pricing**: Minimum order quantities (MOQ), increments, and volume tiers.
- **Fulfillment-aware decisioning**: Restricting products by region or pickup vs. shipping modes.

## Merchant archetypes

The demo uses three distinct merchant archetypes to prove that the same UCP foundation can support drastically different retail models through a consistent extension layer.

### Boutique A
**Purpose:** Discovery-led commerce
- Public and discoverable
- Highly curated, universal DTC items (e.g., Personalized T-Shirt, Ceramic Coffee Mug)
- Easy for agents to understand and recommend
- Not dependent on member pricing or complex qualification rules

### Grocery Retail C
**Purpose:** Contextual offers and fulfillment semantics
- Everyday retail complexity with routine cart behavior
- Public pricing vs. sale pricing with applied offer states (e.g., Honey Nut Cereal, Sparkling Water 12-Pack)
- Pickup, local delivery, and shipping differences
- Region-sensitive availability (e.g., Fresh Organic Bananas)

### Wholesale B
**Purpose:** Quantity and qualification semantics
- Gated access and qualification-sensitive visibility
- Wholesale/industrial items (e.g., Industrial Coffee Beans, Pallet of Mugs, Commercial Espresso Machine)
- Minimum order quantities (MOQ) and quantity increments
- Tiered bulk pricing based on volume

## What the live demo proves

The live application proves that the same core protocol can support radically different retail paradigms. A discovery-led Boutique, an offer-driven Grocery, and a gated Wholesale catalog can all share the same UCP profile concepts, capability structures, and payload vocabulary while outputting entirely different computed outcomes based on user context.

## Current MVP scope

The first version of the demo intentionally focuses on core exploration:
1. **UCP profile viewer**: Inspect merchant capabilities and extensions.
2. **Interactive context simulator**: Change regions, customer types, and fulfillment modes on the fly.
3. **Catalog search**: Browse catalog items that react immediately to context changes.
4. **Cart validation**: Catch MOQ, increment, and eligibility errors before checkout.
5. **Payload inspector**: View both human-readable explanations and raw machine-readable JSON for every decision.

## Example walkthroughs

Run the demo locally and try these scenarios:
- **Boutique Discovery**: A guest user discovers Boutique items and sees a clean, strictly discovery-led payload without irrelevant membership flags.
- **Grocery Offers**: A Grocery item shows a weekly sale price and clearly declares its applied offer state (e.g., "Mix & Match: Buy 3+ for $5 each").
- **Fulfillment Constraints**: A Grocery item changes its availability when the user switches their Market Region or Fulfillment Mode.
- **Wholesale Gating**: A Wholesale item remains entirely hidden or blocked until the user context satisfies specific account qualifications (like a resale certificate).
- **Bulk Pricing Tiers**: A Wholesale cart quantity crosses an MOQ or tier threshold, instantly updating the computed unit price and the explanation payload.

## Why this matters for agentic commerce

If UCP is going to support real-world AI agents, the protocol story cannot stop at discovery and checkout handoff. Merchants need a semantics layer that explains whether an item is visible, whether a price is valid in context, whether a promotion applies, or whether a buyer qualifies at all. 

This project keeps UCP as the foundation and demonstrates how those pre-checkout decisions can be handled cleanly.

## Future directions

The long-term goal is to identify patterns that could eventually be proposed upstream into the broader ecosystem. Future scope may explore:
- Loyalty preview and account-linking states
- Intent capture flows (e.g., WhatsApp routing, lead forms)
- Richer fulfillment constraint engines
- Optional checkout handoff and cart bridging
- Upstream proposal candidates for broader UCP discussion

*(Note: These are future explorations and are not currently active in the demo.)*

## Local development

Run the development server:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.
