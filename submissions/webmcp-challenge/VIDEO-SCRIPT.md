# Native WebMCP demo script — target 2:50

Record native browser invocation as the primary proof. Guided replay is only a labelled fallback.

- **0:00–0:15:** “Shopping agents often guess inventory, prices, fulfillment, and merchant policy. RetailAgentOS is the reasoning layer; WebMCP is the browser action surface.”
- **0:15–0:30:** Show the three native planning capabilities discovered through `document.modelContext`.
- **0:30–0:55:** Paste the canonical weekend-breakfast prompt from the showcase.
- **0:55–1:15:** Show Farm Eggs reach `STOCK_STALE` / `REPAIRABLE`; cart preparation is withheld.
- **1:15–1:30:** Show Cage-Free Eggs, the $0.50 difference, equivalent local delivery, and shopper approval.
- **1:30–1:45:** Show `prepare_validated_cart` register before the repair result returns, then the $15.99 review cart.
- **1:45–1:55:** Show checkout was never registered.
- **1:55–2:15:** Switch to TheCustomHub; show the 25 configured black shirts, delivery within 15 days requested, `QUOTE_REQUIRED`, `request_quote`, `fixedPrice: null`, and `deliveryPromise: null`.
- **2:15–2:35:** Show dynamic registration, registry parity, and native/replay handler parity.
- **2:35–2:50:** “The agent sees only the next action the retailer can safely honor.”

Keep the export below 2:55. Do not imply a live TheCustomHub backend, remote MCP, payment, order, or checkout. Publish the final recording before inserting its public URL into submission fields.
