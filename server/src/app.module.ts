import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentTypesModule } from './appointment-types/appointment-types.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BookablePersonsModule } from './bookable-persons/bookable-persons.module';
import { BookableResourcesModule } from './bookable-resources/bookable-resources.module';
import { validateEnv } from './config/env.validation';
import { MailerModule } from './mailer/mailer.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrganizationApprovedGuard } from './organizations/guards/organization-approved.guard';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { SlotLocksModule } from './slot-locks/slot-locks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', limit: 120, ttl: 60_000 },
        { name: 'login', limit: 50, ttl: 900_000 },
        { name: 'register', limit: 30, ttl: 3_600_000 },
        { name: 'otpSend', limit: 50, ttl: 3_600_000 },
        { name: 'otpSubmit', limit: 100, ttl: 600_000 },
        { name: 'passwordReset', limit: 30, ttl: 3_600_000 },
        { name: 'refresh', limit: 300, ttl: 60_000 },
        { name: 'cancel', limit: 100, ttl: 600_000 },
        { name: 'reschedule', limit: 100, ttl: 600_000 },
        { name: 'paymentIntent', limit: 50, ttl: 600_000 },
        { name: 'paymentVerify', limit: 100, ttl: 600_000 },
      ],
    }),
    PrismaModule,
    MailerModule,
    NotificationsModule,
    UsersModule,
    OrganizationsModule,
    AuthModule,
    AdminModule,
    AnalyticsModule,
    BookablePersonsModule,
    BookableResourcesModule,
    AppointmentTypesModule,
    AvailabilityModule,
    SlotLocksModule,
    PaymentsModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: OrganizationApprovedGuard },
  ],
})
export class AppModule {}
