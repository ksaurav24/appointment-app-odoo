import {
  computeVariableOpenRanges,
  enumerateValidDurations,
} from './variable.strategy';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 5, h, m));

describe('computeVariableOpenRanges', () => {
  it('returns the full window when nothing is booked', () => {
    const ranges = computeVariableOpenRanges({
      windows: [{ start: at(6), end: at(23) }],
      busy: [],
      minDurationMins: 60,
    });
    expect(ranges).toEqual([
      { start: at(6), end: at(23), durationMinutes: 17 * 60 },
    ]);
  });

  it('splits open ranges around an existing booking', () => {
    // PRD §10.2 turf example: an existing 09:00–12:00 booking on Turf A
    const ranges = computeVariableOpenRanges({
      windows: [{ start: at(6), end: at(23) }],
      busy: [{ start: at(9), end: at(12) }],
      minDurationMins: 60,
    });
    expect(ranges).toEqual([
      { start: at(6), end: at(9), durationMinutes: 180 },
      { start: at(12), end: at(23), durationMinutes: 11 * 60 },
    ]);
  });

  it('drops sub-min-duration fragments', () => {
    const ranges = computeVariableOpenRanges({
      windows: [{ start: at(9), end: at(11) }],
      busy: [{ start: at(9, 30), end: at(10, 45) }],
      minDurationMins: 60,
    });
    // remaining open ranges: 9:00-9:30 (30m) and 10:45-11:00 (15m), both < 60.
    expect(ranges).toEqual([]);
  });
});

describe('enumerateValidDurations', () => {
  it('produces min, min+step, ..., capped by remaining range', () => {
    expect(enumerateValidDurations(180, 60, 240, 60)).toEqual([60, 120, 180]);
  });
  it('caps at maxDurationMins when that is smaller than the range', () => {
    expect(enumerateValidDurations(600, 60, 240, 60)).toEqual([
      60, 120, 180, 240,
    ]);
  });
  it('returns [] when remaining < min', () => {
    expect(enumerateValidDurations(30, 60, 240, 60)).toEqual([]);
  });
});
