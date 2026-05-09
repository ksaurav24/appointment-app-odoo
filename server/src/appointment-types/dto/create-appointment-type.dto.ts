import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    example: 'Dental Consultation (30 min)',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'dental-consultation-30',
    description:
      'URL-safe slug used in the public booking link. Auto-generated from name when omitted.',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(SLUG_REGEX, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    example:
      'A 30-minute one-on-one consultation with the dentist for routine check-ups, second opinions, or treatment planning.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({
    example: 'Consultation',
    description:
      'Optional category for organizer-facing grouping. Defaults to organization category when omitted.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  // Step 2: entity type (locked once bookings exist)
  @ApiProperty({ enum: EntityType, example: EntityType.PERSON })
  @IsEnum(EntityType)
  entityType!: EntityType;

  // Step 3: duration mode + values (cross-validated in service)
  @ApiProperty({ enum: DurationMode, example: DurationMode.FIXED })
  @IsEnum(DurationMode)
  durationMode!: DurationMode;

  @ApiPropertyOptional({
    example: 30,
    description: 'Required when durationMode=FIXED',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Required when durationMode=VARIABLE/RANGE (lower bound)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  minDurationMins?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'Required when durationMode=VARIABLE/RANGE (upper bound)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDurationMins?: number;

  @ApiPropertyOptional({
    example: 15,
    description:
      'Step size in minutes the customer can choose between min and max',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationStepMins?: number;

  // Step 4: assignment + entity ids
  @ApiProperty({
    enum: AssignmentMode,
    example: AssignmentMode.MANUAL,
    description:
      'AUTO = system auto-assigns an entity per booking; MANUAL = customer picks the entity at checkout',
  })
  @IsEnum(AssignmentMode)
  assignmentMode!: AssignmentMode;

  @ApiPropertyOptional({
    example: 15,
    description:
      'Buffer in minutes between consecutive bookings for the same entity.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['12', '15'],
    description:
      'Bookable person/resource ids linked to this type — can be empty at creation and assigned later',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  entityIds?: string[];

  // Step 5: schedule (cross-validated in service)
  @ApiProperty({ enum: ScheduleType, example: ScheduleType.WEEKLY })
  @IsEnum(ScheduleType)
  scheduleType!: ScheduleType;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    description: 'IANA timezone',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiProperty({
    type: () => ScheduleRuleDto,
    isArray: true,
    example: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', isAvailable: true },
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isAvailable: true },
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', isAvailable: true },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleRuleDto)
  scheduleRules!: ScheduleRuleDto[];

  // Step 6: booking rules
  @ApiPropertyOptional({
    example: 1,
    description:
      'Maximum bookings allowed in a single time slot (use >1 for group sessions)',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookingsPerSlot?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  manageCapacity?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'When true, bookings stay PENDING until the organiser confirms or rejects',
  })
  @IsOptional()
  @IsBoolean()
  manualConfirmation?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, the customer must pay an advance to confirm the booking',
  })
  @IsOptional()
  @IsBoolean()
  advancePaymentEnabled?: boolean;

  @ApiPropertyOptional({
    example: 250.0,
    description:
      'Advance payment amount in the organisation’s currency (required when advancePaymentEnabled=true)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advancePaymentAmount?: number;

  @ApiPropertyOptional({
    example: 500.0,
    description: 'Base price of the appointment in the organisation\'s currency (0 for free)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'How many days in advance customers can book (omit or 0 = unlimited)',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  advanceBookingWindowDays?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum hours before the slot a booking can be made',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumNoticePeriodHours?: number;

  // Step 7: cancellation/reschedule policy
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  cancellationAllowed?: boolean;

  @ApiPropertyOptional({
    example: 24,
    description: 'How many hours before start time customers may cancel',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationWindowHours?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  rescheduleAllowed?: boolean;

  @ApiPropertyOptional({
    example: 12,
    description: 'How many hours before start time customers may reschedule',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rescheduleWindowHours?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Maximum reschedules permitted per appointment',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxReschedulesAllowed?: number;

  // Step 9: reminder intervals
  @ApiPropertyOptional({
    example: [1440, 60],
    description:
      'List of reminder offsets in minutes before appointment (e.g. 1440 = 24h before, 60 = 1h before)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  reminderIntervals?: number[];

  // Step 10: booking questions (optional set)
  @ApiPropertyOptional({
    type: () => BookingQuestionDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingQuestionDto)
  bookingQuestions?: BookingQuestionDto[];
}
