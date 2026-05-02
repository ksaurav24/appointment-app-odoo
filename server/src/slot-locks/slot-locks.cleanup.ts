import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { SlotLocksService } from './slot-locks.service';

const CLEANUP_INTERVAL_MS = 60_000;

@Injectable()
export class SlotLocksCleanup implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlotLocksCleanup.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly slotLocks: SlotLocksService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, CLEANUP_INTERVAL_MS);
    if (this.timer.unref) this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    try {
      const { deleted } = await this.slotLocks.cleanupExpired();
      if (deleted > 0) {
        this.logger.debug(`Cleaned up ${deleted} expired slot locks`);
      }
    } catch (err) {
      this.logger.error('Slot lock cleanup failed', err as Error);
    }
  }
}
