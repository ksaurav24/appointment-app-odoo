import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @IsNumberString({ no_symbols: true })
  slotLockId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
