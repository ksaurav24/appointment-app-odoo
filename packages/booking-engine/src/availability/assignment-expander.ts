import type {
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  EntityAssignment,
} from '../domain/models.ts';
import type { EntityId } from '../domain/value-objects.ts';
import { toIdString } from '../shared/ids.ts';
import { normalizeEntityType } from '../shared/normalizers.ts';

export function expandAssignmentCandidates(
  appointmentTypeId: EntityId,
  links: readonly AppointmentTypeEntityLink[],
): EntityAssignment[] {
  const assignments: EntityAssignment[] = [];
  const seenKeys = new Set<string>();

  for (const link of links) {
    const bookablePersonId = link.bookablePersonId ?? null;
    const bookableResourceId = link.bookableResourceId ?? null;

    if (!bookablePersonId && !bookableResourceId) {
      continue;
    }

    let shape: EntityAssignment['shape'];
    if (bookablePersonId && bookableResourceId) {
      shape = 'paired';
    } else if (bookablePersonId) {
      shape = 'person-only';
    } else {
      shape = 'resource-only';
    }

    const key = buildAssignmentKey(
      appointmentTypeId,
      bookablePersonId,
      bookableResourceId,
    );

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    assignments.push({
      key,
      appointmentTypeId,
      shape,
      bookablePersonId,
      bookableResourceId,
    });
  }

  return assignments;
}

export function filterAssignmentsByEntityType(
  appointmentType: AppointmentTypePolicy,
  assignments: readonly EntityAssignment[],
): EntityAssignment[] {
  switch (normalizeEntityType(appointmentType.entityType)) {
    case 'PERSON':
      return assignments.filter((assignment) => assignment.shape === 'person-only');
    case 'RESOURCE':
      return assignments.filter((assignment) => assignment.shape === 'resource-only');
    case 'PERSON_RESOURCE_PAIR':
      return assignments.filter((assignment) => assignment.shape === 'paired');
    default:
      return [...assignments];
  }
}

export function buildAssignmentKey(
  appointmentTypeId: EntityId,
  bookablePersonId?: EntityId | null,
  bookableResourceId?: EntityId | null,
): string {
  return [
    toIdString(appointmentTypeId),
    bookablePersonId == null ? 'none' : toIdString(bookablePersonId),
    bookableResourceId == null ? 'none' : toIdString(bookableResourceId),
  ].join(':');
}
