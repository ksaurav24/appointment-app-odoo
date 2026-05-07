import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentAnswerDto } from './create-appointment.dto';

/**
 * Body for `POST /public/appointment-types/:id/requests` — the manual-approval
 * flow. The customer submits an appointment request directly (no slot-lock
 * step) which is stored as PENDING until the organiser approves or rejects.
 */
export class CreateAppointmentRequestDto {
  @ApiPropertyOptional({
    description:
      'Optional explicit person/resource id. Required when the appointment type uses MANUAL assignment; ignored otherwise (system picks an available entity).',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({
    example: '2026-05-10T09:00:00.000Z',
    description: 'Slot start time (ISO 8601 instant).',
  })
  @IsISO8601({ strict: true })
  startTime!: string;

  @ApiProperty({
    example: '2026-05-10T09:30:00.000Z',
    description: 'Slot end time (ISO 8601 instant); must be > startTime.',
  })
  @IsISO8601({ strict: true })
  endTime!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of capacity units to reserve (group bookings). Defaults to 1.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityBooked?: number;

  @ApiPropertyOptional({
    type: () => AppointmentAnswerDto,
    isArray: true,
    description:
      'Answers to the booking-questions defined on the appointment type',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AppointmentAnswerDto)
  answers?: AppointmentAnswerDto[];
}
