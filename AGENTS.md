<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## RetailAgentOS product principle (shared — keep in sync with CLAUDE.md)

Simplicity for retailers and executives is a product requirement. Lead with the business outcome before protocols, schemas or architecture. A retail executive should understand the value in two minutes. A retail SME or product manager should be able to prepare catalog and policy inputs without writing code. Technical implementation details should remain available, but progressively disclosed after the value and next action are clear.
<!-- END:nextjs-agent-rules -->

## Agent-ready storefront and WebMCP platform

RetailAgentOS is expanding additively from a deterministic merchant-reasoning engine into a multi-channel agent-storefront platform. Before changing platform, WebMCP, connector, showcase, or merchant-onboarding code, read [`specs/WEBMCP-PLATFORM-BUILD.md`](./specs/WEBMCP-PLATFORM-BUILD.md), [`specs/reference-implementation/README.md`](./specs/reference-implementation/README.md), and relevant merchant reference documents.

- `@retailagentos/engine` remains the deterministic source of commerce decisions; browser, SaaS, connector, network, tenant, analytics, and authentication concerns stay outside it.
- UCP, MCP, WebMCP, feeds, Schema.org, and human UI derive from the same canonical merchant/catalog/policy objects. WebMCP results must not recalculate decisions.
- Owned storefronts may integrate WebMCP and cart preparation; marketplace integrations use connector and checkout-handoff mode.
- Label experimental WebMCP behavior honestly, degrade gracefully, and update the build document after every material phase with tests and the next safe action.
- The canonical Phase 1 route is `/webmcp-showcase`; `/agent-ready-storefront` is retained as a compatibility entry point. The page must call the WebMCP registration lifecycle, display actual registered-tool results, and abort registrations on unmount. Feature detection alone is not native-WebMCP proof.
- Keep controlled Fresh Corner and TheCustomHub-style fixtures separate from live merchant systems. The Phase 2 handoff/design record is `specs/WEBMCP-PHASE-2-READINESS-INTEGRATION.md`.
- The canonical seven-tool descriptor catalog lives in `packages/webmcp`; native and replay execution must invoke those same handlers, with shopper approval coordinated outside the engine.
- Dynamic phase tools are registrations, not disabled UI affordances. Abort registration controllers on reset, scenario switch, and unmount; never duplicate commerce-policy calculation in React or WebMCP.
- Historical provenance matters: native browser WebMCP is shipped for the controlled showcase; the generalized remote/server MCP is designed, not shipped. Keep pre-challenge foundations distinct from Aug 30–31, 2026 challenge commits `92753e5`, `d094e12`, and `e464bb8`, and update public agent, evidence, developer, and build-log surfaces together when changing this terminology.
- The judge-facing `/webmcp-showcase` UI is split into `src/components/showcase/*` (hero, mission launcher, scenario selector, mission timeline, decision summary, developer evidence) orchestrated by `src/app/agent-ready-storefront/storefront-client.tsx`. Guided replay is always labelled "Guided replay · Same RetailAgentOS handlers · No external agent" and must remain available even when native WebMCP is detected — never gate the guided button on the absence of `document.modelContext`.
- WebMCP telemetry `source` is per-invocation, not inferred from browser capability: `registration.invoke()` (guided) always passes `source: 'replay'`; an omitted `source` means a real browser called the registered descriptor directly (`'native'`). Never reintroduce a shared mutable "current source" flag for invocation events — see `packages/webmcp/src/index.ts`.

## Imported Claude Cowork project instructions
