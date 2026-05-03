import { isoDateInZone, isoDatesInZoneSpanned } from './zone-date';

describe('isoDateInZone', () => {
  it('returns the calendar date in the target timezone, not UTC', () => {
    // 2026-05-05T22:30:00Z is 2026-05-06 03:00 in Asia/Kolkata (+05:30).
    const instant = new Date('2026-05-05T22:30:00.000Z');
    expect(isoDateInZone(instant, 'Asia/Kolkata')).toBe('2026-05-06');
    expect(isoDateInZone(instant, 'UTC')).toBe('2026-05-05');
  });
});

describe('isoDatesInZoneSpanned', () => {
  it('returns a single date when start and end fall on the same calendar day', () => {
    const start = new Date('2026-05-05T09:00:00.000Z');
    const end = new Date('2026-05-05T10:00:00.000Z');
    expect(isoDatesInZoneSpanned(start, end, 'UTC')).toEqual(['2026-05-05']);
  });

  it('returns both dates when a slot crosses midnight in the target zone', () => {
    // 23:30–00:30 IST on the 5th→6th — touches both dates.
    const start = new Date('2026-05-05T18:00:00.000Z'); // 23:30 IST
    const end = new Date('2026-05-05T19:00:00.000Z'); // 00:30 IST next day
    expect(isoDatesInZoneSpanned(start, end, 'Asia/Kolkata')).toEqual([
      '2026-05-05',
      '2026-05-06',
    ]);
  });

  it('does not include the next date when the slot ends exactly at 00:00', () => {
    // 23:00–00:00 in UTC — the boundary belongs to the earlier day only.
    const start = new Date('2026-05-05T23:00:00.000Z');
    const end = new Date('2026-05-06T00:00:00.000Z');
    expect(isoDatesInZoneSpanned(start, end, 'UTC')).toEqual(['2026-05-05']);
  });
});
