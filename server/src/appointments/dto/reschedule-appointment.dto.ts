import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    example: '1124',
    description:
      'Numeric id (string-encoded) of a fresh slot lock acquired for the new desired slot',
  })
  @IsNumberString({ no_symbols: true })
  slotLockId!: string;

  @ApiPropertyOptional({
    example: 'Work meeting moved — please move appointment to the later slot.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
