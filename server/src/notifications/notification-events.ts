/**
 * Discriminated union of every business event that fans out into Notification
 * rows + outbound emails. The dispatcher loads the appointment (or payment) in
 * full and resolves the recipient list per PRD §9.1.
 *
 * Recipient-type mapping note:
 *   `NotificationRecipientType` is { USER, GUEST, ORGANIZER, ADMIN } in the
 *   Prisma schema, while the PRD speaks of {customer, organiser, bookable_person}.
 *   Convention used everywhere in this module:
 *     USER       → customer (recipientId = customer userId)
 *     ORGANIZER  → organiser (recipientId = organiser userId)
 *     GUEST      → bookable person (recipientId = bookable person id,
 *                                   recipientEmail = contactEmail)
 *     ADMIN      → reserved, unused in V1
 */
export type NotificationEvent =
  | { type: 'APPOINTMENT_CREATED'; appointmentId: bigint }
  | { type: 'APPOINTMENT_CONFIRMED'; appointmentId: bigint }
  | { type: 'APPOINTMENT_PENDING_APPROVAL'; appointmentId: bigint }
  | { type: 'APPOINTMENT_APPROVED'; appointmentId: bigint }
  | { type: 'APPOINTMENT_REJECTED'; appointmentId: bigint; reason?: string }
  | {
      type: 'APPOINTMENT_CANCELLED';
      appointmentId: bigint;
      actor: 'customer' | 'organiser';
      reason?: string;
    }
  | {
      type: 'APPOINTMENT_RESCHEDULED';
      appointmentId: bigint;
      previousStart: Date;
      previousEnd: Date;
    }
  | { type: 'PAYMENT_RECEIVED'; paymentId: bigint }
  | { type: 'PAYMENT_REFUNDED'; paymentId: bigint };
