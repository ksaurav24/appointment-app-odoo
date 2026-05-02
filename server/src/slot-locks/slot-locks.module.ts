import { Module } from '@nestjs/common';
import { SlotLocksCleanup } from './slot-locks.cleanup';
import { SlotLocksController } from './slot-locks.controller';
import { SlotLocksService } from './slot-locks.service';

@Module({
  controllers: [SlotLocksController],
  providers: [SlotLocksService, SlotLocksCleanup],
  exports: [SlotLocksService],
})
export class SlotLocksModule {}
