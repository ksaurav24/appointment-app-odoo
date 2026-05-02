import { dayOfWeekInZone, wallTimeToUtc } from './time-zone';

describe('wallTimeToUtc', () => {
  it('converts a UTC wall time directly', () => {
    expect(wallTimeToUtc('2026-05-05', '09:00', 'UTC').toISOString()).toBe(
      '2026-05-05T09:00:00.000Z',
    );
  });

  it('subtracts the IST offset (UTC+5:30)', () => {
    expect(
      wallTimeToUtc('2026-05-05', '09:00', 'Asia/Kolkata').toISOString(),
    ).toBe('2026-05-05T03:30:00.000Z');
  });

  it('handles timezones that are west of UTC', () => {
    // 2026-05-05 09:00 New York (EDT, UTC-4) → 13:00 UTC
    expect(
      wallTimeToUtc('2026-05-05', '09:00', 'America/New_York').toISOString(),
    ).toBe('2026-05-05T13:00:00.000Z');
  });
});

describe('dayOfWeekInZone', () => {
  it('returns Monday=1 for a known Monday', () => {
    expect(dayOfWeekInZone('2026-05-04', 'UTC')).toBe(1);
  });
  it('returns Sunday=0 for a known Sunday', () => {
    expect(dayOfWeekInZone('2026-05-03', 'UTC')).toBe(0);
  });
});
