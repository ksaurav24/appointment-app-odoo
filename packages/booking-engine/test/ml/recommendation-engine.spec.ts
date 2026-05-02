import assert from 'node:assert/strict';
import test from 'node:test';
import { getAvailabilityFromSnapshot } from '../../src/availability/availability-engine.ts';
import { buildOrganizerRecommendations } from '../../src/ml/recommendation-engine.ts';
import {
  capacityManagedAvailabilitySnapshot,
  mondayDate,
} from '../fixtures/scenarios.ts';

test('buildOrganizerRecommendations surfaces best-slot, high-risk, and overbooking guidance', () => {
  const availability = getAvailabilityFromSnapshot({
    appointmentTypeId: 'apt_flexible',
    date: mondayDate,
    requestedDuration: 30,
    requestedCapacity: 1,
    snapshot: capacityManagedAvailabilitySnapshot,
    blockingStatuses: ['confirmed'],
    now: '2026-05-04T08:00:00.000Z',
  });
  const recommendations = buildOrganizerRecommendations({
    availability,
    slotRiskScores: [
      {
        slotStart: '2026-05-04T09:00:00.000Z',
        slotEnd: '2026-05-04T09:30:00.000Z',
        bookableResourceId: 'resource_room_1',
        score: 0.9,
      },
      {
        slotStart: '2026-05-04T09:30:00.000Z',
        slotEnd: '2026-05-04T10:00:00.000Z',
        bookableResourceId: 'resource_room_1',
        score: 0.2,
      },
    ],
  });

  assert.ok(recommendations.some((item) => item.type === 'best_slot'));
  assert.ok(recommendations.some((item) => item.type === 'high_risk_window'));
  assert.ok(
    recommendations.some((item) => item.type === 'overbooking_suggestion'),
  );
});
