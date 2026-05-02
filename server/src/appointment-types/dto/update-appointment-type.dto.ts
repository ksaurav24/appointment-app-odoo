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
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(SLUG_REGEX)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsEnum(DurationMode)
  durationMode?: DurationMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minDurationMins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDurationMins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationStepMins?: number;

  @IsOptional()
  @IsEnum(AssignmentMode)
  assignmentMode?: AssignmentMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookingsPerSlot?: number;

  @IsOptional()
  @IsBoolean()
  manageCapacity?: boolean;

  @IsOptional()
  @IsBoolean()
  manualConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  advancePaymentEnabled?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advancePaymentAmount?: number;

  @IsOptional()
  @IsBoolean()
  cancellationAllowed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationWindowHours?: number;

  @IsOptional()
  @IsBoolean()
  rescheduleAllowed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleWindowHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxReschedulesAllowed?: number;
}
