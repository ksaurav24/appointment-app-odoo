import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrganizationApprovedGuard } from './guards/organization-approved.guard';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [UsersModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationApprovedGuard],
  exports: [OrganizationsService, OrganizationApprovedGuard],
})
export class OrganizationsModule {}
