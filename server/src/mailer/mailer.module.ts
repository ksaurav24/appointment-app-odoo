import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvVars } from '../config/env.validation';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MailDispatcher } from './mail.dispatcher';
import { MailProcessor } from './mail.processor';
import { MailerService } from './mailer.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => {
        const url = config.get('REDIS_URL', { infer: true });
        return {
          connection: { url },
        };
      },
    }),
    BullModule.registerQueueAsync({
      name: MAIL_QUEUE_NAME,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (_config: ConfigService<EnvVars, true>) => ({
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 3_600, count: 1_000 },
          removeOnFail: { age: 24 * 3_600 },
        },
      }),
    }),
  ],
  providers: [MailerService, MailDispatcher, MailProcessor],
  exports: [MailerService],
})
export class MailerModule {}
