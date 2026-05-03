import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import type { EngineAvailabilitySnapshot } from './snapshot-builder';

const BLOCKING_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
] as const;

interface BlockingStatusPolicy {
  appointmentStatuses: readonly string[];
}

interface EngineHoldDecision {
  granted: boolean;
  holdExpiresAt?: string;
  reason?: string;
}

interface EngineBookingDecision {
  confirmed: boolean;
  reason?: string;
}

interface EngineRuntimeModule {
  placeHold(input: {
    appointmentTypeId: string;
    customerId: string;
    slotStart: string;
    requestedDuration: number;
    requestedCapacity: number;
    bookablePersonId?: string | null;
    bookableResourceId?: string | null;
    snapshot: EngineAvailabilitySnapshot;
    blockingStatuses: readonly string[];
    holdTtlMinutes: number;
    now: string;
    timezoneOverride?: string;
  }): EngineHoldDecision;
  confirmBooking(input: {
    appointmentTypeId: string;
    customerId: string;
    holdId?: bigint | string | null;
    slotStart: string;
    requestedDuration: number;
    requestedCapacity: number;
    bookablePersonId?: string | null;
    bookableResourceId?: string | null;
    snapshot: EngineAvailabilitySnapshot;
    blockingStatuses: readonly string[];
    now: string;
    timezoneOverride?: string;
  }): EngineBookingDecision;
  resolveBlockingStatuses(policy?: BlockingStatusPolicy): readonly string[];
}

let runtimeModulePromise: Promise<EngineRuntimeModule> | null = null;
const importModule = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<unknown>;

async function loadEngineRuntime(): Promise<EngineRuntimeModule> {
  if (!runtimeModulePromise) {
    runtimeModulePromise = importModule(
      '../../../packages/booking-engine/dist/index.js',
    ) as Promise<EngineRuntimeModule>;
  }

  return runtimeModulePromise;
}

async function blockingStatusesFromEngine(): Promise<readonly string[]> {
  const runtime = await loadEngineRuntime();
  return runtime.resolveBlockingStatuses({
    appointmentStatuses: [...BLOCKING_STATUSES],
  });
}

export async function evaluateHoldWithEngine(input: {
  appointmentTypeId: string;
  customerId: string;
  slotStart: string;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  snapshot: EngineAvailabilitySnapshot;
  holdTtlMinutes: number;
  now: string;
  timezoneOverride?: string;
}): Promise<EngineHoldDecision> {
  const runtime = await loadEngineRuntime();
  const blockingStatuses = await blockingStatusesFromEngine();

  return runtime.placeHold({
    ...input,
    blockingStatuses,
  });
}

export async function evaluateBookingWithEngine(input: {
  appointmentTypeId: string;
  customerId: string;
  holdId?: bigint | string | null;
  slotStart: string;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  snapshot: EngineAvailabilitySnapshot;
  now: string;
  timezoneOverride?: string;
}): Promise<EngineBookingDecision> {
  const runtime = await loadEngineRuntime();
  const blockingStatuses = await blockingStatusesFromEngine();

  return runtime.confirmBooking({
    ...input,
    blockingStatuses,
  });
}

export function toHoldDecisionException(reason?: string): Error {
  switch (reason) {
    case 'invalid_request':
      return new BadRequestException('Slot hold request is invalid');
    case 'appointment_type_mismatch':
      return new BadRequestException(
        'Slot hold request does not match appointment type',
      );
    case 'assignment_not_allowed':
      return new BadRequestException(
        'entityId is not linked to this appointment type',
      );
    default:
      return new ConflictException('Slot is no longer available');
  }
}

export function toBookingDecisionException(reason?: string): Error {
  switch (reason) {
    case 'invalid_request':
      return new BadRequestException('Booking confirmation request is invalid');
    case 'appointment_type_mismatch':
      return new BadRequestException(
        'Slot lock is for a different appointment type',
      );
    case 'assignment_not_allowed':
      return new BadRequestException(
        'Slot lock assignment is not valid for this appointment type',
      );
    case 'hold_not_found':
      return new ConflictException(
        'Slot lock has expired; please re-select the slot',
      );
    case 'hold_not_owned':
      return new BadRequestException(
        'Slot lock does not belong to this customer',
      );
    case 'hold_expired':
      return new ConflictException(
        'Slot lock has expired; please re-select the slot',
      );
    default:
      return new ConflictException('Slot is no longer available');
  }
}
