export interface BlockingStatusPolicy {
  appointmentStatuses: readonly string[];
}

export interface HoldTtlPolicy {
  ttlMinutes: number;
}

export interface RequestedAvailabilityPolicy {
  requestedDuration?: number;
  requestedCapacity?: number;
}

export const DEFAULT_BLOCKING_STATUSES = [
  'CONFIRMED',
  'PENDING',
] as const;

export function resolveBlockingStatuses(
  policy?: BlockingStatusPolicy,
): readonly string[] {
  return policy?.appointmentStatuses?.length
    ? policy.appointmentStatuses
    : DEFAULT_BLOCKING_STATUSES;
}
