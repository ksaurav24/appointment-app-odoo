import type { EntityId, ISODateTime } from '../domain/value-objects.ts';
import { toIdString } from '../shared/ids.ts';

export interface SlotMutexKeyInput {
  appointmentTypeId: EntityId;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export function buildSlotMutexKey(input: SlotMutexKeyInput): string {
  return [
    'booking-slot',
    toIdString(input.appointmentTypeId),
    input.slotStart,
    input.slotEnd,
    input.bookablePersonId == null ? 'none' : toIdString(input.bookablePersonId),
    input.bookableResourceId == null
      ? 'none'
      : toIdString(input.bookableResourceId),
  ].join('|');
}
