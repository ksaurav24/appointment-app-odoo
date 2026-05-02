import type { ISODate, ISODateTime, LocalTimeWindow } from '../domain/value-objects.ts';

export const MINUTES_PER_DAY = 24 * 60;

export function parseTimeOfDay(value: string): number {
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(`Invalid time of day: ${value}`);
  }

  return hour * 60 + minute;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(totalMinutes, MINUTES_PER_DAY));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getDayOfWeek(date: ISODate): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

export function mergeLocalWindows(
  windows: readonly LocalTimeWindow[],
): LocalTimeWindow[] {
  const normalized = windows
    .filter((window) => window.endMinutes > window.startMinutes)
    .slice()
    .sort(
      (left: LocalTimeWindow, right: LocalTimeWindow) =>
        left.startMinutes - right.startMinutes,
    );

  const merged: LocalTimeWindow[] = [];

  for (const current of normalized) {
    const previous = merged.at(-1);
    if (!previous) {
      merged.push({ ...current });
      continue;
    }

    if (current.startMinutes <= previous.endMinutes) {
      previous.endMinutes = Math.max(previous.endMinutes, current.endMinutes);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function subtractLocalWindows(
  baseWindows: readonly LocalTimeWindow[],
  excludedWindows: readonly LocalTimeWindow[],
): LocalTimeWindow[] {
  let remaining = mergeLocalWindows(baseWindows);

  for (const exclusion of mergeLocalWindows(excludedWindows)) {
    const next: LocalTimeWindow[] = [];

    for (const window of remaining) {
      if (
        exclusion.endMinutes <= window.startMinutes ||
        exclusion.startMinutes >= window.endMinutes
      ) {
        next.push(window);
        continue;
      }

      if (exclusion.startMinutes > window.startMinutes) {
        next.push({
          startMinutes: window.startMinutes,
          endMinutes: exclusion.startMinutes,
        });
      }

      if (exclusion.endMinutes < window.endMinutes) {
        next.push({
          startMinutes: exclusion.endMinutes,
          endMinutes: window.endMinutes,
        });
      }
    }

    remaining = next;
  }

  return remaining;
}

export function localMinutesToUtcIso(
  date: ISODate,
  timeZone: string,
  minutes: number,
): ISODateTime {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const desiredLocal = Date.UTC(year, month - 1, day, hours, mins, 0);
  let guess = new Date(desiredLocal);

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parts = getDatePartsInTimeZone(guess, timeZone);
    const observedLocal = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = desiredLocal - observedLocal;

    if (diff === 0) {
      return guess.toISOString();
    }

    guess = new Date(guess.getTime() + diff);
  }

  return guess.toISOString();
}

export function addMinutesToIso(dateTime: ISODateTime, minutes: number): ISODateTime {
  return new Date(new Date(dateTime).getTime() + minutes * 60_000).toISOString();
}

export function extractIsoDateInTimeZone(
  dateTime: ISODateTime,
  timeZone: string,
): ISODate {
  const parts = getDatePartsInTimeZone(new Date(dateTime), timeZone);

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
    parts.day,
  ).padStart(2, '0')}` as ISODate;
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new Error(`Missing ${type} part for timezone conversion`);
    }

    return Number(value);
  };

  return {
    year: readPart('year'),
    month: readPart('month'),
    day: readPart('day'),
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
}
