import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNoShowFeatures } from '../../src/ml/feature-builder.ts';
import { fixedDurationPolicy } from '../fixtures/scenarios.ts';

test('buildNoShowFeatures extracts schema-driven appointment signals for scoring', () => {
  const features = buildNoShowFeatures({
    appointmentType: fixedDurationPolicy,
    appointment: {
      id: 'appt_ml_1',
      appointmentTypeId: 'apt_fixed',
      organizationId: 'org_1',
      customerId: 'customer_1',
      bookablePersonId: 'person_1',
      startTime: '2026-05-04T18:00:00.000Z',
      endTime: '2026-05-04T19:00:00.000Z',
      durationMins: 60,
      status: 'confirmed',
      rescheduleCount: 2,
      capacityBooked: 1,
      paymentStatus: 'pending',
      paymentPaidAt: '2026-05-04T15:00:00.000Z',
      cancelledAt: '2026-05-04T12:00:00.000Z',
      createdAt: '2026-05-04T10:00:00.000Z',
    },
    organizationHistorySize: 25,
    organizationNoShowRate: 0.2,
    appointmentTypeNoShowRate: 0.1,
    customerNoShowRate: 0.3,
    bookablePersonNoShowRate: 0.15,
    bookableResourceNoShowRate: 0.12,
    rescheduleCountLast30Days: 2,
    lastRescheduledAt: '2026-05-03T18:00:00.000Z',
  });

  assert.deepStrictEqual(features, {
    appointmentTypeId: 'apt_fixed',
    appointmentId: 'appt_ml_1',
    appointmentStatus: 'confirmed',
    startsAtHour: 18,
    appointmentWeekday: 1,
    durationMins: 60,
    rescheduleCount: 2,
    rescheduleCountLast30Days: 2,
    lastRescheduleLeadHours: 24,
    durationMode: 'fixed',
    maxBookingsPerSlot: 1,
    paymentStatus: 'pending',
    advancePaymentEnabled: false,
    manualConfirmation: false,
    cancellationAllowed: true,
    cancellationWindowHours: null,
    rescheduleAllowed: true,
    maxReschedulesAllowed: null,
    manageCapacity: false,
    bookingLeadHours: 8,
    paymentLeadHours: 3,
    wasCancelled: true,
    cancelLeadHours: 6,
    cancelWithinWindow: null,
    organizationHistorySize: 25,
    organizationNoShowRate: 0.2,
    appointmentTypeNoShowRate: 0.1,
    customerNoShowRate: 0.3,
    bookablePersonNoShowRate: 0.15,
    bookableResourceNoShowRate: 0.12,
  });
});

test('buildNoShowFeatures prefers paidAt and status from the payments schema when provided', () => {
  const features = buildNoShowFeatures({
    appointmentType: fixedDurationPolicy,
    appointment: {
      id: 'appt_ml_3',
      appointmentTypeId: 'apt_fixed',
      organizationId: 'org_1',
      customerId: 'customer_1',
      bookablePersonId: 'person_1',
      startTime: '2026-05-04T18:00:00.000Z',
      endTime: '2026-05-04T19:00:00.000Z',
      durationMins: 60,
      status: 'confirmed',
      rescheduleCount: 0,
      capacityBooked: 1,
      paymentStatus: 'pending',
      paymentPaidAt: '2026-05-04T16:00:00.000Z',
      createdAt: '2026-05-04T10:00:00.000Z',
    },
    latestPayment: {
      id: 'payment_1',
      appointmentId: 'appt_ml_3',
      customerId: 'customer_1',
      amount: 500,
      currency: 'INR',
      paymentGateway: 'stripe',
      status: 'paid',
      paidAt: '2026-05-04T14:00:00.000Z',
      createdAt: '2026-05-04T13:30:00.000Z',
    },
    organizationHistorySize: 10,
  });

  assert.equal(features.paymentStatus, 'paid');
  assert.equal(features.paymentLeadHours, 4);
});
