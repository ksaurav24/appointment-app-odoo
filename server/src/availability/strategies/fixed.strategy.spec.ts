import { computeFixedSlots } from './fixed.strategy';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 5, h, m));

const busy = (start: Date, end: Date, confirmed: number, pending = 0) => ({
  start,
  end,
  confirmedCapacity: confirmed,
  pendingCapacity: pending,
});

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
    expect(slots.every((s) => s.state === 'available')).toBe(true);
  });

  it('emits booked state for slots that overlap a fully-confirmed range', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(11) }],
      busy: [busy(at(9, 30), at(10), 1)],
      durationMinutes: 30,
      maxBookingsPerSlot: 1,
    });
    const states = slots.map((s) => ({ start: s.start, state: s.state }));
    expect(states).toEqual([
      { start: at(9), state: 'available' },
      { start: at(9, 30), state: 'booked' },
      { start: at(10), state: 'available' },
      { start: at(10, 30), state: 'available' },
    ]);
  });

  it('reduces remaining capacity for multi-capacity slots', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(10) }],
      busy: [busy(at(9), at(9, 30), 2)],
      durationMinutes: 30,
      maxBookingsPerSlot: 5,
    });
    expect(slots[0].remainingCapacity).toBe(3);
    expect(slots[1].remainingCapacity).toBe(5);
  });

  it('marks slots as pending when a PENDING request overlaps but capacity remains', () => {
    const slots = computeFixedSlots({
      windows: [{ start: at(9), end: at(10) }],
      busy: [busy(at(9), at(9, 30), 0, 1)],
      durationMinutes: 30,
      maxBookingsPerSlot: 2,
    });
    expect(slots[0].state).toBe('pending');
    expect(slots[0].pendingCount).toBe(1);
    expect(slots[0].remainingCapacity).toBe(2);
    expect(slots[1].state).toBe('available');
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
