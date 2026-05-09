import { BadRequestException, ConflictException } from '@nestjs/common';
import { AssignmentMode, EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacityMode, countConsumedCapacity } from './capacity';

type Client = Prisma.TransactionClient | PrismaService;

interface PickableAppointmentType {
  id: string;
  entityType: EntityType;
  assignmentMode: AssignmentMode;
  maxBookingsPerSlot: number;
  bufferMinutes?: number | null;
  entities: {
    bookablePersonId: string | null;
    bookableResourceId: string | null;
  }[];
}

/**
 * MANUAL → caller must specify an entity that is linked.
 * AUTO → if no entity supplied, pick the first linked entity that has the
 * slot free (per the supplied capacity mode). This keeps the schema invariant
 * (entity required on appointments/slot_locks) while honoring PRD §4.1 step
 * 4 — the system picks for AUTO at slot-pick time.
 */
export async function pickEntityForSlot(
  client: Client,
  at: PickableAppointmentType,
  requested: string | undefined,
  slotStart: Date,
  slotEnd: Date,
  mode: CapacityMode = 'all_non_cancelled',
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

  const activeLinkedIds =
    at.entityType === EntityType.PERSON
      ? (
          await client.bookablePerson.findMany({
            where: { id: { in: linkedIds }, isActive: true },
            select: { id: true },
          })
        ).map((p) => p.id)
      : (
          await client.bookableResource.findMany({
            where: { id: { in: linkedIds }, isActive: true },
            select: { id: true },
          })
        ).map((r) => r.id);

  if (activeLinkedIds.length === 0) {
    throw new BadRequestException('No active entities linked to this type');
  }

  if (requested) {
    if (!activeLinkedIds.includes(requested)) {
      throw new BadRequestException(
        'entityId is not linked to this appointment type or is inactive',
      );
    }
    return requested;
  }

  if (at.assignmentMode === AssignmentMode.MANUAL) {
    throw new BadRequestException('entityId is required for MANUAL assignment');
  }

  for (const candidate of activeLinkedIds) {
    const consumed = await countConsumedCapacity(
      client,
      at,
      candidate,
      { start: slotStart, end: slotEnd },
      {},
      mode,
    );
    if (consumed < at.maxBookingsPerSlot) {
      return candidate;
    }
  }
  throw new ConflictException('No entity is available for the requested slot');
}
