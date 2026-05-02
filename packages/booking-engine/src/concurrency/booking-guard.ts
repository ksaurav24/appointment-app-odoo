import type {
  ActiveHold,
  AvailabilitySnapshot,
  BookingDecision,
  ConfirmBookingInput,
} from '../domain/models.ts';
import type { ISODateTime } from '../domain/value-objects.ts';
import { addMinutesToIso } from '../shared/time.ts';
import { resolveRequestedSlot } from './request-evaluator.ts';

export interface ConfirmBookingFromSnapshotInput extends ConfirmBookingInput {
  snapshot: AvailabilitySnapshot;
  blockingStatuses: readonly string[];
  now: ISODateTime;
  timezoneOverride?: string;
}

export function confirmBookingFromSnapshot(
  input: ConfirmBookingFromSnapshotInput,
): BookingDecision {
  if (input.requestedDuration <= 0 || input.requestedCapacity <= 0) {
    return {
      confirmed: false,
      reason: 'invalid_request',
    };
  }

  if (input.snapshot.appointmentType.id !== input.appointmentTypeId) {
    return {
      confirmed: false,
      reason: 'appointment_type_mismatch',
    };
  }

  const holdValidation = validateHold(input);
  if (!holdValidation.ok) {
    return {
      confirmed: false,
      reason: holdValidation.reason,
    };
  }

  const callerHold = holdValidation.hold;

  const snapshotForConfirmation: AvailabilitySnapshot = {
    ...input.snapshot,
    activeHolds: callerHold
      ? input.snapshot.activeHolds.filter((hold) => hold.id !== callerHold.id)
      : input.snapshot.activeHolds,
  };
  const resolutionInput: {
    request: ConfirmBookingFromSnapshotInput;
    snapshot: AvailabilitySnapshot;
    blockingStatuses: readonly string[];
    now: ISODateTime;
    timezoneOverride?: string;
  } = {
    request: input,
    snapshot: snapshotForConfirmation,
    blockingStatuses: input.blockingStatuses,
    now: input.now,
  };

  assignIfDefined(
    resolutionInput,
    'timezoneOverride',
    input.timezoneOverride,
  );

  const resolution = resolveRequestedSlot(resolutionInput);

  if (!resolution.assignment) {
    return {
      confirmed: false,
      reason: 'assignment_not_allowed',
    };
  }

  if (!resolution.slot) {
    return {
      confirmed: false,
      reason: 'slot_not_available',
    };
  }

  if (!resolution.slot.isAvailable) {
    return {
      confirmed: false,
      reason: resolution.slot.blockedReasons[0] ?? 'slot_not_available',
    };
  }

  return {
    confirmed: true,
  };
}

function holdMatchesRequest(
  hold: ActiveHold,
  request: ConfirmBookingInput,
): boolean {
  return (
    hold.slotStart === request.slotStart &&
    hold.slotEnd === addMinutesToIso(request.slotStart, request.requestedDuration) &&
    (hold.bookablePersonId ?? null) === (request.bookablePersonId ?? null) &&
    (hold.bookableResourceId ?? null) === (request.bookableResourceId ?? null)
  );
}

function assignIfDefined<T, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value === undefined) {
    return;
  }

  target[key] = value;
}

function validateHold(input: ConfirmBookingFromSnapshotInput):
  | { ok: true; hold: ActiveHold | null }
  | { ok: false; reason: string } {
  const holdId = input.holdId ?? null;
  if (!holdId) {
    return { ok: true, hold: null };
  }

  const hold =
    input.snapshot.activeHolds.find((candidate) => candidate.id === holdId) ??
    null;

  if (!hold) {
    return { ok: false, reason: 'hold_not_found' };
  }

  if (hold.customerId !== input.customerId) {
    return { ok: false, reason: 'hold_not_owned' };
  }

  if (hold.expiresAt <= input.now) {
    return { ok: false, reason: 'hold_expired' };
  }

  if (!holdMatchesRequest(hold, input)) {
    return { ok: false, reason: 'hold_mismatch' };
  }

  return { ok: true, hold };
}
