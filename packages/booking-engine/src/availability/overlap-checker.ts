import type {
  ActiveHold,
  EntityAssignment,
  ExistingAppointment,
} from '../domain/models.ts';
import type { ISODateTime } from '../domain/value-objects.ts';

interface AssignmentCarrier {
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
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
    !!candidate.bookablePersonId &&
    candidate.bookablePersonId === (existing.bookablePersonId ?? null);
  const sharesResource =
    !!candidate.bookableResourceId &&
    candidate.bookableResourceId === (existing.bookableResourceId ?? null);

  if (candidate.bookablePersonId && candidate.bookableResourceId) {
    return sharesPerson || sharesResource;
  }

  if (candidate.bookablePersonId) {
    return sharesPerson;
  }

  if (candidate.bookableResourceId) {
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
