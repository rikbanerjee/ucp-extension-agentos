# RetailAgentOS WebMCP Agent Storefront

## Tagline

RetailAgentOS turns merchant policy into a dynamic WebMCP capability boundary, so shopping agents can invoke only the next action a retailer can safely honor.

## Short pitch

RetailAgentOS adds a governed WebMCP layer to retailer-owned websites. Instead of scraping pages or guessing what a merchant can promise, a browser agent receives typed capabilities that change with inventory, pricing, fulfillment, quote rules, and shopper approval. In the live demo, stale inventory blocks a cart, a shopper approves a merchant-valid substitute, WebMCP exposes cart preparation only when the repaired plan is eligible, and checkout is never registered.

## Submission description

RetailAgentOS is the merchant-controlled reasoning layer for agentic commerce. WebMCP is the browser action surface. The browser agent can invoke only the next commerce capability that the retailer can safely honor at that moment.

The canonical demo — the **RetailAgentOS WebMCP Agent Storefront**, linked site-wide as **WebMCP Live Demo** — is at `/webmcp-showcase`; `/agent-ready-storefront` is a compatibility route rendering the same page and pointing its canonical metadata back at `/webmcp-showcase`. Both use focused challenge chrome so a judge can identify, run, understand, and leave the demo without meeting the whole company navigation; every other route keeps the normal RetailAgentOS platform navigation and footer. Three planning capabilities register through `document.modelContext` first. The deterministic engine then changes the available tools as it evaluates inventory, price, fulfillment, policy, and approval. The seven canonical Phase 1 descriptors are `get_storefront_capabilities`, `search_catalog`, `evaluate_shopping_plan`, `find_valid_alternatives`, `apply_plan_repair`, `prepare_validated_cart`, and `request_quote`. `revise_validated_cart` is an optional post-cart extension; no state exposes every tool at once.

Fresh Corner is a controlled fixture. The shopper asks for a weekend breakfast cart under $30 with named Farm Eggs and Artisan Sourdough Bread. Farm Eggs returns `STOCK_STALE`, so cart preparation is withheld. RetailAgentOS offers Cage-Free Eggs, $0.50 more with equivalent local delivery. Only after explicit approval and re-evaluation does `prepare_validated_cart` register; it returns a $15.99 review cart. The optional bread revision returns $24.49 against the $30 budget, with $5.51 remaining. Checkout is never exposed.

TheCustomHub is an authorized controlled quote fixture, not a live backend. Twenty-five black robotics-team shirts (6 Youth Small, 11 Youth Medium, 8 Youth Large) with a one-color front logo reach `QUOTE_REQUIRED`, dynamically exposing `request_quote`. The typed request preserves the $500 shopper budget ceiling and delivery request within 15 days, but returns `fixedPrice: null` and `deliveryPromise: null`; no cart, order, payment, or checkout is created.

Native registration is AbortSignal-owned and cleaned up on reset, scenario switch, and unmount. Guided replay uses the exact same descriptors and gateway handlers; its invocation telemetry is `replay`, while browser execution is `native`. A generalized remote/server MCP is designed, not shipped.

Challenge delivery is recorded by `92753e5`, `d094e12`, `e464bb8`, `d9a5eb5`, `0228160`, `5b1603e`, and `12f8ba0`. This working-tree submission-readiness pass is uncommitted until its owner commits it.

## Links

- Live app (WebMCP Live Demo): https://www.retailagentos.com/webmcp-showcase
- Source: https://github.com/rikbanerjee/ucp-extension-agentos
- Video: add the public native-demo URL after recording; do not submit a placeholder. The site's own "Watch video" action stays hidden until `NEXT_PUBLIC_WEBMCP_VIDEO_URL` holds a real public https URL.
