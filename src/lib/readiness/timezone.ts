/**
 * Browser-side wall-clock → UTC epoch conversion for a given IANA timezone.
 *
 * This is UI-input mapping code (Step 6's "order date/time" and "need-by
 * date/time" pickers), NOT rule/extension evaluation code — it is exempt
 * from the "no Date.now()" determinism contract that governs
 * src/lib/rules/** and src/lib/extensions/** because it never reads the
 * system clock. Every value here is derived entirely from explicit
 * arguments (year/month/day/hour/minute + an IANA zone id), so the same
 * inputs always produce the same output.
 *
 * Uses the standard "round-trip through Intl.DateTimeFormat" technique to
 * resolve the UTC offset that applies to a specific IANA zone at a specific
 * calendar instant (handles DST correctly for that date).
 */

/** Converts a merchant-local wall-clock date+time to a UTC epoch-ms instant. Returns null on invalid input. */
export function zonedWallClockToEpochMs(
  dateStr: string, // 'YYYY-MM-DD'
  timeStr: string, // 'HH:mm'
  timeZone: string,
): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dateMatch || !timeMatch) return null;

  const [, yStr, moStr, dStr] = dateMatch;
  const [, hStr, miStr] = timeMatch;
  const y = Number(yStr), mo = Number(moStr), d = Number(dStr), h = Number(hStr), mi = Number(miStr);

  const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
  if (Number.isNaN(utcGuess)) return null;

  let dtf: Intl.DateTimeFormat;
  try {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return null; // unresolvable timezone identifier
  }

  const parts = dtf.formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  const asUtcIfPartsWereUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'),
  );
  if (Number.isNaN(asUtcIfPartsWereUtc)) return null;

  const offsetMs = asUtcIfPartsWereUtc - utcGuess;
  return utcGuess - offsetMs;
}

/** ISO 8601 timestamp with explicit UTC offset for a merchant-local wall-clock date+time (for `needByAt`). */
export function zonedWallClockToIsoWithOffset(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): string | null {
  const epochMs = zonedWallClockToEpochMs(dateStr, timeStr, timeZone);
  if (epochMs === null) return null;
  return new Date(epochMs).toISOString(); // 'Z' suffix is a valid explicit UTC offset.
}

/** Splits a `datetime-local` input value ('YYYY-MM-DDTHH:mm') into its date and time parts. */
export function splitDateTimeLocal(value: string): { date: string; time: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}
