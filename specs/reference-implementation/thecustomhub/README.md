# Case Study — TheCustomHub × RetailAgentOS

**Status:** design phase (spine-first)
**Partner:** thecustomhub.com — custom-built, Firebase-hosted, made-to-order apparel (Indian cultural + American lifestyle), B2C.
**Arrangement:** free pilot in exchange for a public case study; partner will change their codebase. We co-design.

> **Note (2026-07-04):** this folder was previously marked "gitignored / must not land in the
> public repo," but it was already git-tracked and contains no secrets, keys, or PII — only
> architecture/co-design notes. The project owner reviewed this and decided to keep it
> committed, consolidated here under `specs/reference-implementation/` alongside the engine
> docs, since it *is* the concrete proof that the specs are implementable. If a future
> engagement with a partner requires real confidentiality, gitignore that engagement's folder
> explicitly rather than relying on a README note.

This is a **reference implementation case study**, not a spec definition. Nothing here changes
what any `specs/00NN-*.md` RFC says — it documents one real merchant applying the already-
published specs via `@retailagentos/engine`. See [`../README.md`](../README.md) for how this
fits with the rest of the reference-implementation section.

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
