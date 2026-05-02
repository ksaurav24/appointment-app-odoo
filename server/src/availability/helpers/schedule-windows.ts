import { ScheduleRule, ScheduleType } from '@prisma/client';
import { TimeRange } from './range';
import { dayOfWeekInZone, wallTimeToUtc } from './time-zone';

/**
 * Resolve the list of UTC time ranges available on `dateIso` (in zone `tz`)
 * for an appointment type with `scheduleType` and the given `rules`.
 * Rules with isAvailable=false are excluded — V1 treats them as unavailable
 * overrides.
 */
export function resolveScheduleWindowsForDate(
  scheduleType: ScheduleType,
  rules: ScheduleRule[],
  dateIso: string,
  tz: string,
): TimeRange[] {
  const matching = rules.filter(
    (r) => r.isAvailable && matches(r, scheduleType, dateIso, tz),
  );
  return matching
    .map((r) => ({
      start: wallTimeToUtc(dateIso, r.startTime, tz),
      end: wallTimeToUtc(dateIso, r.endTime, tz),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function matches(
  rule: ScheduleRule,
  scheduleType: ScheduleType,
  dateIso: string,
  tz: string,
): boolean {
  if (scheduleType === ScheduleType.WEEKLY) {
    if (rule.dayOfWeek == null) return false;
    return rule.dayOfWeek === dayOfWeekInZone(dateIso, tz);
  }
  if (rule.specificDate == null) return false;
  // specificDate is stored as a Date (DB DATE type). Compare YYYY-MM-DD in UTC
  // since Prisma materialises it as the start of that day at UTC.
  const stored = rule.specificDate.toISOString().slice(0, 10);
  return stored === dateIso;
}
