import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BookablePersonsController } from './bookable-persons.controller';
import { BookablePersonsService } from './bookable-persons.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [BookablePersonsController],
  providers: [BookablePersonsService],
  exports: [BookablePersonsService],
})
export class BookablePersonsModule {}
