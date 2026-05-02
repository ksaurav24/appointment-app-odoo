import type {
  NoShowFeatureInput,
  NoShowFeatureVector,
} from '../domain/models.ts';

export function buildNoShowFeatures(
  input: NoShowFeatureInput,
): NoShowFeatureVector {
  const appointmentStart = new Date(input.appointment.startTime);
  const cancelledAt = input.appointment.cancelledAt
    ? new Date(input.appointment.cancelledAt)
    : null;
  const createdAt = input.appointment.createdAt
    ? new Date(input.appointment.createdAt)
    : null;
  const paymentPaidAt = input.appointment.paymentPaidAt
    ? new Date(input.appointment.paymentPaidAt)
    : null;
  const lastRescheduledAt = input.lastRescheduledAt
    ? new Date(input.lastRescheduledAt)
    : null;
  const bookingLeadHours = createdAt
    ? Math.max(
        0,
        (appointmentStart.getTime() - createdAt.getTime()) / 3_600_000,
      )
    : null;
  const paymentLeadHours = paymentPaidAt
    ? Math.max(
        0,
        (appointmentStart.getTime() - paymentPaidAt.getTime()) / 3_600_000,
      )
    : null;
  const cancellationWindowHours =
    input.appointmentType.cancellationWindowHours ?? null;
  const lastRescheduleLeadHours = lastRescheduledAt
    ? Math.max(
        0,
        (appointmentStart.getTime() - lastRescheduledAt.getTime()) / 3_600_000,
      )
    : null;

  return {
    appointmentTypeId: input.appointmentType.id,
    appointmentId: input.appointment.id,
    appointmentStatus: input.appointment.status,
    startsAtHour: appointmentStart.getUTCHours(),
    appointmentWeekday: appointmentStart.getUTCDay(),
    durationMins: input.appointment.durationMins,
    rescheduleCount: input.appointment.rescheduleCount,
    rescheduleCountLast30Days: input.rescheduleCountLast30Days ?? null,
    lastRescheduleLeadHours,
    durationMode: input.appointmentType.durationMode,
    maxBookingsPerSlot: input.appointmentType.maxBookingsPerSlot ?? null,
    paymentStatus: input.appointment.paymentStatus ?? null,
    advancePaymentEnabled: Boolean(input.appointmentType.advancePaymentEnabled),
    manualConfirmation: input.appointmentType.manualConfirmation,
    cancellationAllowed: input.appointmentType.cancellationAllowed,
    cancellationWindowHours,
    rescheduleAllowed: input.appointmentType.rescheduleAllowed,
    maxReschedulesAllowed: input.appointmentType.maxReschedulesAllowed ?? null,
    manageCapacity: input.appointmentType.manageCapacity,
    bookingLeadHours,
    paymentLeadHours,
    wasCancelled: cancelledAt !== null,
    cancelLeadHours:
      cancelledAt === null
        ? null
        : Math.max(
            0,
            (appointmentStart.getTime() - cancelledAt.getTime()) / 3_600_000,
          ),
    cancelWithinWindow:
      cancelledAt === null || cancellationWindowHours === null
        ? null
        : Math.max(
              0,
              (appointmentStart.getTime() - cancelledAt.getTime()) / 3_600_000,
            ) <= cancellationWindowHours,
    organizationHistorySize: input.organizationHistorySize,
    organizationNoShowRate: input.organizationNoShowRate ?? null,
    appointmentTypeNoShowRate: input.appointmentTypeNoShowRate ?? null,
    customerNoShowRate: input.customerNoShowRate ?? null,
    bookablePersonNoShowRate: input.bookablePersonNoShowRate ?? null,
    bookableResourceNoShowRate: input.bookableResourceNoShowRate ?? null,
  };
}
