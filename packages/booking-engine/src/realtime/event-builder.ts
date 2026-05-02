import type {
  AvailabilityEvent,
  AvailabilityMutationInput,
} from '../domain/models.ts';
import { resolveAffectedDates } from './affected-date-resolver.ts';

export function buildAvailabilityEvents(
  input: AvailabilityMutationInput,
): AvailabilityEvent[] {
  return resolveAffectedDates(input).map<AvailabilityEvent>((affectedDate) => ({
    type: 'availability.changed',
    organizationId: input.organizationId,
    appointmentTypeId: input.appointmentTypeId,
    affectedDate,
    bookablePersonId: input.bookablePersonId ?? null,
    bookableResourceId: input.bookableResourceId ?? null,
    reason: input.reason,
    occurredAt: input.occurredAt,
  }));
}
