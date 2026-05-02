import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  EntityType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQuery } from './dto/list-appointments.query';
import { generateConfirmationCode } from './helpers/confirmation-code';
import { AnswerInput, validateAnswers } from './helpers/validate-answers';

const APPOINTMENT_INCLUDE = {
  appointmentType: true,
  bookablePerson: true,
  bookableResource: true,
  answers: { include: { question: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Customer flows
  // -------------------------------------------------------------------------

  async create(
    customerId: string,
    input: CreateAppointmentDto,
  ): Promise<AppointmentWithRelations> {
    const lock = await this.prisma.slotLock.findUnique({
      where: { id: input.slotLockId },
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
    const status = appointmentType.manualConfirmation
      ? AppointmentStatus.PENDING
      : AppointmentStatus.CONFIRMED;
    const paymentStatus = appointmentType.advancePaymentEnabled
      ? PaymentStatus.PENDING
      : PaymentStatus.PAID;

    return this.prisma.$transaction(async (tx) => {
      // Re-check capacity in transaction (PRD §6.1 step 9 — final guard).
      const consumed = await this.countConsumedCapacityExcludingLock(
        tx,
        appointmentType.id,
        appointmentType.entityType,
        lock.bookablePersonId ?? lock.bookableResourceId!,
        lock.slotStart,
        lock.slotEnd,
        lock.id,
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
            questionId: a.questionId,
            answerText: a.answerText,
          })),
        });
      }

      await tx.slotLock.delete({ where: { id: lock.id } });

      return this.loadById(tx, appointment.id);
    });
  }

  listForCustomer(
    customerId: string,
    query: ListAppointmentsQuery,
  ): Promise<AppointmentWithRelations[]> {
    return this.prisma.appointment.findMany({
      where: this.buildListFilter({ customerId }, query),
      include: APPOINTMENT_INCLUDE,
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneForCustomer(
    customerId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, customerId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
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
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneForOrganiser(
    organiserId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, organizationId: org.id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  /** Approve a PENDING appointment (when manualConfirmation is enabled). */
  async approve(
    organiserId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve an appointment in status ${existing.status}`,
      );
    }
    await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  /** Reject a PENDING appointment with an optional reason. */
  async reject(
    organiserId: string,
    id: string,
    reason?: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    if (existing.status !== AppointmentStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject an appointment in status ${existing.status}`,
      );
    }
    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason ?? 'Rejected by organiser',
        cancelledAt: new Date(),
      },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  async markCompleted(
    organiserId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    if (existing.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        `Only CONFIRMED appointments can be marked completed (current: ${existing.status})`,
      );
    }
    await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  async markNoShow(
    organiserId: string,
    id: string,
  ): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    if (existing.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        `Only CONFIRMED appointments can be marked no-show (current: ${existing.status})`,
      );
    }
    await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.NO_SHOW },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
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

  private async countConsumedCapacityExcludingLock(
    tx: Prisma.TransactionClient,
    appointmentTypeId: string,
    entityType: EntityType,
    entityId: string,
    slotStart: Date,
    slotEnd: Date,
    excludeLockId: string,
  ): Promise<number> {
    const entityFilter =
      entityType === EntityType.PERSON
        ? { bookablePersonId: entityId }
        : { bookableResourceId: entityId };
    const [appointments, locks] = await Promise.all([
      tx.appointment.aggregate({
        _sum: { capacityBooked: true },
        where: {
          appointmentTypeId,
          ...entityFilter,
          status: { not: AppointmentStatus.CANCELLED },
          startTime: { lt: slotEnd },
          endTime: { gt: slotStart },
        },
      }),
      tx.slotLock.count({
        where: {
          appointmentTypeId,
          ...entityFilter,
          id: { not: excludeLockId },
          expiresAt: { gt: new Date() },
          slotStart: { lt: slotEnd },
          slotEnd: { gt: slotStart },
        },
      }),
    ]);
    return (appointments._sum.capacityBooked ?? 0) + locks;
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
    id: string,
  ): Promise<AppointmentWithRelations> {
    const found = await tx.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!found) throw new NotFoundException('Appointment not found');
    return found;
  }
}
