# RetailAgentOS WebMCP Agent Storefront

## Tagline

RetailAgentOS turns merchant policy into a dynamic WebMCP capability boundary, so shopping agents can invoke only the next action a retailer can safely honor.

## Short pitch

RetailAgentOS adds a governed WebMCP layer to retailer-owned websites. Instead of scraping pages or guessing what a merchant can promise, a browser agent receives typed capabilities that change with inventory, pricing, fulfillment, quote rules, and shopper approval. In the live demo, stale inventory blocks a cart, a shopper approves a merchant-valid substitute, WebMCP exposes cart preparation only when the repaired plan is eligible, and checkout is never registered.

## Submission description

RetailAgentOS is the merchant-controlled reasoning layer for agentic commerce. WebMCP is the browser action surface. The browser agent can invoke only the next commerce capability that the retailer can safely honor at that moment.

The agent and the shopper do different jobs, and the whole demo is built around that split. The agent does what software is good at: reading the storefront's registered capabilities, searching the catalog, assembling a plan against a budget and a fulfillment mode, and asking RetailAgentOS to evaluate it. The shopper keeps the part that shouldn't be delegated — judgment. When the engine finds the Farm Eggs inventory stale it neither fails nor quietly substitutes; it proposes Cage-Free Eggs, explains the $0.50 difference and the equivalent local delivery, and stops. A human clicks Approve or Decline. That click is a real gate: never auto-approved, never inferred from the agent's intent, and until it happens `prepare_validated_cart` is not a registered tool at all. Checkout is never registered for anyone — the mission deliberately ends at a cart the shopper reviews and completes themselves.

That division is what makes the experience better than the status quo. Without WebMCP, a shopping agent either scrapes the page and guesses — phantom stock, stale prices, invented delivery promises, carts that die at checkout — or every merchant hand-builds a bespoke, ungoverned integration for each agent that shows up. With it, the shopper gets an agent that can actually finish the errand: a cart that exists only because inventory, price, fulfillment, and the $30 budget were revalidated server-side, a substitution they consciously chose rather than discovered afterward, and a live Mission Control view of every capability that registered and every decision that produced it. The merchant gets a boundary they control rather than a surface being scraped. And the agent gets something far more useful than HTML to parse: a small, typed, revocable set of next safe actions, where the browser's own `registerTool`/`AbortSignal` lifecycle makes "safe" an enforced guarantee instead of a hopeful convention.

The canonical demo — the **RetailAgentOS WebMCP Agent Storefront**, linked site-wide as **WebMCP Live Demo** — is at `/webmcp-showcase`; `/agent-ready-storefront` is a compatibility route rendering the same page and pointing its canonical metadata back at `/webmcp-showcase`. Both use focused challenge chrome so a judge can identify, run, understand, and leave the demo without meeting the whole company navigation; every other route keeps the normal RetailAgentOS platform navigation and footer. Three planning capabilities register through `document.modelContext` first. The deterministic engine then changes the available tools as it evaluates inventory, price, fulfillment, policy, and approval. The seven canonical Phase 1 descriptors are `get_storefront_capabilities`, `search_catalog`, `evaluate_shopping_plan`, `find_valid_alternatives`, `apply_plan_repair`, `prepare_validated_cart`, and `request_quote`. `revise_validated_cart` is an optional post-cart extension; no state exposes every tool at once.

Fresh Corner is a controlled fixture. The shopper asks for a weekend breakfast cart under $30 with named Farm Eggs and Artisan Sourdough Bread. Farm Eggs returns `STOCK_STALE`, so cart preparation is withheld. RetailAgentOS offers Cage-Free Eggs, $0.50 more with equivalent local delivery. Only after explicit approval and re-evaluation does `prepare_validated_cart` register; it returns a $15.99 review cart. The optional bread revision returns $24.49 against the $30 budget, with $5.51 remaining. Checkout is never exposed.

TheCustomHub is an authorized controlled quote fixture, not a live backend. Twenty-five black robotics-team shirts (6 Youth Small, 11 Youth Medium, 8 Youth Large) with a one-color front logo reach `QUOTE_REQUIRED`, dynamically exposing `request_quote`. The typed request preserves the $500 shopper budget ceiling and delivery request within 15 days, but returns `fixedPrice: null` and `deliveryPromise: null`; no cart, order, payment, or checkout is created.

Native registration is AbortSignal-owned and cleaned up on reset, scenario switch, and unmount. Guided replay uses the exact same descriptors and gateway handlers; its invocation telemetry is `replay`, while browser execution is `native`. A generalized remote/server MCP is designed, not shipped.

RetailAgentOS's UCP manifest, deterministic engine, adapter seams, and channel projections predate the challenge. The native browser WebMCP layer and the whole judge-facing experience were built inside the challenge window and are committed on `main`: `92753e5` (browser adapter, descriptor catalog, `packages/webmcp`, controlled gateway), `d094e12` (canonical `/webmcp-showcase` route), `e464bb8` (lifecycle/showcase hardening), `d9a5eb5` (judge-facing UX and native/replay attribution truthfulness), `0228160` (optional post-cart `revise_validated_cart` extension), `5b1603e` (submission-hardening pass and the root Apache-2.0 license), `12f8ba0` (deterministic native approval-to-cart handoff, trusted server-side cart idempotency, unconditional registration-controller cleanup, and recoverable cart-preparation retry), `0b0b71a` (challenge showcase hardening: bounded catalog search ranking and the named $30 breakfast mission), `6a57c09` (structured TheCustomHub quote workflow), and `4790f74` (focused challenge navigation and page identity). `b0550a8` and this pass are documentation/evidence reconciliation, not product changes.

## Links

- Live app (WebMCP Live Demo): https://www.retailagentos.com/webmcp-showcase
- Source: https://github.com/rikbanerjee/ucp-extension-agentos
- Video: https://youtu.be/aIScR90pSb0
