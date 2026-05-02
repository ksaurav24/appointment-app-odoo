import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BookableResourcesController } from './bookable-resources.controller';
import { BookableResourcesService } from './bookable-resources.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [BookableResourcesController],
  providers: [BookableResourcesService],
  exports: [BookableResourcesService],
})
export class BookableResourcesModule {}
