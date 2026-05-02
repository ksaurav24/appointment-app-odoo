import { computeFixedSlots } from './fixed.strategy';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 5, h, m));

describe('computeFixedSlots', () => {
  it('generates 30-minute slots in a single window with no busy ranges', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(11) }],
      busy: [],
      durationMinutes: 30,
      maxBookingsPerSlot: 1,
    });
    expect(slots.map((s) => s.start)).toEqual([
      at(9),
      at(9, 30),
      at(10),
      at(10, 30),
    ]);
    expect(slots.every((s) => s.remainingCapacity === 1)).toBe(true);
  });

  it('omits slots that overlap a non-capacity busy range', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(11) }],
      busy: [{ start: at(9, 30), end: at(10), capacity: 1 }],
      durationMinutes: 30,
      maxBookingsPerSlot: 1,
    });
    expect(slots.map((s) => s.start)).toEqual([at(9), at(10), at(10, 30)]);
  });

  it('reduces remaining capacity for multi-capacity slots', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(10) }],
      busy: [{ start: at(9), end: at(9, 30), capacity: 2 }],
      durationMinutes: 30,
      maxBookingsPerSlot: 5,
    });
    expect(slots[0].remainingCapacity).toBe(3);
    expect(slots[1].remainingCapacity).toBe(5);
  });

  it('respects multiple disjoint windows (lunch break)', () => {
    const slots = computeFixedSlots({
      windows: [
        { start: at(9), end: at(13) },
        { start: at(14), end: at(17) },
      ],
      busy: [],
      durationMinutes: 60,
      maxBookingsPerSlot: 1,
    });
    expect(slots.map((s) => s.start)).toEqual([
      at(9),
      at(10),
      at(11),
      at(12),
      at(14),
      at(15),
      at(16),
    ]);
  });

  it('drops a tail that does not fit a full duration', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(10, 15) }],
      busy: [],
      durationMinutes: 30,
      maxBookingsPerSlot: 1,
    });
    expect(slots.map((s) => s.start)).toEqual([at(9), at(9, 30)]);
  });
});
