# Agent-ready storefront and WebMCP platform — implementation record

## Business objective

Connect a store once so its catalog and selling rules are understandable and safely operable by AI agents across UCP, MCP, WebMCP, feeds, Schema.org, and a human storefront. Retailers should be able to prepare inputs and receive an implementation package without writing protocol code.

## Current repo baseline

- The existing `@retailagentos/engine` is a pure deterministic offer evaluator. It owns eligibility, feasibility, inventory, pricing, quote, trace, and projection decisions.
- The app is Next.js 16.2.6 with an existing browser-local Readiness Studio and static/demonstration surfaces.
- `output/` and `tmp/` were untracked before this work and are intentionally untouched.
- Baseline tests run on 2026-08-29: `npm test` — **486 passed, 22 files passed**.
- Baseline `npm run build` rebuilt `@retailagentos/engine` successfully; the initial Next.js build invocation did not return a final completion result in the available command window. Final verification is required.

## Target architecture

`Commerce systems → canonical tenant/catalog/policy objects → deterministic RetailAgentOS engine → channel projections → UCP, remote MCP, WebMCP, feeds, Schema.org, and human UI`.

The WebMCP SDK is a framework-independent browser delivery adapter. It detects `document.modelContext`, owns registration through `AbortSignal`, delegates requests to an injected gateway, and delegates UI actions to an injected storefront bridge. The local showcase gateway is the application boundary where request validation and injected time occur; it calls the real engine and maps its `DecisionRecord` into compact tool results.

## Boundaries and invariants

- Engine code stays pure: no browser APIs, network, persistence, auth, tenant lookup, analytics, random values, or clock reads.
- Decision facts are calculated once through `evaluateOffer`; WebMCP callbacks and route handlers consume that record.
- WebMCP is optional and experimental. The page remains useful through a clearly labelled interactive simulation when unavailable.
- Mutating operations require idempotency keys; checkout is a user-confirmed handoff only.
- Marketplace bridges do not control marketplace pages or checkout. Etsy support is fixture/contract-only until external approval exists.
- Demo telemetry is optional, injected, and must not contain shopper PII or unverified agent attribution.

## Public interfaces

Planned packages: `@retailagentos/webmcp` for browser-independent tool registration and `@retailagentos/platform-contracts` for tenant, connector, snapshot, policy, deployment, event, and checkout-handoff types.

## Phase checklist

- [x] Phase 0 — grounding, safeguards, baseline record, durable agent instructions.
- [ ] Phase 1 — TODO / intentionally deferred: complete standalone package setup and validation for the WebMCP SDK and platform contracts.
- [x] Phase 2 — local showcase gateway and engine-derived decision tests.
- [x] Phase 3 — owned-storefront and marketplace showcase.
- [ ] Phase 4 — Readiness Studio implementation package.
- [ ] Phase 5 — TheCustomHub integration kit.
- [ ] Phase 6 — Etsy bridge foundation.
- [ ] Phase 7 — documentation and final verification.
- [x] Challenge submission package — paste-ready narrative, implementation gates, demo runbook, timed video script, judging map, technical evidence, and compliance checklist added under `submissions/webmcp-challenge/`.

## Decisions made

- The current WebMCP draft uses `document.modelContext`, not the deprecated `navigator.modelContext`. Registration uses an `AbortSignal` lifecycle; the SDK does not depend on a React hook or third-party polyfill.
- Current browser support is experimental, so native tool registration is never a prerequisite for the showcase.
- The local showcase uses deterministic reference fixtures and clearly marks all merchant and marketplace interactions as simulated.

## Testing matrix

Required: unit tests for detection, schema generation, registration cleanup, abort propagation, unsupported no-op, compaction, tool hints, and platform validation; contract tests for direct-engine equivalence; route integration tests for blocks/idempotency/quotes; existing engine, readiness, projection, guided, lint, and build regression checks.

## External gates

- TheCustomHub live integration requires explicit work in its separate repository and its own credentials/deployment authority.
- Etsy live OAuth, listing sync, webhooks, and commercial access require an approved Etsy app and credentials. No live API calls are attempted here.
- Browser-native WebMCP availability is experimental and browser-dependent.

## Known limitations

No production persistence, authentication, SaaS tenancy, payment session, marketplace control, or external connector is implemented in this repository. The browser showcase must not imply otherwise.

## Current implementation status

Phase 1 is implemented locally as a controlled demonstration, not a production deployment. `packages/webmcp` owns one descriptor catalog for seven tools: capabilities, catalog search, plan evaluation, alternatives, shopper-approved repair, cart preparation, and quote request. It registers the three base tools through `document.modelContext.registerTool(tool, { signal })`, uses separate registration, browser-execution, and storefront-session lifecycle signals, and exposes the same descriptor callbacks for deterministic replay. Successful native registrations—not feature detection—control the native status UI. The workspace package builds independently and its ESM, CommonJS, and declaration artifacts have smoke checks.

Phase 2 is complete locally. `src/lib/showcase/gateway.ts` calls the real engine exactly once per offer evaluation, maps its `DecisionRecord` to compact responses, re-evaluates every cart line, and stores idempotent demo cart results outside the engine. Route handlers expose search, evaluation, cart preparation, and quote requests under `/api/showcase/*`. Inputs are bounded and structured errors are returned. Time is injected at the route boundary. Quote requests never fabricate a price.

`/webmcp-showcase` is the canonical compact Agent Storefront; `/agent-ready-storefront` remains a compatibility route. The client instantiates `createRetailAgentWebMcp`, binds each gateway to a validated server storefront/session identity, displays actual successful registrations in native mode, and disposes registrations on reset, scenario switch, and unmount. Replay is explicitly non-native and executes the exact descriptor callbacks. Fresh Corner and TheCustomHub have separate controlled merchant identities, catalogs, capabilities, versions, policies, decisions, and idempotency scopes. Fresh Corner uses stale Farm Eggs, a valid engine-evaluated Cage-Free Eggs replacement, shopper approval, re-evaluation, and a $15.99 review cart with checkout unavailable. TheCustomHub is a controlled quote-only fixture with `fixedPrice: null`, no cart, no order, and no checkout.

The WebMCP Challenge submission package is complete as documentation, but its readiness audit identified four hard gates: the showcase must call the SDK registration lifecycle and bind tool callbacks to visible UI state; a public HTTPS deployment must be verified; a public repository with a root open-source license is required; and challenge-period WebMCP work must be committed with clear dated evidence. The current page's `document.modelContext` feature detection is not proof of tool registration and must not be presented as such.

## Exact next action for a future agent

Run native browser acceptance on a deployed HTTPS origin: observe actual tool discovery and `toolchange` in ChatGPT/Codex and Chrome (origin trial or local experimental flag), including Fresh Corner approval and decline, TheCustomHub quote, cancellation, and response-header checks. See [`WEBMCP-CHROME-VERIFICATION.md`](./WEBMCP-CHROME-VERIFICATION.md).

## Judge-facing activation pass (2026-08-31)

The showcase was reworked so a first-time visitor can understand and experience it without opening
DevTools, while preserving every invariant above.

- The page now leads with a business outcome ("The browser agent asks. RetailAgentOS checks what
  the retailer can actually promise.") instead of a protocol diagram, with an explicit two-path
  activation panel: "Try with a browser agent" (truthful native-detection status, the shopper
  prompt, and a copy action that never claims to run the agent) and "Watch guided mission" (a
  prominent button available even when native WebMCP is detected, always labelled "Guided replay ·
  Same RetailAgentOS handlers · No external agent").
- `src/app/agent-ready-storefront/storefront-client.tsx` was split into focused components under
  `src/components/showcase/`: `ShowcaseHero`, `MissionLauncher`, `ScenarioSelector`,
  `ShopperApprovalCard`, `MissionTimeline`, `DecisionSummary`, and `DeveloperEvidence` (which also
  carries the collapsed "One decision, multiple channels" WebMCP/UCP/MCP/feeds explainer). The
  orchestrator component keeps state ownership and still calls only the shared `packages/webmcp`
  descriptors and the same-origin `/api/showcase/*` gateway — no commerce logic was duplicated.
  Protocol/registry vocabulary (schema, descriptor, registry parity, provenance envelope) moved
  into progressively-disclosed developer evidence; above-the-fold copy uses retail language (safe
  action, current inventory, valid price, merchant policy, shopper approval, cart for review,
  merchant quote).
- Mission Control is now a business-readable event timeline translating real registration,
  invocation, decision, approval, cart, and quote telemetry into plain language (e.g. "Stale
  inventory prevented cart preparation", "Waiting for shopper approval"), with raw tool
  name/lifecycle/decision-code/source detail collapsed behind a "Show technical detail" toggle.
  Checkout is always shown as withheld. Nothing here is a hard-coded success sequence — every row
  is driven by an actual `WebMcpTelemetryEvent`.
- **Native-vs-replay telemetry fix (`packages/webmcp/src/index.ts`)**: the SDK previously set a
  single module-level `source` flag to `'native'` the moment `document.modelContext` was found
  during `register()`, and never changed it again — so a guided-mission call made through
  `registration.invoke()` would be mislabeled `native` telemetry on any browser that merely
  supported WebMCP, even though no external agent invoked it. `WebMcpToolDescriptor.execute` now
  accepts an explicit, per-invocation `source` option: the guided `invoke()` path always passes
  `source: 'replay'`; a real browser calling the registered descriptor directly never sets that
  option, so an omitted value means native. There is no shared mutable flag for invocation
  telemetry, so concurrent native and guided calls cannot mislabel each other (registration events
  — `registered`/`unregistered` — still correctly reflect whether `document.modelContext` is
  present, since dynamic phase-tool registration genuinely happens through the real API when
  available, independent of who triggered the transition).
- **TheCustomHub delivery-window fix (`src/lib/showcase/gateway.ts`)**: `evaluatePurchasePlan()`
  previously blocked *every* non-empty `requestedDeliveryWindow` with `DELIVERY_WINDOW_UNSUPPORTED`
  before checking whether the line needed a quote — so a correctly-behaving agent asking for
  TheCustomHub's September 15 delivery got an incorrect dead end instead of `QUOTE_REQUIRED`. The
  gateway now evaluates lines first: a quote-only line lets `QUOTE_REQUIRED` win, and the requested
  date is carried forward as a `DELIVERY_WINDOW_MERCHANT_CONFIRMATION_REQUIRED` (`CONDITION`)
  reason — never converted into a promised date or a fabricated price. A fixed-price line with an
  unverifiable prose delivery window is still blocked with `DELIVERY_WINDOW_UNSUPPORTED`, unchanged.
- TheCustomHub's primary label no longer reads "Not live" (which read to reviewers as "broken").
  The scenario card now reads "Controlled quote workflow · Send customization and delivery
  requirements for merchant review without inventing a price," with the full disclosure —
  "Authorized controlled fixture. No live TheCustomHub catalog, quote, cart, or order API is called
  in this showcase." — preserved in the expanded developer evidence, unambiguously distinguishing
  "functionally live as a controlled WebMCP demonstration" from "merchant backend integration is
  not live."
- Added: two new native-vs-replay labeling tests plus a native/guided result-equivalence test in
  `packages/webmcp/src/index.test.ts`; four new gateway tests (TheCustomHub quote-with-delivery-date,
  fixed-price unsupported-window regression, decline-creates-no-cart) in
  `src/lib/showcase/gateway.test.ts`; an 11-case fake-`document.modelContext` integration harness in
  `src/app/agent-ready-storefront/storefront-client.test.tsx` (new `jsdom` + `@testing-library/react`
  dev dependencies, wired through a per-file `// @vitest-environment jsdom` override and
  `vitest.setup.ts` — the default `node` environment and coverage config for `src/lib/rules` are
  unchanged). Full suite: 520/520 passing (up from the 486 baseline). `npx tsc --noEmit`, ESLint on
  every changed file, `@retailagentos/webmcp`'s `tsup` build, and `next build` (Turbopack, all 39
  routes) all complete cleanly as of this pass.

## Last verified results

2026-08-31 — The package workspace is explicitly installed and `@retailagentos/webmcp` emits ESM, CommonJS, and declaration artifacts. Its SDK normalizes omitted browser execution options and combines browser cancellation with an independent storefront-session lifecycle signal. Controlled Fresh Corner and TheCustomHub fixtures are server-bound, have separate catalogs, versions, policies, sessions, decisions, and idempotency namespaces. The page renders actual native registrations only after registration succeeds and shows browser-observed parity when `getTools()` is available. Native-vs-replay telemetry now carries an explicit per-invocation source instead of a capability-inferred flag, and TheCustomHub's requested-delivery-date line reaches `QUOTE_REQUIRED` instead of an unsupported-window dead end. Focused SDK, gateway, and component-integration tests pass (520/520 full suite); `tsc --noEmit`, lint, the package build, and `next build` all complete successfully. Native ChatGPT/Codex and deployed Chrome verification remain external browser checks, not claims made by this record.

## Optional post-cart revision extension (2026-08-31)

RetailAgentOS ships an optional, additive extension after the primary approval-to-$15.99-cart judge
journey: `revise_validated_cart`. It is documented and implemented as an extension **added after**
Phase 1, never as an eighth canonical tool — `packages/webmcp/src/index.ts` now exports
`CANONICAL_PHASE_1_TOOLS` (the historical seven, unchanged), `OPTIONAL_CART_REVISION_TOOLS`
(`['revise_validated_cart']`), and `ALL_WEBMCP_TOOLS` (their union). `CANONICAL_TOOLS` is kept as a
back-compat alias of `CANONICAL_PHASE_1_TOOLS` so existing imports keep working unchanged.

- **Registration lifecycle.** The SDK accepts `enableCartRevision` at construction. When true (and
  only when the injected gateway implements `reviseValidatedCart`), entering the `cart_prepared`
  phase registers `revise_validated_cart` in the same pass that withdraws `prepare_validated_cart`;
  leaving `cart_prepared` (reset, scenario switch, unmount, or a fresh registration cycle)
  unregisters it through the same `AbortController`-based lifecycle as every other phase tool. It is
  never registered before a cart exists, during the repair/approval gate, or for TheCustomHub — the
  showcase only ever passes `enableCartRevision: scenario === 'fresh'`, and the browser gateway only
  attaches `reviseValidatedCart` for the `fresh-corner` storefront id, so TheCustomHub's gateway
  object never carries the method even if a future change flipped the flag.
- **Deterministic pipeline.** `src/lib/showcase/gateway.ts#reviseCart` never edits a cart directly.
  It verifies the cart reference, storefront, storefront session, `expectedRevision`, and expiry
  against trusted server-side stored state (`ShowcaseStores.cartsByReference`), recovers the original
  shopper constraints (budget, substitutions, delivery window, buyer context), re-evaluates the
  proposed final line set through the same `evaluatePurchasePlan` used everywhere else, and only then
  prepares a replacement cart at `revision + 1`. Idempotency keys are namespaced per revision request
  and a reused key with different input is rejected (`IDEMPOTENCY_KEY_REUSED`); a reused key with
  identical input returns the identical prior result. Structured failures — `CART_NOT_FOUND`,
  `CART_EXPIRED`, `STOREFRONT_MISMATCH`, `CONTEXT_MISMATCH`, `CART_REVISION_CONFLICT` — never replace
  the currently visible valid cart.
- **Route.** `POST /api/showcase/carts/revise` (`src/app/api/showcase/carts/revise/route.ts`) mirrors
  the existing cart-prepare route: it parses bounded JSON, resolves the storefront/session from
  request headers, calls the gateway, and returns structured RetailAgentOS results with no internal
  stack traces. No decision logic lives in the route.
- **Judge-facing UX.** `src/components/showcase/CartRevisionPanel.tsx` renders a visually secondary,
  dashed-border panel below the primary $15.99 cart: "Optional: See RetailAgentOS govern a cart
  revision," the exact native-agent prompt with a copy button, and a "Watch guided cart revision"
  button always labelled "Guided replay · Same RetailAgentOS handlers · No external agent" when a
  guided invocation is in flight or has completed — never claiming a guided call is native. Nothing
  runs automatically. On success the primary cart panel transitions to the revised line set/total and
  the panel shows previous vs. revised totals, remaining budget, fulfillment, and cart revision
  number; on a withheld/repair-required/quote-required outcome the previously valid cart is left
  untouched and the panel explains why. `src/components/showcase/DeveloperEvidence.tsx` gained a
  progressively-disclosed "Optional extension evidence" block (schema, registration/invocation
  observed, previous/revised cart reference+revision, and the four false checkout/order/payment
  flags) that only appears once the extension has actually been registered or invoked.
- **Verified controlled result.** Revising the $15.99 Fresh Corner cart to keep 1× Cage-Free Eggs and
  raise Artisan Sourdough Bread to 2× lands on total $24.49, remaining budget $0.51 (of $25.00),
  `fulfillment: LOCAL_DELIVERY`, cart revision 2, and `checkoutAvailable`/`checkoutStarted`/
  `orderPlaced`/`paymentInitiated` all `false` — confirmed both via a direct `/api/showcase/carts/revise`
  curl round trip through the running dev server and via a live Chrome walkthrough of the guided path
  (approve substitute → $15.99 cart → optional panel → guided cart revision → $24.49 revised cart).
- **Tests added.** `src/lib/showcase/gateway.test.ts` (revision-1 start, successful revision math,
  idempotent retry, reused-key-different-input rejection, unknown/mismatched/expired/stale-revision
  rejections, over-budget withholding without cart replacement, schema-level rejections, no
  checkout/order/payment on success); `packages/webmcp/src/index.test.ts` (historical seven unchanged,
  extension absent pre-cart/pre-approval/when disabled/when the gateway lacks the method, registers
  only after cart preparation and withdraws `prepare_validated_cart`, native vs. guided labeling under
  concurrency, schema `additionalProperties: false`, reset aborts the registration); a new
  `storefront-client.test.tsx` fake-`document.modelContext` suite (extension registers only after cart
  exists and never for TheCustomHub, a genuine native call against the registered callback reaches
  $24.49 and shows `Invocation source: native` in developer evidence, reset tears the registration
  down, guided cart revision is reachable via the same button/label contract). Full suite: 545/545
  passing (up from the 520 baseline). `tsc --noEmit`, ESLint on every changed file, the
  `@retailagentos/webmcp` `tsup` build, and `next build` (Turbopack, all 40 routes including the new
  `/api/showcase/carts/revise`) all complete cleanly as of this pass.

## Exact next action for a future agent (cart-revision extension)

Extend the native/deployed Chrome acceptance pass already tracked above
(`WEBMCP-CHROME-VERIFICATION.md`) to include a real WebMCP-capable browser agent driving
`revise_validated_cart` end-to-end on the deployed origin, and capture that alongside the existing
Fresh Corner approval/decline and TheCustomHub quote checks.
