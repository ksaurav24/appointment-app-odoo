import type { Prisma } from '@prisma/client';

/**
 * Contract for the cross-module refund hook called by the cancellation flow
 * (see `AppointmentsService.cancelByCustomer/Organiser`). The PaymentsModule
 * binds an implementation against the `REFUND_HANDLER` DI token; modules that
 * don't depend on PaymentsModule (e.g. unit-test contexts) leave it unbound
 * and `@Optional()` injection yields `null`.
 */
export interface RefundHandler {
  /**
   * Refund every PAID payment attached to the given appointment. Implementations
   * MUST run inside the supplied transaction client so the refund records are
   * atomic with the appointment cancellation that triggered them.
   *
   * Returns the ids of the payments that were refunded so the caller can
   * dispatch corresponding notifications.
   */
  refundForAppointment(
    tx: Prisma.TransactionClient,
    appointmentId: bigint,
  ): Promise<{ refundedPaymentIds: bigint[] }>;
}

export const REFUND_HANDLER = Symbol('REFUND_HANDLER');
