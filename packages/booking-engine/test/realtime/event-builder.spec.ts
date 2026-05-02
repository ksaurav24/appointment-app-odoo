import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAvailabilityEvents } from '../../src/realtime/event-builder.ts';

test('buildAvailabilityEvents invalidates both dates for a reschedule mutation', () => {
  const events = buildAvailabilityEvents({
    organizationId: 'org_1',
    appointmentTypeId: 'apt_fixed',
    oldStartTime: '2026-05-04T09:00:00.000Z',
    newStartTime: '2026-05-05T09:00:00.000Z',
    occurredAt: '2026-05-02T10:30:00.000Z',
    reason: 'booking.rescheduled',
    timezone: 'UTC',
  });

  assert.deepStrictEqual(
    events.map((event) => event.affectedDate),
    ['2026-05-04', '2026-05-05'],
  );
  assert.ok(events.every((event) => event.type === 'availability.changed'));
});

test('buildAvailabilityEvents expands schedule updates across the touched date range', () => {
  const events = buildAvailabilityEvents({
    organizationId: 'org_1',
    appointmentTypeId: 'apt_fixed',
    occurredAt: '2026-05-02T10:30:00.000Z',
    reason: 'schedule.updated',
    rangeStartDate: '2026-05-04',
    rangeEndDate: '2026-05-06',
  });

  assert.deepStrictEqual(
    events.map((event) => event.affectedDate),
    ['2026-05-04', '2026-05-05', '2026-05-06'],
  );
});
