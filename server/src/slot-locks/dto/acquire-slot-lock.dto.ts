import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AcquireSlotLockDto {
  @IsString()
  appointmentTypeId!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;
}
