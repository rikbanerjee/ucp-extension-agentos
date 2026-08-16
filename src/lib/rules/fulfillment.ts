/**
 * RAOS-0003 · Fulfillment Feasibility — reference implementation
 *
 * Pure, deterministic evaluation of whether a variant can reach a buyer at
 * all in this context: mode, region, carrier restrictions (hazmat/oversize),
 * lead-time vs need-by, and same-day cutoff. Returns a
 * `ComputedFulfillmentFeasibility` contract and the `ReasonEntry[]` array
 * the pipeline folds into the DecisionRecord.
 *
 * Deliberately OUT of v1 scope (specs/0003-fulfillment.md §6): anything that
 * requires a LIVE capacity query (delivery-window slot capacity,
 * split-shipment planning) — it cannot be evaluated purely from injected
 * inputs, so it cannot be deterministic. Do not add such a code here without
 * first updating the spec's Scope section.
 *
 * DETERMINISM CONTRACT (RAOS-0000 / MASTER-BUILD-PLAN §1.3):
 *   - No Date.now(), Math.random(), fetch(), or new Date() anywhere in this
 *     module. Time is always the injected `now` parameter (Unix epoch ms).
 *   - Timezone conversion uses Intl.DateTimeFormat fed the raw epoch number
 *     directly (never wrapped in `new Date(...)`) plus a pure Gregorian
 *     civil-calendar <-> epoch-day algorithm (Howard Hinnant's
 *     days_from_civil/civil_from_days, public domain) for date arithmetic —
 *     no Date object is ever constructed.
 *
 * VARIANTS WITHOUT fulfillmentConstraints:
 *   Treated as FEASIBLE with NO reasons — preserves the implicit behavior of
 *   every pre-RAOS-0003 catalog variant (mirrors evaluateInventory's same
 *   convention for variants without an `inventory` config).
 */

import type { Variant } from '@/lib/types/core';
import type { BuyerContext } from '@/lib/types/context';
import type { ReasonEntry } from '@/lib/types/reasons';
import type { ComputedFulfillmentFeasibility } from '@/lib/types/extensions';

export const FULFILLMENT_NAMESPACE = 'com.os.retailagent.shopping.fulfillment_constraints';

// ---------------------------------------------------------------------------
// Pure calendar-date arithmetic (no Date object, ever)
//
// Howard Hinnant's "days from civil" / "civil from days" — a well-known,
// public-domain, allocation-free Gregorian calendar <-> epoch-day algorithm.
// http://howardhinnant.github.io/date_algorithms.html
// ---------------------------------------------------------------------------

/** Days since the Unix epoch (1970-01-01) for a given Gregorian y/m/d. */
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = (yy >= 0 ? yy : yy - 399) / 400 | 0;
  const yoe = yy - era * 400; // [0, 399]
  const mp = (m + 9) % 12; // [0, 11], Mar=0 .. Feb=11
  const doy = (153 * mp + 2) / 5 | 0;
  const doyFull = doy + d - 1; // [0, 365]
  const doe = yoe * 365 + (yoe / 4 | 0) - (yoe / 100 | 0) + doyFull; // [0, 146096]
  return era * 146097 + doe - 719468;
}

/** Add `days` whole days to a 'YYYY-MM-DD' calendar date, returning epoch-day count. */
function epochDayFromIsoDate(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return daysFromCivil(y, m, d);
}

// ---------------------------------------------------------------------------
// Pure, deterministic merchant-local time — Intl.DateTimeFormat fed the raw
// epoch number (never `new Date(...)`).
// ---------------------------------------------------------------------------

interface MerchantLocalNow {
  /** Epoch-day count (days since 1970-01-01) of the merchant-local calendar date. */
  epochDay: number;
  /** Merchant-local hour, 0–23. */
  hour: number;
}

/**
 * Resolve the merchant-local calendar date + hour for an injected `now`.
 * Returns null if the timezone identifier is unsupported/invalid — callers
 * must degrade gracefully (skip the time-dependent check) rather than throw,
 * per RAOS-0000 §7.3.
 */
function resolveMerchantLocalNow(now: number, timezone: string): MerchantLocalNow | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value;
    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    // Intl may format midnight local as "24" with hour12:false in some engines.
    const rawHour = Number(get('hour'));
    const hour = rawHour === 24 ? 0 : rawHour;
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(hour)) {
      return null;
    }
    return { epochDay: daysFromCivil(year, month, day), hour };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FulfillmentEvaluationInput {
  variant: Variant;
  context: BuyerContext;
  /** Injected Unix epoch milliseconds — never Date.now(). */
  now: number;
  /**
   * Merchant-local IANA timezone (`MerchantProfile.timezone`, RAOS-0003 §4).
   * Only consumed by `CUTOFF_PASSED` and `LEAD_TIME_EXCEEDS_NEED_BY`; every
   * other check is timezone-independent. Pass merchant.timezone; there is no
   * safe default (see MerchantProfile.timezone doc comment in core.ts) —
   * callers that genuinely have no merchant in scope should pass `'UTC'` and
   * accept that cutoff/lead-time checks against a mis-assumed timezone are a
   * best effort, not a guarantee.
   */
  merchantTimezone: string;
}

export interface FulfillmentEvaluationResult {
  feasibility: ComputedFulfillmentFeasibility;
  reasons: ReasonEntry[];
}

/**
 * Evaluate fulfillment feasibility for a variant against a buyer context.
 * Deterministic: same (variant, context, now, merchantTimezone) → same
 * output, every time. Accumulates ALL applicable reasons (does not stop at
 * the first) — mirrors calculateEligibility's accumulation pattern so an
 * agent sees every blocker in one pass, not one-at-a-time.
 */
export function evaluateFulfillmentFeasibility(
  input: FulfillmentEvaluationInput,
): FulfillmentEvaluationResult {
  const { variant, context, now, merchantTimezone } = input;
  const constraints = variant.fulfillmentConstraints;

  if (!constraints) {
    return { feasibility: { status: 'FEASIBLE', reasons: [] }, reasons: [] };
  }

  const reasons: ReasonEntry[] = [];

  // 1. Mode feasibility — RAOS-0001's FULFILLMENT_UNAVAILABLE, renamed and
  //    re-sourced here (see specs/0001-eligibility.md §11 changelog).
  if (constraints.availableModes && !constraints.availableModes.includes(context.fulfillmentMode)) {
    reasons.push({
      code: 'FULFILLMENT_MODE_UNAVAILABLE',
      message: `This product is not available for ${context.fulfillmentMode.replace('_', ' ')}.`,
      severity: 'BLOCK',
      blocking: true,
      source: FULFILLMENT_NAMESPACE,
    });
  }

  // 2. Variant-level region reach — distinct from RAOS-0001's merchant-level
  //    REGION_RESTRICTED (servesRegions). See FulfillmentConstraints.
  //    restrictedRegions doc comment (types/extensions.ts) for the crisp
  //    semantic split.
  if (constraints.restrictedRegions?.includes(context.marketRegion)) {
    reasons.push({
      code: 'REGION_NOT_SERVED',
      message: `This product cannot be fulfilled in ${context.marketRegion}.`,
      severity: 'BLOCK',
      blocking: true,
      source: FULFILLMENT_NAMESPACE,
    });
  }

  // 3. Hazmat — deterministically not shippable via parcel carrier in v1.
  if (constraints.hazmat && context.fulfillmentMode === 'shipping') {
    reasons.push({
      code: 'HAZMAT_RESTRICTION',
      message: 'This product is hazmat-classified and cannot be shipped by carrier. Pickup or local delivery only.',
      severity: 'BLOCK',
      blocking: true,
      source: FULFILLMENT_NAMESPACE,
    });
  }

  // 4. Oversize — deterministically not shippable via parcel carrier in v1.
  if (constraints.oversize && context.fulfillmentMode === 'shipping') {
    reasons.push({
      code: 'OVERSIZE_RESTRICTION',
      message: 'This product exceeds standard parcel dimensions and cannot be shipped by carrier. Pickup or local delivery only.',
      severity: 'BLOCK',
      blocking: true,
      source: FULFILLMENT_NAMESPACE,
    });
  }

  // 5. Lead time vs need-by. Absent needByDate NEVER blocks (context.ts
  //    doc comment) — this is the deliberate exception to most-restrictive
  //    defaulting (RAOS-0000 §4.3 / §13 changelog).
  if (constraints.leadTimeDays !== undefined && context.needByDate) {
    const localNow = resolveMerchantLocalNow(now, merchantTimezone);
    const needByEpochDay = epochDayFromIsoDate(context.needByDate);
    if (localNow !== null && needByEpochDay !== null) {
      const earliestFulfillableEpochDay = localNow.epochDay + constraints.leadTimeDays;
      if (earliestFulfillableEpochDay > needByEpochDay) {
        reasons.push({
          code: 'LEAD_TIME_EXCEEDS_NEED_BY',
          message: `This product needs ${constraints.leadTimeDays} day(s) to fulfill, which is later than the requested date of ${context.needByDate}.`,
          severity: 'BLOCK',
          blocking: true,
          source: FULFILLMENT_NAMESPACE,
        });
      }
    }
    // Unresolvable timezone or unparseable needByDate: fail-degraded by
    // OMITTING the check rather than blocking or throwing (RAOS-0000 §7.3)
    // — malformed input from an agent should not manufacture a false block.
  }

  // 6. Same-day cutoff — only meaningful for same-day-capable modes.
  if (
    constraints.cutoffHourLocal !== undefined &&
    (context.fulfillmentMode === 'pickup' || context.fulfillmentMode === 'local_delivery')
  ) {
    const localNow = resolveMerchantLocalNow(now, merchantTimezone);
    if (localNow !== null && localNow.hour >= constraints.cutoffHourLocal) {
      reasons.push({
        code: 'CUTOFF_PASSED',
        message: `The same-day cutoff (${constraints.cutoffHourLocal}:00 local) has passed for ${context.fulfillmentMode.replace('_', ' ')}. Next available fulfillment is a future date.`,
        severity: 'BLOCK',
        blocking: true,
        source: FULFILLMENT_NAMESPACE,
      });
    }
  }

  return {
    feasibility: { status: reasons.length > 0 ? 'BLOCKED' : 'FEASIBLE', reasons },
    reasons,
  };
}
