import type {
  ActiveHold,
  AppointmentTypePolicy,
  AvailabilityBlockedReason,
  BookableResource,
  CapacityEvaluation,
  EntityAssignment,
  ExistingAppointment,
} from '../domain/models.ts';
import type { ISODateTime } from '../domain/value-objects.ts';
import {
  findOverlappingAppointments,
  findOverlappingHolds,
} from './overlap-checker.ts';

export interface CalculateRemainingCapacityInput {
  appointmentType: AppointmentTypePolicy;
  assignment: EntityAssignment;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  appointments: readonly ExistingAppointment[];
  activeHolds: readonly ActiveHold[];
  blockingStatuses: readonly string[];
  requestedCapacity?: number;
  resource?: BookableResource | null;
  ignoredHoldIds?: readonly string[];
  now?: ISODateTime;
}

export function calculateRemainingCapacity(
  input: CalculateRemainingCapacityInput,
): CapacityEvaluation {
  const requestedCapacity = Math.max(input.requestedCapacity ?? 1, 1);
  const blockingAppointments = findOverlappingAppointments(
    input.assignment,
    input.slotStart,
    input.slotEnd,
    input.appointments.filter((appointment) =>
      input.blockingStatuses.includes(appointment.status),
    ),
  );
  const blockingHolds = findOverlappingHolds(
    input.assignment,
    input.slotStart,
    input.slotEnd,
    filterActiveHolds(input.activeHolds, input.now).filter(
      (hold) => !input.ignoredHoldIds?.includes(hold.id),
    ),
  );

  if (!input.appointmentType.manageCapacity) {
    const blockedReasons: AvailabilityBlockedReason[] = [];

    if (blockingAppointments.length > 0) {
      blockedReasons.push('overlapping_appointment');
    }

    if (blockingHolds.length > 0) {
      blockedReasons.push('overlapping_hold');
    }

    const remainingCapacity = blockedReasons.length === 0 ? 1 : 0;

    return {
      capacityLimit: 1,
      remainingCapacity,
      requestedCapacity,
      requestedCapacityFits: requestedCapacity <= remainingCapacity,
      blockedReasons,
      blockingAppointments,
      blockingHolds,
    };
  }

  const capacityLimit = resolveCapacityLimit(
    input.appointmentType,
    input.assignment,
    input.resource ?? null,
  );
  const consumedByAppointments = blockingAppointments.reduce(
    (sum, appointment) => sum + Math.max(appointment.capacityBooked || 1, 1),
    0,
  );
  const consumedByHolds = blockingHolds.reduce(
    (sum, hold) => sum + Math.max(hold.requestedCapacity || 1, 1),
    0,
  );
  const remainingCapacity = Math.max(
    0,
    capacityLimit - consumedByAppointments - consumedByHolds,
  );
  const blockedReasons: AvailabilityBlockedReason[] =
    requestedCapacity <= remainingCapacity ? [] : ['capacity_exhausted'];

  return {
    capacityLimit,
    remainingCapacity,
    requestedCapacity,
    requestedCapacityFits: requestedCapacity <= remainingCapacity,
    blockedReasons,
    blockingAppointments,
    blockingHolds,
  };
}

function filterActiveHolds(
  holds: readonly ActiveHold[],
  now?: ISODateTime,
): ActiveHold[] {
  if (!now) {
    return [...holds];
  }

  return holds.filter((hold) => hold.expiresAt > now);
}

function resolveCapacityLimit(
  appointmentType: AppointmentTypePolicy,
  assignment: EntityAssignment,
  resource?: BookableResource | null,
): number {
  const limits: number[] = [];

  if (
    appointmentType.maxBookingsPerSlot &&
    appointmentType.maxBookingsPerSlot > 0
  ) {
    limits.push(appointmentType.maxBookingsPerSlot);
  }

  if (
    assignment.bookableResourceId &&
    resource?.capacity &&
    resource.capacity > 0
  ) {
    limits.push(resource.capacity);
  }

  return limits.length > 0 ? Math.min(...limits) : 1;
}
