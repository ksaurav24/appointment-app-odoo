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
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { writeAuditLog } from '../common/audit/audit-log.helper';
import { REFUND_HANDLER, RefundHandler } from '../common/refund-handler.token';
import {
  NotificationsService,
  PendingMailJob,
} from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { countConsumedCapacity } from './helpers/capacity';
import { generateConfirmationCode } from './helpers/confirmation-code';
import { assertCancellable, assertReschedulable } from './helpers/policy';
import { AnswerInput, validateAnswers } from './helpers/validate-answers';

const APPOINTMENT_INCLUDE = {
  appointmentType: true,
  bookablePerson: true,
  bookableResource: true,
  answers: { include: { question: true } },
} satisfies Prisma.AppointmentInclude;

// BigInt `id` is internal; clients address appointments by `publicId`.
const APPOINTMENT_OMIT = { id: true } satisfies Prisma.AppointmentOmit;

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
    @Optional()
    @Inject(REFUND_HANDLER)
    private readonly refundHandler: RefundHandler | null = null,
  ) {}

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

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      // Re-check capacity in transaction (PRD §6.1 step 9 — final guard).
      const consumed = await countConsumedCapacity(
        tx,
        {
          id: appointmentType.id,
          entityType: appointmentType.entityType,
        },
        lock.bookablePersonId ?? lock.bookableResourceId!,
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

  /** Approve a PENDING appointment (when manualConfirmation is enabled). */
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

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { publicId },
        data: { status: AppointmentStatus.CONFIRMED },
      });
      mailJobs = await this.notifications.dispatch(tx, {
        type: 'APPOINTMENT_APPROVED',
        appointmentId: updated.id,
      });
      return this.loadById(tx, updated.id);
    });
    await this.notifications.flush(mailJobs);
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

    let mailJobs: PendingMailJob[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      // Capacity recheck against the new slot range, excluding both this
      // appointment (it's about to move) and the new lock (it's about to be
      // consumed).
      const consumed = await countConsumedCapacity(
        tx,
        {
          id: existing.appointmentTypeId,
          entityType: existing.appointmentType.entityType,
        },
        (existing.bookablePersonId ?? existing.bookableResourceId)!,
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
