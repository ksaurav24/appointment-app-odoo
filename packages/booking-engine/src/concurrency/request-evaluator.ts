import {
  buildAssignmentKey,
  expandAssignmentCandidates,
  filterAssignmentsByEntityType,
} from '../availability/assignment-expander.ts';
import { getAvailabilityFromSnapshot } from '../availability/availability-engine.ts';
import type {
  AvailabilitySlot,
  AvailabilitySnapshot,
  EntityAssignment,
} from '../domain/models.ts';
import type { EntityId, ISODate, ISODateTime } from '../domain/value-objects.ts';
import { idsEqual } from '../shared/ids.ts';
import { addMinutesToIso, extractIsoDateInTimeZone } from '../shared/time.ts';

interface ReservationRequestShape {
  appointmentTypeId: EntityId;
  slotStart: ISODateTime;
  requestedDuration: number;
  requestedCapacity?: number;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export interface ResolveRequestedSlotInput {
  request: ReservationRequestShape;
  snapshot: AvailabilitySnapshot;
  blockingStatuses: readonly string[];
  timezoneOverride?: string;
  now?: ISODateTime;
}

export interface RequestedSlotResolution {
  assignment: EntityAssignment | null;
  date: ISODate;
  slot: AvailabilitySlot | null;
}

export function resolveRequestedAssignment(
  snapshot: AvailabilitySnapshot,
  request: ReservationRequestShape,
): EntityAssignment | null {
  const assignmentKey = buildAssignmentKey(
    request.appointmentTypeId,
    request.bookablePersonId ?? null,
    request.bookableResourceId ?? null,
  );

  return (
    filterAssignmentsByEntityType(
      snapshot.appointmentType,
      expandAssignmentCandidates(
        snapshot.appointmentType.id,
        snapshot.entityLinks,
      ),
    ).find((assignment) => assignment.key === assignmentKey) ?? null
  );
}

export function resolveRequestedSlot(
  input: ResolveRequestedSlotInput,
): RequestedSlotResolution {
  const timezone = input.timezoneOverride ?? input.snapshot.schedule.timezone;
  const date = extractIsoDateInTimeZone(input.request.slotStart, timezone);
  const assignment = resolveRequestedAssignment(input.snapshot, input.request);

  if (!assignment) {
    return {
      assignment: null,
      date,
      slot: null,
    };
  }

  const availabilityInput: {
    appointmentTypeId: EntityId;
    date: ISODate;
    requestedDuration: number;
    snapshot: AvailabilitySnapshot;
    blockingStatuses: readonly string[];
    requestedCapacity?: number;
    timezoneOverride?: string;
    now?: ISODateTime;
  } = {
    appointmentTypeId: input.request.appointmentTypeId,
    date,
    requestedDuration: input.request.requestedDuration,
    snapshot: input.snapshot,
    blockingStatuses: input.blockingStatuses,
  };

  assignIfDefined(
    availabilityInput,
    'requestedCapacity',
    input.request.requestedCapacity,
  );
  assignIfDefined(availabilityInput, 'timezoneOverride', input.timezoneOverride);
  assignIfDefined(availabilityInput, 'now', input.now);

  const availability = getAvailabilityFromSnapshot(availabilityInput);
  const expectedSlotEnd = addMinutesToIso(
    input.request.slotStart,
    input.request.requestedDuration,
  );

  return {
    assignment,
    date,
    slot:
      availability.slots.find(
        (slot) =>
          slot.slotStart === input.request.slotStart &&
          slot.slotEnd === expectedSlotEnd &&
          idsEqual(
            slot.bookablePersonId ?? null,
            input.request.bookablePersonId ?? null,
          ) &&
          idsEqual(
            slot.bookableResourceId ?? null,
            input.request.bookableResourceId ?? null,
          ),
      ) ?? null,
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
