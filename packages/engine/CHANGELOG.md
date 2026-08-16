# @retailagentos/engine — Changelog

## 0.3.0 — 2026-08-12 (RAOS-0003 · Fulfillment Feasibility, promoted Tier 4 → Tier 1)

**Source of truth:** `src/lib/` in the RetailAgentOS repo (this package is a pure re-export layer
— see `src/index.ts`). Full write-up: `specs/0003-fulfillment.md` and
`specs/0001-eligibility.md` §11 (v2.0.0 changelog entry).

### Breaking changes

1. **`STAGE_ORDER` reordered.** New `FEASIBILITY` stage inserted between `ELIGIBILITY` and
   `PRICE`: `VISIBILITY → ELIGIBILITY → FEASIBILITY → PRICE → FULFILLMENT → QUOTE` (was
   `VISIBILITY → ELIGIBILITY → PRICE → FULFILLMENT → QUOTE`). `PipelineStage` gains the
   `'FEASIBILITY'` member. The pre-existing `FULFILLMENT` stage is kept, unused in v1, reserved
   for a future shipping-cost concern that genuinely depends on `PRICE`.
2. **`MerchantProfile.timezone: string` is now REQUIRED.** A merchant profile that omits it will
   not compile. Same shape and rationale as the `servesRegions` requirement added in 0.2.0.
3. **`BuyerContext.needByDate?: string` added.** Optional, additive to the type — not itself
   breaking — but consumed by new BLOCK-severity reason codes (below), which is a behavior
   surface every consumer of `evaluateOffer` should be aware of.
4. **`FULFILLMENT_UNAVAILABLE` (RAOS-0001) is deprecated and NO LONGER EMITTED anywhere** —
   no dual-emit window. Superseded by `FULFILLMENT_MODE_UNAVAILABLE` (RAOS-0003, same meaning,
   new namespace). A consumer filtering on the old code name will silently stop seeing it.
5. **`REGION_RESTRICTED` (RAOS-0001) is narrowed.** Previously fired for BOTH the merchant-level
   `servesRegions` gate AND a per-variant `fulfillmentConstraints.restrictedRegions` block. The
   latter now emits the distinct `REGION_NOT_SERVED` (RAOS-0003) instead. A consumer relying on
   `REGION_RESTRICTED` alone to catch variant-level region blocks must also read
   `REGION_NOT_SERVED` from the `fulfillment_constraints` namespace.
6. **`FulfillmentConstraints.availableModes`/`restrictedRegions` evaluation moved.** Same field
   names and shapes on the type; the evaluator that reads and reasons about them moved from the
   `eligibility` namespace to the new `fulfillment_constraints` FEASIBILITY-stage evaluator.
   `calculateVisibility`/`calculateEligibility` no longer read `variant.fulfillmentConstraints`
   at all.

### Additive changes

- `FulfillmentConstraints` gains `hazmat?`, `oversize?`, `leadTimeDays?`, `cutoffHourLocal?`.
- New reason codes (`com.os.retailagent.shopping.fulfillment_constraints`):
  `FULFILLMENT_MODE_UNAVAILABLE`, `REGION_NOT_SERVED`, `HAZMAT_RESTRICTION`,
  `OVERSIZE_RESTRICTION`, `LEAD_TIME_EXCEEDS_NEED_BY`, `CUTOFF_PASSED`.
- New public exports: `setFulfillmentMerchantTimezone` (module-level timezone-threading hook,
  mirrors `setInventoryHolds`), `ComputedFulfillmentFeasibility` type.
- `evaluateOffer` now calls `setFulfillmentMerchantTimezone(merchant.timezone)` internally at
  the top of every call — no caller action required for the pipeline path.

### Not changed

- `evaluateOffer`'s public signature (`EvaluateOfferInput`, `DecisionRecord`).
- The merchant-level `servesRegions` short-circuit and `checkServesRegion` (RAOS-0001 §9.6) —
  untouched.
- Every other reason code, every other spec's evaluator.

### Migration notes for consumers

- If you construct `MerchantProfile` objects directly (not via `mockMerchants` or a factory),
  add a `timezone: '<IANA identifier>'` field — this is a compile-time break, not a runtime one.
- If you filter `DecisionRecord.reasons`/trace output on `FULFILLMENT_UNAVAILABLE`, switch to
  `FULFILLMENT_MODE_UNAVAILABLE`.
- If you filter on `REGION_RESTRICTED` to catch variant-level (not just merchant-level) region
  blocks, also filter on `REGION_NOT_SERVED`.

## 0.2.0 — 2026-08-01 (RAOS-0001 OQ-2 · region-policy fork resolved)

`MerchantProfile.servesRegions: string[]` made required; `evaluateOffer` gained the merchant-level
region-allowlist short-circuit; `UcpManifest` gained `endpoints`/`servesRegions`;
`REGION_POLICY_UNDECLARED` (INFO) added. See `specs/0001-eligibility.md` §11 and
`specs/0000-foundations.md` §13 for the full write-up (this package predates a dedicated
changelog file — recorded here retroactively for continuity with the 0.3.0 entry above).

## 0.1.0 — initial packaged release

First `npm pack` of the reference engine (`evaluateOffer`, quote lifecycle, projections,
adapters). See `VERIFICATION-NEEDED.md` for the packaging verification trail.
