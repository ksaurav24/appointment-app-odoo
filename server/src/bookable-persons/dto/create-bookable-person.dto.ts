import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const IN_PHONE_REGEX = /^\d{10}$/;

export class StaffWeeklyRuleDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_REGEX, { message: 'startTime must be HH:mm' })
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(TIME_REGEX, { message: 'endTime must be HH:mm' })
  endTime!: string;
}

export class StaffDateExceptionDto {
  @ApiProperty({ example: '2026-05-20' })
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({
    example: 'VACATION',
    description: 'VACATION | SICK_LEAVE | TRAINING | OTHER',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  reason?: string;
}

export class StaffAvailabilityOverrideDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  appointmentTypeId!: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiProperty({ type: [StaffWeeklyRuleDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StaffWeeklyRuleDto)
  weeklyRules!: StaffWeeklyRuleDto[];

  @ApiPropertyOptional({ type: [StaffDateExceptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffDateExceptionDto)
  dateExceptions?: StaffDateExceptionDto[];
}

export class CreateBookablePersonDto {
  @ApiProperty({ example: 'Dr. Priya Iyer', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'Senior Orthodontist',
    description: 'Job title shown on staff records',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  designation!: string;

  @ApiProperty({
    example: 'priya.iyer@acme-dental.com',
    description: 'Email used to send booking notifications to the provider',
    maxLength: 254,
  })
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @ApiProperty({
    example: '9876501234',
    description: 'India contact number: exactly 10 digits',
  })
  @IsString()
  @Matches(IN_PHONE_REGEX, {
    message: 'phone must be exactly 10 digits',
  })
  phone!: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Optional appointment types assigned to this staff member. Can be empty and assigned later.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  appointmentTypeIds?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Inactive staff are removed from future slot computation',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [StaffAvailabilityOverrideDto],
    description:
      'Per-appointment-type availability override. Replaces org-level schedule for linked appointment types.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAvailabilityOverrideDto)
  availabilityOverrides?: StaffAvailabilityOverrideDto[];
}
