import type {
  AppointmentEntityType,
  DurationMode,
  ScheduleType,
} from '../domain/models.ts';

export function normalizeEntityType(
  value: AppointmentEntityType,
): 'PERSON' | 'RESOURCE' | 'PERSON_RESOURCE_PAIR' {
  const normalized = normalizeToken(value);
  if (normalized === 'PERSON' || normalized === 'RESOURCE') {
    return normalized;
  }

  return 'PERSON_RESOURCE_PAIR';
}

export function normalizeDurationMode(
  value: DurationMode,
): 'FIXED' | 'VARIABLE' | 'RANGE' {
  const normalized = normalizeToken(value);
  if (normalized === 'FIXED' || normalized === 'VARIABLE') {
    return normalized;
  }

  return 'RANGE';
}

export function normalizeScheduleType(
  value: ScheduleType,
): 'WEEKLY' | 'FLEXIBLE' | 'DATE_OVERRIDE' | 'HYBRID' {
  const normalized = normalizeToken(value);
  if (normalized === 'WEEKLY' || normalized === 'FLEXIBLE') {
    return normalized;
  }
  if (normalized === 'DATE_OVERRIDE') {
    return 'DATE_OVERRIDE';
  }

  return 'HYBRID';
}

export function normalizeStatusToken(value: string): string {
  return normalizeToken(value);
}

export function matchesStatus(
  status: string,
  allowedStatuses: readonly string[],
): boolean {
  const target = normalizeStatusToken(status);
  return allowedStatuses.some(
    (allowed) => normalizeStatusToken(allowed) === target,
  );
}

function normalizeToken(value: string): string {
  return value.trim().replace(/-/g, '_').toUpperCase();
}
