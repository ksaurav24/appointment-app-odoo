import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PaymentsModule } from '../payments/payments.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsOrganiserController } from './appointments.organiser.controller';
import { AppointmentsPublicController } from './appointments.public.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsProcessor } from './queue/appointments.processor';
import { APPOINTMENTS_QUEUE_NAME } from './queue/appointments.queue';

@Module({
  imports: [
    OrganizationsModule,
    PaymentsModule,
    BullModule.registerQueueAsync({
      name: APPOINTMENTS_QUEUE_NAME,
      useFactory: () => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 3_600, count: 1_000 },
          removeOnFail: { age: 24 * 3_600 },
        },
      }),
    }),
  ],
  controllers: [
    AppointmentsController,
    AppointmentsOrganiserController,
    AppointmentsPublicController,
  ],
  providers: [AppointmentsService, AppointmentsProcessor],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
