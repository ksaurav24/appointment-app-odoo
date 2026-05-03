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
    name: 'Consultation',
    slug: 'consultation',
    description: null,
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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    entities: [
      {
        id: 1n,
        appointmentTypeId,
        bookablePersonId: null,
        bookableResourceId: 'res-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    schedules: [
      {
        id: 1n,
        appointmentTypeId,
        scheduleType: ScheduleType.WEEKLY,
        timezone: 'UTC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        rules: [
          {
            id: 10n,
            scheduleId: 1n,
            dayOfWeek: 2,
            specificDate: null,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: true,
          },
          {
            id: 11n,
            scheduleId: 1n,
            dayOfWeek: 3,
            specificDate: null,
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: true,
          },
        ],
      },
    ],
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
  appointmentFindMany: jest.Mock;
  slotLockCount: jest.Mock;
  slotLockFindMany: jest.Mock;
  appointmentCreate: jest.Mock;
  appointmentAnswerCreateMany: jest.Mock;
  slotLockDelete: jest.Mock;
  bookableResourceFindMany: jest.Mock;
  appointmentFindUnique: jest.Mock;
  txExecuteRaw: jest.Mock;
}

function makePrisma(handles: PrismaMockHandles): PrismaService {
  const tx = {
    appointment: {
      aggregate: handles.appointmentAggregate,
      findMany: handles.appointmentFindMany,
      create: handles.appointmentCreate,
      findUnique: handles.appointmentFindUnique,
    },
    appointmentAnswer: { createMany: handles.appointmentAnswerCreateMany },
    slotLock: {
      count: handles.slotLockCount,
      findMany: handles.slotLockFindMany,
      delete: handles.slotLockDelete,
    },
    bookableResource: { findMany: handles.bookableResourceFindMany },
    $executeRaw: handles.txExecuteRaw,
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
      appointmentFindMany: jest.fn().mockResolvedValue([]),
      slotLockCount: jest.fn().mockResolvedValue(0),
      slotLockFindMany: jest.fn().mockResolvedValue([]),
      appointmentCreate: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 100n, ...args.data }),
      ),
      appointmentAnswerCreateMany: jest.fn().mockResolvedValue({ count: 1 }),
      slotLockDelete: jest.fn().mockResolvedValue({}),
      bookableResourceFindMany: jest.fn().mockResolvedValue([
        {
          id: 'res-1',
          organizationId: 'org-1',
          name: 'Room 1',
          resourceType: 'ROOM',
          description: null,
          capacity: 1,
          location: null,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      appointmentFindUnique: jest.fn().mockResolvedValue({
        publicId: 'apt-public-1',
        status: AppointmentStatus.CONFIRMED,
        confirmationCode: 'CC-XYZ',
      }),
      txExecuteRaw: jest.fn().mockResolvedValue(1),
    };
    notifications = makeNotifications();
    const cacheStub = {
      invalidateOrgScope: jest.fn().mockResolvedValue(undefined),
      invalidateAdminScope: jest.fn().mockResolvedValue(undefined),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as unknown as ConstructorParameters<typeof AppointmentsService>[3];
    service = new AppointmentsService(
      makePrisma(handles),
      {} as OrganizationsService,
      notifications.service,
      cacheStub,
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

  it('takes a per-slot advisory lock inside the transaction before checking capacity', async () => {
    await service.create(customerId, {
      slotLockId: lockIdString,
      answers: [{ questionId: questionIdString, answerText: '10' }],
    });

    expect(handles.txExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, key] = handles.txExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(strings.join('')).toMatch(/pg_advisory_xact_lock/);
    expect(key).toContain(appointmentTypeId);
    expect(key).toContain('res-1');
    expect(key).toContain('2026-05-05T09:00:00');

    // Advisory lock must precede the capacity recheck — otherwise the lock
    // doesn't actually serialise the race window.
    expect(handles.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      handles.appointmentAggregate.mock.invocationCallOrder[0],
    );
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

describe('AppointmentsService.rescheduleByCustomer', () => {
  const existingAppointmentId = 200n;
  const existingPublicId = 'apt-public-1';

  function makeExistingAppointment() {
    return {
      id: existingAppointmentId,
      publicId: existingPublicId,
      organizationId: 'org-1',
      appointmentTypeId,
      bookablePersonId: null,
      bookableResourceId: 'res-1',
      customerId,
      startTime: new Date('2026-05-04T09:00:00.000Z'),
      endTime: new Date('2026-05-04T10:00:00.000Z'),
      status: AppointmentStatus.CONFIRMED,
      capacityBooked: 1,
      rescheduleCount: 0,
      appointmentType: makeAppointmentType(),
    };
  }

  it('takes a per-slot advisory lock for the new slot before checking capacity', async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(1);
    const appointmentAggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { capacityBooked: 0 } });
    const appointmentFindMany = jest.fn().mockResolvedValue([]);
    const slotLockCount = jest.fn().mockResolvedValue(0);
    const slotLockFindMany = jest.fn().mockResolvedValue([]);
    const appointmentRescheduleCreate = jest.fn().mockResolvedValue({});
    const appointmentUpdate = jest.fn().mockResolvedValue({});
    const slotLockDelete = jest.fn().mockResolvedValue({});
    const bookableResourceFindMany = jest.fn().mockResolvedValue([
      {
        id: 'res-1',
        organizationId: 'org-1',
        name: 'Room 1',
        resourceType: 'ROOM',
        description: null,
        capacity: 1,
        location: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    const auditLogCreate = jest.fn().mockResolvedValue({});
    const appointmentFindUnique = jest.fn().mockResolvedValue({
      publicId: existingPublicId,
      status: AppointmentStatus.CONFIRMED,
    });

    const tx = {
      appointment: {
        aggregate: appointmentAggregate,
        findMany: appointmentFindMany,
        update: appointmentUpdate,
        findUnique: appointmentFindUnique,
      },
      appointmentReschedule: { create: appointmentRescheduleCreate },
      slotLock: {
        count: slotLockCount,
        findMany: slotLockFindMany,
        delete: slotLockDelete,
      },
      bookableResource: { findMany: bookableResourceFindMany },
      auditLog: { create: auditLogCreate },
      $executeRaw: txExecuteRaw,
    };
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue(makeExistingAppointment()),
      },
      slotLock: {
        findUnique: jest.fn().mockResolvedValue(
          makeLock({
            slotStart: new Date('2026-05-06T09:00:00.000Z'),
            slotEnd: new Date('2026-05-06T10:00:00.000Z'),
          }),
        ),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;

    const notifications = makeNotifications();
    const cacheStub = {
      invalidateOrgScope: jest.fn().mockResolvedValue(undefined),
      invalidateAdminScope: jest.fn().mockResolvedValue(undefined),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as unknown as ConstructorParameters<typeof AppointmentsService>[3];
    const service = new AppointmentsService(
      prisma,
      {} as OrganizationsService,
      notifications.service,
      cacheStub,
    );

    await service.rescheduleByCustomer(customerId, existingPublicId, {
      slotLockId: lockIdString,
    });

    expect(txExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, key] = txExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(strings.join('')).toMatch(/pg_advisory_xact_lock/);
    expect(key).toContain(appointmentTypeId);
    expect(key).toContain('res-1');
    // Key must reference the NEW slot, not the existing appointment time.
    expect(key).toContain('2026-05-06T09:00:00');
    expect(key).not.toContain('2026-05-04T09:00:00');

    expect(txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      appointmentAggregate.mock.invocationCallOrder[0],
    );

    // Sanity: the reschedule actually went through.
    expect(appointmentUpdate).toHaveBeenCalled();
    expect(slotLockDelete).toHaveBeenCalled();
  });
});
