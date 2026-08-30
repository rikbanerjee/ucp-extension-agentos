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
- [~] Phase 1 — WebMCP SDK and platform contracts (source + focused tests added; package build setup still needs workspace dependency installation).
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

Phase 0 is complete. Phase 1 source is in progress: `packages/webmcp` provides a React-free, document-first SDK with feature detection, schema metadata, compact output mapping, gateway/bridge delegation, and AbortSignal cleanup. `packages/platform-contracts` provides the tenant and connector boundaries. Package builds are currently blocked because the new workspaces have not yet received their local `tsup` dev dependency; the existing engine's private install is not reused as a package boundary.

Phase 2 is complete locally. `src/lib/showcase/gateway.ts` calls the real engine exactly once per offer evaluation, maps its `DecisionRecord` to compact responses, re-evaluates every cart line, and stores idempotent demo cart results outside the engine. Route handlers expose search, evaluation, cart preparation, and quote requests under `/api/showcase/*`. Inputs are bounded and structured errors are returned. Time is injected at the route boundary. Quote requests never fabricate a price.

Phase 3 is complete locally. `/agent-ready-storefront` is an accessible, responsive interactive storefront showcase with an owned-storefront flow and an Etsy marketplace-bridge explanation. The owned flow calls the local gateway and visibly demonstrates search, real-engine evaluation, product selection, cart preparation, a cart update, and a shopper-confirmed checkout boundary. GB is blocked with `REGION_RESTRICTED`; bulk custom shirts use a quote-request path. Native browser support is feature-detected and ordinary browsers use a clearly labelled simulation. The Etsy mode explicitly states that it does not control Etsy pages or checkout and has no live integration claim. The primary nav and homepage now link to the route.

The WebMCP Challenge submission package is complete as documentation, but its readiness audit identified four hard gates: the showcase must call the SDK registration lifecycle and bind tool callbacks to visible UI state; a public HTTPS deployment must be verified; a public repository with a root open-source license is required; and challenge-period WebMCP work must be committed with clear dated evidence. The current page's `document.modelContext` feature detection is not proof of tool registration and must not be presented as such.

## Exact next action for a future agent

For the challenge track, wire `createRetailAgentWebMcp` into `/agent-ready-storefront`, bind a fetch gateway and visible storefront bridge, add page-level registration/invocation tests, and verify the deployed route in both supported challenge browsers. For the platform track after submission, extend Readiness Studio with operating-mode advice, downloadable storefront configuration, and a deterministic agent-storefront implementation brief while preserving browser-local catalog processing.

## Last verified results

2026-08-29 — `npm test`: 486 passed / 22 files passed. Focused SDK/platform/gateway tests: 8 passed. `npx tsc --noEmit`: passed after Phase 3; gateway test: 3 passed. Engine portion of `npm run build` succeeded; full Next.js completion must be re-verified in Phase 7.
