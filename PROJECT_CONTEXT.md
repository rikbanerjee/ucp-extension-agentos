# PROJECT_CONTEXT.md

## Project
UCP Retail Semantics Extension Demo

## Why this exists
This project is part of a broader learning journey into agentic commerce and the Universal Commerce Protocol (UCP).

The goal is **not** to create a competing protocol.
The goal is to explore and demonstrate how UCP can be extended with richer retail semantics that many real merchants need before checkout can be valid.

## Strategic thesis
Core UCP is the foundation.
It already covers the broad protocol shape: profile discovery, endpoint declaration, capability negotiation, and transaction-oriented interoperability.

This project explores an extension layer on top of that foundation.
The extension layer focuses on retail decision semantics that are often under-modeled in standard commerce flows.

## Core idea
An AI shopping agent often needs to answer questions *before* checkout:
- Is this product visible to this buyer?
- Is the displayed price valid for this user context?
- Does the user qualify for member pricing?
- Is the quantity valid for wholesale ordering?
- Is the item restricted by fulfillment mode or region?
- Is a non-payment handoff more appropriate than checkout?

This project exists to make those pre-checkout semantics concrete.

## What belongs to core UCP
In this project, core UCP means:
- `/.well-known/ucp` profile
- merchant identity and endpoint discovery
- declared capabilities
- extension-friendly capability model
- downstream handoff to checkout or transactional flows

## What this project adds
This project introduces vendor-scoped retail semantics extensions such as:
- `com.ezyupload.shopping.pricing_context`
- `com.ezyupload.shopping.eligibility`
- `com.ezyupload.shopping.member_pricing`
- `com.ezyupload.shopping.bulk_pricing`
- `com.ezyupload.shopping.loyalty`
- `com.ezyupload.shopping.intent_capture`
- `com.ezyupload.shopping.fulfillment_constraints`

These extensions are intended to show how context-aware retail logic can fit on top of UCP without redefining the protocol.

## Current MVP scope
The first version of the demo intentionally focuses on four pillars:
1. UCP profile viewer
2. Interactive context simulator
3. Catalog search with extension-aware results
4. Cart validation with MOQ and eligibility logic

This limited scope is deliberate.
It is enough to prove the extension thesis clearly without prematurely building a flashy storefront or an oversized demo.

## Future scope
The app should later be able to support:
- loyalty preview and account-linking states
- fulfillment constraints explorer
- intent capture flows such as WhatsApp or lead forms
- optional checkout handoff
- diff views between user contexts
- richer capability negotiation behaviors
- more merchant types and more realistic product catalogs

## Merchant archetypes
The demo should always support at least two merchant archetypes.

### Boutique merchant
Purpose:
- demonstrate discovery-led commerce
- public price plus member teaser price
- simple fulfillment options
- eventual intent-capture flow

### Wholesale merchant
Purpose:
- demonstrate MOQ
- demonstrate quantity increments
- demonstrate tiered pricing
- demonstrate wholesale/member-gated visibility
- demonstrate qualification-sensitive access

## Why two merchants matter
The entire point of this project is to show that the same UCP foundation can support very different retail models when a consistent extension layer is added.

A boutique merchant and a wholesale merchant should feel different in behavior, but they should still fit the same architectural story:
- same UCP profile concept
- same capability-oriented structure
- same extension vocabulary
- different computed outcomes based on context

## Key concepts in this repo

### PricingContext
The active context that determines which retail rules apply.
Examples:
- customer type
- membership tier
- region
- tax exempt state
- resale certificate on file
- fulfillment mode
- account-linked state

### Eligibility
A structured explanation of whether an item, price, or action is allowed.
It should support statuses like:
- eligible
- conditionally eligible
- ineligible
- unknown

It should also include:
- reasons
- requirements
- human-readable messaging
- machine-readable codes

### MemberPricing
The logic that distinguishes:
- public price
- member price
- hidden-until-qualified price
- savings amount / percent
- who is allowed to see which price state

### BulkPricing
The logic that distinguishes:
- minimum order quantity
- quantity increments
- tier thresholds
- selected unit price based on quantity

### Loyalty
Not necessarily implemented in MVP, but planned.
This includes:
- account linked vs not linked
- earn preview
- redeem eligibility
- member benefit summary

### IntentCapture
Not necessarily implemented in MVP, but planned.
This covers non-payment commerce outcomes such as:
- WhatsApp handoff
- lead form submission
- assisted sales callback
- inquiry flow

### FulfillmentConstraints
Not necessarily implemented in MVP, but planned.
This includes:
- supported modes
- region restrictions
- pickup-only behavior
- local delivery conditions
- lead times
- manual quote requirements

## Experience goals
This app is not just a technical prototype.
It is also a communication artifact.
It should be useful for:
- public posts
- architecture discussion
- protocol discussion
- product screenshots
- future upstream proposals

The user should be able to see both a human-readable view and a raw machine-readable payload view.

## UX principles
- Show the same decision in human and JSON form.
- Make context changes immediately visible.
- Make eligibility explanations easy to understand.
- Make the difference between core UCP and extension semantics unmistakable.
- Optimize for explainability over feature volume.

## Engineering principles
- Strong typing
- Local mock data first
- Business rules separate from UI
- Deterministic demo behavior
- Modular architecture that future coding agents can extend safely
- Easy path from mock functions to real API routes

## Current non-goals
This project does not currently aim to be:
- a production UCP server
- a real Google integration
- a live checkout flow
- a full loyalty platform
- a full fulfillment engine
- a merchant admin console

## Contribution intent
This project is a learning vehicle and a reference implementation path.
The long-term goal is to identify extension patterns that could eventually be proposed upstream into the broader UCP ecosystem.

## Short summary for future coding agents
When in doubt, preserve these truths:
1. This project extends UCP; it does not replace UCP.
2. The first version should focus on four pillars only.
3. The codebase must remain ready for future loyalty, fulfillment, and intent-capture work.
4. Boutique and wholesale scenarios are both required.
5. Human-readable reasoning and raw payload visibility are equally important.
