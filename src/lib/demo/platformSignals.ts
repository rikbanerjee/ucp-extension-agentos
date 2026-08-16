/**
 * Platform-owned live delivery signals for the /guided/platform NYC
 * late-night pizza scenario.
 *
 * These are NOT RetailAgentOS facts. RAOS-0003 (merchant-declared
 * feasibility) has no opinion on courier capacity, routing, or delivery
 * ETA — those depend on live dispatch/routing systems the merchant cannot
 * see and RAOS does not query (see `specs/0003-fulfillment.md` §3/§9.1 and
 * `specs/work-packages/RAOS-0003-quick-commerce-provider-signals.md`).
 *
 * `PlatformFulfillmentSignal` is the explicit, timestamped shape a platform
 * would compose alongside the RAOS merchant-feasibility result. This module
 * supplies FICTIONAL, hand-authored values for the demo — deliberately NOT
 * derived from any engine evaluation, so the boundary between "RAOS computed
 * this" and "the platform supplied this" stays visible in the data itself,
 * not just in prose.
 */

/**
 * A platform/provider's live fulfillment-capacity assertion for one merchant,
 * at one observed instant. Mirrors the shape sketched in
 * `specs/0003-fulfillment.md` §9.1 (designed, not built, as an engine input)
 * — this demo module is the reference shape a real platform integration
 * would populate, not a claim that RAOS computes any of it.
 */
export interface PlatformFulfillmentSignal {
  providerId: string;
  merchantId: string;
  serviceable: boolean | 'unknown';
  courierCapacity: 'available' | 'limited' | 'unavailable' | 'unknown';
  pickupEtaMinutes?: number;
  deliveryEtaMinutes?: number;
  /** ISO 8601 timestamp with offset — the platform's estimated arrival instant. */
  estimatedArrivalAt?: string;
  /** Fixed scenario epoch-ms this signal was "observed" at (never Date.now() — this is demo data, not live). */
  observedAt: number;
  /** Fixed scenario epoch-ms this signal expires at. */
  expiresAt: number;
}

// Scenario clock — same fixed instant as platformQuickCommerceScenario.ts's
// SCENARIO_NOW (2026-01-15 23:20 America/New_York). Duplicated as a literal
// here (not imported) so this module stays a self-contained "platform data"
// artifact — a real platform integration would populate this from its own
// live system, with no dependency on RAOS's scenario module.
const SCENARIO_NOW = 1768537200000;

export const PLATFORM_SIGNALS: Record<string, PlatformFulfillmentSignal> = {
  m_midnight_crust: {
    providerId: 'platform_dispatch',
    merchantId: 'm_midnight_crust',
    serviceable: true,
    courierCapacity: 'available',
    pickupEtaMinutes: 4,
    deliveryEtaMinutes: 12,
    estimatedArrivalAt: '2026-01-15T23:52:00-05:00', // ready ~23:36 + dispatch/drive → before midnight
    observedAt: SCENARIO_NOW,
    expiresAt: SCENARIO_NOW + 5 * 60_000,
  },
  m_bigbox_pizza: {
    providerId: 'platform_dispatch',
    merchantId: 'm_bigbox_pizza',
    serviceable: true,
    courierCapacity: 'limited',
    pickupEtaMinutes: 6,
    deliveryEtaMinutes: 24,
    estimatedArrivalAt: '2026-01-16T00:20:00-05:00', // valid, but after midnight — slower than Midnight Crust
    observedAt: SCENARIO_NOW,
    expiresAt: SCENARIO_NOW + 5 * 60_000,
  },
  // Corner Slice has no platform delivery signal at all — the platform has
  // never dispatched here before and has no live read on this merchant.
  // Absence is meaningful: it compounds with the unverified merchant data
  // to produce an UNKNOWN outcome, not a fabricated "unavailable" one.
};
