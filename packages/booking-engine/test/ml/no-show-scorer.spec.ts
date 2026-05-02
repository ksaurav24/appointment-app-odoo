import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreNoShow } from '../../src/ml/no-show-scorer.ts';
import { fixedDurationPolicy } from '../fixtures/scenarios.ts';

test('scoreNoShow falls back to deterministic heuristics when no external model is provided', async () => {
  const score = await scoreNoShow({
    appointmentType: fixedDurationPolicy,
    appointment: {
      id: 'appt_ml_2',
      appointmentTypeId: 'apt_fixed',
      organizationId: 'org_1',
      customerId: 'customer_2',
      bookablePersonId: 'person_1',
      startTime: '2026-05-04T19:00:00.000Z',
      endTime: '2026-05-04T20:00:00.000Z',
      durationMins: 60,
      status: 'confirmed',
      rescheduleCount: 3,
      capacityBooked: 1,
      paymentStatus: 'pending',
    },
    organizationHistorySize: 50,
    organizationNoShowRate: 0.3,
    appointmentTypeNoShowRate: 0.2,
  });

  assert.equal(score.riskBand, 'high');
  assert.ok(score.score > 0.65);
});
