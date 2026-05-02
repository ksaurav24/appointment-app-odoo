import { Module } from '@nestjs/common';
import { OrganizationApprovedGuard } from './guards/organization-approved.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationApprovedGuard],
  exports: [OrganizationsService, OrganizationApprovedGuard],
})
export class OrganizationsModule {}
