import { PrismaClient, AppointmentStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  evaluateHoldWithEngine,
  evaluateBookingWithEngine,
  toHoldDecisionException,
  toBookingDecisionException,
} from '../src/booking-engine/engine-runtime';
import {
  buildEngineSnapshot,
  ENGINE_APPOINTMENT_TYPE_INCLUDE,
} from '../src/booking-engine/snapshot-builder';

const prisma = new PrismaClient();

function toIso(date: Date): string {
  return date.toISOString();
}

function buildSlot(base: Date, hours: number, minutes: number, durationMins: number) {
  const start = new Date(base);
  start.setUTCHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMins * 60_000);
  return { start, end };
}

async function main(): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');

  const organizerEmail = `organizer+${timestamp}@example.com`;
  const customerEmail = `customer+${timestamp}@example.com`;
  const organizerPasswordHash = await bcrypt.hash('Passw0rd!123', 10);
  const customerPasswordHash = await bcrypt.hash('Passw0rd!123', 10);

  const organizer = await prisma.user.create({
    data: {
      email: organizerEmail,
      passwordHash: organizerPasswordHash,
      fullName: `Organizer ${timestamp}`,
      role: 'ORGANIZER',
      emailVerified: true,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: customerEmail,
      passwordHash: customerPasswordHash,
      fullName: `Customer ${timestamp}`,
      role: 'CUSTOMER',
      emailVerified: true,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      organiserId: organizer.id,
      name: `Test Org ${timestamp}`,
      slug: `org-${timestamp}`,
      contactEmail: organizerEmail,
      timezone: 'UTC',
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  const bookablePerson = await prisma.bookablePerson.create({
    data: {
      organizationId: organization.id,
      name: `Dr. Test ${timestamp}`,
      contactEmail: `dr+${timestamp}@example.com`,
      isActive: true,
    },
  });

  const slotDayOfWeek = new Date();
  slotDayOfWeek.setUTCDate(slotDayOfWeek.getUTCDate() + 1);

  const appointmentType = await prisma.appointmentType.create({
    data: {
      organizationId: organization.id,
      name: `Consultation ${timestamp}`,
      slug: `consultation-${timestamp}`,
      entityType: 'PERSON',
      scheduleType: 'WEEKLY',
      durationMode: 'FIXED',
      durationMinutes: 30,
      assignmentMode: 'MANUAL',
      maxBookingsPerSlot: 1,
      manageCapacity: false,
      manualConfirmation: false,
      advancePaymentEnabled: false,
      cancellationAllowed: true,
      rescheduleAllowed: true,
      isPublished: true,
      entities: {
        create: [{ bookablePersonId: bookablePerson.id }],
      },
      schedules: {
        create: [
          {
            scheduleType: 'WEEKLY',
            timezone: 'UTC',
            rules: {
              create: [
                {
                  dayOfWeek: slotDayOfWeek.getUTCDay(),
                  startTime: '09:00',
                  endTime: '17:00',
                  isAvailable: true,
                },
              ],
            },
          },
        ],
      },
    },
    include: ENGINE_APPOINTMENT_TYPE_INCLUDE,
  });

  const baseDate = new Date();
  baseDate.setUTCDate(baseDate.getUTCDate() + 1);

  const slot1 = buildSlot(baseDate, 10, 0, 30);
  const slot2 = buildSlot(baseDate, 11, 0, 30);
  const slot3 = buildSlot(baseDate, 12, 0, 30);

  const now = new Date();

  const snapshot1 = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot1.start, end: slot1.end },
    { now },
  );
  const holdDecision1 = await evaluateHoldWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    slotStart: toIso(slot1.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot1,
    holdTtlMinutes: 5,
    now: toIso(now),
  });

  if (!holdDecision1.granted) {
    throw toHoldDecisionException(holdDecision1.reason);
  }

  const lock1 = await prisma.slotLock.create({
    data: {
      appointmentTypeId: appointmentType.id,
      bookablePersonId: bookablePerson.id,
      slotStart: slot1.start,
      slotEnd: slot1.end,
      customerId: customer.id,
      expiresAt: holdDecision1.holdExpiresAt
        ? new Date(holdDecision1.holdExpiresAt)
        : new Date(now.getTime() + 5 * 60_000),
    },
  });

  const snapshot1Confirm = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot1.start, end: slot1.end },
    { now },
  );
  const bookingDecision1 = await evaluateBookingWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    holdId: lock1.id,
    slotStart: toIso(slot1.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot1Confirm,
    now: toIso(now),
  });

  if (!bookingDecision1.confirmed) {
    throw toBookingDecisionException(bookingDecision1.reason);
  }

  const appointment = await prisma.appointment.create({
    data: {
      appointmentTypeId: appointmentType.id,
      organizationId: organization.id,
      customerId: customer.id,
      bookablePersonId: bookablePerson.id,
      startTime: slot1.start,
      endTime: slot1.end,
      durationMins: 30,
      status: AppointmentStatus.CONFIRMED,
      capacityBooked: 1,
      paymentStatus: PaymentStatus.PAID,
      confirmationCode: randomUUID(),
    },
  });

  await prisma.slotLock.delete({ where: { id: lock1.id } });

  const snapshot2 = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot2.start, end: slot2.end },
    { now, excludeAppointmentId: appointment.id },
  );
  const holdDecision2 = await evaluateHoldWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    slotStart: toIso(slot2.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot2,
    holdTtlMinutes: 5,
    now: toIso(now),
  });

  if (!holdDecision2.granted) {
    throw toHoldDecisionException(holdDecision2.reason);
  }

  const lock2 = await prisma.slotLock.create({
    data: {
      appointmentTypeId: appointmentType.id,
      bookablePersonId: bookablePerson.id,
      slotStart: slot2.start,
      slotEnd: slot2.end,
      customerId: customer.id,
      expiresAt: holdDecision2.holdExpiresAt
        ? new Date(holdDecision2.holdExpiresAt)
        : new Date(now.getTime() + 5 * 60_000),
    },
  });

  const snapshot2Confirm = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot2.start, end: slot2.end },
    { now, excludeAppointmentId: appointment.id },
  );
  const bookingDecision2 = await evaluateBookingWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    holdId: lock2.id,
    slotStart: toIso(slot2.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot2Confirm,
    now: toIso(now),
  });

  if (!bookingDecision2.confirmed) {
    throw toBookingDecisionException(bookingDecision2.reason);
  }

  await prisma.appointmentReschedule.create({
    data: {
      appointmentId: appointment.id,
      rescheduledByUserId: customer.id,
      previousStartTime: appointment.startTime,
      previousEndTime: appointment.endTime,
      newStartTime: slot2.start,
      newEndTime: slot2.end,
      previousPersonId: bookablePerson.id,
      reason: 'Test reschedule',
    },
  });

  const rescheduled = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startTime: slot2.start,
      endTime: slot2.end,
      rescheduleCount: { increment: 1 },
    },
  });

  await prisma.slotLock.delete({ where: { id: lock2.id } });

  const cancelled = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: 'Test cancel',
    },
  });

  const snapshot3 = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot3.start, end: slot3.end },
    { now },
  );
  const holdDecision3 = await evaluateHoldWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    slotStart: toIso(slot3.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot3,
    holdTtlMinutes: 5,
    now: toIso(now),
  });

  if (!holdDecision3.granted) {
    throw toHoldDecisionException(holdDecision3.reason);
  }

  const lock3 = await prisma.slotLock.create({
    data: {
      appointmentTypeId: appointmentType.id,
      bookablePersonId: bookablePerson.id,
      slotStart: slot3.start,
      slotEnd: slot3.end,
      customerId: customer.id,
      expiresAt: holdDecision3.holdExpiresAt
        ? new Date(holdDecision3.holdExpiresAt)
        : new Date(now.getTime() + 5 * 60_000),
    },
  });

  const snapshot3Confirm = await buildEngineSnapshot(
    prisma,
    appointmentType,
    { start: slot3.start, end: slot3.end },
    { now },
  );
  const bookingDecision3 = await evaluateBookingWithEngine({
    appointmentTypeId: appointmentType.id,
    customerId: customer.id,
    holdId: lock3.id,
    slotStart: toIso(slot3.start),
    requestedDuration: 30,
    requestedCapacity: 1,
    bookablePersonId: bookablePerson.id,
    bookableResourceId: null,
    snapshot: snapshot3Confirm,
    now: toIso(now),
  });

  if (!bookingDecision3.confirmed) {
    throw toBookingDecisionException(bookingDecision3.reason);
  }

  const appointment2 = await prisma.appointment.create({
    data: {
      appointmentTypeId: appointmentType.id,
      organizationId: organization.id,
      customerId: customer.id,
      bookablePersonId: bookablePerson.id,
      startTime: slot3.start,
      endTime: slot3.end,
      durationMins: 30,
      status: AppointmentStatus.CONFIRMED,
      capacityBooked: 1,
      paymentStatus: PaymentStatus.PAID,
      confirmationCode: randomUUID(),
    },
  });

  await prisma.slotLock.delete({ where: { id: lock3.id } });

  const noShow = await prisma.appointment.update({
    where: { id: appointment2.id },
    data: { status: AppointmentStatus.NO_SHOW },
  });

  const summary = {
    organizerEmail,
    organizationId: organization.id,
    appointmentTypeId: appointmentType.id,
    customerEmail,
    hold1: holdDecision1,
    booking1: bookingDecision1,
    appointmentStatus: appointment.status,
    rescheduledStatus: rescheduled.status,
    cancelledStatus: cancelled.status,
    noShowStatus: noShow.status,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
