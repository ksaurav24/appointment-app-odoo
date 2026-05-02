import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { EnvVars } from '../config/env.validation';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MailDispatcher } from './mail.dispatcher';
import type { MailJobPayload } from './mail.types';

@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly dispatcher: MailDispatcher,
    @Inject(ConfigService)
    private readonly config: ConfigService<EnvVars, true>,
  ) {
    super();
  }

  async process(job: Job<MailJobPayload>): Promise<void> {
    try {
      await this.dispatcher.deliver(job.data);
    } catch (err) {
      this.logger.error(
        `Mail job ${job.id} failed (attempt ${job.attemptsMade + 1}): ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
