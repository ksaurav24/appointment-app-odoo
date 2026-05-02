import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { EnvVars } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MailDispatcher } from './mail.dispatcher';
import type { MailJobPayload } from './mail.types';

@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly dispatcher: MailDispatcher,
    private readonly prisma: PrismaService,
    @Inject(ConfigService)
    private readonly config: ConfigService<EnvVars, true>,
  ) {
    super();
  }

  async process(job: Job<MailJobPayload>): Promise<void> {
    try {
      await this.dispatcher.deliver(job.data);
      await this.markNotification(job.data, NotificationStatus.SENT);
    } catch (err) {
      const attemptsMax = job.opts.attempts ?? 1;
      const isFinal = job.attemptsMade + 1 >= attemptsMax;
      this.logger.error(
        `Mail job ${job.id} failed (attempt ${job.attemptsMade + 1}/${attemptsMax}): ${(err as Error).message}`,
      );
      if (isFinal) {
        await this.markNotification(job.data, NotificationStatus.FAILED);
      }
      throw err;
    }
  }

  private async markNotification(
    payload: MailJobPayload,
    status: NotificationStatus,
  ): Promise<void> {
    if (!payload.notificationId) return;
    try {
      await this.prisma.notification.update({
        where: { id: BigInt(payload.notificationId) },
        data: {
          status,
          sentAt: status === NotificationStatus.SENT ? new Date() : null,
        },
      });
    } catch (updateErr) {
      // Notification may have been deleted (cascade); don't crash the worker.
      this.logger.warn(
        `Failed to update notification ${payload.notificationId} → ${status}: ${(updateErr as Error).message}`,
      );
    }
  }
}
