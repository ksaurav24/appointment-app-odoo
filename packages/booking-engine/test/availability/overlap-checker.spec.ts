import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignmentConflicts,
  findOverlappingAppointments,
  findOverlappingHolds,
  intervalsOverlap,
} from '../../src/availability/overlap-checker.ts';

const assignment = {
  key: 'apt_fixed:person_1:none',
  appointmentTypeId: 'apt_fixed',
  shape: 'person-only' as const,
  bookablePersonId: 'person_1',
  bookableResourceId: null,
};

test('intervalsOverlap uses strict boundary checks', () => {
  assert.equal(
    intervalsOverlap(
      '2026-05-04T09:00:00.000Z',
      '2026-05-04T09:30:00.000Z',
      '2026-05-04T09:30:00.000Z',
      '2026-05-04T10:00:00.000Z',
    ),
    false,
  );
  assert.equal(
    intervalsOverlap(
      '2026-05-04T09:00:00.000Z',
      '2026-05-04T09:30:00.000Z',
      '2026-05-04T09:15:00.000Z',
      '2026-05-04T09:45:00.000Z',
    ),
    true,
  );
});

test('assignmentConflicts respects assignment shapes', () => {
  assert.equal(
    assignmentConflicts(assignment, { bookablePersonId: 'person_1' }),
    true,
  );
  assert.equal(
    assignmentConflicts(assignment, { bookablePersonId: 'person_2' }),
    false,
  );
});

test('findOverlappingAppointments filters by assignment and time window', () => {
  const overlaps = findOverlappingAppointments(
    assignment,
    '2026-05-04T09:00:00.000Z',
    '2026-05-04T09:30:00.000Z',
    [
      {
        id: 'appt_match',
        appointmentTypeId: 'apt_fixed',
        organizationId: 'org_1',
        customerId: 'customer_1',
        bookablePersonId: 'person_1',
        startTime: '2026-05-04T09:15:00.000Z',
        endTime: '2026-05-04T09:45:00.000Z',
        durationMins: 30,
        status: 'confirmed',
        rescheduleCount: 0,
        capacityBooked: 1,
      },
      {
        id: 'appt_other',
        appointmentTypeId: 'apt_fixed',
        organizationId: 'org_1',
        customerId: 'customer_2',
        bookablePersonId: 'person_2',
        startTime: '2026-05-04T09:15:00.000Z',
        endTime: '2026-05-04T09:45:00.000Z',
        durationMins: 30,
        status: 'confirmed',
        rescheduleCount: 0,
        capacityBooked: 1,
      },
    ],
  );

  assert.deepStrictEqual(overlaps.map((appt) => appt.id), ['appt_match']);
});

test('findOverlappingHolds filters by assignment and time window', () => {
  const overlaps = findOverlappingHolds(
    assignment,
    '2026-05-04T09:00:00.000Z',
    '2026-05-04T09:30:00.000Z',
    [
      {
        id: 'hold_match',
        appointmentTypeId: 'apt_fixed',
        customerId: 'customer_1',
        bookablePersonId: 'person_1',
        slotStart: '2026-05-04T09:15:00.000Z',
        slotEnd: '2026-05-04T09:45:00.000Z',
        expiresAt: '2026-05-04T09:40:00.000Z',
      },
      {
        id: 'hold_other',
        appointmentTypeId: 'apt_fixed',
        customerId: 'customer_2',
        bookablePersonId: 'person_2',
        slotStart: '2026-05-04T09:15:00.000Z',
        slotEnd: '2026-05-04T09:45:00.000Z',
        expiresAt: '2026-05-04T09:40:00.000Z',
      },
    ],
  );

  assert.deepStrictEqual(overlaps.map((hold) => hold.id), ['hold_match']);
});
