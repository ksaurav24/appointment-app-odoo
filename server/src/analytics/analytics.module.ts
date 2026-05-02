import { Global, Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AnalyticsAdminController } from './analytics-admin.controller';
import { AnalyticsOrganiserController } from './analytics-organiser.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './cache/analytics-cache.service';

@Global()
@Module({
  imports: [OrganizationsModule],
  controllers: [AnalyticsAdminController, AnalyticsOrganiserController],
  providers: [AnalyticsService, AnalyticsCacheService],
  exports: [AnalyticsService, AnalyticsCacheService],
})
export class AnalyticsModule {}
