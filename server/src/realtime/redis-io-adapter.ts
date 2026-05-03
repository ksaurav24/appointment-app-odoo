import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * Wires socket.io's Redis adapter so a `slot:updated` event emitted from one
 * Node instance reaches subscribers attached to *any* instance. Uses fresh
 * pub/sub Redis connections rather than reusing the BullMQ client — BullMQ's
 * blocking commands are incompatible with the adapter's pub/sub semantics.
 *
 * Falls back to the in-memory adapter (no fan-out) if `REDIS_URL` isn't set,
 * so the dev/test bootstrap still works without Redis.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pub: Redis | null = null;
  private sub: Redis | null = null;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(redisUrl: string | undefined): Promise<void> {
    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is empty — socket.io will run with the in-memory adapter (single-process only).',
      );
      return;
    }
    this.pub = new Redis(redisUrl, {
      // The Redis adapter does its own reconnection; failing fast on startup
      // is preferable to a silent multi-instance split-brain later.
      lazyConnect: false,
      maxRetriesPerRequest: null,
    });
    this.sub = this.pub.duplicate();
    await Promise.all([this.pub.ping(), this.sub.ping()]);
    this.adapterConstructor = createAdapter(this.pub, this.sub);
    this.logger.log('socket.io Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as {
      adapter?: (a: unknown) => void;
    };
    if (this.adapterConstructor && server.adapter) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([this.pub?.quit(), this.sub?.quit()]);
  }
}
