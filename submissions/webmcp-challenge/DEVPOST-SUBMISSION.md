# Paste-ready Devpost submission

Replace every bracketed placeholder only after the referenced asset is public and verified. Remove this instruction before submitting.

## Project name

RetailAgentOS — The Agent-Ready Storefront

## Tagline

Let shopping agents use a retailer's real catalog and selling rules—without guessing or taking control from the shopper.

## Short elevator pitch

RetailAgentOS adds a WebMCP layer to retailer-owned websites. Instead of scraping buttons and product text, an AI agent receives four safe storefront tools: search products, evaluate an offer against current merchant rules, prepare a visible cart for review, and request a quote when a product should not have an invented price. Every decision comes from a deterministic commerce engine and includes a reason code the agent can explain.

## Submission description

### The problem

Product discovery is not the same as commerce readiness. A shopping agent may find a shirt, but it still needs to know whether that exact product is available to this shopper, whether it ships to the shopper's region, whether the displayed price applies, whether inventory is available, and whether a made-to-order item requires a quote.

Most retailer websites encode those answers in UI flows and backend conditions that only appear late in checkout. Agents are forced to infer, scrape, or fail. That creates dead-end carts, wrong prices, and poor customer experiences—especially for independent retailers whose catalogs include personalization, regional limits, or call-for-price products.

### What RetailAgentOS does

RetailAgentOS makes a retailer-owned storefront directly usable by a browser agent through WebMCP. On the challenge storefront, a person can ask an agent to:

- find a personalized shirt that matches a shopping request;
- evaluate the offer against the retailer's current eligibility, inventory, pricing, fulfillment, and quote rules;
- explain a policy block instead of attempting an invalid purchase;
- prepare a visible cart for the shopper to review; and
- request a structured merchant quote without fabricating a fixed price.

The agent works in the same page the shopper can see. Product selection and cart preparation update the storefront UI. Checkout remains a separate, user-confirmed handoff.

### Why WebMCP is the right fit

WebMCP changes the website from a visual surface an agent must interpret into a structured capability surface the site itself controls. Tool names, descriptions, JSON Schemas, and responses give the agent an explicit contract. At the same time, execution remains in the retailer's page, reuses the site's application logic, and can keep the human visibly in the loop.

That combination is essential for commerce. A remote catalog API alone does not provide shared page context or visible cart collaboration. Browser automation alone is brittle and may bypass business meaning. WebMCP lets the retailer publish safe actions while RetailAgentOS supplies the deterministic reasoning behind those actions.

### The human-and-agent experience

The demo proves three complementary paths:

1. **Eligible purchase preparation:** The agent searches, checks the offer, selects the product in the page, and prepares a visible cart. The shopper reviews it; the agent does not silently check out.
2. **Policy-aware refusal:** The same product is evaluated for a restricted region. The engine returns `REGION_RESTRICTED`, the agent explains the reason, and no cart is created.
3. **Honest custom commerce:** The agent requests 25 custom team shirts. RetailAgentOS returns `QUOTE_REQUESTED` with `fixedPrice: null`, preserving the merchant's quote workflow instead of inventing a price.

### How it was built

The browser layer registers four tools on `document.modelContext` using an `AbortSignal` lifecycle:

- `search_products`
- `evaluate_offer`
- `prepare_cart`
- `request_quote`

The WebMCP package is React-independent. Tool callbacks delegate to an injected gateway, while an injected storefront bridge performs visible UI actions. The local showcase gateway validates bounded inputs, injects time at the application boundary, calls the real `@retailagentos/engine`, and maps its `DecisionRecord` into compact agent-facing results.

The engine is deliberately separate from WebMCP. It contains no browser API, network call, tenant lookup, random value, or implicit clock read. WebMCP does not recalculate commerce decisions: the browser UI, API routes, and agent response all consume the same decision record. Cart preparation re-evaluates every line and requires an idempotency key. Quote requests never manufacture a fixed price.

### What is new for the challenge

RetailAgentOS existed before the challenge as an open deterministic merchant-reasoning engine and spec playground. During the challenge period, it was meaningfully extended with:

- the `@retailagentos/webmcp` browser SDK;
- four WebMCP commerce tools and JSON Schemas;
- browser feature detection and abort-owned registration;
- a storefront bridge for visible human-agent collaboration;
- a challenge gateway and four bounded API routes;
- an owned-storefront WebMCP showcase with positive, blocked, and quote scenarios; and
- marketplace-bridge documentation that clearly distinguishes owned-site capabilities from Etsy-controlled checkout.

Evidence: [LINK TO COMPARE VIEW OR CHALLENGE COMMITS].

### Impact and next step

RetailAgentOS is designed as a reusable layer for retailers, not a one-store demo. An owned storefront can bind the same four capabilities to its own catalog and cart while preserving its selling rules. The longer-term product direction is a managed onboarding service: connect a catalog once, define policies without code, and project the same merchant truth to WebMCP and other agent channels.

This challenge version intentionally focuses on the hardest proof: agents should not merely find products; they should use merchant rules correctly and know when not to transact.

## Challenges we ran into

- Keeping WebMCP as an additive delivery layer instead of moving business decisions into browser callbacks.
- Returning compact results that are useful to an agent while retaining human-readable reason codes.
- Making cart preparation useful without crossing the shopper-confirmation boundary.
- Supporting call-for-price merchandise without allowing the agent to hallucinate a price.
- Demonstrating a marketplace path honestly: Etsy can be a connector and checkout handoff, but a third party cannot inject WebMCP into Etsy's origin.

## Accomplishments we are proud of

- Four tools form a coherent shopping workflow rather than four unrelated API examples.
- The positive path and refusal path use the same deterministic engine.
- A blocked request visibly stops before cart creation and explains why.
- Custom orders preserve a real merchant workflow with `fixedPrice: null`.
- The browser layer degrades gracefully outside a WebMCP-enabled browser without pretending the fallback is native agent invocation.

## What we learned

WebMCP is most valuable when it exposes application meaning, not just DOM actions. In commerce, “click Add to cart” is less useful than “evaluate whether this offer is valid for this shopper, then prepare a reviewable cart if it is.” The strongest tool boundary combines a stable schema, deterministic business logic, visible UI state, and an explicit human confirmation point.

## What's next

- Package retailer onboarding so merchants can map catalogs and policies without writing WebMCP code.
- Add authenticated multi-tenant hosting, connector sync, and privacy-safe tool analytics.
- Turn the TheCustomHub reference design into a separately authorized live merchant pilot.
- Build marketplace connectors that hand shoppers back to marketplace-controlled checkout.

## Technologies

WebMCP, TypeScript, Next.js 16, React 19, Vitest, JSON Schema, UCP concepts, deterministic commerce rules

## Required links

- Live app: [PUBLIC HTTPS URL]/agent-ready-storefront
- Public repository: [PUBLIC GITHUB, GITLAB, OR BITBUCKET URL]
- Challenge commit or compare view: [PUBLIC COMMIT HISTORY URL]
- Demo video: [PUBLIC YOUTUBE URL]
- Testing instructions: [PUBLIC REPOSITORY URL]/blob/[COMMIT]/submissions/webmcp-challenge/DEMO-RUNBOOK.md

## Suggested Devpost gallery captions

1. **Agent-ready storefront:** A shopper and agent work in the same visible product and cart experience.
2. **Merchant rules, not agent guesses:** `REGION_RESTRICTED` stops an invalid cart with an explainable reason.
3. **Custom commerce without invented prices:** The agent creates a quote request and receives `fixedPrice: null`.
4. **One decision, multiple surfaces:** WebMCP tools and the human UI consume the same deterministic RetailAgentOS decision.
