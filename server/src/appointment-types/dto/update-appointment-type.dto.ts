import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AssignmentMode, DurationMode, EntityType } from '@prisma/client';
import { SLUG_REGEX } from '../../utils/slug';

/**
 * Partial update for an appointment type's basics + policy.
 * Sub-resources (entities, schedule, questions) have their own PUT endpoints.
 * entityType / durationMode are locked server-side once bookings exist.
 */
export class UpdateAppointmentTypeDto {
  @ApiPropertyOptional({
    example: 'Dental Consultation (45 min)',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: 'dental-consultation-45',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(SLUG_REGEX)
  slug?: string;

  @ApiPropertyOptional({
    example:
      'Updated description: extended to 45 minutes to allow for preventive imaging.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: EntityType, example: EntityType.PERSON })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({ enum: DurationMode, example: DurationMode.FIXED })
  @IsOptional()
  @IsEnum(DurationMode)
  durationMode?: DurationMode;

  @ApiPropertyOptional({ example: 45, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minDurationMins?: number;

  @ApiPropertyOptional({ example: 90, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDurationMins?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationStepMins?: number;

  @ApiPropertyOptional({ enum: AssignmentMode, example: AssignmentMode.AUTO })
  @IsOptional()
  @IsEnum(AssignmentMode)
  assignmentMode?: AssignmentMode;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookingsPerSlot?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  manageCapacity?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  manualConfirmation?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  advancePaymentEnabled?: boolean;

  @ApiPropertyOptional({ example: 500.0, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advancePaymentAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  cancellationAllowed?: boolean;

  @ApiPropertyOptional({ example: 24, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationWindowHours?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  rescheduleAllowed?: boolean;

  @ApiPropertyOptional({ example: 12, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleWindowHours?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxReschedulesAllowed?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, the appointment is conducted online; the booking flow surfaces a video meeting room.',
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
}
