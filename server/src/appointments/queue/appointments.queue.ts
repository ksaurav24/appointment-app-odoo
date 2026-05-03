export const APPOINTMENTS_QUEUE_NAME = 'appointments';

export const AUTO_REJECT_FANOUT_JOB = 'auto-reject-fanout';

export interface AutoRejectFanoutPayload {
  /** String-encoded BigInt ids of the appointments that were auto-cancelled. */
  appointmentIds: string[];
  /** The cancellationReason already written to the appointments. */
  reason: string;
}
