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

## Last verified results

2026-08-31 — The package workspace is explicitly installed and `@retailagentos/webmcp` emits ESM, CommonJS, and declaration artifacts. Its SDK normalizes omitted browser execution options and combines browser cancellation with an independent storefront-session lifecycle signal. Controlled Fresh Corner and TheCustomHub fixtures are server-bound, have separate catalogs, versions, policies, sessions, decisions, and idempotency namespaces. The page renders actual native registrations only after registration succeeds and shows browser-observed parity when `getTools()` is available. Focused SDK and gateway tests pass; full-suite and production-build results must be recorded only after they are re-run. Native ChatGPT/Codex and deployed Chrome verification remain external browser checks, not claims made by this record.
