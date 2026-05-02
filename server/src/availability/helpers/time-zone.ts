const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isIsoDate(value: string): boolean {
  return DATE_REGEX.test(value);
}

export function isWallTime(value: string): boolean {
  return TIME_REGEX.test(value);
}

/**
 * Returns the offset (ms) added to UTC to get the wall-clock time of `tz` at
 * the given UTC instant. Positive for east of UTC. Naïve but DST-aware: we
 * format the UTC moment in the target zone and re-parse, then subtract the
 * UTC mirror. Two-step iteration corrects the rare boundary case where the
 * naive UTC guess lands on the wrong side of a DST transition.
 */
function getZoneOffsetMs(tz: string, utc: Date): number {
  const localized = new Date(utc.toLocaleString('en-US', { timeZone: tz }));
  const utcMirror = new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' }));
  return localized.getTime() - utcMirror.getTime();
}

/** Convert a wall-clock date+time in `tz` to the corresponding UTC Date. */
export function wallTimeToUtc(
  dateIso: string,
  timeHHMM: string,
  tz: string,
): Date {
  if (!isIsoDate(dateIso)) {
    throw new Error(`Invalid date: ${dateIso}`);
  }
  if (!isWallTime(timeHHMM)) {
    throw new Error(`Invalid time: ${timeHHMM}`);
  }
  const [y, m, d] = dateIso.split('-').map(Number);
  const [h, mi] = timeHHMM.split(':').map(Number);
  const naiveUtcMs = Date.UTC(y, m - 1, d, h, mi);

  let offset = getZoneOffsetMs(tz, new Date(naiveUtcMs));
  let candidate = naiveUtcMs - offset;
  // Refine once: the offset depends on the *target* instant, not the naive one.
  const refined = getZoneOffsetMs(tz, new Date(candidate));
  if (refined !== offset) {
    offset = refined;
    candidate = naiveUtcMs - offset;
  }
  return new Date(candidate);
}

/** 0 = Sunday … 6 = Saturday — the weekday in the target timezone. */
export function dayOfWeekInZone(dateIso: string, tz: string): number {
  const utcAtMidnight = wallTimeToUtc(dateIso, '12:00', tz);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  });
  const weekday = fmt.format(utcAtMidnight);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const result = map[weekday];
  if (result == null) {
    throw new Error(`Unknown weekday "${weekday}" for ${dateIso} in ${tz}`);
  }
  return result;
}
