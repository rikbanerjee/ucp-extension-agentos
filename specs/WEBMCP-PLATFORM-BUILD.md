# Agent-ready storefront and WebMCP platform — implementation record

## Business objective

Connect a store once so its catalog and selling rules are understandable and safely operable by AI agents across UCP, MCP, WebMCP, feeds, Schema.org, and a human storefront. Retailers should be able to prepare inputs and receive an implementation package without writing protocol code.

## Current submission status (2026-09-02)

This is the single authoritative summary of what is shipped, verified, and still unshipped. Every
other document (`README.md`, `AGENTS.md`, `CLAUDE.md`, `src/lib/content/buildlog.ts`,
`submissions/webmcp-challenge/*`) must agree with this section — if one of them contradicts this,
this file wins and the other should be corrected. The per-pass sections further down this file are
**historical records**: each describes the state at the moment that pass was written, and several of
them say "uncommitted" because that was true then. This section, not those sections, describes the
current state.

### Shipped and committed on `main`

Everything below is committed on `main` as of `b0550a8`. Nothing in the WebMCP delivery is sitting
uncommitted in a working tree.

- **Native `document.modelContext` registration and invocation at `/webmcp-showcase`** — the
  canonical route — confirmed live against a real `document.modelContext` in Chrome (native
  `registerTool`/`executeTool`), not feature detection alone.
- **`/agent-ready-storefront` compatibility route** rendering the same single showcase component and
  pointing its canonical metadata at `/webmcp-showcase`.
- **Seven canonical Phase 1 WebMCP descriptors** — `get_storefront_capabilities`, `search_catalog`,
  `evaluate_shopping_plan`, `find_valid_alternatives`, `apply_plan_repair`, `prepare_validated_cart`,
  `request_quote` — with three planning tools registered initially and the rest registered
  dynamically as the engine permits.
- **Optional post-cart `revise_validated_cart` extension**, registered only after a Fresh Corner cart
  exists. It is not part of the original seven-tool Phase 1 catalog.
- **Native/replay handler parity**: guided replay calls the identical descriptors and gateway
  handlers, with per-invocation `source` attribution (`native` for real browser execution, `replay`
  for `registration.invoke()`).
- **`AbortSignal`-owned registration lifecycle**, cleaned up on reset, scenario switch, and unmount.
- **Deterministic post-approval handoff**: every next-phase tool is registered and awaited *before*
  the triggering tool's `execute()` returns, with per-tool generation tokens so a deferred cleanup can
  never remove a newer same-named registration.
- **Cross-agent guided recovery**: explicit, shopper-click-only, always tagged `source: 'replay'`,
  single-flight guarded, and never described as native WebMCP.
- **Trusted server-side cart idempotency**: a second, decision-scoped layer (`cartsByDecision`) in
  `ShowcaseGateway.prepareCart` with a canonical order-independent line fingerprint, independent of
  the unchanged caller-supplied-idempotency-key cache.
- **Recoverable failed cart preparation**: a failed or cancelled attempt that produced no cart
  releases the single-flight lock and offers an explicit, never-automatic retry.
- **Fresh Corner breakfast mission**: the $30 named Farm Eggs journey — `STOCK_STALE`, shopper
  approval of Cage-Free Eggs, a $15.99 review cart, and an optional $24.49 revision leaving $5.51.
- **Structured TheCustomHub quote workflow**: the typed 25-shirt configuration reaching
  `QUOTE_REQUIRED` / `QUOTE_REQUESTED` with `fixedPrice: null` and `deliveryPromise: null`.
- **Focused challenge navigation and page identity**: route-specific challenge header/footer chosen
  once in `AppShell.tsx`, shared canonical metadata for both routes, judge anchors, and a global
  "WebMCP Live Demo" link.
- **Public YouTube demonstration video** (see below).

### Published video

- **URL**: https://youtu.be/aIScR90pSb0
- **Runtime**: 2:56, manually verified on YouTube — inside the challenge's "less than three minutes"
  limit.
- The application reads the production video URL through `NEXT_PUBLIC_WEBMCP_VIDEO_URL`; the "Watch
  video" action renders only when that variable holds a real absolute `https:` URL. No placeholder
  remains anywhere in the submission surfaces.
- **Configured and live**: as of 2026-09-02 the deployed
  `https://www.retailagentos.com/webmcp-showcase` page renders the "Watch video" action pointing at
  the URL above, so `NEXT_PUBLIC_WEBMCP_VIDEO_URL` is already set in the production deployment.
  Configuring it is no longer outstanding work.

### Deployed and natively accepted

- The public application is live at https://www.retailagentos.com/webmcp-showcase.
- **Deployed-origin native acceptance: passed.** On 2026-09-02 the maintainer ran the full
  walkthrough against the deployed origin in **ChatGPT's in-app browser** and reported the journey
  completing as designed. The production deployment under test was `5257759`.
- This is a maintainer-reported result, recorded here on their report rather than re-derived by a
  tool: the browser run happened outside this repository and cannot be reproduced from it. Anyone
  restating it should attribute it the same way, and should re-run the walkthrough after any change
  to the registration lifecycle, the gateway, or the showcase route rather than relying on this
  record indefinitely.

### Designed, not shipped

- A generalized remote/server MCP integration path.
- Production authentication.
- General production persistence and multi-tenancy.
- Rate limiting.
- Real payment, checkout, and order placement — checkout is never registered as a tool.
- Live TheCustomHub backend integration.

### Controlled fixtures

- **Fresh Corner** is a controlled fictional fixture.
- **TheCustomHub** is an authorized controlled quote fixture, not a live backend. It returns
  `fixedPrice: null` and never creates a cart, payment, order, or checkout. No live TheCustomHub
  catalog, quote, cart, or order API is called.

### Test baseline

**610/610 passing across 32 test files**, measured on 2026-09-02 during this documentation
reconciliation pass. `npx tsc --noEmit`, targeted ESLint on the changed files,
`@retailagentos/engine`, `@retailagentos/platform-contracts`, `@retailagentos/webmcp`, and the root
`next build` all complete cleanly. Earlier counts quoted in the per-pass sections below (562, 568,
573, 576) are **historical** records of those passes, not the current baseline.

### Provenance

RetailAgentOS's UCP manifest and specs, its deterministic engine, the external/client adapter seams,
and the channel projections all **predate** the WebMCP Challenge. The native browser WebMCP layer and
the entire judge-facing experience were built during the challenge window (Aug 25–Sep 3, 2026):

| Commit | What it added |
|---|---|
| `92753e5` | Browser adapter, canonical seven-tool descriptor catalog, `packages/webmcp`, controlled gateway. |
| `d094e12` | Canonical `/webmcp-showcase` route and purchase-plan documentation. |
| `e464bb8` | WebMCP lifecycle/showcase hardening and explicit lifecycle evidence. |
| `d9a5eb5` | Judge-facing UX rework and native-vs-replay attribution truthfulness fixes. |
| `0228160` | Optional post-cart `revise_validated_cart` extension. |
| `5b1603e` | Submission-hardening pass (grouped Mission Control telemetry, completed approval sequence, cart-state-aware Decision Summary, canonical Farm Eggs title/unit, 320px layout fix) plus the root Apache-2.0 `LICENSE`. |
| `12f8ba0` | Deterministic native approval-to-cart handoff. Also carries the trusted server-side cart idempotency (`cartsByDecision`), the unconditional `dispose()`/`performCleanup()` controller abort with proactive stale-generation cleanup, and the recoverable guided-fallback retry path — i.e. both the "native handoff hardening" and "correctness-gap closure" passes documented below were committed together in this commit. |
| `0b0b71a` | WebMCP challenge showcase hardening: bounded catalog search ranking with fixture-supplied aliases, the named $30 Farm Eggs breakfast mission, guided-progress feedback, and submission-document consolidation. |
| `6a57c09` | Structured TheCustomHub quote workflow. |
| `4790f74` | Focused challenge navigation and page identity for the WebMCP Live Demo. |
| `b0550a8` | Documentation/evidence reconciliation recording `4790f74` — not a product change. |

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
- [x] Phase 1 — standalone package setup and validation for the WebMCP SDK and platform contracts. `packages/webmcp` and `packages/platform-contracts` are installed workspace packages with their own `package.json`/build; `packages/webmcp` builds via `tsup` to ESM/CommonJS/declaration artifacts and is covered by `packages/webmcp/src/index.test.ts`. Resolved — see "Current submission status" above.
- [x] Phase 2 — local showcase gateway and engine-derived decision tests.
- [x] Phase 3 — owned-storefront and marketplace showcase.
- [ ] Phase 4 — Readiness Studio implementation package.
- [ ] Phase 5 — TheCustomHub integration kit.
- [ ] Phase 6 — Etsy bridge foundation.
- [ ] Phase 7 — documentation and final verification.
- [x] Challenge submission package — paste-ready narrative, implementation gates, demo runbook, timed video script, judging map, technical evidence, and compliance checklist added under `submissions/webmcp-challenge/`.
- [x] Submission-hardening pass — grouped Mission Control telemetry, completed approval sequence,
  cart-state-aware Decision Summary copy, canonical Farm Eggs title/unit, unit×line-total display,
  320px footer overflow fix, judge-facing README restructure, and this documentation reconciliation.
  See "Submission-hardening pass (2026-09-01)" below.

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

No production persistence, authentication, SaaS tenancy, payment session, marketplace control, or external connector is implemented in this repository. The browser showcase must not imply otherwise. A generalized remote/server MCP integration path is designed, not shipped. TheCustomHub's live catalog/quote/cart/order backend is not connected — the scenario is a controlled fixture, functionally live only as a WebMCP demonstration.

## Historical audit findings — resolved

These were real gaps identified by earlier reviews. Each is now fixed and verified; kept here as a
record rather than under "Known limitations" so a future reader does not have to re-discover that
they were once true.

- **(2026-08-31 readiness audit)** The showcase's `document.modelContext` feature detection was not
  proof of tool registration, and was flagged as such. Resolved: the page now calls the SDK
  registration lifecycle and displays actual registered-tool results — verified against a real
  `document.modelContext` (native `registerTool`/`executeTool`) in Chrome, not feature detection.
- **(2026-08-31 readiness audit)** A public HTTPS deployment, a public repository with a root
  open-source license, and dated challenge-period commit evidence were required. Resolved: `LICENSE`
  (Apache-2.0) is present at the repo root, package metadata was added, and challenge-period commits
  are itemized in "Challenge provenance" in `README.md`.
- **(code review, submission-hardening pass)** Fresh Corner's native-mission delivery-window prompt
  could dead-end on `DELIVERY_WINDOW_UNSUPPORTED` instead of reaching the intended
  `REPAIRABLE`/`STOCK_STALE` path — a caller passing a fulfillment-mode phrase through
  `requestedDeliveryWindow` instead of the dedicated `fulfillmentMode` field. Resolved with the
  explicit `fulfillmentMode` enum and updated tool-schema descriptions (see "Judge-facing activation
  pass" below).
- **(code review, submission-hardening pass)** The stale-inventory age rendered to a judge as an
  absurd ~1.7-billion-second duration (the shared mock catalog's `dataFetchedAt: 1000`, one second
  after the Unix epoch, read against a real injected `now`). Resolved: the controlled fixture's
  `dataFetchedAt` is rebased onto the showcase's injected `now` so the snapshot reads a credible,
  deterministic 300 seconds old against its 60-second TTL — still always `STOCK_STALE`.
- **(code review, this pass)** Mission Control could show repeated identical rows (e.g. three
  identical "planning tools registered" rows) because each of a registration wave's tools fires its
  own raw telemetry event. Resolved: `MissionTimeline.tsx` groups consecutive same-wave
  `registered`/`unregistered` events into one business-readable row ("WebMCP exposed 3 planning
  capabilities"); the raw per-event log in Developer Evidence is untouched.
- **(code review, this pass)** The shopper-approval card disappeared the instant Approve was clicked,
  and the Decision Summary kept showing stale `ELIGIBLE`/"ready to prepare" copy after a cart already
  existed. Resolved: `ShopperApprovalCard.tsx` now shows a completed "Approved by shopper" state
  followed by a real, telemetry-driven "Cart preparation unlocked" step and correctly attributed
  native/guided invocation; `DecisionSummary.tsx` now prefers the gateway's own
  `CART_PREPARED`/`CART_REVISED` `code`/`nextAction` once a cart exists.
- **(code review, this pass)** "Farm Eggs" was split across a product title and a bare "Dozen" variant
  title, which made the showcase's `quantityUnit` lookup (a `title.includes('Egg')` heuristic) miss it
  and mislabel it "each". Resolved with one canonical, self-contained title ("Farm Eggs, dozen") and
  an explicit per-variant `quantityUnits` map in the fixture, replacing the substring heuristic.
- **(code review, this pass)** The revised cart showed a bare total for a quantity-2 line with no unit
  price. Resolved: unit price × line total is now shown whenever quantity > 1
  (`src/lib/showcase/cartLineDisplay.ts`).
- **(code review, this pass)** The footer overflowed horizontally at a 320px viewport (the bottom
  developer-links `nav` row had no wrap). Resolved by making that row wrap.

## Current implementation status

Phase 1 is implemented locally as a controlled demonstration, not a production deployment. `packages/webmcp` owns one descriptor catalog for seven tools: capabilities, catalog search, plan evaluation, alternatives, shopper-approved repair, cart preparation, and quote request. It registers the three base tools through `document.modelContext.registerTool(tool, { signal })`, uses separate registration, browser-execution, and storefront-session lifecycle signals, and exposes the same descriptor callbacks for deterministic replay. Successful native registrations—not feature detection—control the native status UI. The workspace package builds independently and its ESM, CommonJS, and declaration artifacts have smoke checks.

Phase 2 is complete locally. `src/lib/showcase/gateway.ts` calls the real engine exactly once per offer evaluation, maps its `DecisionRecord` to compact responses, re-evaluates every cart line, and stores idempotent demo cart results outside the engine. Route handlers expose search, evaluation, cart preparation, and quote requests under `/api/showcase/*`. Inputs are bounded and structured errors are returned. Time is injected at the route boundary. Quote requests never fabricate a price.

`/webmcp-showcase` is the canonical compact Agent Storefront; `/agent-ready-storefront` remains a compatibility route. The client instantiates `createRetailAgentWebMcp`, binds each gateway to a validated server storefront/session identity, displays actual successful registrations in native mode, and disposes registrations on reset, scenario switch, and unmount. Replay is explicitly non-native and executes the exact descriptor callbacks. Fresh Corner and TheCustomHub have separate controlled merchant identities, catalogs, capabilities, versions, policies, decisions, and idempotency scopes. Fresh Corner uses stale Farm Eggs, a valid engine-evaluated Cage-Free Eggs replacement, shopper approval, re-evaluation, and a $15.99 review cart with checkout unavailable. TheCustomHub is a controlled quote-only fixture with `fixedPrice: null`, no cart, no order, and no checkout.

The WebMCP Challenge submission package is complete as documentation. The four hard gates an earlier
readiness audit identified against it (SDK registration lifecycle bound to visible UI state, a
verified public HTTPS deployment, a public repository with a root open-source license, and
dated challenge-period commit evidence) are resolved — see "Historical audit findings — resolved"
above.

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
  TheCustomHub's requested-within-15-days delivery requirement got an incorrect dead end instead of `QUOTE_REQUIRED`. The
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
  raise Artisan Sourdough Bread to 2× lands on total $24.49, remaining budget $5.51 (of $30.00),
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

## Submission-hardening pass (2026-09-01)

A code review of the challenge-period WebMCP work (`92753e5`, `d094e12`, `e464bb8`, `d9a5eb5`,
`0228160`) surfaced a top-ten backlog of correctness and polish gaps. This pass addressed the six
that were genuine bugs or missing tests (the other four in the original backlog were the LICENSE/
package-metadata/approval-text/product-title fixes from an earlier pass on this same branch). None
of it touches `@retailagentos/engine`'s decision logic — every fix is presentation, telemetry
grouping, or a fixture-layer correction.

1. **Grouped Mission Control telemetry.** `src/components/showcase/MissionTimeline.tsx` now groups
   consecutive raw `registered`/`unregistered` events that share the same lifecycle, previous/next
   state, and registry delta (i.e. the same registration "wave") into a single business-readable row
   — "WebMCP exposed 3 planning capabilities" instead of three duplicate rows, "WebMCP exposed 2
   repair capabilities" / "WebMCP withdrew 2 repair capabilities" instead of two. Grouping is
   presentation-only: the `events` array passed to `DeveloperEvidence.tsx` (which renders
   `JSON.stringify(events, null, 2)`) is never touched, so every raw event is still visible there.
2. **A real approval → cart-capability → cart sequence.** `src/components/showcase/ShopperApprovalCard.tsx`
   now shows a completed "Approved by shopper" state (instead of disappearing) followed by an
   explicitly attributed sequence: Human approval → WebMCP lifecycle registration ("Cart preparation
   unlocked") → RetailAgentOS validation → Browser agent / guided replay invocation. The middle step
   is derived from RetailAgentOS's own decision status (`decision.status === 'ELIGIBLE'`, or a cart
   already existing) rather than the raw `registered` lifecycle event, because that event only fires
   when a native `document.modelContext` exists (see `packages/webmcp/src/index.ts`'s `transition()`)
   — keying off the event instead would never show "unlocked" in guided-replay-only mode. The final
   step reads the real `invoked` telemetry event's `source` field, so it always says "native" or
   "guided replay," never a UI click mislabeled as an invocation. Uses `aria-live="polite"`.
3. **`CART_PREPARED`/`CART_REVISED`-aware Decision Summary.** `DecisionSummary.tsx` now accepts a
   `cartOutcome` prop — the authoritative `code`/`nextAction` straight from the `prepare_validated_cart`/
   `revise_validated_cart` gateway response (already computed by the gateway; never recalculated in
   React) — and shows it once a cart exists, instead of the underlying plan decision's now-stale
   `ELIGIBLE`/"ready to prepare" text.
4. **Canonical Farm Eggs title/unit.** The shared mock catalog splits "Farm Eggs (Stale Data Demo)"
   (product) from "Dozen" (variant) — fine for its own callers, but the showcase's `searchProducts`
   `quantityUnit` lookup used a fragile `variant.title.includes('Egg')` heuristic that missed the
   un-overridden "Dozen" title and mislabeled it "each." `src/lib/showcase/fixture.ts` now overrides
   the variant title to one canonical, self-contained "Farm Eggs, dozen" (matching the existing
   `canonicalSourdough` pattern) and `src/lib/showcase/gateway.ts` reads quantity units from an
   explicit `ShowcaseStorefront.quantityUnits` map instead of the substring heuristic. Shared display
   strings live in the new `src/lib/showcase/productDisplay.ts`, imported by both the fixture and
   `ScenarioSelector.tsx`'s pre-mission product preview — not hardcoded twice.
5. **Unit price × line total.** `src/lib/showcase/cartLineDisplay.ts` is a small pure formatter
   (unit-tested) that shows `$8.50 × 2 = $17.00` whenever a cart line's quantity is greater than 1,
   used by both the primary cart display in `storefront-client.tsx` and the revised-cart panel in
   `CartRevisionPanel.tsx`. The unit price always comes from the gateway response; the only math
   performed is `unit price × quantity` for display, never used to decide anything.
6. **320px footer overflow.** The footer's bottom developer-links `nav` row
   (`src/components/layout/Footer.tsx`) had no `flex-wrap`, so at a 320px viewport it forced the page
   320px wider than the viewport. Fixed by wrapping that row. Confirmed both the regression (pre-fix:
   `scrollWidth` 324px against a 320px viewport) and the fix (post-fix: no overflow) via a same-origin
   iframe sized to exactly 320×568 (a real, independent viewport/containing block for CSS/media-query
   purposes — see Delivery Report for the exact tool-level verification, since this environment's
   window-resize floor was ~500px and could not itself reach a true 320px OS window).

**Tests added/updated.** `src/lib/showcase/cartLineDisplay.test.ts` (new, 4 cases); a new grouping
test plus an updated existing one in `src/app/agent-ready-storefront/storefront-client.test.tsx`; a
new approval-sequence/decision-copy integration test in the same file; `src/components/showcase/DecisionSummary.test.tsx`
(new, 4 cases); two new Farm-Eggs/Sourdough quantity-unit cases in `src/lib/showcase/gateway.test.ts`;
`src/lib/content/webmcpDeliveryContent.test.ts` updated for the new top build-log entry. Full suite:
**562/562 passing** (up from the 550/550 baseline this pass started from). `npx tsc --noEmit` clean.
Targeted ESLint on every changed file: clean. `packages/webmcp`'s `tsup` build: clean (ESM, CommonJS,
and declaration artifacts emitted). `next build` (Turbopack, all routes including `/webmcp-showcase`
and `/agent-ready-storefront`): clean. Manual QA: no horizontal overflow at 320×568, 375×812, or
1920×1080; a real overflow (768×1024, in the site header, unrelated to the footer fix and outside
this pass's scope) was found and is noted under "Known limitations" for a future pass. No console
errors or hydration warnings during a full native `document.modelContext` walkthrough in Chrome
(Fresh Corner: evaluate → stale-inventory repair → shopper approval → `CART_PREPARED` → `revise_validated_cart`
→ `CART_REVISED`, $24.49 total, $5.51 remaining budget) against the local dev server — this was
**not** verified against the deployed `https://www.retailagentos.com` origin; that remains the exact
next action below.

## Exact next action for a future agent (submission-hardening pass)

1. Repeat the native `document.modelContext` acceptance walkthrough above against the deployed
   `https://www.retailagentos.com/webmcp-showcase` origin once these changes are committed and
   deployed (this pass only verified against a local dev server).
2. The 768×1024 header horizontal-overflow bug noted above is fixed in the native-handoff-hardening
   pass below (`NavBar.tsx`'s `md:` → `lg:` breakpoint change).
3. This pass's changes are committed as `5b1603e` on `main` — the evidence commit lists in
   `README.md`, `src/lib/content/buildlog.ts`, and this file's "Current submission status" section
   have been updated accordingly.

## Native handoff hardening pass (2026-09-01)

*Historical record. At the time of writing this pass was uncommitted on the
`webmcp-native-handoff-hardening` branch; it has since been **committed to `main` as `12f8ba0`**. See
"Current submission status" for the present state.*

**Root cause.** `packages/webmcp/src/index.ts`'s `apply_plan_repair` handler deferred its full state
transition — `if (outcome.defer) void queueTransition(outcome.nextState);` — via a `setTimeout(0)`
chain, so `execute()` returned the repair result to the calling browser agent *before*
`prepare_validated_cart`'s `registerTool()` call (and the browser's own tool-change notification for
it) had necessarily completed. Codex Browser completed the native flow anyway (apparently by
rediscovering the newly registered tool on its own); a separate ChatGPT browser-agent run stopped
right after the shopper clicked Approve, leaving `RetailAgentOS validation: Pending` and
`Browser agent / guided replay invocation: Pending` with no further messages sent. This was a genuine
cross-agent continuation-timing weakness, not evidence the native flow is universally broken.

**Fix.** `activatePhase()` (replacing the old `transition()`/`queueTransition()` split) always
registers and awaits every next-phase tool before returning from the triggering tool's `execute()`
call; only the superseded phase's cleanup — including the currently-executing tool's own registration
— is deferred to a following tick via `scheduleCleanup()`. Per-tool generation tokens (`toolGeneration`,
`phaseGeneration`) mean a late deferred cleanup can never remove a same-named tool a newer transition
has since re-registered. Registration failure aborts only the partially-created next-phase controller,
removes only the tools it added, preserves the previous valid state, and returns a truthful
`REGISTRATION_FAILED` result — no "unlocked" capability is ever shown for a failed registration. Native
and guided (`registration.invoke()`) execution still call the identical descriptor/gateway handlers,
and `source: 'native'`/`'replay'` attribution is unchanged (no shared mutable "current source" flag).

`apply_plan_repair`'s successful result now also carries a top-level continuation contract —
`status: 'APPLIED'`, `code: 'REPAIR_APPLIED'`, `decisionId`, `allowedNextActions:
['prepare_validated_cart']`, `nextAction`, and `cartCreated`/`checkoutAvailable`/`checkoutStarted`/
`orderPlaced: false` — alongside the preserved nested `decision`/`repair`/`lines` fields, using the
actual engine/gateway decision (no recomputation in WebMCP or React).

`ShopperApprovalCard.tsx`'s completed sequence is reordered to the true chronology — Human approval →
WebMCP capability ("Cart preparation registered") → `prepare_validated_cart` invocation (native/guided/
waiting) → RetailAgentOS validation ("Cart revalidated and prepared" / "Waiting for cart preparation")
— and the approval click itself never marks the invocation step done. `storefront-client.tsx` now
tracks the WebMCP capability step from a real `prepare_validated_cart` `registered` lifecycle event
(falling back to the decision-authority signal only for guided-only sessions, which never emit
registration lifecycle events at all) instead of the decision status alone, which could arrive before
registration in the native case.

A cross-agent recovery state appears only once the capability is genuinely registered, no invocation
or cart exists, and ~5s have elapsed: a "waiting" message, then a "paused" message with a copyable
continuation prompt and an explicit "Guided fallback · Same RetailAgentOS handler · External browser
agent paused" button — always `source: 'replay'` through `registration.invoke()`, never automatic, and
disabled the instant any invocation begins or a cart exists (single-flight guarded via an in-memory
ref, not a `Date.now()`-based key, so a resuming native agent and a fallback click cannot both prepare
a cart). The recovery timer is cancelled by reset, scenario switch, or unmount (a `useEffect` dependent
on the derived "waiting" condition and `generation`).

Separately: `packages/platform-contracts`'s `tsup` build was silently inheriting the root Next.js
tsconfig's `incremental: true` and failing its declaration build (`error TS5074`); its
`tsup.config.ts` now points at its own `tsconfig.build.json` (`incremental: false`, `composite: false`).
`NavBar.tsx`'s desktop nav/CTA and mobile hamburger/drawer now switch at the `lg` breakpoint instead
of `md`, fixing the 768×1024 overflow noted in the prior pass without ever showing both navigation
systems at once.

**Tests added.** `packages/webmcp/src/index.test.ts` gained a `describe` block (7 new tests) covering:
a controllable fake `ModelContext` that holds `prepare_validated_cart`'s `registerTool()` pending and
asserts `apply_plan_repair`'s `execute()` does not resolve until it settles, then that
`prepare_validated_cart` is immediately invocable with no `settleRegistry()` call and returns
`CART_PREPARED` with checkout/order/payment still unavailable; stale-generation cleanup cannot remove
a newer same-named registration; registration failure preserves the previous valid state and never
exposes an unlocked capability; declined approval never exposes `prepare_validated_cart`; reset during
a pending approval cancels safely; and guided replay still completes end to end tagged `source:
'replay'`. All prior tests (including the existing "defers phase-tool removal until after an executing
repair returns" test) pass unmodified against the new implementation.

**Verification.**
- `git diff --check`: clean (no whitespace errors).
- `npm test`: **568/568 passing** (29 files), up from the 562/562 baseline.
- `npx tsc --noEmit`: clean.
- Targeted ESLint on every changed/new file (`packages/webmcp/src/index.ts`,
  `packages/webmcp/src/index.test.ts`, `packages/platform-contracts/tsup.config.ts`,
  `src/components/layout/NavBar.tsx`, `src/app/agent-ready-storefront/storefront-client.tsx`,
  `src/app/agent-ready-storefront/storefront-client.test.tsx`,
  `src/components/showcase/ShopperApprovalCard.tsx`): clean.
- Full `npm run lint`: exits with 14 pre-existing errors / 59 pre-existing warnings, none in any file
  this pass touched (all in `src/app/sandbox/*`, `src/lib/rules/*`, `src/lib/trace/*`, and similar
  pre-existing areas) — **not** clean, and not claimed to be.
- `npm run build -w @retailagentos/engine`: clean.
- `npm run build -w @retailagentos/platform-contracts`: clean (previously failing with `TS5074`; ESM,
  CommonJS, and declaration artifacts now all emit).
- `npm run build -w @retailagentos/webmcp`: clean.
- `npm run build` (root, which also rebuilds `@retailagentos/engine` then runs `next build`): clean —
  all 39 routes compiled, including `/webmcp-showcase` and `/agent-ready-storefront`; Google Fonts were
  reachable in this run.
- Browser acceptance: verified via `claude-in-chrome` against a local dev server only — no independent
  Codex Browser or ChatGPT in-app browser session was available in this environment, so this pass does
  **not** claim to have reproduced or fixed the original cross-agent report on that specific host; the
  fix is verified at the unit-test level (the exact registration-timing scenario described in the
  report) and via `claude-in-chrome`.
- Deployment: not verified against `https://www.retailagentos.com` — that remains outstanding, as does
  independent QA on a real Codex Browser / ChatGPT in-app browser session.

## Exact next action for a future agent (native handoff hardening pass)

1. Independently verify the exact cross-agent report (approve → native agent continues → cart appears)
   against a real Codex Browser and/or ChatGPT in-app browser session — this pass could only verify the
   registration-timing fix at the unit-test level and via `claude-in-chrome`.
2. Repeat the native `document.modelContext` acceptance walkthrough against the deployed
   `https://www.retailagentos.com/webmcp-showcase` origin.
3. ~~Commit this pass's changes and update the evidence commit lists in `README.md`,
   `src/lib/content/buildlog.ts`, and this file's "Current submission status" section with the real
   commit hash.~~ Done: committed to `main` as
   [`12f8ba0`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/12f8ba0).

## Correctness-gap closure pass (2026-09-01)

*Historical record. At the time of writing this pass was still uncommitted on the
`webmcp-native-handoff-hardening` branch; it has since been **committed to `main` as `12f8ba0`**,
together with the native-handoff-hardening pass above. See "Current submission status" for the
present state.*

The native-handoff-hardening pass's own report flagged four items as incomplete; this pass closes all
four. It does not change the successful registration-before-return architecture from that pass.

**1. Server-side cart-preparation idempotency (was: client-side single-flight lock only).**
`ShowcaseGateway.prepareCart` (`src/lib/showcase/gateway.ts`) now has two independent idempotency
layers. The pre-existing layer — a cache keyed by `storefrontId:storefrontSessionId:cart:<caller's
idempotency key>` — is unchanged, and stays the first check (a retried call with the *same* key
short-circuits to the identical prior response). A new second layer, `cartsByDecision`, is keyed by
`storefrontId:storefrontSessionId:cart-by-decision:<decisionId>` (`decisionId` already embeds
`storefrontId`/`storefrontSessionId`) and stores a canonical, order-independent line fingerprint
alongside the resulting `CartResponse`. Effect: a native WebMCP call and a guided-fallback replay
racing to prepare a cart for the *same eligible decision and lines*, each minting its own idempotency
key, now converge on the exact same stored cart reference — before this pass, two different caller
keys would have produced two different `demo-cart-*` references for the identical decision, since the
old layer's cart reference is derived from the caller's own key. A decisionId reused with lines that
don't match is rejected with a bounded error; in practice this is `DECISION_MISMATCH` from the
*pre-existing* `requireDecision` per-decision lines check, which fires first — because `decisionId`
already 1:1-encodes the exact lines it was evaluated for (see `decision()`'s decisionId construction:
`${storefrontId}:${storefrontSessionId}:${now}:${lines.map(l => `${l.productId}-${l.quantity}`).join
('_')}`), a mismatched-lines request for a *real* decisionId is structurally unreachable past that
existing guard. The new layer's own `CART_PREPARATION_CONFLICT` is therefore a defense-in-depth
integrity check on `cartsByDecision` itself (e.g. against a future decisionId-construction change that
loses that 1:1 property) — `gateway.test.ts` exercises it directly, by constructing a gateway over a
`stores` object that already holds a deliberately inconsistent `cartsByDecision` entry, since the
natural collision path is otherwise unreachable through the public API. No checkout, order, or payment
behavior changes. Tests: `gateway.test.ts`'s `describe('prepareCart — decision-scoped idempotency
(native/guided-fallback convergence)')` block (3 tests: convergence across different caller keys, the
pre-existing DECISION_MISMATCH guard confirmed still bounded, and the new layer's own integrity check).

**2. Dispose-during-pending-cleanup (was: a captured superseded controller could be silently
skipped).** Before this pass, `dispose()` only aborted the *current* phase/base/session controllers;
a phase transition's *superseded* controller — captured by `scheduleCleanup`'s closure, awaiting its
`setTimeout(0)` tick on `cleanupChain` — was left untouched if `dispose()` ran first, because the
deferred callback's own `if (disposed) return;` guard sat *before* the abort call. `packages/webmcp/
src/index.ts` now tracks every not-yet-cleaned-up generation in a `pendingCleanups` map (keyed by
generation number) and routes all cleanup — the normal deferred-tick path, dispose, and (new, see
item 3) a proactive same-name-collision path — through one function, `performCleanup(generation)`,
which always aborts the controller *first, unconditionally*; only the telemetry emission and
`activeTools`/`toolGeneration` bookkeeping *after* that abort are suppressed once disposed (dispose
already clears that bookkeeping itself, for every tool, right after). `dispose()` now also clears
`toolGeneration`, not just `activeTools`. Test: "disposing immediately after a next-phase
registration, before its deferred cleanup tick fires, still aborts the superseded controller and
leaves the fake native registry completely empty" — a fake `ModelContext` that only removes a name
from its own registry when the registration's `AbortSignal` actually fires; the test disposes strictly
before the `setTimeout(0)` tick and asserts the fake registry's own tracked name set (not just this
SDK's `registeredTools`) is completely empty, then advances past the tick to confirm nothing resurfaces.

**3. Stale-cleanup test replaced with a real transition (was: a same-state no-op transition that
never exercised cleanup at all).** The old test drove `repairable -> repairable` (`evaluate_shopping_
plan` twice with the same REPAIRABLE-producing input) — but `activatePhase` short-circuits a same-tool-
set transition as a no-op (`oldTools.join('|') === newTools.join('|')`), so `scheduleCleanup` was never
even called; the test asserted nothing about actual cleanup behavior. The replacement drives the real
sequence the task specifies: REPAIRABLE → approved `apply_plan_repair` → ELIGIBLE (registers
`prepare_validated_cart`, `find_valid_alternatives`/`apply_plan_repair`'s cleanup scheduled but not yet
ticked) → an immediate re-evaluate back to REPAIRABLE, *before* that first cleanup's `setTimeout(0)`
tick fires — re-registering `find_valid_alternatives`/`apply_plan_repair` while their prior generation
is still technically active. This exposed a genuine race: without a fix, `activatePhase` would call
`registerTool` for a name a real strict host still considers registered. The fix (also item 2's
`performCleanup`) is now invoked *proactively and synchronously* from `activatePhase`, right before
registering a tool whose name collides with a still-pending stale generation — safe because a name
collision only occurs when that whole stale generation is, by construction, being superseded by the
current transition. The test uses a fake `ModelContext` whose `registerTool` throws
`DUPLICATE_REGISTRATION:<name>` if the name is already in its own active set (mirroring a real
strict WebMCP host), and only frees a name when that registration's `AbortSignal` fires. It asserts:
no duplicate-registration error is thrown; the newest `apply_plan_repair`/`find_valid_alternatives`
registrations survive; the stale cleanup removed only the superseded `prepare_validated_cart`; and
`registeredTools` agrees exactly with the fake registry's own tracked set and with
`getNativeToolNames()`.

**4. Fallback failure is now recoverable (was: a failed guided-fallback attempt permanently disabled
retry).** Before this pass, `cartInvocationSource` — set the instant a `prepare_validated_cart`
`invoked` telemetry event fires, *before* the outcome is known — was used both to attribute who
invoked the tool *and* to gate re-invocation (`guidedFallbackDisabled`, and `runGuidedFallback`'s own
early-return guard). A failed attempt still fires `invoked`, so `cartInvocationSource` stayed truthy
forever after a single failure, permanently disabling the "Guided fallback" button — and separately,
`recoveryWaiting`'s `!cartInvocationSource` condition meant the whole recovery banner (including any
retry affordance) would have disappeared the instant an attempt was made, success or not.
`storefront-client.tsx` now tracks a distinct `cartPreparationState` (`idle | invoking | failed |
prepared`), set from telemetry (`invoked` → `'invoking'`; `failed`/`cancelled` → `'failed'`, releasing
the client single-flight lock) and from `onCart` (a truthy `result.cart` → `'prepared'`, locking
permanently; a null `result.cart` on an otherwise-completed call → `'failed'`, releasing the lock — the
decision was no longer eligible by the time RetailAgentOS revalidated it). The single-flight guard
(`cartPreparationInFlightRef`/`guidedFallbackDisabled`) and `runGuidedFallback`'s own guard now key off
this state and `cart`, never off `cartInvocationSource` alone. `ShopperApprovalCard.tsx` renders a new,
independent "Cart preparation failed" banner (separate from the pre-invocation `recoveryPhase` waiting/
timeout banner, which would otherwise read `'none'` once any invocation — including a failed one — has
happened) showing the failed attempt's own truthful `code`/`nextAction` (from the gateway response, or
the WebMCP telemetry event's `error` for a thrown/cancelled attempt) with an explicit "Retry guided
cart preparation" button — never triggered automatically. Test (full integration, `storefront-client.
test.tsx`): a stubbed `/api/showcase/carts/prepare` fails on its first call only; the test drives
REPAIRABLE → native `apply_plan_repair` approval → waits for the real ~5s recovery timeout → clicks
"Guided fallback" (fails, truthful error shown, button re-enabled, nothing retried automatically) →
clicks "Retry guided cart preparation" (succeeds against the real route handler) → asserts exactly 2
`prepare_validated_cart` POSTs occurred and the cart is shown.

**Verification.**
- `git diff --check`: clean (no whitespace errors).
- `npm test`: **573/573 passing** (29 files), up from 568/568 (5 new tests: 2 in `gateway.test.ts`,
  2 in `packages/webmcp/src/index.test.ts` replacing 1 removed weak test net +1, and 1 in
  `storefront-client.test.tsx`).
- `npx tsc --noEmit`: clean.
- Targeted ESLint on every changed/new file this pass (`src/lib/showcase/gateway.ts`,
  `src/lib/showcase/gateway.test.ts`, `src/lib/showcase/fixture.ts`, `packages/webmcp/src/index.ts`,
  `packages/webmcp/src/index.test.ts`, `src/app/agent-ready-storefront/storefront-client.tsx`,
  `src/app/agent-ready-storefront/storefront-client.test.tsx`,
  `src/components/showcase/ShopperApprovalCard.tsx`): clean.
- Full `npm run lint`: 14 errors / 59 warnings, identical count to the native-handoff-hardening pass's
  baseline and in the same pre-existing files (`src/app/sandbox/*`, `src/lib/rules/*`,
  `src/lib/trace/*`, `src/lib/extensions/__tests__/*`, and similar) — none in any file this pass
  touched. Not clean overall, and not claimed to be.
- `npm run build -w @retailagentos/engine`: clean.
- `npm run build -w @retailagentos/platform-contracts`: clean.
- `npm run build -w @retailagentos/webmcp`: clean.
- `npm run build` (root): clean — all 39 routes compiled, including `/webmcp-showcase` and
  `/agent-ready-storefront`.
- Browser acceptance: this pass ran unit/integration tests only (Vitest + Testing Library, including a
  full `storefront-client.tsx` render/interaction test for item 4) — no `claude-in-chrome` or native
  Codex Browser/ChatGPT in-app browser QA was performed in this pass. Do not read this section as
  claiming real-browser verification beyond what the native-handoff-hardening pass already recorded.
- Deployment: not verified against `https://www.retailagentos.com` — unchanged from the prior pass.

## Exact next action for a future agent (correctness-gap closure pass)

1. Independently verify items 1 and 4 (idempotency convergence, fallback-retry UX) against a real
   Codex Browser and/or ChatGPT in-app browser session — this pass verified them at the unit/
   integration-test level only.
2. ~~Commit this pass's changes and update the evidence commit lists in `README.md`,
   `src/lib/content/buildlog.ts`, and this file's "Current submission status" section with the real
   commit hash.~~ Done: committed to `main` as
   [`12f8ba0`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/12f8ba0), together with the
   native-handoff-hardening pass; all three evidence lists carry that hash.
3. Repeat the deployed-origin acceptance walkthrough from the prior pass's next-action list.

## Judge-facing navigation and page-identity pass (2026-09-02)

**Problem.** The showcase carried the whole company IA. A judge landing on `/webmcp-showcase` met a
five-dropdown Product / Solutions / Developers / Evidence / About header and a four-column corporate
footer whose dominant message was UCP; the page's own identity was a one-line eyebrow, its only
in-page anchor was `#mission-launcher` (unreferenced by any navigation), and there was no compact
business comparison a retail executive could read in under a minute. Conversely a judge who browsed
anywhere else on the site had no visible way back: the demo was buried in the Developers dropdown as
"WebMCP implementation". No behavior was wrong — the *framing* was.

**What changed (chrome).** `src/components/layout/AppShell.tsx` — already the single place route
shape is decided — now also chooses the chrome: `isShowcaseRoute(pathname)` swaps `NavBar`/`Footer`
for a new `ShowcaseHeader`/`ShowcaseFooter` on `/webmcp-showcase` and `/agent-ready-storefront`.
Because exactly one header and one footer component is selected, the two systems can never both
render; every other route is byte-for-byte unchanged. No route group, no nested layout, and no
second showcase component: both routes still render the one `storefront-client.tsx` instance, so
nothing in the WebMCP registration lifecycle moved. The focused header carries RetailAgentOS
identity, a text-only "OpenAI WebMCP Challenge" badge (no endorsement claim, no OpenAI mark), Run
Demo / How It Works / Developer Evidence / GitHub, and Back to RetailAgentOS; it switches to a
single accessible menu button at the same `lg` breakpoint `NavBar` uses. The compact footer states
"RetailAgentOS is the merchant reasoning layer. WebMCP is the browser action surface." and links
WebMCP Live Demo, Source Code, Build Log, Technical Evidence, `/agents.md`, and Back to
RetailAgentOS — UCP stays available in developer documentation and on the rest of the site.

**What changed (identity and sequence).** The hero now reads eyebrow ("OPENAI WEBMCP CHALLENGE ·
LIVE IMPLEMENTATION") → product label ("RetailAgentOS WebMCP Agent Storefront") → outcome headline →
supporting copy → a compact action group ("Start the 90-second demo", "View source", and a
conditional "Watch video"). The primary CTA only scrolls to the mission launcher; it never starts
native WebMCP or guided replay. A new `WhyWebMcp.tsx` section sits between the live mission and
Developer Evidence, contrasting ordinary browser automation with RetailAgentOS + WebMCP in two
short columns. The redundant "RetailAgentOS · WebMCP retail mission" strip lost its duplicate
identity line (the header carries it now) and keeps the Reset control.

**Global discoverability.** `developerLinks.ts` renames "WebMCP implementation" to "WebMCP Live
Demo" (sourced from `showcaseChrome.ts`, so the Developers dropdown, the footer Developers column,
and the homepage gateway all follow), and `NavBar.tsx` gains a compact "WebMCP Live Demo" pill
beside — never instead of — the existing "See it work" CTA, mirrored in the mobile drawer. Measured
at the `lg` breakpoint the desktop bar is 930px of content in 960px of available width: no wrap, no
overflow.

**Anchors, metadata, video.** Judge anchors are `#webmcp-mission` (renamed from `mission-launcher`
rather than duplicated), `#why-webmcp`, and `#developer-evidence` — each `tabIndex={-1}`,
`aria-labelledby`-named, and carrying `.showcase-anchor` (`scroll-margin-top: 5rem`) so the sticky
header cannot cover it. Navigation is plain fragment navigation: no timers, no scripted scrolling,
and nothing that could be mistaken for a WebMCP invocation. Smooth scrolling is scoped to
`:root:has(.showcase-header)` and disabled under `prefers-reduced-motion`; the root layout gains
`<html data-scroll-behavior="smooth">`, required by Next.js 16 (it no longer suspends smooth
scrolling during route transitions without it — this was an actual console warning). Both routes
share one `showcaseMetadata` object: title "RetailAgentOS WebMCP Agent Storefront | OpenAI WebMCP
Challenge" (`title.absolute`), the canonical description, `alternates.canonical` =
`https://www.retailagentos.com/webmcp-showcase`, and the repository's existing verified
`/og-image.png` — no invented image, and the compatibility route cannot present a competing
canonical. The optional demo video is read once through `getShowcaseVideoUrl()` from
`NEXT_PUBLIC_WEBMCP_VIDEO_URL`; anything that is not an absolute `https:` URL (blank, `#`,
`[VIDEO LINK]`, "coming soon", `http:`) yields `null` and the button is simply absent.

**One real layout bug found and fixed.** The sticky header stopped sticking roughly one viewport
down the page. `body` is a fixed-height (`h-full`) column flex container, so AppShell's wrapper — a
flex item — was being shrunk back to exactly one viewport while its content overflowed, and that
capped wrapper was the sticky header's containing block. Adding `shrink-0` grows the wrapper to its
content height; nothing moves visually (the overflow was already painted) and the header now stays
pinned through the full scroll, verified in Chrome at the bottom of the page.

**Verification.**
- `npm test`: **610/610 passing** (32 files), up from 576/576 — 34 new tests across
  `src/components/layout/showcase-chrome.test.tsx` (18: route chrome on both showcase routes and on
  normal routes, exactly one banner/contentinfo, mutually exclusive navigation systems, focused-link
  destinations, safe external links, mobile menu accessible name / `aria-expanded` / Escape /
  link-close / keyboard operation / distinguishable landmark names, global "WebMCP Live Demo"
  discoverability, preserved product CTA), `src/lib/content/showcaseChrome.test.ts` (7: route
  identity, naming with an explicit "StoreFront" guard, developer-link rename, canonical metadata
  with no invented image, video-URL validation), `src/components/showcase/ShowcaseHero.test.tsx` (3:
  video action absent / placeholder-rejecting / present-and-safe), and 6 in
  `storefront-client.test.tsx` (page identity, hero actions that scroll rather than invoke, focusable
  scroll-margin anchors, business comparison above Developer Evidence, single instance with no
  nested `main`, and a native-registration/guided-availability/no-checkout regression).
- `npx tsc --noEmit`: clean.
- Targeted ESLint on all 18 changed/new source files: clean.
- Full `npm run lint`: 14 errors / 59 warnings — identical to the correctness-gap-closure pass's
  baseline and in the same pre-existing files; none in any file this pass touched. Not clean
  overall, and not claimed to be.
- `npm run build -w @retailagentos/engine`, `-w @retailagentos/platform-contracts`,
  `-w @retailagentos/webmcp`: clean. Root `npm run build`: clean, all 39 routes.
- Browser acceptance (Chrome with a real `document.modelContext`, against the **production** build
  served locally): three base tools register natively on both routes; the full guided Fresh Corner
  flow runs to approval → capability registered → invoked by guided replay → `CART_PREPARED` $15.99
  with checkout never exposed; scenario switch to TheCustomHub resets cleanly to the three base
  tools and produces the quote with `fixedPrice: null`, no cart, no checkout; client-side navigation
  showcase → home → showcase re-registers exactly three tools with "Native WebMCP detected" and no
  duplicate registration; the compatibility route shows identical chrome, one `main`, one `h1`, one
  `#webmcp-mission`, and canonical `/webmcp-showcase`. Responsive probes at 320/375/768/1024/1280/
  1440 show zero horizontal overflow, a single 64px header row, the mobile menu at ≤768 and the
  desktop row at ≥1024 (never both), and the badge hidden rather than clipped below 640px. No
  console errors or hydration warnings.
- **Not verified:** deployment to `https://www.retailagentos.com` — unchanged from prior passes.
  A separate `next dev` server was already running during this pass; its React Strict Mode
  double-invoked effect made the showcase briefly report "Registration failed — guided mission
  available" after a soft navigation. That did **not** reproduce on the production build, which is
  what the acceptance above was run against.

## Exact next action for a future agent (navigation and page-identity pass)

1. ~~Commit this pass and record its real hash.~~ Done: committed and pushed to `main` as
   [`4790f74`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/4790f74) on 2026-09-02;
   `README.md`'s challenge-commit table and `src/lib/content/buildlog.ts`'s evidence list carry that
   hash. ~~The "Current submission status" section above still predates this pass — fold `4790f74`
   into it on the next pass that touches it.~~ Done: the "Current submission status" section was
   rewritten on 2026-09-02 and now covers every commit through `b0550a8`.
2. ~~Run the deployed-origin acceptance walkthrough at
   `https://www.retailagentos.com/webmcp-showcase`, including a native browser-agent run.~~ Done: the
   maintainer ran it in ChatGPT's in-app browser against the deployed origin on 2026-09-02 (build
   `5257759`) and reported it working as designed. See "Deployed and natively accepted" in the
   current submission status above for how that result is scoped and attributed.
3. ~~Record and publish the WebMCP demo video, then set `NEXT_PUBLIC_WEBMCP_VIDEO_URL` to its public
   URL in the production deployment and verify the "Watch video" action appears.~~ Done: the public
   video is https://youtu.be/aIScR90pSb0 (2:56, manually verified). The production deployment already
   carries the environment variable, and the live page renders the "Watch video" action — confirmed
   2026-09-02 against `https://www.retailagentos.com/webmcp-showcase`.
