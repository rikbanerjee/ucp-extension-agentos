# Demo video script — target 2:50

The official limit is under three minutes and judges need not watch beyond it. Record a single coherent demo with clear audio. Publish it publicly on YouTube. Use no copyrighted music and include captions.

## 0:00–0:18 — problem and promise

**Visual:** RetailAgentOS challenge storefront hero, native WebMCP status visible.

**Narration:**

> Shopping agents can find product pages, but they still guess whether an item is actually eligible, in stock, correctly priced, shippable, or quote-only. RetailAgentOS gives a retailer's website a WebMCP layer so an agent can use those rules correctly, in the same page the shopper sees.

## 0:18–0:32 — four capabilities

**Visual:** Registered-tool panel showing the four native tools.

**Narration:**

> This page registers four tools: search products, evaluate an offer, prepare a visible cart, and request a custom quote. The tools are native browser capabilities, not scripted button clicks.

## 0:32–1:18 — positive human-agent workflow

**Visual:** Enter the Scenario 1 prompt in the browser agent. Keep the storefront and agent response visible. Let the actual tool timeline populate.

**Narration while calls execute:**

> I ask for a personalized Father's Day shirt under fifty dollars that ships to California, and I tell the agent not to check out. It searches the catalog, then evaluates the exact offer against the merchant's rules. The page selects the product. Now it prepares a cart that appears here for my review. Checkout remains mine to confirm.

**Pause briefly on:** selected product, eligible result, reason/next action, cart, three tool events.

## 1:18–1:53 — refusal is a feature

**Visual:** Enter the Great Britain prompt. Show `REGION_RESTRICTED` and unchanged/no cart.

**Narration:**

> The same product should not be sold into every region. For a Great Britain shopper, the deterministic engine returns `REGION_RESTRICTED`. The agent explains the merchant's decision and does not create a cart. This is the difference between an agent operating the store correctly and an agent merely automating clicks.

## 1:53–2:19 — custom commerce without hallucinated prices

**Visual:** Enter the 25-shirt quote prompt. Show quote reference and `fixedPrice: null`.

**Narration:**

> Made-to-order retail creates another failure mode: agents inventing a price where none exists. Here I request 25 custom team shirts. The tool creates a structured quote request, returns no fixed price, and hands the next step to the merchant.

## 2:19–2:40 — how it works

**Visual:** Split screen or quick cuts: `document.modelContext` registration, gateway, engine decision, visible UI. Keep code readable; highlight only relevant lines.

**Narration:**

> WebMCP owns discovery and invocation. A typed gateway validates each call. RetailAgentOS evaluates the merchant's eligibility, inventory, pricing, fulfillment, and quote rules once, then the agent response and storefront UI consume that same reason-coded decision. There is no model in the commerce decision loop.

## 2:40–2:52 — ambition and close

**Visual:** Return to hero and one-line architecture/outcome.

**Narration:**

> The goal is one connection that makes any retailer-owned storefront agent-ready—without asking the retailer to write protocol code. RetailAgentOS is the reasoning layer for agentic commerce.

## Recording notes

- Keep the final export below 2:55 to leave platform/transcoding margin.
- Use a 16:9 1080p canvas and zoom enough for reason codes and tool names to be legible on mobile.
- Do not speed up the calls so much that judges cannot see the real UI transitions.
- Avoid a long architecture slide; the working product should dominate the video.
- Do not show Etsy logos or imply a live Etsy integration.
- If a tool fails during the take, fix the system and restart the recording rather than editing around it.
