/**
 * Pure conversion from Readiness Studio session data into the real
 * RetailAgentOS engine types (`MerchantProfile`, `Variant`, `BuyerContext`)
 * and a thin wrapper around the public `evaluateOffer` — this module never
 * re-implements rule evaluation, it only shapes inputs for it.
 *
 * DETERMINISM: `now` is always an explicit parameter, never Date.now(). The
 * one exception, `deriveOrderNow`, is a pure function of explicit scenario
 * fields (never the system clock) — see its doc comment.
 */

import type {
  MerchantProfile,
  Variant,
  UcpManifest,
} from '@retailagentos/engine';
import type { BuyerContext } from '@retailagentos/engine';
import type { UcpCapabilityEntry } from '@/lib/types/core';
import type { ComputedFulfillmentFeasibility } from '@/lib/types/extensions';
import type { ComputedAvailability, InventoryState } from '@/lib/types/inventory';
import { evaluateOffer, type DecisionRecord } from '@retailagentos/engine';
import type {
  CanonicalCatalogRow,
  StoreProfile,
  RetailerRuleDefaults,
  ProductRuleOverride,
  ShopperScenario,
} from './types';
import { resolveEffectiveRule } from './rules';
import { zonedWallClockToEpochMs, zonedWallClockToIsoWithOffset } from './timezone';

/** RAOS namespaces this Studio actually evaluates against — never claim a namespace that isn't implemented. */
export const IMPLEMENTED_RAOS_CAPABILITIES: UcpCapabilityEntry[] = [
  { id: 'visibility', name: 'Visibility', namespace: 'com.os.retailagent.shopping.visibility', version: '1.0.0', description: 'Hides products a buyer should never see.', required: true, tier: 1 },
  { id: 'eligibility', name: 'Eligibility', namespace: 'com.os.retailagent.shopping.eligibility', version: '1.0.0', description: 'Determines who may buy a product.', required: true, tier: 1 },
  { id: 'pricing', name: 'Contextual pricing', namespace: 'com.os.retailagent.shopping.pricing', version: '1.0.0', description: 'Resolves the correct customer price.', required: true, tier: 1 },
  { id: 'inventory', name: 'Inventory & availability', namespace: 'com.os.retailagent.shopping.inventory', version: '1.0.0', description: 'Reflects real-time stock state.', required: false, tier: 2 },
  { id: 'fulfillment', name: 'Fulfillment feasibility', namespace: 'com.os.retailagent.shopping.fulfillment_constraints', version: '1.0.0', description: 'Confirms an order can actually be fulfilled.', required: false, tier: 2 },
];

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'store';
}

function draftEndpoint(domain: string, path: string): string {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${host}${path}`;
}

/**
 * Builds the MerchantProfile the engine evaluates against. Endpoints are
 * either the candidate URLs the user supplied in Step 3, or draft URLs
 * inferred from their domain — draft-ness is tracked separately by the
 * readiness analysis, never implied by this function's return value alone.
 */
export function toMerchantProfile(store: StoreProfile, defaults: RetailerRuleDefaults): MerchantProfile {
  const merchantId = `readiness-${slugify(store.storeName || store.storeDomain || 'store')}`;
  const endpoints = {
    catalog: store.catalogEndpoint || draftEndpoint(store.storeDomain, '/ucp/catalog'),
    cart: store.cartEndpoint || draftEndpoint(store.storeDomain, '/ucp/cart'),
    checkout: store.checkoutEndpoint || draftEndpoint(store.storeDomain, '/ucp/checkout'),
  };

  const manifest: UcpManifest = {
    protocol: 'raos-2026-08',
    tier: 1,
    capabilities: IMPLEMENTED_RAOS_CAPABILITIES,
    endpoints,
    servesRegions: store.regions,
  };

  const profile: MerchantProfile = {
    merchantId,
    merchantName: store.storeName || 'Your store',
    protocolVersion: 'raos-2026-08',
    endpoints,
    capabilities: [{ id: 'commerce', name: 'Commerce', version: '1.0.0', description: 'Core UCP commerce capability.' }],
    servesRegions: store.regions,
    timezone: store.timezone,
    manifest,
  };

  if (defaults.fulfillment.weeklySchedule?.length) {
    profile.serviceSchedule = {
      weekly: defaults.fulfillment.weeklySchedule.map((d) => ({
        day: d.day,
        intervals: [{ opensAt: d.opensAt, closesAt: d.closesAt }],
      })),
      orderAcceptanceBufferMinutes: defaults.fulfillment.orderAcceptanceBufferMinutes,
    };
  }

  if (!defaults.eligibility.restrictToServedRegions) {
    // "Only sell to the regions I serve" is unchecked — the retailer wants
    // no region restriction at all. `MerchantProfile.servesRegions` is a
    // required TS field for typed profiles (RAOS-0001 OQ-2), but the engine
    // itself documents a runtime "undeclared" state — an absent
    // `servesRegions` — that `evaluateOffer` never blocks on (see
    // `buildManifest`'s `REGION_POLICY_UNDECLARED` doc comment,
    // src/lib/types/core.ts and src/lib/projections/manifest.ts). This is
    // the only way to express "no region restriction" against the current
    // `MerchantProfile` contract, so the Studio opts into it deliberately
    // here rather than leaving the toggle a no-op.
    return { ...profile, servesRegions: undefined as unknown as string[] };
  }

  return profile;
}

/** Converts one catalog row + its resolved rule into an engine Variant. */
export function toVariant(
  row: CanonicalCatalogRow,
  store: StoreProfile,
  defaults: RetailerRuleDefaults,
  overrides: ProductRuleOverride[],
): Variant {
  const rule = resolveEffectiveRule(row, defaults, overrides);

  const variant: Variant = {
    id: row.variantId,
    sku: row.sku,
    title: row.title,
    basePrice: row.price,
    currency: row.currency,
    callForPrice: rule.callForPrice || undefined,
  };

  if (rule.eligibilityMode !== 'everyone') {
    variant.eligibilityRules = {
      hideFromGuests: true,
      requireWholesale: rule.eligibilityMode === 'wholesale',
    };
  }

  if (rule.memberPrice !== undefined) {
    variant.memberPricing = { available: true, memberPrice: rule.memberPrice };
  }

  // A product can carry a minimum quantity / quantity increment WITHOUT a
  // distinct wholesale price (e.g. "sold in sets of 4" at the regular
  // price). `bulkPricing.available` must be true whenever ANY of these
  // fields is set — the engine's MOQ/increment checks (BELOW_MOQ,
  // QUANTITY_INCREMENT_MISMATCH, src/lib/rules/pricing.ts) are gated on
  // `bulkPricing?.available`, not on the presence of a wholesale price.
  // Gating `available` on `wholesalePrice !== undefined` alone (the
  // previous behavior here) silently dropped MOQ/increment enforcement for
  // any product that only set one of those two fields — a real wiring bug,
  // not a hypothetical one.
  const hasBulkConfig =
    rule.wholesalePrice !== undefined || rule.minimumQuantity !== undefined || rule.quantityIncrement !== undefined;
  if (hasBulkConfig) {
    variant.bulkPricing = {
      available: true,
      moq: rule.minimumQuantity,
      quantityIncrement: rule.quantityIncrement,
      tiers: rule.wholesalePrice !== undefined
        ? [{ minQuantity: rule.minimumQuantity ?? 1, price: rule.wholesalePrice }]
        : undefined,
    };
  }

  // Variant-level region REACH is a blocklist (FulfillmentConstraints.
  // restrictedRegions: "regions this specific item cannot reach"), while
  // the Studio's rule model expresses fulfilment regions as an ALLOWLIST
  // ("regions this product/store serves"). Convert: any region the store
  // generally serves but this product's effective fulfilment-regions list
  // does NOT include is a restricted region for this variant. Previously
  // `effective.fulfillmentRegions` / `ProductRuleOverride.fulfillmentRegions`
  // were resolved but never reached the engine at all — REGION_NOT_SERVED
  // was unreachable for every product regardless of exceptions.
  const restrictedRegions = store.regions.filter((r) => !rule.fulfillmentRegions.includes(r));

  variant.fulfillmentConstraints = {
    availableModes: rule.fulfillmentModes,
    restrictedRegions: restrictedRegions.length > 0 ? restrictedRegions : undefined,
    leadTimeDays: rule.leadTimeDays,
    cutoffHourLocal: rule.cutoffHourLocal,
  };

  variant.inventory = {
    state: rule.availability === 'in_stock' ? 'in_stock' : 'out_of_stock',
    quantityAvailable: row.inventoryQuantity,
    reservationPolicy: 'none',
    // "Inventory data freshness expectation" (Step 4) — wired to the
    // engine's own staleness seam (`dataTtlSeconds`, consumed by the
    // inventory evaluator to emit STOCK_STALE). Previously this was a
    // display-only string that never reached a Variant at all.
    dataTtlSeconds: defaults.inventory.freshnessSeconds,
  };

  return variant;
}

export function toBuyerContext(scenario: ShopperScenario, merchantTimezone: string): BuyerContext {
  const needByAt = scenario.needByDate && scenario.needByTime
    ? zonedWallClockToIsoWithOffset(scenario.needByDate, scenario.needByTime, merchantTimezone) ?? undefined
    : undefined;

  return {
    customerType: scenario.customerType,
    membershipTier: scenario.customerType === 'wholesale' ? 'gold' : 'none',
    marketRegion: scenario.marketRegion,
    fulfillmentMode: scenario.fulfillmentMode,
    accountLinked: scenario.customerType !== 'guest',
    taxExempt: false,
    resaleCertificateOnFile: false,
    needByDate: scenario.needByDate || undefined,
    needByAt,
    // The Studio's buyer-type selector represents a buyer the retailer has
    // deliberately chosen to preview (an authenticated session in the
    // scenario it is modeling), not an untrusted, agent-supplied claim —
    // so this maps to `trust.mode: 'signed'`, not `'asserted'`. Using
    // 'asserted' (the previous behavior) meant `normalizeBuyerContext`'s
    // §7.2 trust-downgrade unconditionally reset `membershipTier` to
    // 'none' before every evaluation (the pipeline's default
    // `trustEnforcement` is 'enforce') — so a "wholesale" scenario could
    // never actually satisfy a `requiredTier` gate above the default tier,
    // silently breaking every tiered wholesale/member preview.
    trust: { mode: 'signed', issuer: 'readiness-studio-preview', keyId: 'preview' },
  };
}

export interface PreviewInput {
  store: StoreProfile;
  defaults: RetailerRuleDefaults;
  overrides: ProductRuleOverride[];
  row: CanonicalCatalogRow;
  scenario: ShopperScenario;
  now: number;
}

/**
 * Derives the evaluation `now` (Unix ms) from the scenario's explicit
 * order date + time, interpreted as merchant-local wall-clock time. Pure —
 * never reads the system clock. Falls back to `0` only when the date/time
 * strings are missing or unparseable, so a half-filled form never throws.
 */
export function deriveOrderNow(scenario: ShopperScenario, merchantTimezone: string): number {
  return zonedWallClockToEpochMs(scenario.orderDate, scenario.orderTime, merchantTimezone) ?? 0;
}

/** Runs the real engine for one (row, scenario) pair. This is the ONLY place the Studio calls evaluateOffer. */
export function runPreview(input: PreviewInput): DecisionRecord {
  const merchant = toMerchantProfile(input.store, input.defaults);
  const variant = toVariant(input.row, input.store, input.defaults, input.overrides);
  const context = toBuyerContext(input.scenario, input.store.timezone);
  return evaluateOffer({ merchant, variant, quantity: input.scenario.quantity, context, now: input.now });
}

// ---------------------------------------------------------------------------
// Decision summary — plain-language extraction from a DecisionRecord for
// Step 6's preview UI. Reads only from the record the engine returned; never
// re-derives a decision independently.
// ---------------------------------------------------------------------------

export interface DecisionSummary {
  allowed: boolean;
  unitPrice?: number;
  currency?: string;
  inventoryState?: InventoryState;
  fulfillmentStatus?: 'FEASIBLE' | 'BLOCKED';
  plainLanguage: string;
  blockingReasonMessages: string[];
}

function stageOutput<T>(record: DecisionRecord, stage: string, namespace: string): T | undefined {
  const stageResults = (record.stages as Record<string, Record<string, { output: unknown }>>)[stage];
  return stageResults?.[namespace]?.output as T | undefined;
}

export function summarizeDecision(record: DecisionRecord, quantity: number): DecisionSummary {
  const blockingReasons = record.reasons.filter((r) => r.severity === 'BLOCK');
  const allowed = blockingReasons.length === 0;

  const priceOutput = stageOutput<{ unitPrice: number; currency: string }>(record, 'PRICE', 'com.os.retailagent.shopping.pricing');
  const inventoryOutput = stageOutput<ComputedAvailability>(record, 'ELIGIBILITY', 'com.os.retailagent.shopping.inventory');
  const fulfillmentOutput = stageOutput<ComputedFulfillmentFeasibility>(record, 'FEASIBILITY', 'com.os.retailagent.shopping.fulfillment_constraints');
  const fulfillmentMode = record.normalizedContext.fulfillmentMode.replace('_', ' ');

  const blockingReasonMessages = blockingReasons.map((r) => r.message);

  let plainLanguage: string;
  if (!allowed) {
    plainLanguage = `Do not show this product to this shopper. ${blockingReasonMessages[0] ?? 'The order cannot be completed as configured.'}`;
  } else if (priceOutput) {
    plainLanguage = `This ${record.normalizedContext.customerType} can buy ${quantity} unit${quantity === 1 ? '' : 's'} for ${priceOutput.currency} ${(priceOutput.unitPrice * quantity).toFixed(2)} with ${fulfillmentMode}.`;
  } else {
    plainLanguage = `This ${record.normalizedContext.customerType} can buy ${quantity} unit${quantity === 1 ? '' : 's'} with ${fulfillmentMode}.`;
  }

  return {
    allowed,
    unitPrice: priceOutput?.unitPrice,
    currency: priceOutput?.currency,
    inventoryState: inventoryOutput?.state,
    fulfillmentStatus: fulfillmentOutput?.status,
    plainLanguage,
    blockingReasonMessages,
  };
}
