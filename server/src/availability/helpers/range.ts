export interface TimeRange {
  start: Date;
  end: Date;
}

/** Two ranges overlap iff a.start < b.end AND a.end > b.start. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return (
    a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime()
  );
}

/**
 * Subtract a list of busy ranges from a single available window, returning
 * the contiguous open sub-ranges. Both inputs must be in absolute time (UTC).
 * Busy ranges may overlap each other; they are sorted and merged first.
 */
export function subtractBusyFromWindow(
  window: TimeRange,
  busy: TimeRange[],
): TimeRange[] {
  if (busy.length === 0) return [{ ...window }];

  const merged = mergeRanges(
    busy
      .filter((r) => rangesOverlap(r, window))
      .map((r) => ({
        start:
          r.start.getTime() < window.start.getTime() ? window.start : r.start,
        end: r.end.getTime() > window.end.getTime() ? window.end : r.end,
      })),
  );

  const result: TimeRange[] = [];
  let cursor = window.start;
  for (const b of merged) {
    if (b.start.getTime() > cursor.getTime()) {
      result.push({ start: cursor, end: b.start });
    }
    if (b.end.getTime() > cursor.getTime()) {
      cursor = b.end;
    }
  }
  if (cursor.getTime() < window.end.getTime()) {
    result.push({ start: cursor, end: window.end });
  }
  return result;
}

/** Merge overlapping/adjacent ranges. Returns a new sorted array. */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length <= 1) return [...ranges];
  const sorted = [...ranges].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const out: TimeRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const r = sorted[i];
    if (r.start.getTime() <= last.end.getTime()) {
      if (r.end.getTime() > last.end.getTime()) last.end = r.end;
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

export function durationMinutes(range: TimeRange): number {
  return Math.floor((range.end.getTime() - range.start.getTime()) / 60_000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
