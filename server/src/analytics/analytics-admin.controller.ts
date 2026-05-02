import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminDashboard, AnalyticsService } from './analytics.service';
import { AdminTimeseriesQuery } from './dto/timeseries.query';

@ApiTags('admin-analytics')
@ApiCookieAuth('access')
@Roles(Role.ADMIN)
@Controller('admin/analytics')
export class AnalyticsAdminController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin: platform-wide dashboard counters' })
  dashboard(): Promise<AdminDashboard> {
    return this.analytics.adminDashboard();
  }

  @Get('timeseries')
  @ApiOperation({
    summary:
      'Admin: time-bucketed series (metric=appointments|revenue|signups, granularity=day|week|month)',
  })
  timeseries(@Query() query: AdminTimeseriesQuery) {
    return this.analytics.adminTimeseries(query);
  }

  @Get('top-organizations')
  @ApiOperation({
    summary: 'Admin: top organisations by bookings or revenue',
  })
  top(
    @Query('metric', new DefaultValuePipe('bookings')) metric: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (metric !== 'bookings' && metric !== 'revenue') {
      throw new BadRequestException('metric must be bookings or revenue');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }
    return this.analytics.topOrganizations(metric, limit);
  }
}
