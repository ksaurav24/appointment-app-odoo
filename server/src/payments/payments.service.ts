import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { writeAuditLog } from '../common/audit/audit-log.helper';
import { RefundHandler } from '../common/refund-handler.token';
import { EnvVars } from '../config/env.validation';
import {
  NotificationsService,
  PendingMailJob,
} from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.token';
import type { PaymentGateway } from './gateways/payment-gateway.interface';

export interface CreateIntentResult {
  paymentPublicId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string } };
    refund?: {
      entity?: { id?: string; payment_id?: string; status?: string };
    };
  };
}

@Injectable()
export class PaymentsService implements RefundHandler {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly currency: string;
  private readonly keyId: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    config: ConfigService<EnvVars, true>,
  ) {
    this.currency = config.get('PAYMENT_CURRENCY', { infer: true });
    this.keyId = config.get('RAZORPAY_KEY_ID', { infer: true });
  }

  // -------------------------------------------------------------------------
  // Customer endpoints
  // -------------------------------------------------------------------------

  async createIntent(
    customerId: string,
    appointmentPublicId: string,
  ): Promise<CreateIntentResult> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { publicId: appointmentPublicId, customerId },
      include: { appointmentType: true, payments: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (!appointment.appointmentType.advancePaymentEnabled) {
      throw new BadRequestException(
        'This appointment type does not require advance payment',
      );
    }
    if (
      appointment.status !== AppointmentStatus.PENDING ||
      appointment.paymentStatus !== PaymentStatus.PENDING
    ) {
      throw new ConflictException(
        `Cannot create a payment intent for an appointment in status ${appointment.status} (paymentStatus=${appointment.paymentStatus})`,
      );
    }
    const amount =
      appointment.totalAmount ??
      appointment.appointmentType.advancePaymentAmount;
    if (!amount) {
      throw new ConflictException('Appointment is missing a payment amount');
    }
    if (!this.keyId) {
      throw new ConflictException(
        'Payment gateway is not configured (RAZORPAY_KEY_ID missing)',
      );
    }

    // If a PENDING Payment row already exists, reuse it (idempotent re-call).
    const existingPending = appointment.payments.find(
      (p) => p.status === PaymentStatus.PENDING,
    );
    if (existingPending && existingPending.gatewayTransactionId) {
      return {
        paymentPublicId: existingPending.publicId,
        orderId: existingPending.gatewayTransactionId,
        amount: amountToMinorUnits(existingPending.amount),
        currency: existingPending.currency,
        keyId: this.keyId,
      };
    }

    const minorAmount = amountToMinorUnits(amount);
    const order = await this.gateway.createOrder({
      amount: minorAmount,
      currency: this.currency,
      receipt: appointment.publicId,
      notes: {
        appointmentPublicId: appointment.publicId,
        customerId,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        appointmentId: appointment.id,
        customerId,
        amount,
        currency: order.currency,
        paymentGateway: this.gateway.providerName,
        gatewayTransactionId: order.orderId,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentPublicId: payment.publicId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  /**
   * Verify the {orderId}|{paymentId} signature returned by the client checkout
   * and promote the payment to PAID. Used as a fast-path success handler — the
   * webhook is the ultimate source of truth, but verifying client-side lets
   * the customer see confirmation immediately.
   */
  async verify(
    customerId: string,
    dto: VerifyPaymentDto,
  ): Promise<{ paymentPublicId: string }> {
    this.gateway.verifyPaymentSignature({
      orderId: dto.razorpayOrderId,
      paymentId: dto.razorpayPaymentId,
      signature: dto.razorpaySignature,
    });
    const payment = await this.prisma.payment.findFirst({
      where: {
        gatewayTransactionId: dto.razorpayOrderId,
        customerId,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.markPaid(payment.id, dto.razorpayPaymentId);
    return { paymentPublicId: payment.publicId };
  }

  // -------------------------------------------------------------------------
  // Webhook handling
  // -------------------------------------------------------------------------

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    this.gateway.verifyWebhookSignature({ rawBody, signature });
    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody) as RazorpayWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    switch (event.event) {
      case 'payment.captured': {
        const orderId = event.payload.payment?.entity?.order_id;
        const gatewayPaymentId = event.payload.payment?.entity?.id;
        if (!orderId) return;
        const payment = await this.prisma.payment.findFirst({
          where: { gatewayTransactionId: orderId },
        });
        if (!payment) {
          this.logger.warn(`Webhook for unknown order ${orderId}`);
          return;
        }
        await this.markPaid(payment.id, gatewayPaymentId);
        return;
      }
      case 'payment.failed': {
        const orderId = event.payload.payment?.entity?.order_id;
        if (!orderId) return;
        const payment = await this.prisma.payment.findFirst({
          where: { gatewayTransactionId: orderId },
        });
        if (!payment) return;
        await this.markFailed(payment.id);
        return;
      }
      case 'refund.processed':
      case 'refund.created': {
        const refundId = event.payload.refund?.entity?.id;
        const gatewayPaymentId = event.payload.refund?.entity?.payment_id;
        // Refunds were initiated by us; the response is informational. We
        // already flipped Payment.status=REFUNDED at refund-initiation time,
        // so this is just a no-op log.
        this.logger.log(
          `Razorpay refund event ${event.event} refundId=${refundId} paymentId=${gatewayPaymentId}`,
        );
        return;
      }
      default:
        this.logger.debug(`Ignoring Razorpay webhook event: ${event.event}`);
    }
  }

  // -------------------------------------------------------------------------
  // State transitions
  // -------------------------------------------------------------------------

  /**
   * Promote a Payment to PAID and advance the parent Appointment. Idempotent —
   * if the payment is already PAID, this is a no-op.
   */
  async markPaid(paymentId: bigint, gatewayPaymentId?: string): Promise<void> {
    const mailJobs: PendingMailJob[] = [];
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { appointment: { include: { appointmentType: true } } },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === PaymentStatus.PAID) return;
      if (payment.status === PaymentStatus.REFUNDED) {
        this.logger.warn(
          `Refusing to mark refunded payment ${payment.publicId} as paid`,
        );
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          ...(gatewayPaymentId
            ? { gatewayTransactionId: gatewayPaymentId }
            : {}),
        },
      });

      const appointment = payment.appointment;
      // Promote the appointment per its manualConfirmation policy. If the
      // appointment is no longer PENDING (e.g. already cancelled), leave it.
      if (appointment.status === AppointmentStatus.PENDING) {
        const promotedStatus = appointment.appointmentType.manualConfirmation
          ? AppointmentStatus.PENDING
          : AppointmentStatus.CONFIRMED;
        await tx.appointment.update({
          where: { id: appointment.id },
          data: {
            status: promotedStatus,
            paymentStatus: PaymentStatus.PAID,
          },
        });

        const eventType = appointment.appointmentType.manualConfirmation
          ? 'APPOINTMENT_PENDING_APPROVAL'
          : 'APPOINTMENT_CONFIRMED';
        const apptJobs = await this.notifications.dispatch(tx, {
          type: eventType,
          appointmentId: appointment.id,
        });
        mailJobs.push(...apptJobs);
      } else {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      }

      const receiptJobs = await this.notifications.dispatch(tx, {
        type: 'PAYMENT_RECEIVED',
        paymentId: payment.id,
      });
      mailJobs.push(...receiptJobs);
    });
    await this.notifications.flush(mailJobs);
  }

  /**
   * Mark a Payment as FAILED and cancel the parent Appointment. Idempotent.
   */
  async markFailed(paymentId: bigint): Promise<void> {
    const mailJobs: PendingMailJob[] = [];
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { appointment: true },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === PaymentStatus.FAILED) return;
      if (
        payment.status === PaymentStatus.PAID ||
        payment.status === PaymentStatus.REFUNDED
      ) {
        this.logger.warn(
          `Refusing to mark already-${payment.status} payment ${payment.publicId} as failed`,
        );
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      if (payment.appointment.status === AppointmentStatus.PENDING) {
        await tx.appointment.update({
          where: { id: payment.appointment.id },
          data: {
            status: AppointmentStatus.CANCELLED,
            paymentStatus: PaymentStatus.FAILED,
            cancellationReason: 'payment_failed',
            cancelledAt: new Date(),
          },
        });

        await writeAuditLog(tx, {
          actorId: null,
          actorRole: null,
          action: 'appointment.cancelled',
          entityType: 'appointment',
          entityId: payment.appointment.publicId,
          metadata: {
            previousStatus: payment.appointment.status,
            actor: 'system',
            reason: 'payment_failed',
            paymentPublicId: payment.publicId,
          },
        });

        const cancellationJobs = await this.notifications.dispatch(tx, {
          type: 'APPOINTMENT_CANCELLED',
          appointmentId: payment.appointment.id,
          actor: 'organiser',
          reason: 'Payment was not received',
        });
        mailJobs.push(...cancellationJobs);
      }
    });
    await this.notifications.flush(mailJobs);
  }

  // -------------------------------------------------------------------------
  // RefundHandler
  // -------------------------------------------------------------------------

  async refundForAppointment(
    tx: Prisma.TransactionClient,
    appointmentId: bigint,
  ): Promise<{ refundedPaymentIds: bigint[] }> {
    const payments = await tx.payment.findMany({
      where: { appointmentId, status: PaymentStatus.PAID },
    });
    const refundedPaymentIds: bigint[] = [];
    for (const payment of payments) {
      if (!payment.gatewayTransactionId) {
        this.logger.warn(
          `Payment ${payment.publicId} has no gatewayTransactionId — cannot refund`,
        );
        continue;
      }
      try {
        await this.gateway.refund({
          paymentId: payment.gatewayTransactionId,
          amount: amountToMinorUnits(payment.amount),
        });
      } catch (err) {
        // Don't roll back the cancellation just because the gateway is down —
        // mark the payment as still PAID and surface a warning. An operator
        // can retry the refund manually.
        this.logger.error(
          `Refund failed for payment ${payment.publicId}: ${(err as Error).message}`,
        );
        continue;
      }
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
      });
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });
      refundedPaymentIds.push(payment.id);
    }
    return { refundedPaymentIds };
  }
}

/**
 * Convert a Prisma Decimal/number to minor-unit integer (paise/cents).
 * Razorpay rejects fractional amounts in `amount` field.
 */
function amountToMinorUnits(amount: Prisma.Decimal | number | string): number {
  const value =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? Number(amount)
        : Number(amount.toString());
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException('Invalid payment amount');
  }
  return Math.round(value * 100);
}
