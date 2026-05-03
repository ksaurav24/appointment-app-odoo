import { Injectable, Logger } from '@nestjs/common';
import { AppointmentStatus, EntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityGateway, availabilityRoom } from './availability.gateway';
import { isoDatesInZoneSpanned } from './zone-date';

export type SlotState = 'available' | 'pending' | 'booked';

export interface SlotUpdatedPayload {
  appointmentTypeId: string;
  entityId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  confirmedCount: number;
  pendingCount: number;
  remainingCapacity: number;
  state: SlotState;
}

export interface EmitForSlotInput {
  appointmentTypeId: string;
  entityId: string;
  slotStart: Date;
  slotEnd: Date;
}

/**
 * Pushes `slot:updated` events to the booking page after a mutation. Always
 * called *after* the surrounding transaction commits — emitting from inside
 * a tx would let listeners refetch stale rows under READ COMMITTED.
 *
 * Recovery posture for the rare commit-then-crash window: the next mutation
 * on that slot will emit, and react-query refetch-on-focus on the client
 * picks up missed updates within seconds. No outbox in v1.
 */
@Injectable()
export class AvailabilityEmitter {
  private readonly logger = new Logger(AvailabilityEmitter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AvailabilityGateway,
  ) {}

  /**
   * Re-derives confirmed/pending counts for a single (appointmentType, entity,
   * slot) and emits to both the entity-specific and wildcard rooms for every
   * date the slot touches in the schedule timezone.
   */
  async emitForSlot(input: EmitForSlotInput): Promise<void> {
    try {
      const at = await this.prisma.appointmentType.findUnique({
        where: { id: input.appointmentTypeId },
        include: { schedules: true },
      });
      if (!at) {
        this.logger.warn(
          `emitForSlot skipped — appointment type ${input.appointmentTypeId} no longer exists`,
        );
        return;
      }

      const tz = at.schedules[0]?.timezone ?? 'UTC';
      const dates = isoDatesInZoneSpanned(input.slotStart, input.slotEnd, tz);
      const counts = await this.computeCounts(at, input);
      const remaining = Math.max(0, at.maxBookingsPerSlot - counts.confirmed);
      const state: SlotState =
        counts.confirmed >= at.maxBookingsPerSlot
          ? 'booked'
          : at.manualConfirmation && counts.pending > 0
            ? 'pending'
            : 'available';

      for (const date of dates) {
        const payload: SlotUpdatedPayload = {
          appointmentTypeId: at.id,
          entityId: input.entityId,
          date,
          slotStart: input.slotStart.toISOString(),
          slotEnd: input.slotEnd.toISOString(),
          confirmedCount: counts.confirmed,
          pendingCount: counts.pending,
          remainingCapacity: remaining,
          state,
        };
        // Publish to BOTH the entity-specific room and the wildcard room so
        // AUTO-mode subscribers (no entityId yet) also receive the update.
        const wildcardRoom = availabilityRoom(at.id, date, null);
        const entityRoom = availabilityRoom(at.id, date, input.entityId);
        this.gateway.server
          .to([wildcardRoom, entityRoom])
          .emit('slot:updated', payload);
      }
    } catch (err) {
      // Never let an emit failure escape into a service method's response —
      // the DB state is already durable, the missed event will be filled by
      // the next mutation or react-query's refetch-on-focus.
      this.logger.error(
        `Failed to emit slot:updated for ${input.appointmentTypeId} ${input.entityId} ${input.slotStart.toISOString()}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Convenience for cleanup tasks that touch many distinct slots at once.
   * Each unique (entityId, slotStart, slotEnd) gets one emit per touched date.
   */
  async emitForSlots(slots: EmitForSlotInput[]): Promise<void> {
    const seen = new Set<string>();
    const unique: EmitForSlotInput[] = [];
    for (const s of slots) {
      const key = `${s.appointmentTypeId}|${s.entityId}|${s.slotStart.toISOString()}|${s.slotEnd.toISOString()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(s);
    }
    await Promise.all(unique.map((s) => this.emitForSlot(s)));
  }

  private async computeCounts(
    at: { id: string; entityType: EntityType },
    input: EmitForSlotInput,
  ): Promise<{ confirmed: number; pending: number }> {
    const entityFilter =
      at.entityType === EntityType.PERSON
        ? { bookablePersonId: input.entityId }
        : { bookableResourceId: input.entityId };

    const [confirmedAgg, pendingAgg] = await Promise.all([
      this.prisma.appointment.aggregate({
        _sum: { capacityBooked: true },
        where: {
          appointmentTypeId: at.id,
          ...entityFilter,
          status: AppointmentStatus.CONFIRMED,
          startTime: { lt: input.slotEnd },
          endTime: { gt: input.slotStart },
        },
      }),
      this.prisma.appointment.aggregate({
        _sum: { capacityBooked: true },
        where: {
          appointmentTypeId: at.id,
          ...entityFilter,
          status: AppointmentStatus.PENDING,
          startTime: { lt: input.slotEnd },
          endTime: { gt: input.slotStart },
        },
      }),
    ]);

    return {
      confirmed: confirmedAgg._sum.capacityBooked ?? 0,
      pending: pendingAgg._sum.capacityBooked ?? 0,
    };
  }
}
