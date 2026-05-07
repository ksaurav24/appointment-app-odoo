import { addMinutes, rangesOverlap, TimeRange } from '../helpers/range';

export type SlotState = 'available' | 'pending' | 'booked';

export interface FixedSlot {
  start: Date;
  end: Date;
  remainingCapacity: number;
  /** Capacity already consumed by CONFIRMED appointments overlapping this slot. */
  confirmedCount: number;
  /**
   * Capacity already consumed by PENDING appointments overlapping this slot.
   * Always 0 for non-`manualConfirmation` types since PENDING contributes to
   * `confirmedCount` accounting via `treatPendingAsConfirmed`.
   */
  pendingCount: number;
  state: SlotState;
}

export interface ComputeFixedSlotsInput {
  windows: TimeRange[];
  /**
   * Already-acquired ranges. For each entry, callers must classify capacity
   * into CONFIRMED vs PENDING — pending is shown as a yellow "request
   * approval" state on the booking page, while booked (gray) is reached only
   * once `confirmedCapacity >= maxBookingsPerSlot`.
   */
  busy: BusyRange[];
  durationMinutes: number;
  maxBookingsPerSlot: number;
}

export interface BusyRange extends TimeRange {
  /** CONFIRMED capacity (and slot_lock holds, which always count as confirmed). */
  confirmedCapacity: number;
  /** PENDING capacity (manual-approval requests awaiting organiser action). */
  pendingCapacity: number;
}

/**
 * Fixed-duration slot generation per PRD §5.1. A slot is included unless it
 * is fully booked by CONFIRMED capacity. PENDING capacity does NOT remove
 * the slot from the response — instead, the caller surfaces it as
 * `state: 'pending'` so the user can submit their own competing request.
 *
 * Slots step by `durationMinutes` inside each schedule window.
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
      let confirmed = 0;
      let pending = 0;
      for (const b of busy) {
        if (!rangesOverlap(b, slot)) continue;
        confirmed += b.confirmedCapacity;
        pending += b.pendingCapacity;
      }
      const remaining = maxBookingsPerSlot - confirmed;
      if (remaining > 0) {
        const state: SlotState = pending > 0 ? 'pending' : 'available';
        slots.push({
          start: slot.start,
          end: slot.end,
          remainingCapacity: remaining,
          confirmedCount: confirmed,
          pendingCount: pending,
          state,
        });
      } else {
        // Surfacing fully-booked slots as `booked` lets the UI render them as
        // grayed-out chips instead of silently omitting them, which matches
        // the user's mental model of "the day's calendar".
        slots.push({
          start: slot.start,
          end: slot.end,
          remainingCapacity: 0,
          confirmedCount: confirmed,
          pendingCount: pending,
          state: 'booked',
        });
      }
      cursor = addMinutes(cursor, durationMinutes);
    }
  }
  return slots;
}
