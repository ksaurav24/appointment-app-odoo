import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AssignmentMode,
  EntityType,
  Prisma,
  SlotLock,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const APPOINTMENT_TYPE_INCLUDE = {
  entities: true,
  schedules: { include: { rules: true } },
} satisfies Prisma.AppointmentTypeInclude;

type LoadedAppointmentType = Prisma.AppointmentTypeGetPayload<{
  include: typeof APPOINTMENT_TYPE_INCLUDE;
}>;

const DEFAULT_TTL_MINUTES = 5;

export interface AcquireSlotLockInput {
  appointmentTypeId: string;
  entityId?: string;
  /** ISO 8601 instant. */
  startTime: string;
  /** ISO 8601 instant; must be > startTime. */
  endTime: string;
}

@Injectable()
export class SlotLocksService {
  constructor(private readonly prisma: PrismaService) {}

  async acquire(
    customerId: string,
    input: AcquireSlotLockInput,
  ): Promise<SlotLock> {
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

    const at = await this.loadAppointmentType(input.appointmentTypeId);
    const entityId = await this.pickEntity(
      at,
      input.entityId,
      slotStart,
      slotEnd,
    );

    const expiresAt = new Date(Date.now() + DEFAULT_TTL_MINUTES * 60_000);

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction (PRD §12.2 — defense against races).
      const consumed = await this.countConsumedCapacity(
        tx,
        at,
        entityId,
        slotStart,
        slotEnd,
      );
      if (consumed >= at.maxBookingsPerSlot) {
        throw new ConflictException('Slot is no longer available');
      }
      return tx.slotLock.create({
        data: {
          appointmentTypeId: at.id,
          ...(at.entityType === EntityType.PERSON
            ? { bookablePersonId: entityId }
            : { bookableResourceId: entityId }),
          slotStart,
          slotEnd,
          customerId,
          expiresAt,
        },
      });
    });
  }

  async release(customerId: string, lockId: string): Promise<void> {
    const lock = await this.prisma.slotLock.findUnique({
      where: { id: lockId },
    });
    if (!lock) throw new NotFoundException('Slot lock not found');
    if (lock.customerId !== customerId) {
      throw new ForbiddenException('Cannot release another user’s slot lock');
    }
    await this.prisma.slotLock.delete({ where: { id: lockId } });
  }

  async extend(
    customerId: string,
    lockId: string,
    extraMinutes = DEFAULT_TTL_MINUTES,
  ): Promise<SlotLock> {
    const lock = await this.prisma.slotLock.findUnique({
      where: { id: lockId },
    });
    if (!lock) throw new NotFoundException('Slot lock not found');
    if (lock.customerId !== customerId) {
      throw new ForbiddenException('Cannot extend another user’s slot lock');
    }
    if (lock.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Slot lock has already expired');
    }
    return this.prisma.slotLock.update({
      where: { id: lockId },
      data: { expiresAt: new Date(Date.now() + extraMinutes * 60_000) },
    });
  }

  /**
   * Find this customer's active lock for a given (appointmentType, entity,
   * slotStart, slotEnd). Used by the booking flow to consume the lock at
   * confirmation time. Returns null if no matching, unexpired lock exists.
   */
  async findActiveForCustomer(
    customerId: string,
    appointmentTypeId: string,
    entityType: EntityType,
    entityId: string,
    slotStart: Date,
    slotEnd: Date,
  ): Promise<SlotLock | null> {
    return this.prisma.slotLock.findFirst({
      where: {
        customerId,
        appointmentTypeId,
        ...(entityType === EntityType.PERSON
          ? { bookablePersonId: entityId }
          : { bookableResourceId: entityId }),
        slotStart,
        slotEnd,
        expiresAt: { gt: new Date() },
      },
    });
  }

  listForCustomer(customerId: string): Promise<SlotLock[]> {
    return this.prisma.slotLock.findMany({
      where: { customerId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Hard-delete every expired lock. Wired to a scheduled job. */
  async cleanupExpired(): Promise<{ deleted: number }> {
    const result = await this.prisma.slotLock.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return { deleted: result.count };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async loadAppointmentType(
    id: string,
  ): Promise<LoadedAppointmentType> {
    const at = await this.prisma.appointmentType.findFirst({
      where: {
        id,
        organization: { approvalStatus: 'APPROVED', isActive: true },
      },
      include: APPOINTMENT_TYPE_INCLUDE,
    });
    if (!at) throw new NotFoundException('Appointment type not found');
    if (!at.isPublished && !at.shareToken) {
      // Unpublished types are still bookable via share token; the public
      // appointment-types controller is the gate. Here we just trust the id
      // and let availability enforce its own checks.
    }
    return at;
  }

  /**
   * MANUAL → caller must specify an entity that is linked.
   * AUTO → if no entity supplied, pick the first linked entity that has the
   * slot free. This keeps the schema invariant (entity required on lock)
   * while honoring PRD §4.1 step 4 — system picks for AUTO at slot pick time.
   */
  private async pickEntity(
    at: LoadedAppointmentType,
    requested: string | undefined,
    slotStart: Date,
    slotEnd: Date,
  ): Promise<string> {
    const linkedIds = at.entities
      .map((e) =>
        at.entityType === EntityType.PERSON
          ? e.bookablePersonId
          : e.bookableResourceId,
      )
      .filter((x): x is string => x != null);

    if (linkedIds.length === 0) {
      throw new BadRequestException('Appointment type has no linked entities');
    }

    if (requested) {
      if (!linkedIds.includes(requested)) {
        throw new BadRequestException(
          'entityId is not linked to this appointment type',
        );
      }
      return requested;
    }

    if (at.assignmentMode === AssignmentMode.MANUAL) {
      throw new BadRequestException(
        'entityId is required for MANUAL assignment',
      );
    }

    for (const candidate of linkedIds) {
      const consumed = await this.countConsumedCapacity(
        this.prisma,
        at,
        candidate,
        slotStart,
        slotEnd,
      );
      if (consumed < at.maxBookingsPerSlot) {
        return candidate;
      }
    }
    throw new ConflictException(
      'No entity is available for the requested slot',
    );
  }

  /**
   * Sum of capacity consumed by overlapping (non-cancelled) appointments and
   * still-active slot locks for the given entity. Used to gate against
   * `maxBookingsPerSlot` for both single- and multi-capacity types.
   */
  private async countConsumedCapacity(
    client: Prisma.TransactionClient | PrismaService,
    at: LoadedAppointmentType,
    entityId: string,
    slotStart: Date,
    slotEnd: Date,
  ): Promise<number> {
    const entityFilter =
      at.entityType === EntityType.PERSON
        ? { bookablePersonId: entityId }
        : { bookableResourceId: entityId };
    const [appointments, locks] = await Promise.all([
      client.appointment.aggregate({
        _sum: { capacityBooked: true },
        where: {
          appointmentTypeId: at.id,
          ...entityFilter,
          status: { not: AppointmentStatus.CANCELLED },
          startTime: { lt: slotEnd },
          endTime: { gt: slotStart },
        },
      }),
      client.slotLock.count({
        where: {
          appointmentTypeId: at.id,
          ...entityFilter,
          expiresAt: { gt: new Date() },
          slotStart: { lt: slotEnd },
          slotEnd: { gt: slotStart },
        },
      }),
    ]);
    return (appointments._sum.capacityBooked ?? 0) + locks;
  }
}
