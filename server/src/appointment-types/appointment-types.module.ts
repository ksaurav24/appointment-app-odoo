import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AppointmentTypeEntitiesService } from './appointment-type-entities.service';
import { AppointmentTypesController } from './appointment-types.controller';
import { AppointmentTypesPublicController } from './appointment-types.public.controller';
import { AppointmentTypesService } from './appointment-types.service';
import { BookingQuestionsService } from './booking-questions.service';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [AppointmentTypesController, AppointmentTypesPublicController],
  providers: [
    AppointmentTypesService,
    AppointmentTypeEntitiesService,
    SchedulesService,
    BookingQuestionsService,
  ],
  exports: [AppointmentTypesService],
})
export class AppointmentTypesModule {}
