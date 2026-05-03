import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AcquireSlotLockDto {
  @ApiProperty({
    example: '17',
    description:
      'Numeric appointment-type id (string-encoded) the slot belongs to',
  })
  @IsString()
  appointmentTypeId!: string;

  @ApiPropertyOptional({
    example: '12',
    description:
      'Specific bookable_person/resource id to hold (required when assignmentMode=MANUAL; auto-assigned otherwise)',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({
    example: '2026-05-15T09:00:00.000Z',
    description: 'Slot start time in ISO-8601 (UTC)',
  })
  @IsISO8601()
  startTime!: string;

  @ApiProperty({
    example: '2026-05-15T09:30:00.000Z',
    description: 'Slot end time in ISO-8601 (UTC)',
  })
  @IsISO8601()
  endTime!: string;
}
