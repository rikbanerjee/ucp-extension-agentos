# WebMCP Phase 2 — Readiness Studio integration

## Executive summary

Phase 2 turns Readiness Studio from a browser-local assessment into an onboarding and implementation operating system: **assess → model → preview → generate → deploy → monitor**. It will produce a merchant-specific, controlled WebMCP preview from canonical catalog and policy inputs; it will not promise a live connector, payment flow, or marketplace control until those boundaries are explicitly approved.

## Retailer value

Retailers should be able to provide catalog and policy inputs in business language, see how an agent behaves with those rules, and hand their team a practical implementation package. The outcome is fewer dead-end agent carts and fewer invented prices—not a new protocol project for a retailer to operate.

## Journey and inputs

1. A retailer imports a catalog and answers Readiness Studio questions.
2. The service validates and normalizes canonical catalog, policy, buyer-context, and deployment configuration objects.
3. It reports gaps, then creates a private preview using the same deterministic engine as all channel projections.
4. The retailer tests missions, selects an owned-storefront or marketplace-handoff mode, and downloads an implementation package.
5. An approved connector/deployment publishes the merchant-owned surface; monitoring records only bounded, non-PII operational events.

Inputs include variants, prices, inventory freshness, fulfillment and regional constraints, buyer-context trust requirements, quote policy, merchant identity, and deployment settings. UCP, WebMCP, feeds, Schema.org, and human UI must all derive from those same objects.

## Product and platform design

The preview generator creates a tenant-scoped snapshot with an explicit catalog/policy version. The engine evaluates it exactly once per offer or plan; WebMCP and UI consume the resulting decision. Owned storefront mode may prepare a visible cart and requires a human checkout handoff. Marketplace mode can only provide a connector-backed listing handoff; it never controls another origin’s tools or checkout.

The implementation package contains validated mappings, UCP-shaped capability projection, WebMCP deployment configuration, endpoint contracts, environment checklist, test missions, integration code stubs, and unresolved policy questions. It is a reviewable artifact, not an automatic production deployment.

## Tenant, authentication, analytics, and deployment boundaries

Phase 2 introduces authenticated retailer workspaces and tenant isolation outside `@retailagentos/engine`. Canonical snapshots are access-controlled; raw uploaded files follow an explicit retention policy. Analytics use injected, pseudonymous event envelopes (tool registration, decision status, and error code) with no shopper PII or asserted agent identity. Deployment uses a tenant configuration service and merchant-owned origin; secrets stay server-side.

## Data contracts

`MerchantSnapshot` references canonical `Catalog`, `Policy`, `BuyerContextPolicy`, `CapabilityProjection`, and `DeploymentConfig` versions. `PurchasePlanDecision` includes status, primary code, lines, reasons, allowed actions, provenance, freshness, and next action. Mutations require idempotency keys; quote results retain `fixedPrice: null` until merchant review.

## Phased implementation and acceptance

1. Persist validated canonical snapshots and deterministic preview generation.
2. Add tenant/auth boundaries and an implementation-package generator.
3. Add owned-storefront deployment adapter plus mission verification.
4. Add approved marketplace connector handoffs and bounded operational monitoring.

Acceptance requires identical engine and preview results for canonical inputs, no client-side policy evaluation, clear provenance/freshness, tenant isolation, an accessible fallback when WebMCP is unavailable, and explicit external approval before any connector or production deployment.

## Dependencies, risks, and non-goals

Dependencies include tenant identity, secure storage, approved connector credentials, merchant domain/deployment authority, and browser WebMCP support. Risks are stale inventory, incomplete policy input, and treating a preview as a production promise. Phase 2 does not implement payment processing, unrestricted marketplace control, generalized multi-tenant production operation, or an LLM commerce-decision engine.

## Exact first task

Define and test the versioned `MerchantSnapshot` schema plus a server-side preview factory that maps one Readiness Studio sample into canonical catalog/policy objects and proves engine-equivalent decisions.
