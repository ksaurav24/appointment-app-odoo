import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { AnalyticsService, OrgDashboard } from './analytics.service';
import { OrgTimeseriesQuery } from './dto/timeseries.query';

@ApiTags('organiser-analytics')
@ApiCookieAuth('access')
@Roles(Role.ORGANIZER)
@Controller('organizations/me/analytics')
export class AnalyticsOrganiserController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Organiser: dashboard counters for the org' })
  dashboard(@CurrentUser() user: JwtUserPayload): Promise<OrgDashboard> {
    return this.analytics.organiserDashboard(user.sub);
  }

  @Get('timeseries')
  @ApiOperation({
    summary:
      'Organiser: bookings/revenue/cancellations time-series (granularity day|week|month)',
  })
  timeseries(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: OrgTimeseriesQuery,
  ) {
    return this.analytics.organiserTimeseries(user.sub, query);
  }

  @Get('by-appointment-type')
  @ApiOperation({
    summary: 'Organiser: bookings + revenue grouped by appointment type',
  })
  byAppointmentType(@CurrentUser() user: JwtUserPayload) {
    return this.analytics.organiserByAppointmentType(user.sub);
  }

  @Get('busy-hours')
  @ApiOperation({
    summary:
      'Organiser: 7×24 booking heatmap over the last 90 days (excludes cancelled)',
  })
  busyHours(@CurrentUser() user: JwtUserPayload) {
    return this.analytics.organiserBusyHours(user.sub);
  }
}
