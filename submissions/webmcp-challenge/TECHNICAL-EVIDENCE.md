# Technical evidence

RetailAgentOS is the deterministic merchant-reasoning layer. WebMCP is its native browser action surface at `/webmcp-showcase`; `/agent-ready-storefront` is compatibility-only.

Three planning descriptors register initially through `document.modelContext`: `get_storefront_capabilities`, `search_catalog`, and `evaluate_shopping_plan`. Decision-specific tools are registered and withdrawn dynamically from the seven canonical Phase 1 descriptors; `revise_validated_cart` is an optional post-cart extension, never an eighth Phase 1 tool.

The shared descriptor catalog is `packages/webmcp/src/index.ts`; the controlled gateway is `src/lib/showcase/gateway.ts`. Native execution and guided replay call the same descriptors and handlers. Registration is AbortSignal-owned. Invocation telemetry is explicit per call: `native` for browser execution and `replay` for guided `registration.invoke()`.

Fresh Corner's named Farm Eggs plan reaches `STOCK_STALE` / `REPAIRABLE`; shopper approval is outside the engine; the repaired plan reaches a $15.99 review cart. The optional revision is $24.49 of $30 with $5.51 remaining. Checkout, payment, and order placement are never registered.

TheCustomHub is an authorized controlled fixture, not a live merchant backend. Its structured 25-shirt request preserves black color, youth-size mix, front logo, artwork status, a $500 shopper budget ceiling, and delivery within 15 days requested. It reaches `QUOTE_REQUIRED` / `QUOTE_REQUESTED` with `fixedPrice: null` and `deliveryPromise: null`; no cart, order, payment, or checkout exists. A generalized remote/server MCP remains designed, not shipped.
