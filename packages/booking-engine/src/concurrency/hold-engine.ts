import type {
  AvailabilitySnapshot,
  HoldDecision,
  HoldRequest,
} from '../domain/models.ts';
import type { ISODateTime } from '../domain/value-objects.ts';
import { idsEqual } from '../shared/ids.ts';
import { addMinutesToIso } from '../shared/time.ts';
import { resolveRequestedSlot } from './request-evaluator.ts';
import { buildSlotMutexKey } from './slot-key.ts';

export interface PlaceHoldFromSnapshotInput extends HoldRequest {
  snapshot: AvailabilitySnapshot;
  blockingStatuses: readonly string[];
  holdTtlMinutes: number;
  now: ISODateTime;
  timezoneOverride?: string;
}

export function placeHoldFromSnapshot(
  input: PlaceHoldFromSnapshotInput,
): HoldDecision {
  if (
    input.requestedDuration <= 0 ||
    input.requestedCapacity <= 0 ||
    input.holdTtlMinutes <= 0
  ) {
    return {
      granted: false,
      reason: 'invalid_request',
    };
  }

  if (!idsEqual(input.snapshot.appointmentType.id, input.appointmentTypeId)) {
    return {
      granted: false,
      reason: 'appointment_type_mismatch',
    };
  }

  const resolutionInput: {
    request: PlaceHoldFromSnapshotInput;
    snapshot: AvailabilitySnapshot;
    blockingStatuses: readonly string[];
    now: ISODateTime;
    timezoneOverride?: string;
  } = {
    request: input,
    snapshot: input.snapshot,
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
      granted: false,
      reason: 'assignment_not_allowed',
    };
  }

  if (!resolution.slot) {
    return {
      granted: false,
      reason: 'slot_not_available',
    };
  }

  if (!resolution.slot.isAvailable) {
    return {
      granted: false,
      reason: resolution.slot.blockedReasons[0] ?? 'slot_not_available',
    };
  }

  return {
    granted: true,
    holdExpiresAt: addMinutesToIso(input.now, input.holdTtlMinutes),
    holdKey: buildSlotMutexKey({
      appointmentTypeId: input.appointmentTypeId,
      slotStart: resolution.slot.slotStart,
      slotEnd: resolution.slot.slotEnd,
      bookablePersonId: resolution.slot.bookablePersonId ?? null,
      bookableResourceId: resolution.slot.bookableResourceId ?? null,
    }),
    remainingCapacityAfterHold: Math.max(
      0,
      resolution.slot.remainingCapacity - input.requestedCapacity,
    ),
  };
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
