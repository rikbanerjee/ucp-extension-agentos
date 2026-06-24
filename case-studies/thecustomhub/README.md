# Case Study — TheCustomHub × RetailAgentOS

**Status:** design phase (spine-first)
**Partner:** thecustomhub.com — custom-built, Firebase-hosted, made-to-order apparel (Indian cultural + American lifestyle), B2C.
**Arrangement:** free pilot in exchange for a public case study; partner will change their codebase. We co-design.

> This folder is **gitignored** — it holds client-specific co-design material that must not land in the public spec/reference repo (scope rule + partner confidentiality).

## Goal
Make TheCustomHub agent-ready end-to-end: discoverable by buyer agents where the platforms allow it, and — the differentiator — **transactable for made-to-order goods without dead-ends** (call-for-price → quote → order), powered by the RetailAgentOS reasoning engine.

## Architecture decision: "model once, project everywhere"
One RetailAgentOS-shaped source of truth in Firestore → a reusable adapter + the deterministic engine → many agent surfaces (well-known manifest, schema.org, product feed, MCP, ACP).

## Two-repo workflow (the contract between them)
- **This repo (RetailAgentOS):** the *kit* — extract the engine into a publishable package, define the canonical **adapter interface**, and the engine-embeddable/hostable boundary. Generic, reusable, the seed of the hosted product.
- **TheCustomHub repo (separate Claude session):** *implements* the adapter (their Firestore docs → canonical RAOS objects), adds the missing model fields, builds the Cloud Run MCP + Cloud Function projections — all consuming the kit.
- **Shared contract:** the adapter interface + the pinned engine package version. Change those deliberately.

## What we need from TheCustomHub to start spine-first
(Only the data model — NOT the whole codebase, NOT any secrets.)
- [ ] Product / variant / catalog **type definitions** (TS interfaces or Firestore schema).
- [ ] One or two **sample product documents** (real or representative JSON), ideally including a made-to-order / personalized item.
- [ ] How product data is **served** today (SSR Next.js? SPA? Cloud Functions? direct Firestore reads?).
- [ ] Auth model (Firebase Auth? guest vs. account?) — only the shape, no keys.
- [ ] **Do NOT share:** `.env`, Firebase admin/service-account keys, API secrets.

## Open log
- 2026-06-23 — area created; chose spine-first; pending TheCustomHub data model.
