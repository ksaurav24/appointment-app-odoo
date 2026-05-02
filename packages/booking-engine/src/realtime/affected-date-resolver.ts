import type { AvailabilityMutationInput } from '../domain/models.ts';
import type { ISODate } from '../domain/value-objects.ts';
import { extractIsoDateInTimeZone } from '../shared/time.ts';

export function resolveAffectedDates(
  input: AvailabilityMutationInput,
): ISODate[] {
  const timezone = input.timezone ?? 'UTC';

  switch (input.reason) {
    case 'booking.rescheduled':
      return uniqueDates([
        input.oldStartTime
          ? extractIsoDateInTimeZone(input.oldStartTime, timezone)
          : null,
        input.newStartTime
          ? extractIsoDateInTimeZone(input.newStartTime, timezone)
          : null,
      ]);
    case 'schedule.updated':
      return resolveRangeOrPointDates(input, timezone);
    case 'appointment-type.updated':
      return resolveFutureDates(input, timezone);
    default:
      return uniqueDates([
        input.newStartTime
          ? extractIsoDateInTimeZone(input.newStartTime, timezone)
          : null,
        input.oldStartTime
          ? extractIsoDateInTimeZone(input.oldStartTime, timezone)
          : null,
      ]);
  }
}

function resolveRangeOrPointDates(
  input: AvailabilityMutationInput,
  timezone: string,
): ISODate[] {
  if (input.rangeStartDate && input.rangeEndDate) {
    return enumerateDates(input.rangeStartDate, input.rangeEndDate);
  }

  return uniqueDates([
    input.newStartTime
      ? extractIsoDateInTimeZone(input.newStartTime, timezone)
      : null,
    input.oldStartTime
      ? extractIsoDateInTimeZone(input.oldStartTime, timezone)
      : null,
  ]);
}

function resolveFutureDates(
  input: AvailabilityMutationInput,
  timezone: string,
): ISODate[] {
  if (input.rangeStartDate && input.rangeEndDate) {
    return enumerateDates(input.rangeStartDate, input.rangeEndDate);
  }

  const startDate =
    input.rangeStartDate ?? extractIsoDateInTimeZone(input.occurredAt, timezone);
  const futureDays = input.futureDays ?? 0;

  if (futureDays <= 0) {
    return [startDate];
  }

  return enumerateDates(startDate, addDays(startDate, futureDays));
}

function enumerateDates(startDate: ISODate, endDate: ISODate): ISODate[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const dates: ISODate[] = [];

  for (let cursor = start; cursor <= end; cursor = addDate(cursor, 1)) {
    dates.push(cursor.toISOString().slice(0, 10) as ISODate);
  }

  return dates;
}

function addDays(date: ISODate, days: number): ISODate {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);

  return cursor.toISOString().slice(0, 10) as ISODate;
}

function addDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function uniqueDates(values: Array<ISODate | null>): ISODate[] {
  return [...new Set(values.filter((value): value is ISODate => value !== null))];
}
