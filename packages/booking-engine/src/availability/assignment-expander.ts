import type {
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  EntityAssignment,
} from '../domain/models.ts';

export function expandAssignmentCandidates(
  appointmentTypeId: string,
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
  switch (appointmentType.entityType) {
    case 'person':
      return assignments.filter((assignment) => assignment.shape === 'person-only');
    case 'resource':
      return assignments.filter((assignment) => assignment.shape === 'resource-only');
    case 'person_resource_pair':
      return assignments.filter((assignment) => assignment.shape === 'paired');
    default:
      return [...assignments];
  }
}

export function buildAssignmentKey(
  appointmentTypeId: string,
  bookablePersonId?: string | null,
  bookableResourceId?: string | null,
): string {
  return [
    appointmentTypeId,
    bookablePersonId ?? 'none',
    bookableResourceId ?? 'none',
  ].join(':');
}
