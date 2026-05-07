import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityEmitter } from '../../realtime/availability.emitter';
import {
  APPOINTMENTS_QUEUE_NAME,
  AUTO_REJECT_FANOUT_JOB,
  AutoRejectFanoutPayload,
} from './appointments.queue';

/**
 * Fans out APPOINTMENT_REJECTED notifications for the auto-cancelled siblings
 * of an approved appointment. Runs out-of-band so the organiser's approve
 * call returns quickly even when many losers exist; the DB state is already
 * durable when this runs.
 */
@Processor(APPOINTMENTS_QUEUE_NAME)
export class AppointmentsProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentsProcessor.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly availabilityEmitter: AvailabilityEmitter,
  ) {
    super();
  }

  async process(job: Job<AutoRejectFanoutPayload>): Promise<void> {
    if (job.name !== AUTO_REJECT_FANOUT_JOB) {
      this.logger.warn(`Unknown job name on appointments queue: ${job.name}`);
      return;
    }
    const { appointmentIds, reason } = job.data;
    // Load slot identity once so we can re-emit availability after the batch.
    // All losers share the same (appointmentTypeId, entity, slot) — `approve`
    // queries them by exact slot range — so the first row is representative.
    const losers = await this.prisma.appointment.findMany({
      where: { id: { in: appointmentIds.map((s) => BigInt(s)) } },
      select: {
        appointmentTypeId: true,
        bookablePersonId: true,
        bookableResourceId: true,
        startTime: true,
        endTime: true,
      },
    });

    for (const idStr of appointmentIds) {
      const id = BigInt(idStr);
      try {
        await this.notifications.dispatchAndFlush({
          type: 'APPOINTMENT_REJECTED',
          appointmentId: id,
          reason,
        });
      } catch (err) {
        // Log and continue — one failure must not block the rest.
        this.logger.error(
          `Failed to dispatch APPOINTMENT_REJECTED for appointment ${idStr}: ${(err as Error).message}`,
        );
      }
    }

    // The approve() handler already emitted once for this slot, but the
    // pendingCount it observed reflected the row state *before* the
    // updateMany committed (auto-reject happens inside the same tx, so the
    // emit-after-commit captures the final state). The re-emit here is
    // belt-and-suspenders for the (rare) case where additional state has
    // shifted by the time this job runs.
    if (losers[0]) {
      const sample = losers[0];
      await this.availabilityEmitter.emitForSlot({
        appointmentTypeId: sample.appointmentTypeId,
        entityId: (sample.bookablePersonId ??
          sample.bookableResourceId) as string,
        slotStart: sample.startTime,
        slotEnd: sample.endTime,
      });
    }
  }
}
