import assert from 'node:assert/strict';
import test from 'node:test';
import { getAvailabilityFromSnapshot } from '../../src/availability/availability-engine.ts';
import {
  exclusiveAvailabilitySnapshot,
  mondayDate,
} from '../fixtures/scenarios.ts';

test('getAvailabilityFromSnapshot keeps conflicting assignments unavailable without hiding free ones', () => {
  const availability = getAvailabilityFromSnapshot({
    appointmentTypeId: 'apt_fixed',
    date: mondayDate,
    requestedCapacity: 1,
    snapshot: exclusiveAvailabilitySnapshot,
    blockingStatuses: ['confirmed'],
  });

  const firstSlotByPerson = availability.slots
    .filter((slot) => slot.slotStart === '2026-05-04T09:00:00.000Z')
    .map((slot) => ({
      person: slot.bookablePersonId,
      available: slot.isAvailable,
      blockedReasons: slot.blockedReasons,
    }));

  assert.deepStrictEqual(firstSlotByPerson, [
    {
      person: 'person_1',
      available: false,
      blockedReasons: ['overlapping_appointment'],
    },
    {
      person: 'person_2',
      available: true,
      blockedReasons: [],
    },
  ]);
});

test('getAvailabilityFromSnapshot rejects mismatched appointment type input', () => {
  assert.throws(
    () =>
      getAvailabilityFromSnapshot({
        appointmentTypeId: 'apt_other',
        date: mondayDate,
        requestedCapacity: 1,
        snapshot: exclusiveAvailabilitySnapshot,
        blockingStatuses: ['confirmed'],
      }),
    /Appointment type mismatch/,
  );
});
