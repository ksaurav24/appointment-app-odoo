import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmBookingFromSnapshot } from '../../src/concurrency/booking-guard.ts';
import {
  expiredHoldSnapshot,
  ownedHoldSnapshot,
} from '../fixtures/scenarios.ts';

test("confirmBookingFromSnapshot ignores the caller's own hold when rechecking capacity", () => {
  const decision = confirmBookingFromSnapshot({
    appointmentTypeId: 'apt_fixed',
    customerId: 'customer_1',
    holdId: 'hold_owned',
    slotStart: '2026-05-04T09:00:00.000Z',
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: 'person_1',
    snapshot: ownedHoldSnapshot,
    blockingStatuses: ['confirmed'],
    now: '2026-05-04T08:45:00.000Z',
  });

  assert.deepStrictEqual(decision, {
    confirmed: true,
  });
});

test('confirmBookingFromSnapshot rejects an expired hold before booking confirmation', () => {
  const decision = confirmBookingFromSnapshot({
    appointmentTypeId: 'apt_fixed',
    customerId: 'customer_1',
    holdId: 'hold_expired',
    slotStart: '2026-05-04T09:00:00.000Z',
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: 'person_1',
    snapshot: expiredHoldSnapshot,
    blockingStatuses: ['confirmed'],
    now: '2026-05-04T08:45:00.000Z',
  });

  assert.deepStrictEqual(decision, {
    confirmed: false,
    reason: 'hold_expired',
  });
});
