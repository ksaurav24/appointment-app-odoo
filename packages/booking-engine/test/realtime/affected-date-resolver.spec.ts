import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAffectedDates } from '../../src/realtime/affected-date-resolver.ts';

test('resolveAffectedDates includes both old and new booking dates', () => {
  const dates = resolveAffectedDates({
    organizationId: 'org_1',
    appointmentTypeId: 'apt_fixed',
    oldStartTime: '2026-05-04T23:30:00.000Z',
    newStartTime: '2026-05-05T00:30:00.000Z',
    occurredAt: '2026-05-02T10:30:00.000Z',
    reason: 'booking.rescheduled',
    timezone: 'UTC',
  });

  assert.deepStrictEqual(dates, ['2026-05-04', '2026-05-05']);
});

test('resolveAffectedDates expands appointment type updates across future days', () => {
  const dates = resolveAffectedDates({
    organizationId: 'org_1',
    appointmentTypeId: 'apt_fixed',
    occurredAt: '2026-05-02T10:30:00.000Z',
    reason: 'appointment-type.updated',
    rangeStartDate: '2026-05-04',
    futureDays: 2,
  });

  assert.deepStrictEqual(dates, ['2026-05-04', '2026-05-05', '2026-05-06']);
});
