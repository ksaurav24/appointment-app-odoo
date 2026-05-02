import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveScheduleDay } from '../../src/availability/schedule-resolver.ts';
import { generateSlotCandidates } from '../../src/availability/slot-generator.ts';
import type {
  AppointmentTypePolicy,
  ScheduleDefinition,
} from '../../src/domain/models.ts';

const appointmentType: AppointmentTypePolicy = {
  id: 'apt_tz',
  organizationId: 'org_1',
  name: 'TZ',
  slug: 'tz',
  entityType: 'person',
  scheduleType: 'weekly',
  durationMode: 'fixed',
  durationMinutes: 60,
  durationStepMins: 60,
  manageCapacity: false,
  manualConfirmation: false,
  cancellationAllowed: true,
  rescheduleAllowed: true,
  isPublished: true,
};

const assignment = {
  key: 'apt_tz:person_1:none',
  appointmentTypeId: 'apt_tz',
  shape: 'person-only' as const,
  bookablePersonId: 'person_1',
  bookableResourceId: null,
};

test('generateSlotCandidates keeps unique slot starts during DST spring forward', () => {
  const schedule: ScheduleDefinition = {
    id: 'schedule_dst',
    appointmentTypeId: 'apt_tz',
    scheduleType: 'weekly',
    timezone: 'America/New_York',
    rules: [
      {
        id: 'rule_dst',
        scheduleId: 'schedule_dst',
        dayOfWeek: 0,
        startTime: '00:00',
        endTime: '04:00',
        isAvailable: true,
      },
    ],
  };
  const resolved = resolveScheduleDay(schedule, '2026-03-08');
  const slots = generateSlotCandidates({
    appointmentType,
    resolvedDay: resolved,
    assignment,
  });
  const slotStarts = slots.map((slot) => slot.slotStart);
  const unique = new Set(slotStarts);

  assert.equal(slotStarts.length, unique.size);
  for (let index = 1; index < slotStarts.length; index += 1) {
    const previous = slotStarts[index - 1];
    const current = slotStarts[index];
    if (!previous || !current) {
      throw new Error('Missing slot start during DST test.');
    }
    assert.ok(previous < current);
  }
});

test('generateSlotCandidates keeps unique slot starts during DST fall back', () => {
  const schedule: ScheduleDefinition = {
    id: 'schedule_dst_fall',
    appointmentTypeId: 'apt_tz',
    scheduleType: 'weekly',
    timezone: 'America/New_York',
    rules: [
      {
        id: 'rule_dst_fall',
        scheduleId: 'schedule_dst_fall',
        dayOfWeek: 0,
        startTime: '00:00',
        endTime: '04:00',
        isAvailable: true,
      },
    ],
  };
  const resolved = resolveScheduleDay(schedule, '2026-11-01');
  const slots = generateSlotCandidates({
    appointmentType,
    resolvedDay: resolved,
    assignment,
  });
  const slotStarts = slots.map((slot) => slot.slotStart);
  const unique = new Set(slotStarts);

  assert.equal(slotStarts.length, unique.size);
  for (let index = 1; index < slotStarts.length; index += 1) {
    const previous = slotStarts[index - 1];
    const current = slotStarts[index];
    if (!previous || !current) {
      throw new Error('Missing slot start during DST test.');
    }
    assert.ok(previous < current);
  }
});
