import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveScheduleDay } from '../../src/availability/schedule-resolver.ts';
import {
  mondayDate,
  weeklyOverrideSchedule,
} from '../fixtures/scenarios.ts';

test('resolveScheduleDay applies specific-date overrides after weekly rules', () => {
  const resolved = resolveScheduleDay(weeklyOverrideSchedule, mondayDate);

  assert.deepStrictEqual(resolved.windows, [
    { startMinutes: 570, endMinutes: 600 },
    { startMinutes: 630, endMinutes: 750 },
  ]);
});
