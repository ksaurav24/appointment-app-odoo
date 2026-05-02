import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import {
  AssignmentMode,
  DurationMode,
  EntityType,
  ScheduleType,
} from '@prisma/client';
import { SLUG_REGEX } from '../../utils/slug';
import { BookingQuestionDto } from './set-booking-questions.dto';
import { ScheduleRuleDto } from './set-schedule.dto';

export class CreateAppointmentTypeDto {
  // Step 1: basics
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(SLUG_REGEX, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  // Step 2: entity type (locked once bookings exist)
  @IsEnum(EntityType)
  entityType!: EntityType;

  // Step 3: duration mode + values (cross-validated in service)
  @IsEnum(DurationMode)
  durationMode!: DurationMode;

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

  // Step 4: assignment + entity ids
  @IsEnum(AssignmentMode)
  assignmentMode!: AssignmentMode;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  entityIds!: string[];

  // Step 5: schedule (cross-validated in service)
  @IsEnum(ScheduleType)
  scheduleType!: ScheduleType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleRuleDto)
  scheduleRules!: ScheduleRuleDto[];

  // Step 6: booking rules
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

  // Step 7: cancellation/reschedule policy
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

  // Step 8: booking questions (optional set)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingQuestionDto)
  bookingQuestions?: BookingQuestionDto[];
}
