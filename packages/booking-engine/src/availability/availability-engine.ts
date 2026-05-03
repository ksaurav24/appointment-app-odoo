import type {
  AvailabilityDay,
  AvailabilitySnapshot,
  AvailabilitySlot,
  GetAvailabilityInput,
} from '../domain/models.ts';
import type { EntityId } from '../domain/value-objects.ts';
import {
  expandAssignmentCandidates,
  filterAssignmentsByEntityType,
} from './assignment-expander.ts';
import { calculateRemainingCapacity } from './capacity-calculator.ts';
import { resolveScheduleDay } from './schedule-resolver.ts';
import { generateSlotCandidates } from './slot-generator.ts';
import { idsEqual, toIdString } from '../shared/ids.ts';

export interface GetAvailabilityFromSnapshotInput extends GetAvailabilityInput {
  snapshot: AvailabilitySnapshot;
  blockingStatuses: readonly string[];
  now?: string;
}

export function getAvailabilityFromSnapshot(
  input: GetAvailabilityFromSnapshotInput,
): AvailabilityDay {
  if (!idsEqual(input.appointmentTypeId, input.snapshot.appointmentType.id)) {
    throw new Error(
      `Appointment type mismatch: expected ${toIdString(input.snapshot.appointmentType.id)}, received ${toIdString(input.appointmentTypeId)}`,
    );
  }

  const resolvedDay = resolveScheduleDay(
    input.snapshot.schedule,
    input.date,
    input.timezoneOverride,
  );
  const assignments = filterAssignmentsByEntityType(
    input.snapshot.appointmentType,
    expandAssignmentCandidates(
      input.snapshot.appointmentType.id,
      input.snapshot.entityLinks,
    ),
  );
  const resourceLookup = new Map(
    input.snapshot.resources.map((resource) => [toIdString(resource.id), resource]),
  );

  const slots = assignments.flatMap((assignment) => {
    const slotInput: {
      appointmentType: typeof input.snapshot.appointmentType;
      resolvedDay: typeof resolvedDay;
      assignment: typeof assignment;
      requestedDuration?: number;
    } = {
      appointmentType: input.snapshot.appointmentType,
      resolvedDay,
      assignment,
    };

    assignIfDefined(slotInput, 'requestedDuration', input.requestedDuration);

    return generateSlotCandidates(slotInput).map<AvailabilitySlot>((candidate) => {
      const capacityInput: {
        appointmentType: typeof input.snapshot.appointmentType;
        assignment: typeof assignment;
        slotStart: string;
        slotEnd: string;
        appointments: typeof input.snapshot.appointments;
        activeHolds: typeof input.snapshot.activeHolds;
        blockingStatuses: readonly string[];
        resource: typeof resourceLookup extends Map<string, infer R>
          ? R | null
          : null;
        requestedCapacity?: number;
        now?: string;
      } = {
        appointmentType: input.snapshot.appointmentType,
        assignment,
        slotStart: candidate.slotStart,
        slotEnd: candidate.slotEnd,
        appointments: input.snapshot.appointments,
        activeHolds: input.snapshot.activeHolds,
        blockingStatuses: input.blockingStatuses,
        resource:
          assignment.bookableResourceId
            ? resourceLookup.get(toIdString(assignment.bookableResourceId)) ??
              null
            : null,
      };

      assignIfDefined(
        capacityInput,
        'requestedCapacity',
        input.requestedCapacity,
      );
      assignIfDefined(capacityInput, 'now', input.now);
      const capacity = calculateRemainingCapacity(capacityInput);

      return {
        ...candidate,
        remainingCapacity: capacity.remainingCapacity,
        requestedCapacityFits: capacity.requestedCapacityFits,
        isAvailable:
          capacity.requestedCapacityFits && capacity.blockedReasons.length === 0,
        blockedReasons: capacity.blockedReasons,
      };
    });
  });

  return {
    appointmentTypeId: input.snapshot.appointmentType.id,
    date: input.date,
    timezone: resolvedDay.timezone,
    slots: [...slots].sort(compareAvailabilitySlots),
  };
}

function compareAvailabilitySlots(
  left: AvailabilitySlot,
  right: AvailabilitySlot,
): number {
  if (left.slotStart !== right.slotStart) {
    return left.slotStart.localeCompare(right.slotStart);
  }

  const personCompare = toSortableId(left.bookablePersonId).localeCompare(
    toSortableId(right.bookablePersonId),
  );
  if (personCompare !== 0) {
    return personCompare;
  }

  return toSortableId(left.bookableResourceId).localeCompare(
    toSortableId(right.bookableResourceId),
  );
}

function toSortableId(id: EntityId | null | undefined): string {
  if (id == null) {
    return '';
  }
  return toIdString(id);
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
