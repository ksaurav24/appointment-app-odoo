export type ISODate = `${number}-${number}-${number}`;
export type ISODateTime = string; // NOSONAR - keeps intent clear without impacting runtime.
export type TimeOfDay = `${number}:${number}`;

export interface LocalTimeWindow {
  startMinutes: number;
  endMinutes: number;
}

export interface SlotInterval {
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
}

export interface SnapshotRange {
  rangeStart: ISODateTime;
  rangeEnd: ISODateTime;
}
