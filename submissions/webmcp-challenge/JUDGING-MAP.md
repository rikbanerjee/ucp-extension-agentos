# Judging map

The four criteria are equally weighted. The demo and description should supply direct evidence for each one.

## 1. WebMCP leverage

### Claim

RetailAgentOS uses WebMCP as a coherent browser-native commerce workflow, not as a single novelty tool or a wrapper around page clicks.

### Evidence to show

- Four registered tools with bounded JSON Schemas and meaningful descriptions.
- `document.modelContext.registerTool(tool, { signal })` lifecycle.
- Agent discovery and invocation in a supported browser.
- Read-only annotations for search/evaluation and mutation-aware treatment for cart/quote preparation.
- Storefront bridge that converts tool calls into visible page state.
- Structured reason-coded results compact enough for agent use.

### Strongest demo moment

The agent moves from search to evaluation to visible cart preparation while the shopper stays in the same page.

### Risk to eliminate

Feature detection is not tool registration. The current page must be wired to the SDK before recording.

## 2. Execution

### Claim

The project is a complete, understandable mini-product with positive, blocked, and custom-order flows.

### Evidence to show

- Public HTTPS route with no local setup.
- Visible registration state and tool-call timeline.
- Product selection and cart updates agree with tool outputs.
- Clean refusal state with no stale cart.
- Quote reference and explicit merchant-review next step.
- Graceful unsupported-browser behavior.
- Repeatable judge runbook and tests.

### Strongest demo moment

The page visibly prepares the cart, but checkout stays behind a shopper confirmation boundary.

### Risk to eliminate

Do not submit a simulation-only page, broken public repository, or deployment that depends on local memory/state.

## 3. Potential impact

### Claim

Independent retailers need agents to understand real selling constraints, but they cannot each build a custom agent protocol layer.

### Evidence to show

- Specific audience: retailers with personalized, regional, inventory-sensitive, contextual-price, or quote-only catalogs.
- Specific failures prevented: dead-end cart, region-invalid offer, and invented custom price.
- Reusable boundary: catalog and policy adapters feed one deterministic engine and one WebMCP package.
- TheCustomHub-style fixture demonstrates a credible made-to-order use case without overstating a live pilot.

### Strongest demo moment

`REGION_RESTRICTED` blocks an invalid cart with an explanation the shopper can act on.

### Risk to eliminate

Avoid broad claims about Shopify, Etsy, Gemini, or live merchant integrations that are not demonstrated in this build.

## 4. Creativity and ambition

### Claim

Most commerce demos help agents discover or click products. RetailAgentOS treats the retailer's reasoning—eligibility, price, availability, fulfillment, and quote integrity—as the missing machine-readable layer.

### Evidence to show

- “Merchant rules, not agent guesses” framing.
- Deterministic decision engine separated from the browser adapter.
- Positive and negative cases use the same tool and engine.
- Quote path proves agentic commerce can preserve ambiguity honestly instead of hallucinating certainty.
- Architecture can project the same canonical merchant truth to more than one channel.

### Strongest demo moment

The quote tool returns `fixedPrice: null`, turning “I don't know yet” into a safe structured workflow.

### Risk to eliminate

Keep future platform ambition to the closing sentence; spend most of the video proving what works now.

## Suggested opening and closing

- **Opening:** “Shopping agents can find products. They still guess the merchant's rules.”
- **Closing:** “Connect a store once; let agents operate it correctly while the retailer and shopper stay in control.”
