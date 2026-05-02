import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsOrganiserController } from './appointments.organiser.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [AppointmentsController, AppointmentsOrganiserController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
