import type { BookingDecision, ConfirmBookingInput, HoldDecision, HoldRequest } from '../domain/models.ts';
import type { ISODateTime } from '../domain/value-objects.ts';
import type { ClockPort } from '../ports/clock.port.ts';
import type { MutexPort } from '../ports/mutex.port.ts';
import type { BookingEngineRepositoryPort } from '../ports/repository.port.ts';
import type { TransactionPort } from '../ports/transaction.port.ts';

export interface ReservationCoordinatorDependencies {
  clock: ClockPort;
  mutex: MutexPort;
  repository: BookingEngineRepositoryPort;
  transactions: TransactionPort;
}

export interface PlaceHoldFlowContext {
  slotKey: string;
  now: ISODateTime;
  input: HoldRequest;
}

export interface ConfirmBookingFlowContext {
  slotKey: string;
  now: ISODateTime;
  input: ConfirmBookingInput;
}

export interface ReservationCoordinatorContract {
  placeHold(input: HoldRequest): Promise<HoldDecision>;
  confirmBooking(input: ConfirmBookingInput): Promise<BookingDecision>;
}
