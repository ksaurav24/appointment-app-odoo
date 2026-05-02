import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import {
  AvailabilityResponse,
  AvailabilityService,
  DurationOptionsResponse,
} from './availability.service';
import { AvailabilityQuery } from './dto/availability.query';
import { DurationOptionsQuery } from './dto/duration-options.query';

@ApiTags('public-availability')
@Public()
@Controller('public/appointment-types/:id/availability')
export class AvailabilityPublicController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @ApiOperation({
    summary:
      'Real-time availability for an appointment type on a specific date',
  })
  get(
    @Param('id') id: string,
    @Query() query: AvailabilityQuery,
  ): Promise<AvailabilityResponse> {
    return this.availability.getAvailability({
      appointmentTypeId: id,
      date: query.date,
      entityId: query.entityId,
      timezone: query.timezone,
    });
  }

  @Get('duration-options')
  @ApiOperation({
    summary:
      'Valid duration choices from a chosen start time (variable-duration only)',
  })
  durationOptions(
    @Param('id') id: string,
    @Query() query: DurationOptionsQuery,
  ): Promise<DurationOptionsResponse> {
    return this.availability.getDurationOptions({
      appointmentTypeId: id,
      date: query.date,
      startTime: query.startTime,
      entityId: query.entityId,
      timezone: query.timezone,
    });
  }
}
