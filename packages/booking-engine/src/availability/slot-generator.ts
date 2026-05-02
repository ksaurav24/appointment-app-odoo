import type {
  AppointmentTypePolicy,
  EntityAssignment,
  ResolvedScheduleDay,
  SlotCandidate,
} from '../domain/models.ts';
import {
  addMinutesToIso,
  localMinutesToUtcIso,
} from '../shared/time.ts';

export interface GenerateSlotCandidatesInput {
  appointmentType: AppointmentTypePolicy;
  resolvedDay: ResolvedScheduleDay;
  assignment: EntityAssignment;
  requestedDuration?: number;
}

export function generateSlotCandidates(
  input: GenerateSlotCandidatesInput,
): SlotCandidate[] {
  const durations = resolveRequestedDurations(
    input.appointmentType,
    input.requestedDuration,
  );

  if (durations.length === 0) {
    return [];
  }

  const [firstDuration] = durations;
  if (firstDuration === undefined) {
    return [];
  }

  const slotStepMinutes = resolveStepMinutes(input.appointmentType, firstDuration);
  const slots: SlotCandidate[] = [];
  const seenSlotStarts = new Set<string>();

  for (const window of input.resolvedDay.windows) {
    const windowInput: {
      window: ResolvedScheduleDay['windows'][number];
      appointmentType: AppointmentTypePolicy;
      resolvedDay: ResolvedScheduleDay;
      assignment: EntityAssignment;
      requestedDuration?: number;
      durations: number[];
      firstDuration: number;
      slotStepMinutes: number;
      seenSlotStarts: Set<string>;
      slots: SlotCandidate[];
    } = {
      window,
      appointmentType: input.appointmentType,
      resolvedDay: input.resolvedDay,
      assignment: input.assignment,
      durations,
      firstDuration,
      slotStepMinutes,
      seenSlotStarts,
      slots,
    };

    if (input.requestedDuration !== undefined) {
      windowInput.requestedDuration = input.requestedDuration;
    }

    appendSlotsForWindow(windowInput);
  }

  return slots;
}

function appendSlotsForWindow(input: {
  window: ResolvedScheduleDay['windows'][number];
  appointmentType: AppointmentTypePolicy;
  resolvedDay: ResolvedScheduleDay;
  assignment: EntityAssignment;
  requestedDuration?: number;
  durations: number[];
  firstDuration: number;
  slotStepMinutes: number;
  seenSlotStarts: Set<string>;
  slots: SlotCandidate[];
}): void {
  for (
    let startMinutes = input.window.startMinutes;
    startMinutes < input.window.endMinutes;
    startMinutes += input.slotStepMinutes
  ) {
    const fittingDurations = input.durations.filter(
      (duration) => startMinutes + duration <= input.window.endMinutes,
    );

    if (fittingDurations.length === 0) {
      continue;
    }

    const slotStart = localMinutesToUtcIso(
      input.resolvedDay.date,
      input.resolvedDay.timezone,
      startMinutes,
    );

    if (input.seenSlotStarts.has(slotStart)) {
      continue;
    }

    input.seenSlotStarts.add(slotStart);
    const displayDuration =
      input.requestedDuration ?? fittingDurations[0] ?? input.firstDuration;
    const allowedDurations =
      input.appointmentType.durationMode === 'fixed'
        ? null
        : fittingDurations;

    const slotBase = {
      appointmentTypeId: input.appointmentType.id,
      date: input.resolvedDay.date,
      timezone: input.resolvedDay.timezone,
      slotStart,
      slotEnd: addMinutesToIso(slotStart, displayDuration),
      bookablePersonId: input.assignment.bookablePersonId ?? null,
      bookableResourceId: input.assignment.bookableResourceId ?? null,
    } satisfies Omit<SlotCandidate, 'allowedDurations'>;

    input.slots.push({
      ...slotBase,
      ...(allowedDurations ? { allowedDurations } : {}),
    });
  }
}

function resolveRequestedDurations(
  appointmentType: AppointmentTypePolicy,
  requestedDuration?: number,
): number[] {
  if (appointmentType.durationMode === 'fixed') {
    if (!appointmentType.durationMinutes || appointmentType.durationMinutes <= 0) {
      return [];
    }

    if (
      requestedDuration &&
      requestedDuration !== appointmentType.durationMinutes
    ) {
      return [];
    }

    return [appointmentType.durationMinutes];
  }

  const minimum = appointmentType.minDurationMins ?? 0;
  const maximum = appointmentType.maxDurationMins ?? 0;
  const step = appointmentType.durationStepMins ?? minimum;

  if (minimum <= 0 || maximum < minimum || step <= 0) {
    return [];
  }

  if (requestedDuration) {
    if (
      requestedDuration < minimum ||
      requestedDuration > maximum ||
      (requestedDuration - minimum) % step !== 0
    ) {
      return [];
    }

    return [requestedDuration];
  }

  const durations: number[] = [];
  for (let current = minimum; current <= maximum; current += step) {
    durations.push(current);
  }

  return durations;
}

function resolveStepMinutes(
  appointmentType: AppointmentTypePolicy,
  fallbackDuration: number,
): number {
  return (
    appointmentType.durationStepMins ??
    appointmentType.durationMinutes ??
    fallbackDuration
  );
}
