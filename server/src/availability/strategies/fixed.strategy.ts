import { addMinutes, rangesOverlap, TimeRange } from '../helpers/range';

export interface FixedSlot {
  start: Date;
  end: Date;
  remainingCapacity: number;
}

export interface ComputeFixedSlotsInput {
  windows: TimeRange[];
  /** Already-acquired ranges (appointments + active slot locks). */
  busy: BusyRange[];
  durationMinutes: number;
  maxBookingsPerSlot: number;
}

export interface BusyRange extends TimeRange {
  /** Capacity already consumed by this booking/lock (>=1). */
  capacity: number;
}

/**
 * Fixed-duration slot generation per PRD §5.1. Slots step by `durationMinutes`
 * inside each schedule window. A slot is included iff its remaining capacity
 * (maxBookingsPerSlot − overlap-weighted busy) is > 0. For
 * maxBookingsPerSlot=1 this reduces to "no overlap".
 */
export function computeFixedSlots(input: ComputeFixedSlotsInput): FixedSlot[] {
  const { windows, busy, durationMinutes, maxBookingsPerSlot } = input;
  const slots: FixedSlot[] = [];

  for (const window of windows) {
    let cursor = window.start;
    while (
      cursor.getTime() + durationMinutes * 60_000 <=
      window.end.getTime()
    ) {
      const slot: TimeRange = {
        start: cursor,
        end: addMinutes(cursor, durationMinutes),
      };
      const consumed = busy
        .filter((b) => rangesOverlap(b, slot))
        .reduce((sum, b) => sum + b.capacity, 0);
      const remaining = maxBookingsPerSlot - consumed;
      if (remaining > 0) {
        slots.push({
          start: slot.start,
          end: slot.end,
          remainingCapacity: remaining,
        });
      }
      cursor = addMinutes(cursor, durationMinutes);
    }
  }
  return slots;
}
