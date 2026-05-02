import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export enum TimeseriesGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum AdminTimeseriesMetric {
  APPOINTMENTS = 'appointments',
  REVENUE = 'revenue',
  SIGNUPS = 'signups',
}

export enum OrgTimeseriesMetric {
  BOOKINGS = 'bookings',
  REVENUE = 'revenue',
  CANCELLATIONS = 'cancellations',
}

export class AdminTimeseriesQuery {
  @ApiProperty({
    enum: AdminTimeseriesMetric,
    example: AdminTimeseriesMetric.APPOINTMENTS,
    description: 'Metric to bucket over time',
  })
  @IsEnum(AdminTimeseriesMetric)
  metric!: AdminTimeseriesMetric;

  @ApiPropertyOptional({
    enum: TimeseriesGranularity,
    example: TimeseriesGranularity.DAY,
    default: TimeseriesGranularity.DAY,
  })
  @IsOptional()
  @IsEnum(TimeseriesGranularity)
  granularity: TimeseriesGranularity = TimeseriesGranularity.DAY;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-02T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class OrgTimeseriesQuery {
  @ApiProperty({
    enum: OrgTimeseriesMetric,
    example: OrgTimeseriesMetric.BOOKINGS,
    description: 'Metric to bucket over time',
  })
  @IsEnum(OrgTimeseriesMetric)
  metric!: OrgTimeseriesMetric;

  @ApiPropertyOptional({
    enum: TimeseriesGranularity,
    example: TimeseriesGranularity.WEEK,
    default: TimeseriesGranularity.DAY,
  })
  @IsOptional()
  @IsEnum(TimeseriesGranularity)
  granularity: TimeseriesGranularity = TimeseriesGranularity.DAY;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-02T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
