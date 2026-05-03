import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType, Prisma, SlotLock } from '@prisma/client';
import { countConsumedCapacity } from '../appointments/helpers/capacity';
import { pickEntityForSlot } from '../appointments/helpers/entity-pick';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEmitter } from '../realtime/availability.emitter';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityEmitter: AvailabilityEmitter,
  ) {}

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
    if (at.manualConfirmation) {
      // Manual-approval types intentionally bypass slot_locks so that multiple
      // customers can submit competing PENDING requests for the same slot.
      // The frontend should call POST /public/appointment-types/:id/requests
      // instead. Defence-in-depth against a misbehaving client.
      throw new BadRequestException(
        'This appointment type requires approval; submit a request via /public/appointment-types/:id/requests instead of acquiring a slot lock',
      );
    }
    const entityId = await pickEntityForSlot(
      this.prisma,
      at,
      input.entityId,
      slotStart,
      slotEnd,
    );

    const expiresAt = new Date(Date.now() + DEFAULT_TTL_MINUTES * 60_000);

    const created = await this.prisma.$transaction(async (tx) => {
      // Serialise concurrent acquires for this exact (type, entity, slotStart):
      // pg_advisory_xact_lock blocks any other tx that hashes to the same key
      // until this one commits/rolls back. Without it the capacity recheck
      // below has a TOCTOU race under READ COMMITTED.
      const lockKey = `${at.id}:${entityId}:${slotStart.toISOString()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

      const consumed = await countConsumedCapacity(tx, at, entityId, {
        start: slotStart,
        end: slotEnd,
      });
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
    await this.availabilityEmitter.emitForSlot({
      appointmentTypeId: at.id,
      entityId,
      slotStart,
      slotEnd,
    });
    return created;
  }

  async release(customerId: string, lockId: bigint): Promise<void> {
    const lock = await this.prisma.slotLock.findUnique({
      where: { id: lockId },
    });
    if (!lock) throw new NotFoundException('Slot lock not found');
    if (lock.customerId !== customerId) {
      throw new ForbiddenException('Cannot release another user’s slot lock');
    }
    await this.prisma.slotLock.delete({ where: { id: lockId } });
    const releasedEntity = lock.bookablePersonId ?? lock.bookableResourceId;
    if (releasedEntity) {
      await this.availabilityEmitter.emitForSlot({
        appointmentTypeId: lock.appointmentTypeId,
        entityId: releasedEntity,
        slotStart: lock.slotStart,
        slotEnd: lock.slotEnd,
      });
    }
  }

  async extend(
    customerId: string,
    lockId: bigint,
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

  /**
   * Hard-delete every expired lock. Wired to a scheduled job. Emits one
   * `slot:updated` per unique (appointmentTypeId, entityId, slotStart,
   * slotEnd) the cleanup freed up — connected booking pages get the
   * capacity-restored event without a manual refresh.
   */
  async cleanupExpired(): Promise<{ deleted: number }> {
    const now = new Date();
    // Load first so we can emit per-slot after the delete commits.
    // `deleteMany` doesn't return rows.
    const expired = await this.prisma.slotLock.findMany({
      where: { expiresAt: { lt: now } },
      select: {
        appointmentTypeId: true,
        bookablePersonId: true,
        bookableResourceId: true,
        slotStart: true,
        slotEnd: true,
      },
    });
    if (expired.length === 0) return { deleted: 0 };

    const result = await this.prisma.slotLock.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    await this.availabilityEmitter.emitForSlots(
      expired
        .map((l) => {
          const entityId = l.bookablePersonId ?? l.bookableResourceId;
          if (!entityId) return null;
          return {
            appointmentTypeId: l.appointmentTypeId,
            entityId,
            slotStart: l.slotStart,
            slotEnd: l.slotEnd,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    );

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
}
