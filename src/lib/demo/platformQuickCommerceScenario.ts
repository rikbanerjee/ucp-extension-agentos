/**
 * /guided/platform — NYC late-night quick-commerce scenario data.
 *
 * A dedicated, typed scenario module (per AGENTS.md guidance on demo data
 * hygiene) — the guided-demo components import from here, never construct
 * fictional merchant data inline.
 *
 * WHAT IS REAL VS. WHAT IS DEMO DATA, PRECISELY:
 *
 * - Midnight Crust is evaluated through the ACTUAL `evaluateOffer()`
 *   reference engine (`@retailagentos/engine`), against a real
 *   `MerchantProfile`/`Variant` using the RAOS-0003 v1.1 quick-commerce
 *   capabilities (`serviceSchedule`, `preparationTimeMinutes`, `needByAt`).
 *   Its `merchantFacts` below are read off that real evaluation, not
 *   hand-typed — change the schedule/prep-time/price and the demo's numbers
 *   move with it.
 * - Corner Slice and BigBox Pizza are DELIBERATELY NOT run through the
 *   engine. Corner Slice represents an unverified web/marketplace listing —
 *   there is no RAOS merchant profile to evaluate. BigBox Pizza represents
 *   an existing platform-native structured feed — its facts come from the
 *   platform's own integration, not from RAOS. Modeling either of them as
 *   an `evaluateOffer()` call would misrepresent what the demo's own
 *   narrative says: RAOS did not verify these two merchants.
 * - Every displayed platform-live signal (courier, ETA) lives in
 *   `platformSignals.ts`, fictional and clearly out of the deterministic
 *   RAOS engine — see that file's doc comment.
 *
 * DETERMINISTIC SCENARIO CLOCK:
 *   Location:        Lower Manhattan, New York City
 *   Merchant tz:      America/New_York
 *   Fixed local time:  Thursday 2026-01-15, 11:20 PM
 *   SCENARIO_NOW:      1768537200000 (epoch ms) — verified via
 *                       `Intl.DateTimeFormat` against 'America/New_York'
 *                       (see src/lib/rules/__tests__/fulfillment.test.ts
 *                       for the same pinned value and its derivation).
 *   Need-by:           midnight the same night → 2026-01-16T00:00:00-05:00
 *                       (`SCENARIO_NEED_BY_AT`), 40 minutes after "now".
 *
 * No `Date.now()`/`new Date()` anywhere in this module — every timestamp is
 * a hardcoded epoch-ms or ISO-with-offset literal, matching the engine's
 * own determinism contract (RAOS-0000 §7.1).
 */

import { evaluateOffer, buildDecisionTrace, renderBuyerTrace } from '@retailagentos/engine';
import type { MerchantProfile, Variant, ServiceSchedule, DayOfWeek } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import { PLATFORM_SIGNALS, type PlatformFulfillmentSignal } from './platformSignals';

// ---------------------------------------------------------------------------
// Scenario clock + location
// ---------------------------------------------------------------------------

export const SCENARIO_TIMEZONE = 'America/New_York';
/** 2026-01-15 23:20 America/New_York (Thursday). */
export const SCENARIO_NOW = 1768537200000;
/** Midnight the same night, as an exact ISO 8601 timestamp (RAOS-0003 v1.1 `needByAt`). */
export const SCENARIO_NEED_BY_AT = '2026-01-16T00:00:00-05:00';
export const SCENARIO_LOCATION = 'Lower Manhattan, New York City';
export const SCENARIO_TIME_LABEL = '11:20 PM · Lower Manhattan';

// ---------------------------------------------------------------------------
// Currency — integer cents internally, Intl.NumberFormat for display.
// Never compare formatted strings; compare the integer cent values.
// ---------------------------------------------------------------------------

const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUsd(cents: number): string {
  return USD_FORMATTER.format(cents / 100);
}

export const BUDGET_CENTS = 3000; // "under $30" applies to item price before fees/tax/tip

// ---------------------------------------------------------------------------
// Shopper request — the plain-language ask and the platform's structured
// interpretation of it. RetailAgentOS does not perform NLU; the structured
// form below is explicitly labeled "platform-interpreted," per spec.
// ---------------------------------------------------------------------------

export const SHOPPER_REQUEST_TEXT =
  'Find me a large vegetarian pizza under $30, delivered before midnight. Only show stores that will keep accepting orders for at least another 30 minutes.';

export interface PlatformInterpretedIntent {
  product: string;
  maxItemPriceCents: number;
  fulfillmentMode: string;
  needByLabel: string;
  minimumAcceptanceWindowMinutes: number;
  customerArea: string;
  quantity: number;
}

export const PLATFORM_INTERPRETED_INTENT: PlatformInterpretedIntent = {
  product: 'Large vegetarian pizza',
  maxItemPriceCents: BUDGET_CENTS,
  fulfillmentMode: 'Local delivery',
  needByLabel: 'Midnight',
  minimumAcceptanceWindowMinutes: 30,
  customerArea: SCENARIO_LOCATION,
  quantity: 1,
};

// ---------------------------------------------------------------------------
// Evidence / sourcing model (see spec "Real versus proposed data")
// ---------------------------------------------------------------------------

export type MerchantDataSource = 'raos' | 'platform_native' | 'unverified';

export type EvidenceSource =
  | 'raos_engine'
  | 'raos_proposed'
  | 'platform_feed'
  | 'platform_live'
  | 'listing';

export type VerificationStatus = 'verified' | 'blocked' | 'unknown';

export interface SourcedFact<T> {
  value?: T;
  source: EvidenceSource;
  observedAt?: number;
  expiresAt?: number;
  status: 'fresh' | 'stale' | 'unknown';
}

function fresh<T>(value: T, source: EvidenceSource, extra: Partial<Pick<SourcedFact<T>, 'observedAt' | 'expiresAt'>> = {}): SourcedFact<T> {
  return { value, source, status: 'fresh', ...extra };
}

function stale<T>(value: T, source: EvidenceSource): SourcedFact<T> {
  return { value, source, status: 'stale' };
}

function unknown<T>(source: EvidenceSource): SourcedFact<T> {
  return { source, status: 'unknown' };
}

// ---------------------------------------------------------------------------
// Midnight Crust — real RAOS-0003 v1.1 merchant, evaluated through the
// actual reference engine.
// ---------------------------------------------------------------------------

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Open 11:00 AM – 1:00 AM every night (crosses midnight); orders accepted until 30 min before close (12:30 AM). */
const MIDNIGHT_CRUST_SCHEDULE: ServiceSchedule = {
  weekly: ALL_DAYS.map(day => ({ day, intervals: [{ opensAt: '11:00', closesAt: '01:00' }] })),
  orderAcceptanceBufferMinutes: 30,
};

export const MIDNIGHT_CRUST_MERCHANT: MerchantProfile = {
  merchantId: 'm_midnight_crust',
  merchantName: 'Midnight Crust',
  protocolVersion: '1.0.0',
  endpoints: {
    catalog: 'https://api.midnight-crust.test/ucp/catalog',
    cart: 'https://api.midnight-crust.test/ucp/cart',
    checkout: 'https://api.midnight-crust.test/ucp/checkout',
  },
  servesRegions: ['US'],
  timezone: SCENARIO_TIMEZONE,
  serviceSchedule: MIDNIGHT_CRUST_SCHEDULE,
  capabilities: [],
  manifest: {
    protocol: '1.0',
    tier: 1,
    capabilities: [
      {
        id: 'ext.fulfillment_constraints',
        name: 'Fulfillment feasibility',
        namespace: 'com.os.retailagent.shopping.fulfillment_constraints',
        version: '1.1.0',
        description: 'Merchant-declared reachability, hours, and preparation time.',
        required: true,
        tier: 1,
      },
    ],
  },
};

export const MIDNIGHT_CRUST_VARIANT: Variant = {
  id: 'v_midnight_crust_large_veg',
  sku: 'MC-LG-VEG',
  title: 'Large Vegetarian Pizza',
  basePrice: 24.0,
  currency: 'USD',
  fulfillmentConstraints: {
    availableModes: ['local_delivery', 'pickup'],
    preparationTimeMinutes: 16,
  },
};

export const SHOPPER_CONTEXT: BuyerContext = {
  customerType: 'guest',
  loyaltyTier: 'guest',
  membershipTier: 'none',
  marketRegion: 'US',
  fulfillmentMode: 'local_delivery',
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  needByAt: SCENARIO_NEED_BY_AT,
  trust: { mode: 'asserted' },
};

export interface EngineEvaluation {
  feasible: boolean;
  unitPriceCents: number;
  blockReasons: { code: string; message: string }[];
  headline: string;
  detail: string;
}

/** Runs the real engine. Called once at module load — deterministic, so the result is stable for the life of the process/render. */
function evaluateMidnightCrust(): EngineEvaluation {
  const record = evaluateOffer({
    merchant: MIDNIGHT_CRUST_MERCHANT,
    variant: MIDNIGHT_CRUST_VARIANT,
    quantity: 1,
    context: SHOPPER_CONTEXT,
    now: SCENARIO_NOW,
  });
  const trace = buildDecisionTrace(record);
  const buyer = renderBuyerTrace(trace);
  const blockReasons = record.reasons.filter(r => r.severity === 'BLOCK');
  return {
    feasible: blockReasons.length === 0,
    unitPriceCents: Math.round(MIDNIGHT_CRUST_VARIANT.basePrice * 100),
    blockReasons: blockReasons.map(r => ({ code: r.code, message: r.message })),
    headline: buyer.headline,
    detail: buyer.detail ?? buyer.headline,
  };
}

export const MIDNIGHT_CRUST_EVALUATION = evaluateMidnightCrust();

// ---------------------------------------------------------------------------
// Candidate comparison model (Scene 3 / Scene 4)
// ---------------------------------------------------------------------------

export interface QuickCommerceCandidate {
  merchantId: string;
  merchantName: string;
  merchantType: 'independent' | 'chain';
  dataSource: MerchantDataSource;
  itemName: string;
  itemPriceCents?: number;
  merchantFacts: {
    acceptingOrders: SourcedFact<boolean>;
    acceptanceCutoffLabel: SourcedFact<string>;
    itemAvailable: SourcedFact<boolean>;
    itemPrice: SourcedFact<number>;
    preparationTimeMinutes: SourcedFact<number>;
    localDeliverySupported: SourcedFact<boolean>;
    areaServiceable: SourcedFact<boolean>;
    acceptingFor30MoreMinutes: SourcedFact<boolean>;
  };
  platformFacts: {
    courierCapacity?: SourcedFact<PlatformFulfillmentSignal['courierCapacity']>;
    deliveryEtaMinutes?: SourcedFact<number>;
    estimatedArrivalLabel?: SourcedFact<string>;
  };
  verification: VerificationStatus;
  headline: string;
  explanation: string;
}

const midnightCrustSignal = PLATFORM_SIGNALS['m_midnight_crust'];
const bigboxSignal = PLATFORM_SIGNALS['m_bigbox_pizza'];

export const MIDNIGHT_CRUST_CANDIDATE: QuickCommerceCandidate = {
  merchantId: 'm_midnight_crust',
  merchantName: 'Midnight Crust',
  merchantType: 'independent',
  dataSource: 'raos',
  itemName: 'Large vegetarian pizza',
  itemPriceCents: MIDNIGHT_CRUST_EVALUATION.unitPriceCents,
  merchantFacts: {
    acceptingOrders: fresh(true, 'raos_engine'),
    acceptanceCutoffLabel: fresh('12:30 AM', 'raos_engine'),
    itemAvailable: fresh(true, 'raos_engine'),
    itemPrice: fresh(MIDNIGHT_CRUST_EVALUATION.unitPriceCents, 'raos_engine'),
    preparationTimeMinutes: fresh(16, 'raos_engine'),
    localDeliverySupported: fresh(true, 'raos_engine'),
    areaServiceable: fresh(true, 'raos_engine'),
    // Comparison against the platform-interpreted "30+ more minutes" intent
    // — see the module doc comment for why this is a platform/discovery
    // comparison, not a new engine-computed field: RAOS declares "accepting
    // until 12:30 AM" (a merchant fact); the platform is the one deciding
    // whether 70 minutes of remaining runway satisfies its own 30-minute
    // floor (specs/0003-fulfillment.md §RAOS-0004 roadmap notes).
    acceptingFor30MoreMinutes: fresh(true, 'raos_engine'),
  },
  platformFacts: {
    courierCapacity: midnightCrustSignal ? fresh(midnightCrustSignal.courierCapacity, 'platform_live') : undefined,
    deliveryEtaMinutes: midnightCrustSignal?.deliveryEtaMinutes !== undefined
      ? fresh(midnightCrustSignal.deliveryEtaMinutes, 'platform_live')
      : undefined,
    estimatedArrivalLabel: fresh('Before midnight', 'platform_live'),
  },
  verification: MIDNIGHT_CRUST_EVALUATION.feasible ? 'verified' : 'blocked',
  headline: 'Verified local match',
  explanation:
    'The item is available, the price is within budget, the store will remain accepting long enough, the customer is serviceable, and the platform delivery estimate satisfies the deadline.',
};

export const CORNER_SLICE_CANDIDATE: QuickCommerceCandidate = {
  merchantId: 'm_corner_slice',
  merchantName: 'Corner Slice',
  merchantType: 'independent',
  dataSource: 'unverified',
  itemName: 'Vegetarian pizza (listed)',
  itemPriceCents: 2200,
  merchantFacts: {
    // The listing suggests these things but nothing here is verified —
    // status 'unknown' or 'stale' throughout, never upgraded to 'fresh'.
    acceptingOrders: unknown('listing'),
    acceptanceCutoffLabel: unknown('listing'),
    itemAvailable: stale(true, 'listing'),
    itemPrice: stale(2200, 'listing'),
    preparationTimeMinutes: unknown('listing'),
    localDeliverySupported: unknown('listing'),
    areaServiceable: unknown('listing'),
    acceptingFor30MoreMinutes: unknown('listing'),
  },
  platformFacts: {
    // No platform signal at all — see platformSignals.ts: the platform has
    // never dispatched to this merchant, so it has no live read either.
  },
  verification: 'unknown',
  headline: 'Unable to verify for this time-sensitive promise',
  explanation:
    "The platform cannot verify that the store will continue accepting orders long enough to prepare and hand off the order.",
};

export const BIGBOX_CANDIDATE: QuickCommerceCandidate = {
  merchantId: 'm_bigbox_pizza',
  merchantName: 'BigBox Pizza',
  merchantType: 'chain',
  dataSource: 'platform_native',
  itemName: 'Large vegetarian pizza',
  itemPriceCents: 2700,
  merchantFacts: {
    acceptingOrders: fresh(true, 'platform_feed'),
    acceptanceCutoffLabel: fresh('2:00 AM', 'platform_feed'),
    itemAvailable: fresh(true, 'platform_feed'),
    itemPrice: fresh(2700, 'platform_feed'),
    preparationTimeMinutes: fresh(20, 'platform_feed'),
    localDeliverySupported: fresh(true, 'platform_feed'),
    areaServiceable: fresh(true, 'platform_feed'),
    acceptingFor30MoreMinutes: fresh(true, 'platform_feed'),
  },
  platformFacts: {
    courierCapacity: bigboxSignal ? fresh(bigboxSignal.courierCapacity, 'platform_live') : undefined,
    deliveryEtaMinutes: bigboxSignal?.deliveryEtaMinutes !== undefined
      ? fresh(bigboxSignal.deliveryEtaMinutes, 'platform_live')
      : undefined,
    estimatedArrivalLabel: fresh('After midnight — slower than Midnight Crust', 'platform_live'),
  },
  verification: 'verified',
  headline: 'Verified alternative',
  explanation:
    "A structured, existing platform-native feed confirms availability and price. The platform delivery estimate is valid but slower than Midnight Crust.",
};

export const QUICK_COMMERCE_CANDIDATES: QuickCommerceCandidate[] = [
  MIDNIGHT_CRUST_CANDIDATE,
  CORNER_SLICE_CANDIDATE,
  BIGBOX_CANDIDATE,
];

// ---------------------------------------------------------------------------
// Scene 2 — plain conventional-listing data (distance/rating/menu match),
// deliberately separate from the verified comparison above: this is what a
// generic search/listing surface shows BEFORE any feasibility verification.
// ---------------------------------------------------------------------------

export interface DiscoveryListing {
  merchantId: string;
  merchantName: string;
  distanceLabel: string;
  ratingLabel: string;
  menuMatch: string;
  displayedPriceCents: number;
  listedClosingLabel: string;
}

export const DISCOVERY_LISTINGS: DiscoveryListing[] = [
  {
    merchantId: 'm_midnight_crust',
    merchantName: 'Midnight Crust',
    distanceLabel: '0.4 mi',
    ratingLabel: '4.8 (1,200+ ratings)',
    menuMatch: 'Large vegetarian pizza listed',
    displayedPriceCents: 2400,
    listedClosingLabel: 'Listed open until 1:00 AM',
  },
  {
    merchantId: 'm_corner_slice',
    merchantName: 'Corner Slice',
    distanceLabel: '0.2 mi',
    ratingLabel: '4.6 (300+ ratings)',
    menuMatch: 'Vegetarian pizza listed',
    displayedPriceCents: 2200,
    listedClosingLabel: 'Listing suggests it may be open',
  },
  {
    merchantId: 'm_bigbox_pizza',
    merchantName: 'BigBox Pizza',
    distanceLabel: '0.9 mi',
    ratingLabel: '4.2 (40,000+ ratings)',
    menuMatch: 'Large vegetarian pizza listed',
    displayedPriceCents: 2700,
    listedClosingLabel: 'Listed open until 2:00 AM',
  },
];

// ---------------------------------------------------------------------------
// Checkout summary (Scene 6)
// ---------------------------------------------------------------------------

export const CHECKOUT_SUMMARY = {
  merchantName: MIDNIGHT_CRUST_CANDIDATE.merchantName,
  itemName: MIDNIGHT_CRUST_CANDIDATE.itemName,
  itemPriceCents: MIDNIGHT_CRUST_CANDIDATE.itemPriceCents ?? 0,
  fulfillmentModeLabel: 'Local delivery',
  estimatedArrivalLabel: 'Before midnight',
  acceptingUntilLabel: '12:30 AM',
  // Reuses the merchant's real acceptance-cutoff fact as the price-validity
  // boundary — RAOS-0007 (Quote Integrity) is not wired into this demo
  // scenario; this is the acceptance-window fact restated, not a separate
  // quote-token claim. See specs/0003-fulfillment.md quick-commerce note.
  priceValidUntilLabel: '12:30 AM',
  merchantDataLabel: 'Verified through RetailAgentOS',
  platformDataLabel: 'Platform-calculated',
} as const;
