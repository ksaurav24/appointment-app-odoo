import {
  durationMinutes as rangeDurationMinutes,
  subtractBusyFromWindow,
  TimeRange,
} from '../helpers/range';

export interface VariableOpenRange {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ComputeVariableInput {
  windows: TimeRange[];
  /** Booked ranges (appointments + active slot locks). Variable bookings
   *  treat the whole range as taken; capacity != 1 is not supported in V1
   *  for variable mode (PRD §5.4 examples). */
  busy: TimeRange[];
  minDurationMins: number;
}

/**
 * Variable-duration availability per PRD §5.2. For each schedule window,
 * subtract busy ranges and return contiguous open sub-ranges that are at
 * least `minDurationMins` long. Clients pick a start within an open range
 * and a duration in `[min, min+step, …, ≤ range length]`.
 */
export function computeVariableOpenRanges(
  input: ComputeVariableInput,
): VariableOpenRange[] {
  const { windows, busy, minDurationMins } = input;
  const out: VariableOpenRange[] = [];
  for (const window of windows) {
    const open = subtractBusyFromWindow(window, busy);
    for (const range of open) {
      const dur = rangeDurationMinutes(range);
      if (dur >= minDurationMins) {
        out.push({ start: range.start, end: range.end, durationMinutes: dur });
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Given an open range and the appointment-type duration policy, enumerate
 * the valid duration choices a customer may pick (PRD §5.2 step 6). Used
 * when the customer has chosen a start time and we need to gate which
 * durations remain selectable.
 */
export function enumerateValidDurations(
  openRangeFromStart: number,
  minDurationMins: number,
  maxDurationMins: number,
  durationStepMins: number,
): number[] {
  const cap = Math.min(maxDurationMins, openRangeFromStart);
  const out: number[] = [];
  for (let d = minDurationMins; d <= cap; d += durationStepMins) {
    out.push(d);
  }
  return out;
}
