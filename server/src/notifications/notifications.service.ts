import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EntityType,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipientType,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import {
  RenderedEmail,
  bookingApprovedCustomerEmail,
  bookingAwaitingPaymentCustomerEmail,
  bookingCancelledEmail,
  bookingConfirmedCustomerEmail,
  bookingNoticeForBookablePersonEmail,
  bookingPendingApprovalCustomerEmail,
  bookingPendingApprovalOrganiserEmail,
  bookingRejectedCustomerEmail,
  bookingRescheduledEmail,
  paymentReceiptEmail,
  refundIssuedEmail,
} from '../mailer/templates';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEvent } from './notification-events';

type Client = Prisma.TransactionClient | PrismaService;

const APPOINTMENT_INCLUDE = {
  customer: true,
  appointmentType: true,
  bookablePerson: true,
  bookableResource: true,
  organization: { include: { organiser: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentContext = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

const PAYMENT_INCLUDE = {
  appointment: { include: APPOINTMENT_INCLUDE },
} satisfies Prisma.PaymentInclude;

type PaymentContext = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;

export interface PendingMailJob {
  to: string;
  rendered: RenderedEmail;
  notificationId: bigint;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  /**
   * Insert Notification rows for every recipient of `event`. Returns a list
   * of pending mail jobs the caller MUST enqueue via `flush()` AFTER the
   * surrounding transaction commits — otherwise a rolled-back transaction
   * would still send emails.
   *
   * Pass the transaction client when calling from inside `prisma.$transaction`;
   * otherwise pass `prisma` (or omit — defaults to the injected service).
   */
  async dispatch(
    client: Client,
    event: NotificationEvent,
  ): Promise<PendingMailJob[]> {
    if (
      event.type === 'PAYMENT_RECEIVED' ||
      event.type === 'PAYMENT_REFUNDED'
    ) {
      const payment = await this.loadPayment(client, event.paymentId);
      if (!payment) return [];
      return this.dispatchPayment(client, event, payment);
    }
    const appointment = await this.loadAppointment(client, event.appointmentId);
    if (!appointment) return [];
    return this.dispatchAppointment(client, event, appointment);
  }

  /**
   * Convenience for callers that don't need to control the transaction
   * themselves. Wraps dispatch in a Prisma transaction and flushes mail jobs
   * after commit.
   */
  async dispatchAndFlush(event: NotificationEvent): Promise<void> {
    const jobs = await this.prisma.$transaction((tx) =>
      this.dispatch(tx, event),
    );
    await this.flush(jobs);
  }

  /** Enqueue mail jobs collected from `dispatch()`. */
  async flush(jobs: PendingMailJob[]): Promise<void> {
    for (const job of jobs) {
      try {
        await this.mailer.enqueueRendered(
          job.to,
          job.rendered,
          job.notificationId,
        );
      } catch (err) {
        // Don't let one mail failure block the rest of the batch.
        this.logger.error(
          `Failed to enqueue mail for notification ${job.notificationId}: ${(err as Error).message}`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Internals — appointment events
  // -------------------------------------------------------------------------

  private async dispatchAppointment(
    client: Client,
    event: Exclude<
      NotificationEvent,
      { type: 'PAYMENT_RECEIVED' } | { type: 'PAYMENT_REFUNDED' }
    >,
    appointment: AppointmentContext,
  ): Promise<PendingMailJob[]> {
    const ctx = this.buildAppointmentEmailContext(appointment);
    const customerEmail = appointment.customer.email;
    const customerName = appointment.customer.fullName;
    const organiserEmail = appointment.organization.organiser.email;
    const organiserName = appointment.organization.organiser.fullName;
    const bookablePerson = appointment.bookablePerson;
    const personEmail =
      appointment.appointmentType.entityType === EntityType.PERSON &&
      bookablePerson?.contactEmail
        ? bookablePerson.contactEmail
        : null;

    const jobs: PendingMailJob[] = [];

    const inApp = (
      recipientType: NotificationRecipientType,
      recipientId: string | null,
      notificationType: NotificationType,
      priority: NotificationPriority = NotificationPriority.NORMAL,
    ) =>
      this.recordNotification(client, {
        recipientType,
        recipientId,
        recipientEmail: null,
        appointmentId: appointment.id,
        notificationType,
        channel: NotificationChannel.IN_APP,
        priority,
      });

    const email = (
      recipientType: NotificationRecipientType,
      recipientId: string | null,
      recipientEmail: string,
      notificationType: NotificationType,
      rendered: RenderedEmail,
      priority: NotificationPriority = NotificationPriority.NORMAL,
    ) =>
      this.recordEmail(client, jobs, {
        recipientType,
        recipientId,
        recipientEmail,
        appointmentId: appointment.id,
        notificationType,
        rendered,
        priority,
      });

    switch (event.type) {
      case 'APPOINTMENT_CREATED': {
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_CREATED,
          bookingAwaitingPaymentCustomerEmail({
            ...ctx,
            recipientName: customerName,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_CREATED,
        );
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_CREATED,
        );
        break;
      }
      case 'APPOINTMENT_CONFIRMED': {
        const meetingUrls = this.buildMeetingUrls(appointment);
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_CONFIRMED,
          bookingConfirmedCustomerEmail({
            ...ctx,
            recipientName: customerName,
            meetingUrl: meetingUrls.customer,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_CONFIRMED,
        );
        if (personEmail && bookablePerson) {
          await email(
            NotificationRecipientType.GUEST,
            bookablePerson.id,
            personEmail,
            NotificationType.APPOINTMENT_CONFIRMED,
            bookingNoticeForBookablePersonEmail({
              ...ctx,
              recipientName: bookablePerson.name,
              customerName,
              eventLabel: 'confirmed',
              meetingUrl: meetingUrls.host,
            }),
          );
        }
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_CONFIRMED,
        );
        break;
      }
      case 'APPOINTMENT_PENDING_APPROVAL': {
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_PENDING_APPROVAL,
          bookingPendingApprovalCustomerEmail({
            ...ctx,
            recipientName: customerName,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_PENDING_APPROVAL,
        );
        await email(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          organiserEmail,
          NotificationType.APPOINTMENT_PENDING_APPROVAL,
          bookingPendingApprovalOrganiserEmail({
            ...ctx,
            recipientName: organiserName,
            customerName,
          }),
        );
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_PENDING_APPROVAL,
        );
        break;
      }
      case 'APPOINTMENT_APPROVED': {
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_APPROVED,
          bookingApprovedCustomerEmail({
            ...ctx,
            recipientName: customerName,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_APPROVED,
        );
        if (personEmail && bookablePerson) {
          await email(
            NotificationRecipientType.GUEST,
            bookablePerson.id,
            personEmail,
            NotificationType.APPOINTMENT_APPROVED,
            bookingNoticeForBookablePersonEmail({
              ...ctx,
              recipientName: bookablePerson.name,
              customerName,
              eventLabel: 'approved',
            }),
          );
        }
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_APPROVED,
        );
        break;
      }
      case 'APPOINTMENT_REJECTED': {
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_REJECTED,
          bookingRejectedCustomerEmail({
            ...ctx,
            recipientName: customerName,
            reason: event.reason,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_REJECTED,
        );
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_REJECTED,
        );
        break;
      }
      case 'APPOINTMENT_CANCELLED': {
        // Organiser-initiated cancellations are higher-priority for the
        // customer because they were not requested by the customer themselves.
        const customerPriority =
          event.actor === 'organiser'
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL;
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_CANCELLED,
          bookingCancelledEmail({
            ...ctx,
            recipientName: customerName,
            actor: event.actor,
            reason: event.reason,
            priority: customerPriority,
          }),
          customerPriority,
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_CANCELLED,
          customerPriority,
        );
        if (personEmail && bookablePerson) {
          await email(
            NotificationRecipientType.GUEST,
            bookablePerson.id,
            personEmail,
            NotificationType.APPOINTMENT_CANCELLED,
            bookingNoticeForBookablePersonEmail({
              ...ctx,
              recipientName: bookablePerson.name,
              customerName,
              eventLabel: 'cancelled',
            }),
          );
        }
        await email(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          organiserEmail,
          NotificationType.APPOINTMENT_CANCELLED,
          bookingCancelledEmail({
            ...ctx,
            recipientName: organiserName,
            actor: event.actor,
            reason: event.reason,
          }),
        );
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_CANCELLED,
        );
        break;
      }
      case 'APPOINTMENT_RESCHEDULED': {
        await email(
          NotificationRecipientType.USER,
          appointment.customerId,
          customerEmail,
          NotificationType.APPOINTMENT_RESCHEDULED,
          bookingRescheduledEmail({
            ...ctx,
            recipientName: customerName,
            previousStart: event.previousStart,
            previousEnd: event.previousEnd,
          }),
        );
        await inApp(
          NotificationRecipientType.USER,
          appointment.customerId,
          NotificationType.APPOINTMENT_RESCHEDULED,
        );
        if (personEmail && bookablePerson) {
          await email(
            NotificationRecipientType.GUEST,
            bookablePerson.id,
            personEmail,
            NotificationType.APPOINTMENT_RESCHEDULED,
            bookingNoticeForBookablePersonEmail({
              ...ctx,
              recipientName: bookablePerson.name,
              customerName,
              eventLabel: 'rescheduled',
            }),
          );
        }
        await inApp(
          NotificationRecipientType.ORGANIZER,
          appointment.organization.organiser.id,
          NotificationType.APPOINTMENT_RESCHEDULED,
        );
        break;
      }
    }
    return jobs;
  }

  // -------------------------------------------------------------------------
  // Internals — payment events
  // -------------------------------------------------------------------------

  private async dispatchPayment(
    client: Client,
    event: { type: 'PAYMENT_RECEIVED' | 'PAYMENT_REFUNDED'; paymentId: bigint },
    payment: PaymentContext,
  ): Promise<PendingMailJob[]> {
    const appointment = payment.appointment;
    const ctx = this.buildAppointmentEmailContext(appointment);
    const customerEmail = appointment.customer.email;
    const customerName = appointment.customer.fullName;
    const amount = payment.amount.toString();
    const currency = payment.currency;

    const jobs: PendingMailJob[] = [];

    const notificationType =
      event.type === 'PAYMENT_RECEIVED'
        ? NotificationType.PAYMENT_RECEIVED
        : NotificationType.PAYMENT_REFUNDED;

    const rendered =
      event.type === 'PAYMENT_RECEIVED'
        ? paymentReceiptEmail({
            recipientName: customerName,
            amount,
            currency,
            appointmentTypeName: ctx.appointmentTypeName,
            organizationName: ctx.organizationName,
            confirmationCode: ctx.confirmationCode,
          })
        : refundIssuedEmail({
            recipientName: customerName,
            amount,
            currency,
            appointmentTypeName: ctx.appointmentTypeName,
            organizationName: ctx.organizationName,
            confirmationCode: ctx.confirmationCode,
          });

    await this.recordEmail(client, jobs, {
      recipientType: NotificationRecipientType.USER,
      recipientId: appointment.customerId,
      recipientEmail: customerEmail,
      appointmentId: appointment.id,
      notificationType,
      rendered,
    });
    await this.recordNotification(client, {
      recipientType: NotificationRecipientType.USER,
      recipientId: appointment.customerId,
      recipientEmail: null,
      appointmentId: appointment.id,
      notificationType,
      channel: NotificationChannel.IN_APP,
    });
    await this.recordNotification(client, {
      recipientType: NotificationRecipientType.ORGANIZER,
      recipientId: appointment.organization.organiser.id,
      recipientEmail: null,
      appointmentId: appointment.id,
      notificationType,
      channel: NotificationChannel.IN_APP,
    });

    return jobs;
  }

  // -------------------------------------------------------------------------
  // Persistence helpers
  // -------------------------------------------------------------------------

  private async recordNotification(
    client: Client,
    input: {
      recipientType: NotificationRecipientType;
      recipientId: string | null;
      recipientEmail: string | null;
      appointmentId: bigint;
      notificationType: NotificationType;
      channel: NotificationChannel;
      priority?: NotificationPriority;
    },
  ): Promise<bigint> {
    const created = await client.notification.create({
      data: {
        recipientType: input.recipientType,
        recipientId: input.recipientId,
        recipientEmail: input.recipientEmail,
        appointmentId: input.appointmentId,
        notificationType: input.notificationType,
        channel: input.channel,
        priority: input.priority ?? NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
      },
    });
    return created.id;
  }

  private async recordEmail(
    client: Client,
    jobs: PendingMailJob[],
    input: {
      recipientType: NotificationRecipientType;
      recipientId: string | null;
      recipientEmail: string;
      appointmentId: bigint;
      notificationType: NotificationType;
      rendered: RenderedEmail;
      priority?: NotificationPriority;
    },
  ): Promise<void> {
    const id = await this.recordNotification(client, {
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      recipientEmail: input.recipientEmail,
      appointmentId: input.appointmentId,
      notificationType: input.notificationType,
      channel: NotificationChannel.EMAIL,
      priority: input.priority,
    });
    jobs.push({
      to: input.recipientEmail,
      rendered: input.rendered,
      notificationId: id,
    });
  }

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------

  private async loadAppointment(
    client: Client,
    id: bigint,
  ): Promise<AppointmentContext | null> {
    return client.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
  }

  private async loadPayment(
    client: Client,
    id: bigint,
  ): Promise<PaymentContext | null> {
    return client.payment.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
  }

  /**
   * Returns the customer + host meeting URLs for an online appointment, or
   * `{ customer: undefined, host: undefined }` for in-person appointments. The
   * customer URL embeds the confirmation code so the booking email is a
   * one-click join; the host uses their session cookie.
   */
  private buildMeetingUrls(appointment: AppointmentContext): {
    customer: string | undefined;
    host: string | undefined;
  } {
    if (!appointment.appointmentType.isOnline) {
      return { customer: undefined, host: undefined };
    }
    const baseUrl = this.config.get('APP_BASE_URL', { infer: true });
    const id = appointment.id.toString();
    return {
      customer: `${baseUrl}/meeting/${id}?code=${encodeURIComponent(appointment.confirmationCode)}`,
      host: `${baseUrl}/meeting/${id}`,
    };
  }

  private buildAppointmentEmailContext(appointment: AppointmentContext) {
    const timezone = appointment.organization.timezone || 'UTC';
    const providerName =
      appointment.appointmentType.entityType === EntityType.PERSON &&
      appointment.bookablePerson
        ? appointment.bookablePerson.name
        : appointment.bookableResource?.name;
    return {
      appointmentTypeName: appointment.appointmentType.name,
      organizationName: appointment.organization.name,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      timezone,
      confirmationCode: appointment.confirmationCode,
      providerName,
    };
  }
}
