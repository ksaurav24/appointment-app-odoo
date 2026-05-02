import type { AvailabilityEvent } from '../domain/models.ts';

export interface EventBusPort {
  publish(event: AvailabilityEvent): Promise<void>;
  publishMany(events: readonly AvailabilityEvent[]): Promise<void>;
}
