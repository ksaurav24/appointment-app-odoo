import assert from 'node:assert/strict';
import test from 'node:test';
import { placeHoldFromSnapshot } from '../../src/concurrency/hold-engine.ts';
import {
  competingHoldSnapshot,
  singlePersonAvailabilitySnapshot,
} from '../fixtures/scenarios.ts';

test('placeHoldFromSnapshot grants a hold and returns a stable slot key', () => {
  const decision = placeHoldFromSnapshot({
    appointmentTypeId: 'apt_fixed',
    customerId: 'customer_1',
    slotStart: '2026-05-04T09:00:00.000Z',
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: 'person_1',
    snapshot: singlePersonAvailabilitySnapshot,
    blockingStatuses: ['confirmed'],
    holdTtlMinutes: 10,
    now: '2026-05-04T08:45:00.000Z',
  });

  assert.deepStrictEqual(decision, {
    granted: true,
    holdExpiresAt: '2026-05-04T08:55:00.000Z',
    holdKey:
      'booking-slot|apt_fixed|2026-05-04T09:00:00.000Z|2026-05-04T09:30:00.000Z|person_1|none',
    remainingCapacityAfterHold: 0,
  });
});

test('placeHoldFromSnapshot rejects a competing hold on the same exclusive slot', () => {
  const decision = placeHoldFromSnapshot({
    appointmentTypeId: 'apt_fixed',
    customerId: 'customer_2',
    slotStart: '2026-05-04T09:00:00.000Z',
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: 'person_1',
    snapshot: competingHoldSnapshot,
    blockingStatuses: ['confirmed'],
    holdTtlMinutes: 10,
    now: '2026-05-04T08:45:00.000Z',
  });

  assert.deepStrictEqual(decision, {
    granted: false,
    reason: 'overlapping_hold',
  });
});
