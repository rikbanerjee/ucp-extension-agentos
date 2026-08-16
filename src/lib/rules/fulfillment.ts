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

import type { Variant, ServiceSchedule, LocalTimeRange, DayOfWeek } from '@/lib/types/core';
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

/** Inverse of `daysFromCivil` — Howard Hinnant's `civil_from_days`. */
function civilFromDays(epochDay: number): { y: number; m: number; d: number } {
  const z = epochDay + 719468;
  const era = (z >= 0 ? z : z - 146096) / 146097 | 0;
  const doe = z - era * 146097; // [0, 146096]
  const yoe = (doe - (doe / 1460 | 0) + (doe / 36524 | 0) - (doe / 146096 | 0)) / 365 | 0; // [0, 399]
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + (yoe / 4 | 0) - (yoe / 100 | 0)); // [0, 365]
  const mp = (5 * doy + 2) / 153 | 0; // [0, 11]
  const d = doy - ((153 * mp + 2) / 5 | 0) + 1; // [1, 31]
  const m = mp < 10 ? mp + 3 : mp - 9; // [1, 12]
  const yy = m <= 2 ? y + 1 : y;
  return { y: yy, m, d };
}

/** Format an epoch-day count as 'YYYY-MM-DD' for exception-date lookups. */
function isoDateFromEpochDay(epochDay: number): string {
  const { y, m, d } = civilFromDays(epochDay);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;
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
// RAOS-0003 v1.1 — merchant operating-schedule algorithm
//
// Everything below is additive to the v1.0 module above: new helpers, new
// checks (STORE_CLOSED, ORDER_ACCEPTANCE_ENDED, PREPARATION_EXCEEDS_NEED_BY,
// INSUFFICIENT_TIME_BEFORE_CLOSE), no changes to the v1.0 checks or their
// tested behavior. Same determinism contract: Intl.DateTimeFormat fed a raw
// epoch number, never `new Date(...)`.
// ---------------------------------------------------------------------------

const DOW_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_SHORT_TO_DOW: Record<string, DayOfWeek> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
};

interface MerchantLocalInstant {
  /** Epoch-day count of the merchant-local calendar date. */
  epochDay: number;
  /** Minutes since local midnight, 0–1439. */
  minutesOfDay: number;
  dayOfWeek: DayOfWeek;
}

/**
 * Richer sibling of `resolveMerchantLocalNow` — adds minute-of-day and
 * day-of-week, needed for the schedule algorithm. Same fail-degraded
 * contract: returns null (never throws) for an unresolvable timezone.
 */
function resolveMerchantLocalInstant(now: number, timezone: string): MerchantLocalInstant | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value;
    const year = Number(get('year'));
    const month = Number(get('month'));
    const day = Number(get('day'));
    const rawHour = Number(get('hour'));
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = Number(get('minute'));
    const dayOfWeek = WEEKDAY_SHORT_TO_DOW[get('weekday') ?? ''];
    if (
      !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) ||
      !Number.isFinite(hour) || !Number.isFinite(minute) || !dayOfWeek
    ) {
      return null;
    }
    return { epochDay: daysFromCivil(year, month, day), minutesOfDay: hour * 60 + minute, dayOfWeek };
  } catch {
    return null;
  }
}

/**
 * Inverse of `resolveMerchantLocalInstant`: given a merchant-local calendar
 * date + minute-of-day, find the epoch-ms instant that localizes to it in
 * `timezone`. Fixed-point iteration against `Intl.DateTimeFormat` (no `Date`
 * object, no timezone-offset table) — converges in 1–2 passes for any real
 * IANA zone, including on a DST-transition day, because the offset a guess
 * lands on only needs to stabilize, not be computed analytically. Bounded to
 * 4 iterations so a pathological/unsupported timezone can never loop.
 */
function epochMsFromMerchantLocal(epochDay: number, minutesOfDay: number, timezone: string): number | null {
  const targetTotalMinutes = epochDay * 1440 + minutesOfDay;
  let guessMs = epochDay * 86_400_000 + minutesOfDay * 60_000;
  for (let i = 0; i < 4; i++) {
    const local = resolveMerchantLocalInstant(guessMs, timezone);
    if (local === null) return null;
    const localTotalMinutes = local.epochDay * 1440 + local.minutesOfDay;
    const diffMinutes = targetTotalMinutes - localTotalMinutes;
    if (diffMinutes === 0) return guessMs;
    guessMs += diffMinutes * 60_000;
  }
  return guessMs;
}

/** Parse 'HH:mm' (24-hour, merchant-local) to minutes since midnight, or null if malformed. */
function parseHHmm(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Resolve the effective intervals for one merchant-local calendar date, honoring exceptions. */
function intervalsForDate(
  schedule: ServiceSchedule,
  dayOfWeek: DayOfWeek,
  isoDate: string,
): LocalTimeRange[] {
  const exception = schedule.exceptions?.find(e => e.date === isoDate);
  if (exception) {
    if (exception.closed) return [];
    if (exception.intervals) return exception.intervals;
    return []; // malformed exception (neither closed nor intervals) degrades to "no hours asserted"
  }
  return schedule.weekly.find(d => d.day === dayOfWeek)?.intervals ?? [];
}

interface ScheduleWindow {
  openNow: boolean;
  /** Order acceptance is still open (implies openNow). False when closed OR past the acceptance buffer. */
  acceptingNow: boolean;
  /** Epoch-ms the currently-active interval closes, or null when not open. */
  closeAtMs: number | null;
}

/**
 * Resolve whether the merchant is open, and still accepting orders, at
 * `now` — evaluating today's intervals AND yesterday's overnight spillover
 * (an interval whose `closesAt <= opensAt` crosses midnight into today).
 * Returns null when the timezone is unresolvable (fail-degraded — callers
 * must OMIT the schedule checks, never fabricate a block).
 */
function resolveScheduleWindow(now: number, timezone: string, schedule: ServiceSchedule): ScheduleWindow | null {
  const local = resolveMerchantLocalInstant(now, timezone);
  if (local === null) return null;

  const todayIso = isoDateFromEpochDay(local.epochDay);
  const yesterdayEpochDay = local.epochDay - 1;
  const yesterdayIso = isoDateFromEpochDay(yesterdayEpochDay);
  const yesterdayDow = DOW_ORDER[(DOW_ORDER.indexOf(local.dayOfWeek) + 6) % 7];

  const todayIntervals = intervalsForDate(schedule, local.dayOfWeek, todayIso);
  const yesterdayIntervals = intervalsForDate(schedule, yesterdayDow, yesterdayIso);

  const candidates: { openMs: number; closeMs: number }[] = [];

  for (const iv of todayIntervals) {
    const openMin = parseHHmm(iv.opensAt);
    const closeMin = parseHHmm(iv.closesAt);
    if (openMin === null || closeMin === null) continue; // malformed interval — skip, don't fabricate
    const crossesMidnight = closeMin <= openMin;
    const openMs = epochMsFromMerchantLocal(local.epochDay, openMin, timezone);
    const closeMs = epochMsFromMerchantLocal(crossesMidnight ? local.epochDay + 1 : local.epochDay, closeMin, timezone);
    if (openMs === null || closeMs === null) continue;
    candidates.push({ openMs, closeMs });
  }

  // Only yesterday's midnight-crossing intervals can still be "open" today.
  for (const iv of yesterdayIntervals) {
    const openMin = parseHHmm(iv.opensAt);
    const closeMin = parseHHmm(iv.closesAt);
    if (openMin === null || closeMin === null) continue;
    if (closeMin > openMin) continue; // does not cross midnight — irrelevant to today
    const openMs = epochMsFromMerchantLocal(yesterdayEpochDay, openMin, timezone);
    const closeMs = epochMsFromMerchantLocal(local.epochDay, closeMin, timezone);
    if (openMs === null || closeMs === null) continue;
    candidates.push({ openMs, closeMs });
  }

  const active = candidates.find(c => now >= c.openMs && now < c.closeMs);
  if (!active) {
    return { openNow: false, acceptingNow: false, closeAtMs: null };
  }

  const bufferMs = (schedule.orderAcceptanceBufferMinutes ?? 0) * 60_000;
  const acceptanceCutoffMs = active.closeMs - bufferMs;
  return { openNow: true, acceptingNow: now < acceptanceCutoffMs, closeAtMs: active.closeMs };
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
  /**
   * RAOS-0003 v1.1 — merchant operating schedule (`MerchantProfile.
   * serviceSchedule`). OPTIONAL: absent means the schedule/acceptance/
   * preparation checks below are all OMITTED (never fabricate a block from
   * a declaration the merchant never made). Only consumed by
   * `STORE_CLOSED`, `ORDER_ACCEPTANCE_ENDED`, `PREPARATION_EXCEEDS_NEED_BY`,
   * and `INSUFFICIENT_TIME_BEFORE_CLOSE`.
   */
  merchantSchedule?: import('@/lib/types/core').ServiceSchedule;
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
  const { variant, context, now, merchantTimezone, merchantSchedule } = input;
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

  // 7. Merchant operating schedule (RAOS-0003 v1.1) — same-day modes only,
  //    same gating rationale as check 6 (cutoffHourLocal): whether the store
  //    is open right now is not a fact a multi-day shipping promise depends
  //    on. Absent `merchantSchedule` OMITS both schedule checks entirely —
  //    this is NOT "default to open"; it is declining to assert a claim the
  //    merchant never declared (see ServiceSchedule doc comment, core.ts).
  let scheduleWindow: ScheduleWindow | null = null;
  if (
    merchantSchedule &&
    (context.fulfillmentMode === 'pickup' || context.fulfillmentMode === 'local_delivery')
  ) {
    scheduleWindow = resolveScheduleWindow(now, merchantTimezone, merchantSchedule);
    if (scheduleWindow !== null) {
      if (!scheduleWindow.openNow) {
        reasons.push({
          code: 'STORE_CLOSED',
          message: `The store is not open for ${context.fulfillmentMode.replace('_', ' ')} at this time.`,
          severity: 'BLOCK',
          blocking: true,
          source: FULFILLMENT_NAMESPACE,
        });
      } else if (!scheduleWindow.acceptingNow) {
        reasons.push({
          code: 'ORDER_ACCEPTANCE_ENDED',
          message: `The store has stopped accepting new ${context.fulfillmentMode.replace('_', ' ')} orders for its current hours.`,
          severity: 'BLOCK',
          blocking: true,
          source: FULFILLMENT_NAMESPACE,
        });
      }
    }
    // Unresolvable merchantTimezone: fail-degraded by OMITTING (mirrors
    // checks 5/6) — a malformed timezone identifier should not manufacture
    // a false block.
  }

  // 8/9. Preparation time vs. exact need-by / vs. store close (RAOS-0003
  //      v1.1). Same-day modes only — preparation minutes only matter when
  //      the promise is "today," which is exactly the scope `needByAt`
  //      exists for (day-granularity `leadTimeDays`/`needByDate` already
  //      covers multi-day shipping). Both sub-checks are independent and
  //      accumulate per this function's "collect every applicable reason"
  //      contract; each requires its own asserted input (needByAt / an
  //      open, resolvable schedule window) and never fabricates one.
  if (
    constraints.preparationTimeMinutes !== undefined &&
    (context.fulfillmentMode === 'pickup' || context.fulfillmentMode === 'local_delivery')
  ) {
    const prepMs = constraints.preparationTimeMinutes * 60_000;
    const readyAtMs = now + prepMs;

    if (context.needByAt) {
      const needByAtMs = epochMsFromIsoTimestamp(context.needByAt);
      if (needByAtMs !== null && readyAtMs > needByAtMs) {
        reasons.push({
          code: 'PREPARATION_EXCEEDS_NEED_BY',
          message: `This item needs ${constraints.preparationTimeMinutes} minute(s) to prepare, which would not be ready by the requested deadline.`,
          severity: 'BLOCK',
          blocking: true,
          source: FULFILLMENT_NAMESPACE,
        });
      }
      // Unparseable needByAt: OMIT (fail-degraded), never fabricate a block
      // from malformed input — same discipline as needByDate (check 5).
    }

    if (scheduleWindow !== null && scheduleWindow.openNow && scheduleWindow.closeAtMs !== null) {
      if (readyAtMs > scheduleWindow.closeAtMs) {
        reasons.push({
          code: 'INSUFFICIENT_TIME_BEFORE_CLOSE',
          message: `This item needs ${constraints.preparationTimeMinutes} minute(s) to prepare, which would not be ready before the store closes.`,
          severity: 'BLOCK',
          blocking: true,
          source: FULFILLMENT_NAMESPACE,
        });
      }
    }
  }

  return {
    feasibility: { status: reasons.length > 0 ? 'BLOCKED' : 'FEASIBLE', reasons },
    reasons,
  };
}

// ---------------------------------------------------------------------------
// RAOS-0003 v1.1 — pure ISO 8601 timestamp parser (no `Date` object, ever)
// ---------------------------------------------------------------------------

/**
 * Parse an ISO 8601 timestamp with an explicit UTC offset (`Z` or
 * `±HH:mm`) to epoch milliseconds. Returns null for anything else — no
 * bare/local-time strings, no partial dates, no throwing on malformed
 * input (RAOS-0000 §7.3: an agent's malformed timestamp degrades the
 * check away, it never fabricates a block).
 */
function epochMsFromIsoTimestamp(iso: string): number | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const [, yStr, moStr, dStr, hStr, miStr, sStr, msStr, offStr] = match;
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);
  const h = Number(hStr);
  const mi = Number(miStr);
  const s = sStr ? Number(sStr) : 0;
  const ms = msStr ? Number(msStr.padEnd(3, '0')) : 0;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;

  const epochDay = daysFromCivil(y, mo, d);
  let totalMs = epochDay * 86_400_000 + h * 3_600_000 + mi * 60_000 + s * 1000 + ms;

  if (offStr !== 'Z') {
    const sign = offStr[0] === '-' ? -1 : 1;
    const offH = Number(offStr.slice(1, 3));
    const offM = Number(offStr.slice(4, 6));
    totalMs -= sign * (offH * 3_600_000 + offM * 60_000);
  }
  return totalMs;
}
