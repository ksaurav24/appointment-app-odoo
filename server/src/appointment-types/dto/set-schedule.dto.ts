import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScheduleType } from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleRuleDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      '0=Sunday … 6=Saturday. Set this for weekly recurrence; omit when using specificDate.',
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    example: '2026-05-15',
    description:
      'YYYY-MM-DD date for one-off availability or override. Mutually exclusive with dayOfWeek.',
  })
  @IsOptional()
  @IsDateString()
  specificDate?: string;

  @ApiProperty({ example: '09:00', description: 'Start time in 24h HH:MM' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:MM (24h)' })
  startTime!: string;

  @ApiProperty({ example: '13:00', description: 'End time in 24h HH:MM' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:MM (24h)' })
  endTime!: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'When false, this rule explicitly blocks the time range (override)',
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class SetScheduleDto {
  @ApiProperty({ enum: ScheduleType, example: ScheduleType.WEEKLY })
  @IsEnum(ScheduleType)
  scheduleType!: ScheduleType;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    description: 'IANA timezone the rules are interpreted in',
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
      {
        specificDate: '2026-05-30',
        startTime: '00:00',
        endTime: '23:59',
        isAvailable: false,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScheduleRuleDto)
  rules!: ScheduleRuleDto[];
}
