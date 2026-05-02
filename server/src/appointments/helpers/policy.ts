import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

const HOUR_MS = 60 * 60 * 1000;

interface AppointmentForPolicy {
  status: AppointmentStatus;
  startTime: Date;
  rescheduleCount: number;
}

type PolicyFields = Pick<
  AppointmentType,
  | 'cancellationAllowed'
  | 'cancellationWindowHours'
  | 'rescheduleAllowed'
  | 'rescheduleWindowHours'
  | 'maxReschedulesAllowed'
>;

/**
 * Hours from `now` until `startTime`, signed (negative if startTime is past).
 * Exposed for tests; callers should use the assert* helpers.
 */
export function hoursUntil(startTime: Date, now: Date): number {
  return (startTime.getTime() - now.getTime()) / HOUR_MS;
}

/**
 * Customer-side cancellation gate (PRD §7.1).
 * Throws if the appointment cannot be cancelled per the type's policy.
 * Organisers bypass this entirely — they have an explicit override path.
 */
export function assertCancellable(
  appointment: AppointmentForPolicy,
  type: PolicyFields,
  now: Date,
): void {
  if (!type.cancellationAllowed) {
    throw new ForbiddenException(
      'Cancellation is not allowed for this appointment type. Please contact the organiser.',
    );
  }
  if (type.cancellationWindowHours != null) {
    const remaining = hoursUntil(appointment.startTime, now);
    if (remaining < type.cancellationWindowHours) {
      throw new BadRequestException(
        `Cancellations require at least ${type.cancellationWindowHours} hours' notice (this appointment is ${formatHours(remaining)} away).`,
      );
    }
  }
}

/**
 * Customer-side reschedule gate (PRD §8.1).
 * Throws if the appointment cannot be rescheduled per the type's policy.
 */
export function assertReschedulable(
  appointment: AppointmentForPolicy,
  type: PolicyFields,
  now: Date,
): void {
  if (!type.rescheduleAllowed) {
    throw new ForbiddenException(
      'Reschedules are not allowed for this appointment type. Please contact the organiser.',
    );
  }
  if (
    type.maxReschedulesAllowed != null &&
    appointment.rescheduleCount >= type.maxReschedulesAllowed
  ) {
    throw new BadRequestException(
      `This appointment has already been rescheduled the maximum number of times (${type.maxReschedulesAllowed}).`,
    );
  }
  if (type.rescheduleWindowHours != null) {
    const remaining = hoursUntil(appointment.startTime, now);
    if (remaining < type.rescheduleWindowHours) {
      throw new BadRequestException(
        `Reschedules require at least ${type.rescheduleWindowHours} hours' notice (this appointment is ${formatHours(remaining)} away).`,
      );
    }
  }
}

function formatHours(value: number): string {
  if (value < 0) return 'in the past';
  if (value < 1) return `${Math.round(value * 60)} minutes`;
  return `${value.toFixed(1)} hours`;
}
