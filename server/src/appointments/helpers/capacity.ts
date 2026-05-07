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
 * `all_non_cancelled` (default) — every appointment with status != CANCELLED
 * counts plus active slot_locks. Use for instant-confirm bookings and
 * advance-payment holds where any non-cancelled row reserves capacity.
 *
 * `confirmed_only` — only CONFIRMED appointments count; PENDING and slot_locks
 * are ignored. Use for the multi-applicant manual-approval flow where many
 * PENDINGs may co-exist for one slot.
 */
export type CapacityMode = 'all_non_cancelled' | 'confirmed_only';

/**
 * Sum of capacity consumed by overlapping appointments (and, when
 * `mode === 'all_non_cancelled'`, still-active slot locks) for the given
 * entity. Single source of truth for capacity checks across slot-lock
 * acquisition, appointment confirmation, and approval.
 */
export async function countConsumedCapacity(
  client: Client,
  at: { id: string; entityType: EntityType },
  entityId: string,
  range: CapacityRange,
  exclude: CapacityExclusions = {},
  mode: CapacityMode = 'all_non_cancelled',
): Promise<number> {
  const entityFilter =
    at.entityType === EntityType.PERSON
      ? { bookablePersonId: entityId }
      : { bookableResourceId: entityId };

  const statusFilter =
    mode === 'confirmed_only'
      ? { status: AppointmentStatus.CONFIRMED }
      : { status: { not: AppointmentStatus.CANCELLED } };

  const appointmentWhere: Prisma.AppointmentWhereInput = {
    appointmentTypeId: at.id,
    ...entityFilter,
    ...statusFilter,
    startTime: { lt: range.end },
    endTime: { gt: range.start },
    ...(exclude.appointmentId != null
      ? { id: { not: exclude.appointmentId } }
      : {}),
  };

  const appointments = await client.appointment.aggregate({
    _sum: { capacityBooked: true },
    where: appointmentWhere,
  });

  if (mode === 'confirmed_only') {
    return appointments._sum.capacityBooked ?? 0;
  }

  const lockWhere: Prisma.SlotLockWhereInput = {
    appointmentTypeId: at.id,
    ...entityFilter,
    expiresAt: { gt: new Date() },
    slotStart: { lt: range.end },
    slotEnd: { gt: range.start },
    ...(exclude.lockId != null ? { id: { not: exclude.lockId } } : {}),
  };

  const locks = await client.slotLock.count({ where: lockWhere });
  return (appointments._sum.capacityBooked ?? 0) + locks;
}
