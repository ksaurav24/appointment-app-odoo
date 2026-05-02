import type { ISODateTime } from '../domain/value-objects.ts';

export interface SlotMutexKeyInput {
  appointmentTypeId: string;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
}

export function buildSlotMutexKey(input: SlotMutexKeyInput): string {
  return [
    'booking-slot',
    input.appointmentTypeId,
    input.slotStart,
    input.slotEnd,
    input.bookablePersonId ?? 'none',
    input.bookableResourceId ?? 'none',
  ].join('|');
}
