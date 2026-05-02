import { Transform } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class ListAppointmentsQuery {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  appointmentTypeId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : false))
  upcomingOnly?: boolean;
}
