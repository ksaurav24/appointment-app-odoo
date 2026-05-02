import { AppointmentStatus, EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Client = Prisma.TransactionClient | PrismaService;

export interface CapacityRange {
  start: Date;
  end: Date;
}

export interface CapacityExclusions {
  /** Lock id to exclude from the lock count (the customer's own lock). */
  lockId?: bigint;
  /** Appointment id to exclude (used during reschedule). */
  appointmentId?: bigint;
}

/**
 * Sum of capacity consumed by overlapping (non-cancelled) appointments and
 * still-active slot locks for the given entity. Single source of truth for
 * the capacity check used in slot-lock acquisition and appointment confirmation.
 */
export async function countConsumedCapacity(
  client: Client,
  at: { id: string; entityType: EntityType },
  entityId: string,
  range: CapacityRange,
  exclude: CapacityExclusions = {},
): Promise<number> {
  const entityFilter =
    at.entityType === EntityType.PERSON
      ? { bookablePersonId: entityId }
      : { bookableResourceId: entityId };

  const appointmentWhere: Prisma.AppointmentWhereInput = {
    appointmentTypeId: at.id,
    ...entityFilter,
    status: { not: AppointmentStatus.CANCELLED },
    startTime: { lt: range.end },
    endTime: { gt: range.start },
    ...(exclude.appointmentId != null
      ? { id: { not: exclude.appointmentId } }
      : {}),
  };

  const lockWhere: Prisma.SlotLockWhereInput = {
    appointmentTypeId: at.id,
    ...entityFilter,
    expiresAt: { gt: new Date() },
    slotStart: { lt: range.end },
    slotEnd: { gt: range.start },
    ...(exclude.lockId != null ? { id: { not: exclude.lockId } } : {}),
  };

  const [appointments, locks] = await Promise.all([
    client.appointment.aggregate({
      _sum: { capacityBooked: true },
      where: appointmentWhere,
    }),
    client.slotLock.count({ where: lockWhere }),
  ]);

  return (appointments._sum.capacityBooked ?? 0) + locks;
}
