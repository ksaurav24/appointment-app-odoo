import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveRequestedAssignment,
  resolveRequestedSlot,
} from '../../src/concurrency/request-evaluator.ts';
import {
  exclusiveAvailabilitySnapshot,
  mondayDate,
  singlePersonAvailabilitySnapshot,
} from '../fixtures/scenarios.ts';

test('resolveRequestedAssignment returns null when assignment is not allowed', () => {
  const assignment = resolveRequestedAssignment(
    singlePersonAvailabilitySnapshot,
    {
      appointmentTypeId: 'apt_fixed',
      slotStart: '2026-05-04T09:00:00.000Z',
      requestedDuration: 30,
      bookablePersonId: 'person_2',
    },
  );

  assert.equal(assignment, null);
});

test('resolveRequestedSlot returns the matching availability slot', () => {
  const resolution = resolveRequestedSlot({
    request: {
      appointmentTypeId: 'apt_fixed',
      slotStart: '2026-05-04T09:00:00.000Z',
      requestedDuration: 30,
      requestedCapacity: 1,
      bookablePersonId: 'person_2',
    },
    snapshot: exclusiveAvailabilitySnapshot,
    blockingStatuses: ['confirmed'],
    now: '2026-05-04T08:45:00.000Z',
  });

  assert.equal(resolution.date, mondayDate);
  assert.ok(resolution.slot);
  assert.equal(resolution.slot?.bookablePersonId, 'person_2');
  assert.equal(resolution.slot?.isAvailable, true);
});
