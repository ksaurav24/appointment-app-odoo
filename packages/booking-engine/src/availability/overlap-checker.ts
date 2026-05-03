import type {
  ActiveHold,
  EntityAssignment,
  ExistingAppointment,
} from '../domain/models.ts';
import type { EntityId, ISODateTime } from '../domain/value-objects.ts';
import { idsEqual } from '../shared/ids.ts';

interface AssignmentCarrier {
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export function intervalsOverlap(
  candidateStart: ISODateTime,
  candidateEnd: ISODateTime,
  existingStart: ISODateTime,
  existingEnd: ISODateTime,
): boolean {
  return candidateStart < existingEnd && candidateEnd > existingStart;
}

export function assignmentConflicts(
  candidate: AssignmentCarrier,
  existing: AssignmentCarrier,
): boolean {
  const sharesPerson =
    candidate.bookablePersonId != null &&
    idsEqual(candidate.bookablePersonId, existing.bookablePersonId ?? null);
  const sharesResource =
    candidate.bookableResourceId != null &&
    idsEqual(candidate.bookableResourceId, existing.bookableResourceId ?? null);

  if (
    candidate.bookablePersonId != null &&
    candidate.bookableResourceId != null
  ) {
    return sharesPerson || sharesResource;
  }

  if (candidate.bookablePersonId != null) {
    return sharesPerson;
  }

  if (candidate.bookableResourceId != null) {
    return sharesResource;
  }

  return true;
}

export function findOverlappingAppointments(
  assignment: EntityAssignment,
  slotStart: ISODateTime,
  slotEnd: ISODateTime,
  appointments: readonly ExistingAppointment[],
): ExistingAppointment[] {
  return appointments.filter(
    (appointment) =>
      assignmentConflicts(assignment, appointment) &&
      intervalsOverlap(slotStart, slotEnd, appointment.startTime, appointment.endTime),
  );
}

export function findOverlappingHolds(
  assignment: EntityAssignment,
  slotStart: ISODateTime,
  slotEnd: ISODateTime,
  holds: readonly ActiveHold[],
): ActiveHold[] {
  return holds.filter(
    (hold) =>
      assignmentConflicts(assignment, hold) &&
      intervalsOverlap(slotStart, slotEnd, hold.slotStart, hold.slotEnd),
  );
}
