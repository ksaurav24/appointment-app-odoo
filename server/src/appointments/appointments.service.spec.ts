import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  AppointmentStatus,
  AssignmentMode,
  DurationMode,
  EntityType,
  PaymentStatus,
  QuestionType,
  ScheduleType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

const customerId = 'cust-1';
const lockId = 1n;
const lockIdString = lockId.toString();
const questionId = 1n;
const questionIdString = questionId.toString();
const appointmentTypeId = 'at-1';

function makeLock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: lockId,
    appointmentTypeId,
    bookablePersonId: null,
    bookableResourceId: 'res-1',
    customerId,
    slotStart: new Date('2026-05-05T09:00:00.000Z'),
    slotEnd: new Date('2026-05-05T10:00:00.000Z'),
    expiresAt: new Date(Date.now() + 5 * 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAppointmentType(overrides: Record<string, unknown> = {}) {
  return {
    id: appointmentTypeId,
    organizationId: 'org-1',
    entityType: EntityType.RESOURCE,
    durationMode: DurationMode.VARIABLE,
    durationMinutes: null,
    minDurationMins: 60,
    maxDurationMins: 240,
    durationStepMins: 60,
    maxBookingsPerSlot: 1,
    manageCapacity: false,
    manualConfirmation: false,
    advancePaymentEnabled: false,
    advancePaymentAmount: null,
    assignmentMode: AssignmentMode.MANUAL,
    cancellationAllowed: true,
    cancellationWindowHours: null,
    rescheduleAllowed: true,
    rescheduleWindowHours: null,
    maxReschedulesAllowed: null,
    isPublished: true,
    shareToken: null,
    scheduleType: ScheduleType.WEEKLY,
    bookingQuestions: [
      {
        id: questionId,
        appointmentTypeId,
        questionText: 'Number of players',
        questionType: QuestionType.NUMBER,
        isRequired: true,
        options: null,
        displayOrder: 0,
      },
    ],
    organization: { id: 'org-1' },
    ...overrides,
  };
}

interface PrismaMockHandles {
  slotLockFindUnique: jest.Mock;
  appointmentTypeFindUnique: jest.Mock;
  appointmentAggregate: jest.Mock;
  slotLockCount: jest.Mock;
  appointmentCreate: jest.Mock;
  appointmentAnswerCreateMany: jest.Mock;
  slotLockDelete: jest.Mock;
  appointmentFindUnique: jest.Mock;
}

function makePrisma(handles: PrismaMockHandles): PrismaService {
  const tx = {
    appointment: {
      aggregate: handles.appointmentAggregate,
      create: handles.appointmentCreate,
      findUnique: handles.appointmentFindUnique,
    },
    appointmentAnswer: { createMany: handles.appointmentAnswerCreateMany },
    slotLock: {
      count: handles.slotLockCount,
      delete: handles.slotLockDelete,
    },
  };
  return {
    slotLock: { findUnique: handles.slotLockFindUnique },
    appointmentType: { findUnique: handles.appointmentTypeFindUnique },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
}

interface NotificationMocks {
  service: NotificationsService;
  dispatch: jest.Mock;
}

function makeNotifications(): NotificationMocks {
  const dispatch = jest.fn().mockResolvedValue([]);
  return {
    dispatch,
    service: {
      dispatch,
      flush: jest.fn().mockResolvedValue(undefined),
      dispatchAndFlush: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService,
  };
}

describe('AppointmentsService.create', () => {
  let handles: PrismaMockHandles;
  let service: AppointmentsService;
  let notifications: NotificationMocks;

  beforeEach(() => {
    handles = {
      slotLockFindUnique: jest.fn().mockResolvedValue(makeLock()),
      appointmentTypeFindUnique: jest
        .fn()
        .mockResolvedValue(makeAppointmentType()),
      appointmentAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      slotLockCount: jest.fn().mockResolvedValue(0),
      appointmentCreate: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 100n, ...args.data }),
      ),
      appointmentAnswerCreateMany: jest.fn().mockResolvedValue({ count: 1 }),
      slotLockDelete: jest.fn().mockResolvedValue({}),
      appointmentFindUnique: jest.fn().mockResolvedValue({
        publicId: 'apt-public-1',
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: 'CC-XYZ',
      }),
    };
    notifications = makeNotifications();
    service = new AppointmentsService(
      makePrisma(handles),
      {} as OrganizationsService,
      notifications.service,
    );
  });

  it('creates a CONFIRMED appointment and deletes the lock', async () => {
    const result = await service.create(customerId, {
      slotLockId: lockIdString,
      answers: [{ questionId: questionIdString, answerText: '10' }],
    });
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);

    const created = handles.appointmentCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(created.data.status).toBe(AppointmentStatus.CONFIRMED);
    expect(created.data.paymentStatus).toBe(PaymentStatus.PAID);
    expect(created.data.confirmationCode).toMatch(/^CC-/);
    expect(handles.slotLockDelete).toHaveBeenCalledWith({
      where: { id: lockId },
    });
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'APPOINTMENT_CONFIRMED' }),
    );
  });

  it('marks the appointment PENDING when manualConfirmation is enabled', async () => {
    handles.appointmentTypeFindUnique.mockResolvedValue(
      makeAppointmentType({ manualConfirmation: true }),
    );
    await service.create(customerId, {
      slotLockId: lockIdString,
      answers: [{ questionId: questionIdString, answerText: '10' }],
    });
    const created = handles.appointmentCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(created.data.status).toBe(AppointmentStatus.PENDING);
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'APPOINTMENT_PENDING_APPROVAL' }),
    );
  });

  it('rejects when slot lock does not belong to the customer', async () => {
    handles.slotLockFindUnique.mockResolvedValue(
      makeLock({ customerId: 'other-cust' }),
    );
    await expect(
      service.create(customerId, {
        slotLockId: lockIdString,
        answers: [{ questionId: questionIdString, answerText: '10' }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when slot lock has expired', async () => {
    handles.slotLockFindUnique.mockResolvedValue(
      makeLock({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      service.create(customerId, {
        slotLockId: lockIdString,
        answers: [{ questionId: questionIdString, answerText: '10' }],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects when capacity check fails inside the transaction (race)', async () => {
    handles.appointmentAggregate.mockResolvedValue({
      _sum: { capacityBooked: 1 },
    });
    await expect(
      service.create(customerId, {
        slotLockId: lockIdString,
        answers: [{ questionId: questionIdString, answerText: '10' }],
      }),
    ).rejects.toThrow(ConflictException);
    expect(handles.appointmentCreate).not.toHaveBeenCalled();
  });

  it('rejects answers that fail required-question validation', async () => {
    await expect(
      service.create(customerId, { slotLockId: lockIdString, answers: [] }),
    ).rejects.toThrow(/Number of players/);
  });

  it('keeps appointment PENDING and paymentStatus PENDING when advance payment is required', async () => {
    handles.appointmentTypeFindUnique.mockResolvedValue(
      makeAppointmentType({
        advancePaymentEnabled: true,
        advancePaymentAmount: 1000,
      }),
    );
    await service.create(customerId, {
      slotLockId: lockIdString,
      answers: [{ questionId: questionIdString, answerText: '10' }],
    });
    const created = handles.appointmentCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // Advance-payment booking stays PENDING until payment succeeds — see
    // PaymentsService.markPaid which promotes it to CONFIRMED.
    expect(created.data.status).toBe(AppointmentStatus.PENDING);
    expect(created.data.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(created.data.totalAmount).toBe(1000);
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'APPOINTMENT_CREATED' }),
    );
  });
});
