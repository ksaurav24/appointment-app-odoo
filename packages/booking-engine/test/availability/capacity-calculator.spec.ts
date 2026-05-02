import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRemainingCapacity } from '../../src/availability/capacity-calculator.ts';
import {
  capacityManagedAppointments,
  capacityManagedHolds,
  capacityManagedResource,
  flexibleDurationPolicy,
} from '../fixtures/scenarios.ts';

const resourceAssignment = {
  key: 'apt_flexible:none:resource_room_1',
  appointmentTypeId: 'apt_flexible',
  shape: 'resource-only' as const,
  bookablePersonId: null,
  bookableResourceId: 'resource_room_1',
};

test('calculateRemainingCapacity uses the lower of appointment-type and resource capacity', () => {
  const evaluation = calculateRemainingCapacity({
    appointmentType: flexibleDurationPolicy,
    assignment: resourceAssignment,
    slotStart: '2026-05-04T09:00:00.000Z',
    slotEnd: '2026-05-04T09:30:00.000Z',
    appointments: capacityManagedAppointments,
    activeHolds: capacityManagedHolds,
    blockingStatuses: ['confirmed'],
    requestedCapacity: 1,
    resource: capacityManagedResource,
    now: '2026-05-04T08:00:00.000Z',
  });

  assert.equal(evaluation.capacityLimit, 3);
  assert.equal(evaluation.remainingCapacity, 0);
  assert.equal(evaluation.requestedCapacityFits, false);
  assert.deepStrictEqual(evaluation.blockedReasons, ['capacity_exhausted']);
});
