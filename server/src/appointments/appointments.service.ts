import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  AppointmentTypeVisibility,
  EntityType,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { AnalyticsCacheService } from '../analytics/cache/analytics-cache.service';
import { writeAuditLog } from '../common/audit/audit-log.helper';
import { REFUND_HANDLER, RefundHandler } from '../common/refund-handler.token';
import {
  NotificationsService,
  PendingMailJob,
} from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEmitter } from '../realtime/availability.emitter';
import {
  APPOINTMENTS_QUEUE_NAME,
  AUTO_REJECT_FANOUT_JOB,
  AutoRejectFanoutPayload,
} from './queue/appointments.queue';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentRequestDto } from './dto/create-appointment-request.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { countConsumedCapacity } from './helpers/capacity';
import { generateConfirmationCode } from './helpers/confirmation-code';
import { pickEntityForSlot } from './helpers/entity-pick';
import { assertCancellable, assertReschedulable } from './helpers/policy';
import { AnswerInput, validateAnswers } from './helpers/validate-answers';

const APPOINTMENT_INCLUDE = {
  // organization is nested under appointmentType so the client can render
  // start/end times in the org's configured timezone (matches the slot picker).
  appointmentType: { include: { organization: true } },
  bookablePerson: true,
  bookableResource: true,
  answers: { include: { question: true } },
} satisfies Prisma.AppointmentInclude;

// BigInt `id` is internal; clients address appointments by `publicId`.
const APPOINTMENT_OMIT = { id: true } satisfies Prisma.AppointmentOmit;

/**
 * Reason recorded on appointments that are auto-cancelled because another
 * applicant's approval filled the slot. Surfaced verbatim to the customer
 * via the APPOINTMENT_REJECTED notification.
 */
const AUTO_REJECT_REASON = 'Slot filled by another applicant';

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
  omit: typeof APPOINTMENT_OMIT;
}>;

export interface ActorContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly notifications: NotificationsService,
    private readonly analyticsCache: AnalyticsCacheService,
    @InjectQueue(APPOINTMENTS_QUEUE_NAME)
    private readonly appointmentsQueue: Queue<AutoRejectFanoutPayload>,
    private readonly availabilityEmitter: AvailabilityEmitter,
    @Optional()
    @Inject(REFUND_HANDLER)
    private readonly refundHandler: RefundHandler | null = null,
  ) {}

  /**
   * Returns the entity id from an appointment row regardless of whether it
   * points at a person or a resource. Throws when neither is set, which
   * shouldn't happen for any appointment that successfully passed the
   * service layer.
   */
  private appointmentEntityId(a: {
    bookablePersonId: string | null;
    bookableResourceId: string | null;
  }): string {
    const id = a.bookablePersonId ?? a.bookableResourceId;
    if (!id) {
      throw new Error('Appointment is missing both person and resource id');
    }
    return id;
  }

  private async invalidateAnalyticsCache(
    organizationId: string,
  ): Promise<void> {
    await Promise.all([
      this.analyticsCache.invalidateOrgScope(organizationId),
      this.analyticsCache.invalidateAdminScope(),
    ]);
  }

  // -------------------------------------------------------------------------
  // Customer flows
  // -------------------------------------------------------------------------

  async create(
    customerId: string,
    input: CreateAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    const slotLockId = BigInt(input.slotLockId);
    const lock = await this.prisma.slotLock.findUnique({
      where: { id: slotLockId },
    });
    if (!lock || lock.customerId !== customerId) {
      throw new NotFoundException('Slot lock not found');
    }
    if (lock.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException(
        'Slot lock has expired; please re-select the slot',
      );
    }

    const appointmentType = await this.prisma.appointmentType.findUnique({
      where: { id: lock.appointmentTypeId },
      include: { bookingQuestions: true, organization: true },
    });
    if (!appointmentType)
      throw new NotFoundException('Appointment type not found');

    const capacityBooked = this.resolveCapacity(
      appointmentType,
      input.capacityBooked,
    );
    const answers = validateAnswers(
      appointmentType.bookingQuestions,
      (input.answers ?? []) as AnswerInput[],
    );

    const durationMins = Math.floor(
      (lock.slotEnd.getTime() - lock.slotStart.getTime()) / 60_000,
    );

    // When advance payment is required, the appointment cannot be CONFIRMED
    // until the payment succeeds — keep it PENDING regardless of
    // `manualConfirmation` (PaymentsService.markPaid promotes it).
    const requiresPayment = appointmentType.advancePaymentEnabled;
    const status =
      requiresPayment || appointmentType.manualConfirmation
        ? AppointmentStatus.PENDING
        : AppointmentStatus.CONFIRMED;
    const paymentStatus = requiresPayment
      ? PaymentStatus.PENDING
      : PaymentStatus.PAID;

    const entityIdForLock = lock.bookablePersonId ?? lock.bookableResourceId!;
    const advisoryKey = `${appointmentType.id}:${entityIdForLock}:${lock.slotStart.toISOString()}`;

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialise against concurrent slot-lock acquires / other bookings on
      // the same (type, entity, slot). Without this the capacity recheck below
      // races under READ COMMITTED.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${advisoryKey}, 0))`;

      // Re-check capacity in transaction (PRD §6.1 step 9 — final guard).
      const consumed = await countConsumedCapacity(
        tx,
        {
          id: appointmentType.id,
          entityType: appointmentType.entityType,
          bufferMinutes: appointmentType.bufferMinutes,
        },
        entityIdForLock,
        { start: lock.slotStart, end: lock.slotEnd },
        { lockId: lock.id },
      );
      if (consumed + capacityBooked > appointmentType.maxBookingsPerSlot) {
        throw new ConflictException('Slot is no longer available');
      }

      const appointment = await tx.appointment.create({
        data: {
          appointmentTypeId: appointmentType.id,
          organizationId: appointmentType.organizationId,
          customerId,
          bookablePersonId: lock.bookablePersonId,
          bookableResourceId: lock.bookableResourceId,
          startTime: lock.slotStart,
          endTime: lock.slotEnd,
          durationMins,
          status,
          capacityBooked,
          totalAmount: appointmentType.advancePaymentAmount ?? null,
          paymentStatus,
          confirmationCode: generateConfirmationCode(),
        },
      });

      if (answers.length > 0) {
        await tx.appointmentAnswer.createMany({
          data: answers.map((a) => ({
            appointmentId: appointment.id,
            questionId: BigInt(a.questionId),
            answerText: a.answerText,
          })),
        });
      }

      await tx.slotLock.delete({ where: { id: lock.id } });

      // Dispatch notifications inside the transaction so rows are atomic with
      // the appointment write. Mail enqueue happens after commit (below).
      // When advance payment is required, defer the booking-confirmed/pending
      // notifications until payment succeeds — we only signal "created" here.
      if (requiresPayment) {
        mailJobs = await this.notifications.dispatch(tx, {
          type: 'APPOINTMENT_CREATED',
          appointmentId: appointment.id,
        });
      } else if (appointmentType.manualConfirmation) {
        mailJobs = await this.notifications.dispatch(tx, {
          type: 'APPOINTMENT_PENDING_APPROVAL',
          appointmentId: appointment.id,
        });
      } else {
        mailJobs = await this.notifications.dispatch(tx, {
          type: 'APPOINTMENT_CONFIRMED',
          appointmentId: appointment.id,
        });
      }

      return this.loadById(tx, appointment.id);
    });

    await this.notifications.flush(mailJobs);
    await this.invalidateAnalyticsCache(result.organizationId);
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: appointmentType.id,
      entityId: entityIdForLock,
      slotStart: lock.slotStart,
      slotEnd: lock.slotEnd,
    });
    return result;
  }

  /**
   * Submit a manual-approval booking request (PRD §6.2). The appointment type
   * must have `manualConfirmation = true`. No slot lock is involved — multiple
   * customers may submit competing PENDING requests for the same slot, and
   * the organiser approves up to `maxBookingsPerSlot` of them via
   * `approve()`.
   *
   * The advisory lock + confirmed-only capacity recheck guard against the
   * (rare) case where the slot is already filled with CONFIRMED appointments
   * by the time the request lands.
   */
  async submitRequest(
    customerId: string,
    appointmentTypeId: string,
    input: CreateAppointmentRequestDto,
  ): Promise<AppointmentWithRelations> {
    const slotStart = new Date(input.startTime);
    const slotEnd = new Date(input.endTime);
    if (
      Number.isNaN(slotStart.getTime()) ||
      Number.isNaN(slotEnd.getTime()) ||
      slotEnd.getTime() <= slotStart.getTime()
    ) {
      throw new BadRequestException(
        'startTime and endTime must be valid ISO instants with endTime > startTime',
      );
    }

    const appointmentType = await this.prisma.appointmentType.findFirst({
      where: {
        id: appointmentTypeId,
        visibility: { not: AppointmentTypeVisibility.ARCHIVED },
        organization: { approvalStatus: 'APPROVED', isActive: true },
      },
      include: {
        bookingQuestions: true,
        organization: true,
        entities: true,
      },
    });
    if (!appointmentType) {
      throw new NotFoundException('Appointment type not found');
    }
    if (!appointmentType.manualConfirmation) {
      throw new BadRequestException(
        'This appointment type does not require approval; use POST /appointments with a slot lock instead',
      );
    }
    if (appointmentType.advancePaymentEnabled) {
      // Approval + advance payment combined isn't supported in v1 — the two
      // PENDING-driving signals would race. Reject up front to avoid silent
      // surprises rather than letting the user submit a request that can
      // never be approved without a payment flow that doesn't exist yet.
      throw new BadRequestException(
        'Manual-approval flow does not support advance payment yet',
      );
    }

    const capacityBooked = this.resolveCapacity(
      appointmentType,
      input.capacityBooked,
    );
    const answers = validateAnswers(
      appointmentType.bookingQuestions,
      (input.answers ?? []) as AnswerInput[],
    );

    // Pick the entity by CONFIRMED-only capacity so PENDING applicants don't
    // exhaust the AUTO selection.
    const entityId = await pickEntityForSlot(
      this.prisma,
      appointmentType,
      input.entityId,
      slotStart,
      slotEnd,
      'confirmed_only',
    );

    const durationMins = Math.floor(
      (slotEnd.getTime() - slotStart.getTime()) / 60_000,
    );
    const advisoryKey = `${appointmentType.id}:${entityId}:${slotStart.toISOString()}`;

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialise against approve() and other submitRequest()s for the same
      // slot so the CONFIRMED-count recheck below is race-free.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${advisoryKey}, 0))`;

      const confirmed = await countConsumedCapacity(
        tx,
        {
          id: appointmentType.id,
          entityType: appointmentType.entityType,
          bufferMinutes: appointmentType.bufferMinutes,
        },
        entityId,
        { start: slotStart, end: slotEnd },
        {},
        'confirmed_only',
      );
      if (confirmed + capacityBooked > appointmentType.maxBookingsPerSlot) {
        throw new ConflictException(
          'Slot is already filled by approved bookings',
        );
      }

      const appointment = await tx.appointment.create({
        data: {
          appointmentTypeId: appointmentType.id,
          organizationId: appointmentType.organizationId,
          customerId,
          ...(appointmentType.entityType === 'PERSON'
            ? { bookablePersonId: entityId }
            : { bookableResourceId: entityId }),
          startTime: slotStart,
          endTime: slotEnd,
          durationMins,
          status: AppointmentStatus.PENDING,
          capacityBooked,
          totalAmount: null,
          paymentStatus: PaymentStatus.PAID,
          confirmationCode: generateConfirmationCode(),
        },
      });

      if (answers.length > 0) {
        await tx.appointmentAnswer.createMany({
          data: answers.map((a) => ({
            appointmentId: appointment.id,
            questionId: BigInt(a.questionId),
            answerText: a.answerText,
          })),
        });
      }

      mailJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_PENDING_APPROVAL',
        appointmentId: appointment.id,
      });

      return this.loadById(tx, appointment.id);
    });

    await this.notifications.flush(mailJobs);
    await this.invalidateAnalyticsCache(result.organizationId);
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: appointmentType.id,
      entityId,
      slotStart,
      slotEnd,
    });
    return result;
  }

  listForCustomer(
    customerId: string,
    query: ListAppointmentsQuery,
  ): Promise<AppointmentWithRelations[]> {
    return this.prisma.appointment.findMany({
      where: this.buildListFilter({ customerId }, query),
      include: APPOINTMENT_INCLUDE,
      omit: APPOINTMENT_OMIT,
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneForCustomer(
    customerId: string,
    publicId: string,
  ): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { publicId, customerId },
      include: APPOINTMENT_INCLUDE,
      omit: APPOINTMENT_OMIT,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  /**
   * Customer-initiated cancellation (PRD §7.1). Enforces the type's
   * cancellationAllowed flag and cancellationWindowHours rule.
   */
  async cancelByCustomer(
    customerId: string,
    publicId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.cancelInternal({
      publicId,
      reason: dto.reason,
      actor: 'customer',
      actorId: customerId,
      actorRole: Role.CUSTOMER,
      ownership: { customerId },
      enforcePolicy: true,
    });
  }

  /**
   * Customer-initiated reschedule (PRD §8.1). Customer first acquires a new
   * slot lock via POST /slot-locks; this endpoint consumes that lock.
   */
  async rescheduleByCustomer(
    customerId: string,
    publicId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    return this.rescheduleInternal({
      publicId,
      slotLockId: BigInt(dto.slotLockId),
      reason: dto.reason,
      actorId: customerId,
      actorRole: Role.CUSTOMER,
      ownership: { customerId },
      requireLockOwner: customerId,
      enforcePolicy: true,
    });
  }

  // -------------------------------------------------------------------------
  // Organiser flows
  // -------------------------------------------------------------------------

  async listForOrganiser(
    organiserId: string,
    query: ListAppointmentsQuery,
  ): Promise<AppointmentWithRelations[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.appointment.findMany({
      where: this.buildListFilter({ organizationId: org.id }, query),
      include: APPOINTMENT_INCLUDE,
      omit: APPOINTMENT_OMIT,
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneForOrganiser(
    organiserId: string,
    publicId: string,
  ): Promise<AppointmentWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const appointment = await this.prisma.appointment.findFirst({
      where: { publicId, organizationId: org.id },
      include: APPOINTMENT_INCLUDE,
      omit: APPOINTMENT_OMIT,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  /**
   * Approve a PENDING appointment (manual confirmation). When approval pushes
   * the slot's CONFIRMED count to `maxBookingsPerSlot`, every other PENDING
   * for the same (entity, slot) is auto-cancelled in the same transaction
   * with `cancellationReason = AUTO_REJECT_REASON`. Per-loser
   * `APPOINTMENT_REJECTED` notifications are fanned out via BullMQ so the
   * organiser's request returns immediately even when many losers exist.
   */
  async approve(
    organiserId: string,
    publicId: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, publicId);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve an appointment in status ${existing.status}`,
      );
    }

    const at = existing.appointmentType;
    const entityId = (existing.bookablePersonId ??
      existing.bookableResourceId) as string;
    const advisoryKey = `${existing.appointmentTypeId}:${entityId}:${existing.startTime.toISOString()}`;

    let mailJobs: PendingMailJob[] = [];
    let autoRejectedIds: bigint[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      // Serialise against concurrent approves and submitRequest()s for the
      // same slot so the CONFIRMED-count recheck below is race-free under
      // READ COMMITTED. Two organisers approving simultaneously must not
      // both push CONFIRMED past maxBookingsPerSlot.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${advisoryKey}, 0))`;

      // 'confirmed_only' mode skips PENDING rows, so the appointment we are
      // about to approve is automatically excluded — no need to filter by id.
      const confirmed = await countConsumedCapacity(
        tx,
        {
          id: at.id,
          entityType: at.entityType,
          bufferMinutes: at.bufferMinutes,
        },
        entityId,
        { start: existing.startTime, end: existing.endTime },
        {},
        'confirmed_only',
      );
      if (confirmed + existing.capacityBooked > at.maxBookingsPerSlot) {
        throw new ConflictException('Slot is already fully booked');
      }

      const updated = await tx.appointment.update({
        where: { publicId },
        data: { status: AppointmentStatus.CONFIRMED },
      });
      mailJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_APPROVED',
        appointmentId: updated.id,
      });

      const newConfirmed = confirmed + existing.capacityBooked;
      if (newConfirmed >= at.maxBookingsPerSlot) {
        const losers = await tx.appointment.findMany({
          where: {
            appointmentTypeId: existing.appointmentTypeId,
            status: AppointmentStatus.PENDING,
            startTime: existing.startTime,
            endTime: existing.endTime,
            ...(at.entityType === EntityType.PERSON
              ? { bookablePersonId: entityId }
              : { bookableResourceId: entityId }),
            id: { not: updated.id },
          },
          select: { id: true, publicId: true },
        });
        if (losers.length > 0) {
          autoRejectedIds = losers.map((l) => l.id);
          await tx.appointment.updateMany({
            where: { id: { in: autoRejectedIds } },
            data: {
              status: AppointmentStatus.CANCELLED,
              cancellationReason: AUTO_REJECT_REASON,
              cancelledAt: new Date(),
            },
          });
          for (const loser of losers) {
            await writeAuditLog(tx, {
              actorId: organiserId,
              actorRole: Role.ORGANIZER,
              action: 'appointment.auto_rejected',
              entityType: 'appointment',
              entityId: loser.publicId,
              metadata: {
                triggeredByAppointmentPublicId: updated.publicId,
                slotStart: existing.startTime.toISOString(),
                slotEnd: existing.endTime.toISOString(),
              },
            });
          }
        }
      }

      return this.loadById(tx, updated.id);
    });

    await this.notifications.flush(mailJobs);

    if (autoRejectedIds.length > 0) {
      // Fan-out APPOINTMENT_REJECTED notifications out-of-band: the DB state
      // is already durable, so a queue failure only delays mail — it can't
      // corrupt the slot.
      await this.appointmentsQueue.add(AUTO_REJECT_FANOUT_JOB, {
        appointmentIds: autoRejectedIds.map((id) => id.toString()),
        reason: AUTO_REJECT_REASON,
      });
    }

    await this.invalidateAnalyticsCache(result.organizationId);
    // Both the approve and the auto-reject batch happened on the same
    // (entity, slot), so a single emit reflects both transitions.
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: existing.appointmentTypeId,
      entityId,
      slotStart: existing.startTime,
      slotEnd: existing.endTime,
    });
    return result;
  }

  /** Reject a PENDING appointment with an optional reason. */
  async reject(
    organiserId: string,
    publicId: string,
    reason?: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, publicId);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject an appointment in status ${existing.status}`,
      );
    }

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { publicId },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: reason ?? 'Rejected by organiser',
          cancelledAt: new Date(),
        },
      });
      mailJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_REJECTED',
        appointmentId: updated.id,
        reason,
      });
      return this.loadById(tx, updated.id);
    });
    await this.notifications.flush(mailJobs);
    await this.invalidateAnalyticsCache(result.organizationId);
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: existing.appointmentTypeId,
      entityId: this.appointmentEntityId(existing),
      slotStart: existing.startTime,
      slotEnd: existing.endTime,
    });
    return result;
  }

  async markCompleted(
    organiserId: string,
    publicId: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, publicId);
    if (existing.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        `Only CONFIRMED appointments can be marked completed (current: ${existing.status})`,
      );
    }
    await this.prisma.appointment.update({
      where: { publicId },
      data: { status: AppointmentStatus.COMPLETED },
    });
    await this.invalidateAnalyticsCache(existing.organizationId);
    return this.findOneForOrganiser(organiserId, publicId);
  }

  async markNoShow(
    organiserId: string,
    publicId: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, publicId);
    if (existing.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        `Only CONFIRMED appointments can be marked no-show (current: ${existing.status})`,
      );
    }
    await this.prisma.appointment.update({
      where: { publicId },
      data: { status: AppointmentStatus.NO_SHOW },
    });
    await this.invalidateAnalyticsCache(existing.organizationId);
    return this.findOneForOrganiser(organiserId, publicId);
  }

  /**
   * Organiser-initiated cancellation (PRD §7.2 — manual override).
   * Skips the policy-window check and writes a mandatory audit log.
   */
  async cancelByOrganiser(
    organiserId: string,
    publicId: string,
    dto: CancelAppointmentDto,
    actorContext: ActorContext,
  ): Promise<AppointmentWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.cancelInternal({
      publicId,
      reason: dto.reason,
      actor: 'organiser',
      actorId: organiserId,
      actorRole: Role.ORGANIZER,
      ownership: { organizationId: org.id },
      enforcePolicy: false,
      actorContext,
    });
  }

  /** Organiser-initiated reschedule (PRD §8 — manual override). */
  async rescheduleByOrganiser(
    organiserId: string,
    publicId: string,
    dto: RescheduleAppointmentDto,
    actorContext: ActorContext,
  ): Promise<AppointmentWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.rescheduleInternal({
      publicId,
      slotLockId: BigInt(dto.slotLockId),
      reason: dto.reason,
      actorId: organiserId,
      actorRole: Role.ORGANIZER,
      ownership: { organizationId: org.id },
      enforcePolicy: false,
      actorContext,
    });
  }

  // -------------------------------------------------------------------------
  // Internal helpers — cancellation
  // -------------------------------------------------------------------------

  private async cancelInternal(args: {
    publicId: string;
    reason?: string;
    actor: 'customer' | 'organiser';
    actorId: string;
    actorRole: Role;
    ownership: Prisma.AppointmentWhereInput;
    enforcePolicy: boolean;
    actorContext?: ActorContext;
  }): Promise<AppointmentWithRelations> {
    const existing = await this.prisma.appointment.findFirst({
      where: { publicId: args.publicId, ...args.ownership },
      include: { appointmentType: true, payments: true },
    });
    if (!existing) throw new NotFoundException('Appointment not found');
    if (
      existing.status !== AppointmentStatus.PENDING &&
      existing.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new ConflictException(
        `Cannot cancel an appointment in status ${existing.status}`,
      );
    }
    if (args.enforcePolicy) {
      assertCancellable(existing, existing.appointmentType, new Date());
    }

    const refundEligiblePaymentIds = existing.payments
      .filter((p) => p.status === PaymentStatus.PAID)
      .map((p) => p.id);

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: existing.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: args.reason ?? null,
          cancelledAt: new Date(),
        },
      });

      let refundedPaymentIds: bigint[] = [];
      if (refundEligiblePaymentIds.length > 0 && this.refundHandler) {
        const refundResult = await this.refundHandler.refundForAppointment(
          tx,
          existing.id,
        );
        refundedPaymentIds = refundResult.refundedPaymentIds;
      }

      await writeAuditLog(tx, {
        actorId: args.actorId,
        actorRole: args.actorRole,
        action: 'appointment.cancelled',
        entityType: 'appointment',
        entityId: existing.publicId,
        metadata: {
          previousStatus: existing.status,
          actor: args.actor,
          reason: args.reason ?? null,
          refundedPaymentIds: refundedPaymentIds.map((id) => id.toString()),
        },
        ipAddress: args.actorContext?.ipAddress,
        userAgent: args.actorContext?.userAgent,
      });

      const cancellationJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_CANCELLED',
        appointmentId: existing.id,
        actor: args.actor,
        reason: args.reason,
      });
      mailJobs = [...cancellationJobs];

      for (const paymentId of refundedPaymentIds) {
        const refundJobs = await this.notifications.dispatch(tx, {
          type: 'PAYMENT_REFUNDED',
          paymentId,
        });
        mailJobs.push(...refundJobs);
      }

      return this.loadById(tx, existing.id);
    });
    await this.notifications.flush(mailJobs);
    await this.invalidateAnalyticsCache(existing.organizationId);
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: existing.appointmentTypeId,
      entityId: this.appointmentEntityId(existing),
      slotStart: existing.startTime,
      slotEnd: existing.endTime,
    });
    return result;
  }

  // -------------------------------------------------------------------------
  // Internal helpers — reschedule
  // -------------------------------------------------------------------------

  private async rescheduleInternal(args: {
    publicId: string;
    slotLockId: bigint;
    reason?: string;
    actorId: string;
    actorRole: Role;
    ownership: Prisma.AppointmentWhereInput;
    /** When set, the lock must belong to this customerId. */
    requireLockOwner?: string;
    enforcePolicy: boolean;
    actorContext?: ActorContext;
  }): Promise<AppointmentWithRelations> {
    const existing = await this.prisma.appointment.findFirst({
      where: { publicId: args.publicId, ...args.ownership },
      include: { appointmentType: true },
    });
    if (!existing) throw new NotFoundException('Appointment not found');
    if (
      existing.status !== AppointmentStatus.PENDING &&
      existing.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new ConflictException(
        `Cannot reschedule an appointment in status ${existing.status}`,
      );
    }
    if (args.enforcePolicy) {
      assertReschedulable(existing, existing.appointmentType, new Date());
    }

    const lock = await this.prisma.slotLock.findUnique({
      where: { id: args.slotLockId },
    });
    if (!lock) {
      throw new BadRequestException('Slot lock not found');
    }
    if (args.requireLockOwner && lock.customerId !== args.requireLockOwner) {
      throw new BadRequestException(
        'Slot lock does not belong to this customer',
      );
    }
    if (lock.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Slot lock has expired; please re-select the slot',
      );
    }
    if (lock.appointmentTypeId !== existing.appointmentTypeId) {
      throw new BadRequestException(
        'Slot lock is for a different appointment type',
      );
    }
    // Entity must match the original (PRD §8.3 — entity stays the same).
    if (
      lock.bookablePersonId !== existing.bookablePersonId ||
      lock.bookableResourceId !== existing.bookableResourceId
    ) {
      throw new BadRequestException(
        'Reschedules cannot change the assigned person/resource',
      );
    }
    if (
      lock.slotStart.getTime() === existing.startTime.getTime() &&
      lock.slotEnd.getTime() === existing.endTime.getTime()
    ) {
      throw new BadRequestException(
        'New slot is identical to the current appointment time',
      );
    }

    const newDurationMins = Math.floor(
      (lock.slotEnd.getTime() - lock.slotStart.getTime()) / 60_000,
    );
    const previousStart = existing.startTime;
    const previousEnd = existing.endTime;

    const rescheduleEntityId = (existing.bookablePersonId ??
      existing.bookableResourceId)!;
    const advisoryKey = `${existing.appointmentTypeId}:${rescheduleEntityId}:${lock.slotStart.toISOString()}`;

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      // Serialise against concurrent acquires/bookings on the new slot so the
      // capacity recheck below is race-free under READ COMMITTED.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${advisoryKey}, 0))`;

      // Capacity recheck against the new slot range, excluding both this
      // appointment (it's about to move) and the new lock (it's about to be
      // consumed).
      const consumed = await countConsumedCapacity(
        tx,
        {
          id: existing.appointmentTypeId,
          entityType: existing.appointmentType.entityType,
          bufferMinutes: existing.appointmentType.bufferMinutes,
        },
        rescheduleEntityId,
        { start: lock.slotStart, end: lock.slotEnd },
        { lockId: lock.id, appointmentId: existing.id },
      );
      if (
        consumed + existing.capacityBooked >
        existing.appointmentType.maxBookingsPerSlot
      ) {
        throw new ConflictException('New slot is no longer available');
      }

      await tx.appointmentReschedule.create({
        data: {
          appointmentId: existing.id,
          rescheduledByUserId: args.actorId,
          previousStartTime: previousStart,
          previousEndTime: previousEnd,
          newStartTime: lock.slotStart,
          newEndTime: lock.slotEnd,
          previousPersonId: existing.bookablePersonId,
          previousResourceId: existing.bookableResourceId,
          reason: args.reason,
        },
      });

      await tx.appointment.update({
        where: { id: existing.id },
        data: {
          startTime: lock.slotStart,
          endTime: lock.slotEnd,
          durationMins: newDurationMins,
          rescheduleCount: { increment: 1 },
        },
      });

      await tx.slotLock.delete({ where: { id: lock.id } });

      await writeAuditLog(tx, {
        actorId: args.actorId,
        actorRole: args.actorRole,
        action: 'appointment.rescheduled',
        entityType: 'appointment',
        entityId: existing.publicId,
        metadata: {
          previousStartTime: previousStart.toISOString(),
          previousEndTime: previousEnd.toISOString(),
          newStartTime: lock.slotStart.toISOString(),
          newEndTime: lock.slotEnd.toISOString(),
          rescheduleCount: existing.rescheduleCount + 1,
          reason: args.reason ?? null,
        },
        ipAddress: args.actorContext?.ipAddress,
        userAgent: args.actorContext?.userAgent,
      });

      mailJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_RESCHEDULED',
        appointmentId: existing.id,
        previousStart,
        previousEnd,
      });

      return this.loadById(tx, existing.id);
    });
    await this.notifications.flush(mailJobs);
    await this.invalidateAnalyticsCache(existing.organizationId);
    // Reschedules touch two slots: the previous one (which freed up) and the
    // new one (which is now consumed). Emit for both so subscribers on
    // either day refetch.
    const rescheduleEntity = this.appointmentEntityId(existing);
    await this.availabilityEmitter.emitForSlots([
      {
        appointmentTypeId: existing.appointmentTypeId,
        entityId: rescheduleEntity,
        slotStart: previousStart,
        slotEnd: previousEnd,
      },
      {
        appointmentTypeId: existing.appointmentTypeId,
        entityId: rescheduleEntity,
        slotStart: lock.slotStart,
        slotEnd: lock.slotEnd,
      },
    ]);
    return result;
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  private resolveCapacity(
    at: AppointmentType,
    requested: number | undefined,
  ): number {
    const capacity = requested ?? 1;
    if (capacity < 1) {
      throw new BadRequestException('capacityBooked must be >= 1');
    }
    if (!at.manageCapacity && capacity !== 1) {
      throw new BadRequestException(
        'capacityBooked is only configurable when manageCapacity is enabled',
      );
    }
    if (capacity > at.maxBookingsPerSlot) {
      throw new BadRequestException(
        `capacityBooked cannot exceed maxBookingsPerSlot (${at.maxBookingsPerSlot})`,
      );
    }
    return capacity;
  }

  private buildListFilter(
    base: Prisma.AppointmentWhereInput,
    query: ListAppointmentsQuery,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = { ...base };
    if (query.status) where.status = query.status;
    if (query.appointmentTypeId)
      where.appointmentTypeId = query.appointmentTypeId;
    if (query.entityId) {
      where.OR = [
        { bookablePersonId: query.entityId },
        { bookableResourceId: query.entityId },
      ];
    }
    const start: Prisma.DateTimeFilter = {};
    if (query.from) start.gte = new Date(query.from);
    if (query.to) start.lte = new Date(query.to);
    if (query.upcomingOnly) start.gte = new Date();
    if (Object.keys(start).length > 0) where.startTime = start;
    return where;
  }

  private async loadById(
    tx: Prisma.TransactionClient,
    id: bigint,
  ): Promise<AppointmentWithRelations> {
    const found = await tx.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
      omit: APPOINTMENT_OMIT,
    });
    if (!found) throw new NotFoundException('Appointment not found');
    return found;
  }
}
