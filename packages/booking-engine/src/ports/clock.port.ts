import type { ISODateTime } from '../domain/value-objects.ts';

export interface ClockPort {
  now(): ISODateTime;
}
