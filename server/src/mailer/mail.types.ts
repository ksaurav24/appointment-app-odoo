export const MAIL_JOB_SEND = 'send';

export interface MailJobPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * If set, the worker updates the corresponding Notification row to SENT on
   * success or FAILED on terminal failure. Encoded as string because BullMQ
   * job payloads must be JSON-serialisable (bigint is not).
   */
  notificationId?: string;
}
