import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSlotCandidates } from '../../src/availability/slot-generator.ts';
import { resolveScheduleDay } from '../../src/availability/schedule-resolver.ts';
import {
  fixedDurationPolicy,
  flexibleDurationPolicy,
  mondayDate,
  oneHourUtcSchedule,
} from '../fixtures/scenarios.ts';

const personAssignment = {
  key: 'apt_fixed:person_1:none',
  appointmentTypeId: 'apt_fixed',
  shape: 'person-only' as const,
  bookablePersonId: 'person_1',
  bookableResourceId: null,
};

const resourceAssignment = {
  key: 'apt_flexible:none:resource_room_1',
  appointmentTypeId: 'apt_flexible',
  shape: 'resource-only' as const,
  bookablePersonId: null,
  bookableResourceId: 'resource_room_1',
};

test('generateSlotCandidates creates fixed slots across a window using the step size', () => {
  const resolvedDay = resolveScheduleDay(oneHourUtcSchedule, mondayDate);
  const slots = generateSlotCandidates({
    appointmentType: fixedDurationPolicy,
    resolvedDay,
    assignment: personAssignment,
  });

  assert.deepStrictEqual(
    slots.map((slot) => slot.slotStart),
    [
      '2026-05-04T09:00:00.000Z',
      '2026-05-04T09:15:00.000Z',
      '2026-05-04T09:30:00.000Z',
    ],
  );
});

test('generateSlotCandidates keeps flexible durations grouped under each start time', () => {
  const resolvedDay = resolveScheduleDay(
    {
      ...oneHourUtcSchedule,
      appointmentTypeId: 'apt_flexible',
    },
    mondayDate,
  );
  const slots = generateSlotCandidates({
    appointmentType: flexibleDurationPolicy,
    resolvedDay,
    assignment: resourceAssignment,
  });

  assert.deepStrictEqual(
    slots.map((slot) => ({
      slotStart: slot.slotStart,
      allowedDurations: slot.allowedDurations,
    })),
    [
      {
        slotStart: '2026-05-04T09:00:00.000Z',
        allowedDurations: [30, 45, 60],
      },
      {
        slotStart: '2026-05-04T09:15:00.000Z',
        allowedDurations: [30, 45],
      },
      {
        slotStart: '2026-05-04T09:30:00.000Z',
        allowedDurations: [30],
      },
      {
        slotStart: '2026-05-04T09:45:00.000Z',
        allowedDurations: [],
      },
    ].filter((slot) => slot.allowedDurations.length > 0),
  );
});
