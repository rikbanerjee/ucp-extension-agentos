# RetailAgentOS — Project TODO (deferred-but-decided)

Items that are decided in direction but intentionally not built yet. See `questions.md` for the
decisions behind each, `specs/PRODUCT-BACKLOG.md` for prioritized feature work, and
`specs/MASTER-BUILD-PLAN.md` for the work-package execution plan (the real MCP endpoint below
is scheduled there as **WP-19**, Wave 5).

## Infrastructure / platform

- **Real MCP endpoint** — *(D2, decided 2026-06-07)* Keep the MCP surface **simulated** for now;
  build the real MCP server + transport as the **next step once the specs are fully finalized**.
  Until then, MCP tools/resources are modeled in demo-mode only.
  - Depends on: RAOS-0000 (manifest `{ tier, capabilities[] }` shape), RAOS-0007 (quote lock),
    RAOS-0008 (provenance/freshness — real crypto + transport).
  - Ref: `specs/ARCH-UCP-EXTENSION-MCP.md` (MCP integration architecture).


## V2 (explicitly out of v1)

- **Multi-currency / i18n** — *(C toggle, decided 2026-06-07: OUT of v1)* v1 stays single-currency
  USD. Design seams only (don't hardcode USD assumptions into pricing/quote types), but no real
  multi-currency or localization until V2.
- **Cross-merchant / marketplace cart** — *(C toggle, decided 2026-06-07: OUT of v1)* Single-merchant
  cart only for v1. Cross-merchant/marketplace cart is a V2 concern; flag as future in any cart
  bridge work (RAOS-0012).
