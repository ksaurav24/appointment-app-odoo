import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { EnvVars } from '../../config/env.validation';

/**
 * Cache-aside helper for analytics dashboards. Backed by Redis (reuses the
 * REDIS_URL already configured for BullMQ). Keys are namespaced under
 * `analytics:` and SCAN-deleted by prefix on writes that move the underlying
 * counts.
 *
 * Tier-1 strategy (see plan): on-demand SQL with composite indexes + this
 * cache. If a single org's appointment table outgrows on-the-fly aggregation,
 * graduate to a maintained `appointment_daily_stats` summary table.
 */
@Injectable()
export class AnalyticsCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private redis!: IORedis;

  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  onModuleInit(): void {
    const url = this.config.get('REDIS_URL', { infer: true });
    this.redis = new IORedis(url, {
      // Don't queue commands while disconnected — fail fast so getOrSet falls
      // through to the loader rather than silently waiting.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  /**
   * Returns a cached value if present, otherwise invokes `loader`, caches the
   * result with the given TTL, and returns it. If the cache is unreachable,
   * `loader` is invoked directly — analytics must never block on Redis.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn(
        `Cache read failed for ${key}: ${(err as Error).message}`,
      );
      return loader();
    }

    const value = await loader();
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache write failed for ${key}: ${(err as Error).message}`,
      );
    }
    return value;
  }

  /**
   * Delete every key matching `prefix*`. Uses SCAN to avoid blocking Redis on
   * large keyspaces. Errors are logged and swallowed — a stale dashboard is
   * better than a failed write path.
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    if (!prefix) return;
    const pattern = `${prefix}*`;
    try {
      const stream = this.redis.scanStream({ match: pattern, count: 100 });
      const pending: Promise<unknown>[] = [];
      for await (const keys of stream) {
        const batch = keys as string[];
        if (batch.length > 0) {
          pending.push(this.redis.del(...batch));
        }
      }
      await Promise.all(pending);
    } catch (err) {
      this.logger.warn(
        `Cache invalidation failed for ${pattern}: ${(err as Error).message}`,
      );
    }
  }

  async invalidateAdminScope(): Promise<void> {
    await this.invalidatePrefix('analytics:admin:');
  }

  async invalidateOrgScope(organizationId: string): Promise<void> {
    await this.invalidatePrefix(`analytics:org:${organizationId}:`);
  }
}
