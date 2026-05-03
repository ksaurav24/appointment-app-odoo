import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

export class ListAdminAppointmentsQuery {
  @ApiPropertyOptional({
    example: 'b6f6b9d4-0e62-4c5a-9d3a-4a7e2c1a9b11',
    description: 'Filter appointments belonging to this organisation',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    example: '8c2d6e8c-7a3f-4b6f-8b1d-2e6e6c0a4d77',
    description: 'Filter appointments booked by this customer',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    example: '17',
    description: 'Numeric appointment-type id (string-encoded)',
  })
  @IsOptional()
  @IsString()
  appointmentTypeId?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    example: '2026-05-01T00:00:00.000Z',
    description: 'Filter appointments starting on/after this timestamp',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-05-31T23:59:59.999Z',
    description: 'Filter appointments starting on/before this timestamp',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, only appointments starting now or later are returned',
  })
  @IsOptional()
  @Transform(toBool)
  upcomingOnly?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip: number = 0;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 20;
}
