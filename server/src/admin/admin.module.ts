import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../mailer/mailer.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminController } from './admin.controller';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminOrganizationsService } from './admin-organizations.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule, OrganizationsModule, MailerModule],
  controllers: [
    AdminController,
    AdminOrganizationsController,
    AdminUsersController,
    AdminAppointmentsController,
    AdminAuditLogsController,
  ],
  providers: [
    AdminOrganizationsService,
    AdminUsersService,
    AdminAuditLogsService,
  ],
  exports: [AdminOrganizationsService],
})
export class AdminModule {}
