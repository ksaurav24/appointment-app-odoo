import { Module } from '@nestjs/common';
import { AvailabilityPublicController } from './availability.public.controller';
import { AvailabilityService } from './availability.service';

@Module({
  controllers: [AvailabilityPublicController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
