import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AssignmentMode,
  DurationMode,
  EntityType,
  PaymentStatus,
  QuestionType,
  ScheduleType,
} from '@prisma/client';
import type { Queue } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEmitter } from '../realtime/availability.emitter';
import { AppointmentsService } from './appointments.service';
import type { AutoRejectFanoutPayload } from './queue/appointments.queue';

function makeQueueStub(): {
  queue: Queue<AutoRejectFanoutPayload>;
  add: jest.Mock;
} {
  const add = jest.fn().mockResolvedValue({});
  const queue = { add } as unknown as Queue<AutoRejectFanoutPayload>;
  return { queue, add };
}

function makeEmitterStub(): AvailabilityEmitter {
  return {
    emitForSlot: jest.fn().mockResolvedValue(undefined),
    emitForSlots: jest.fn().mockResolvedValue(undefined),
  } as unknown as AvailabilityEmitter;
}

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
  txExecuteRaw: jest.Mock;
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
      makeQueueStub().queue,
      makeEmitterStub(),
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

describe('AppointmentsService.submitRequest', () => {
  function makeApprovalType(overrides: Record<string, unknown> = {}) {
    return makeAppointmentType({
      manualConfirmation: true,
      durationMode: DurationMode.FIXED,
      durationMinutes: 60,
      assignmentMode: AssignmentMode.AUTO,
      maxBookingsPerSlot: 2,
      entities: [{ bookablePersonId: null, bookableResourceId: 'res-1' }],
      ...overrides,
    });
  }

  function makePrismaForRequest(handles: {
    typeFindFirst: jest.Mock;
    aggregate: jest.Mock;
    appointmentCreate: jest.Mock;
    appointmentAnswerCreateMany: jest.Mock;
    appointmentFindUnique: jest.Mock;
    txExecuteRaw: jest.Mock;
  }): PrismaService {
    const tx = {
      appointment: {
        aggregate: handles.aggregate,
        create: handles.appointmentCreate,
        findUnique: handles.appointmentFindUnique,
      },
      appointmentAnswer: { createMany: handles.appointmentAnswerCreateMany },
      $executeRaw: handles.txExecuteRaw,
    };
    return {
      appointmentType: { findFirst: handles.typeFindFirst },
      appointment: {
        aggregate: handles.aggregate,
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;
  }

  function buildService(prisma: PrismaService) {
    const cacheStub = {
      invalidateOrgScope: jest.fn().mockResolvedValue(undefined),
      invalidateAdminScope: jest.fn().mockResolvedValue(undefined),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as unknown as ConstructorParameters<typeof AppointmentsService>[3];
    const notifications = makeNotifications();
    return {
      service: new AppointmentsService(
        prisma,
        {} as OrganizationsService,
        notifications.service,
        cacheStub,
        makeQueueStub().queue,
        makeEmitterStub(),
      ),
      notifications,
    };
  }

  const baseInput = {
    startTime: '2026-05-05T09:00:00.000Z',
    endTime: '2026-05-05T10:00:00.000Z',
  };

  it('creates a PENDING appointment without acquiring a slot lock', async () => {
    const handles = {
      typeFindFirst: jest.fn().mockResolvedValue(makeApprovalType()),
      aggregate: jest.fn().mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      appointmentCreate: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 100n, ...args.data }),
      ),
      appointmentAnswerCreateMany: jest.fn().mockResolvedValue({ count: 0 }),
      appointmentFindUnique: jest.fn().mockResolvedValue({
        publicId: 'apt-public-req',
        status: AppointmentStatus.PENDING,
      }),
      txExecuteRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = makePrismaForRequest(handles);
    const { service, notifications } = buildService(prisma);

    await service.submitRequest(customerId, appointmentTypeId, {
      ...baseInput,
      answers: [{ questionId: questionIdString, answerText: '4' }],
    });

    const created = handles.appointmentCreate.mock.calls[0][0];
    expect(created.data.status).toBe(AppointmentStatus.PENDING);
    expect(created.data.bookableResourceId).toBe('res-1');
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'APPOINTMENT_PENDING_APPROVAL' }),
    );
  });

  it('rejects when manualConfirmation is false', async () => {
    const handles = {
      typeFindFirst: jest
        .fn()
        .mockResolvedValue(makeApprovalType({ manualConfirmation: false })),
      aggregate: jest.fn(),
      appointmentCreate: jest.fn(),
      appointmentAnswerCreateMany: jest.fn(),
      appointmentFindUnique: jest.fn(),
      txExecuteRaw: jest.fn(),
    };
    const { service } = buildService(makePrismaForRequest(handles));
    await expect(
      service.submitRequest(customerId, appointmentTypeId, {
        ...baseInput,
        answers: [{ questionId: questionIdString, answerText: '4' }],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(handles.appointmentCreate).not.toHaveBeenCalled();
  });

  it('rejects when CONFIRMED capacity already meets the slot maximum', async () => {
    const handles = {
      typeFindFirst: jest.fn().mockResolvedValue(makeApprovalType()),
      aggregate: jest.fn().mockResolvedValue({ _sum: { capacityBooked: 2 } }),
      appointmentCreate: jest.fn(),
      appointmentAnswerCreateMany: jest.fn(),
      appointmentFindUnique: jest.fn(),
      txExecuteRaw: jest.fn().mockResolvedValue(1),
    };
    const { service } = buildService(makePrismaForRequest(handles));
    await expect(
      service.submitRequest(customerId, appointmentTypeId, {
        ...baseInput,
        answers: [{ questionId: questionIdString, answerText: '4' }],
      }),
    ).rejects.toThrow(ConflictException);
    expect(handles.appointmentCreate).not.toHaveBeenCalled();
  });

  it('takes the same advisory lock that approve() uses, so submit/approve serialise', async () => {
    const handles = {
      typeFindFirst: jest.fn().mockResolvedValue(makeApprovalType()),
      aggregate: jest.fn().mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      appointmentCreate: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 100n, ...args.data }),
      ),
      appointmentAnswerCreateMany: jest.fn().mockResolvedValue({ count: 0 }),
      appointmentFindUnique: jest.fn().mockResolvedValue({
        publicId: 'apt-public-req',
        status: AppointmentStatus.PENDING,
      }),
      txExecuteRaw: jest.fn().mockResolvedValue(1),
    };
    const { service } = buildService(makePrismaForRequest(handles));

    await service.submitRequest(customerId, appointmentTypeId, {
      ...baseInput,
      answers: [{ questionId: questionIdString, answerText: '4' }],
    });

    expect(handles.txExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, key] = handles.txExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(strings.join('')).toMatch(/pg_advisory_xact_lock/);
    expect(key).toBe(`${appointmentTypeId}:res-1:2026-05-05T09:00:00.000Z`);
    // The advisory lock must precede the *in-transaction* aggregate (the
    // capacity recheck) — that's the call that races. `pickEntityForSlot`
    // also calls aggregate outside the tx; ignore that earlier call.
    const aggregateCalls = handles.aggregate.mock.invocationCallOrder;
    const lastAggregate = aggregateCalls[aggregateCalls.length - 1];
    expect(handles.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      lastAggregate,
    );
  });
});

describe('AppointmentsService.approve (with auto-reject)', () => {
  const approvalAppointmentId = 300n;
  const approvalPublicId = 'apt-pending-1';
  const slotStart = new Date('2026-05-05T09:00:00.000Z');
  const slotEnd = new Date('2026-05-05T10:00:00.000Z');

  function makeAppointmentForApproval() {
    const at = makeAppointmentType({
      manualConfirmation: true,
      durationMode: DurationMode.FIXED,
      durationMinutes: 60,
      assignmentMode: AssignmentMode.AUTO,
      maxBookingsPerSlot: 1,
    });
    return {
      id: approvalAppointmentId,
      publicId: approvalPublicId,
      organizationId: 'org-1',
      appointmentTypeId,
      bookablePersonId: null,
      bookableResourceId: 'res-1',
      customerId,
      startTime: slotStart,
      endTime: slotEnd,
      status: AppointmentStatus.PENDING,
      capacityBooked: 1,
      appointmentType: at,
    };
  }

  function buildHarness(opts: {
    organizationFindFirst?: jest.Mock;
    losers?: { id: bigint; publicId: string }[];
    confirmedSum?: number;
  }) {
    const losers = opts.losers ?? [];
    const txExecuteRaw = jest.fn().mockResolvedValue(1);
    const aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { capacityBooked: opts.confirmedSum ?? 0 } });
    const appointmentUpdate = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        id: approvalAppointmentId,
        publicId: approvalPublicId,
        ...data,
      }),
    );
    const appointmentUpdateMany = jest
      .fn()
      .mockResolvedValue({ count: losers.length });
    const appointmentFindMany = jest.fn().mockResolvedValue(losers);
    const appointmentFindUnique = jest.fn().mockResolvedValue({
      publicId: approvalPublicId,
      status: AppointmentStatus.CONFIRMED,
    });
    const auditLogCreate = jest.fn().mockResolvedValue({});

    const tx = {
      appointment: {
        aggregate,
        update: appointmentUpdate,
        updateMany: appointmentUpdateMany,
        findMany: appointmentFindMany,
        findUnique: appointmentFindUnique,
      },
      auditLog: { create: auditLogCreate },
      $executeRaw: txExecuteRaw,
    };

    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue(makeAppointmentForApproval()),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;

    const orgsStub = {
      requireForOrganiser: jest.fn().mockResolvedValue({ id: 'org-1' }),
    } as unknown as OrganizationsService;
    const cacheStub = {
      invalidateOrgScope: jest.fn().mockResolvedValue(undefined),
      invalidateAdminScope: jest.fn().mockResolvedValue(undefined),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as unknown as ConstructorParameters<typeof AppointmentsService>[3];
    const notifications = makeNotifications();
    const { queue, add: queueAdd } = makeQueueStub();

    const service = new AppointmentsService(
      prisma,
      orgsStub,
      notifications.service,
      cacheStub,
      queue,
      makeEmitterStub(),
    );
    return {
      service,
      notifications,
      queueAdd,
      txExecuteRaw,
      aggregate,
      appointmentUpdate,
      appointmentUpdateMany,
      auditLogCreate,
    };
  }

  it('takes the slot-keyed advisory lock before counting confirmed capacity', async () => {
    const harness = buildHarness({});
    await harness.service.approve('organiser-1', approvalPublicId);

    expect(harness.txExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, key] = harness.txExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(strings.join('')).toMatch(/pg_advisory_xact_lock/);
    expect(key).toBe(`${appointmentTypeId}:res-1:${slotStart.toISOString()}`);
    expect(harness.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      harness.aggregate.mock.invocationCallOrder[0],
    );
  });

  it('rejects when CONFIRMED capacity already meets the slot maximum (concurrent approve)', async () => {
    const harness = buildHarness({ confirmedSum: 1 });
    await expect(
      harness.service.approve('organiser-1', approvalPublicId),
    ).rejects.toThrow(ConflictException);
    expect(harness.appointmentUpdate).not.toHaveBeenCalled();
  });

  it('auto-cancels sibling PENDINGs and enqueues the rejection fan-out when the slot fills', async () => {
    const losers = [
      { id: 401n, publicId: 'loser-a' },
      { id: 402n, publicId: 'loser-b' },
    ];
    const harness = buildHarness({ losers });

    await harness.service.approve('organiser-1', approvalPublicId);

    expect(harness.appointmentUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [401n, 402n] } },
      data: expect.objectContaining({
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Slot filled by another applicant',
      }),
    });
    expect(harness.auditLogCreate).toHaveBeenCalledTimes(losers.length);
    expect(harness.queueAdd).toHaveBeenCalledWith(
      'auto-reject-fanout',
      expect.objectContaining({
        appointmentIds: ['401', '402'],
        reason: 'Slot filled by another applicant',
      }),
    );
  });

  it('does not enqueue a fan-out job when no losers exist (capacity > 1)', async () => {
    // maxBookingsPerSlot=2 and approving leaves room → no auto-reject.
    const at = makeAppointmentType({
      manualConfirmation: true,
      durationMode: DurationMode.FIXED,
      durationMinutes: 60,
      maxBookingsPerSlot: 2,
    });
    const txExecuteRaw = jest.fn().mockResolvedValue(1);
    const aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { capacityBooked: 0 } });
    const appointmentUpdate = jest.fn().mockResolvedValue({
      id: approvalAppointmentId,
      publicId: approvalPublicId,
    });
    const appointmentFindMany = jest.fn();
    const appointmentUpdateMany = jest.fn();
    const auditLogCreate = jest.fn();
    const appointmentFindUnique = jest.fn().mockResolvedValue({
      publicId: approvalPublicId,
      status: AppointmentStatus.CONFIRMED,
    });
    const tx = {
      appointment: {
        aggregate,
        update: appointmentUpdate,
        updateMany: appointmentUpdateMany,
        findMany: appointmentFindMany,
        findUnique: appointmentFindUnique,
      },
      auditLog: { create: auditLogCreate },
      $executeRaw: txExecuteRaw,
    };
    const prisma = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeAppointmentForApproval(),
          appointmentType: at,
        }),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    } as unknown as PrismaService;

    const { queue, add: queueAdd } = makeQueueStub();
    const cacheStub = {
      invalidateOrgScope: jest.fn().mockResolvedValue(undefined),
      invalidateAdminScope: jest.fn().mockResolvedValue(undefined),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    } as unknown as ConstructorParameters<typeof AppointmentsService>[3];
    const orgs = {
      requireForOrganiser: jest.fn().mockResolvedValue({ id: 'org-1' }),
    } as unknown as OrganizationsService;
    const service = new AppointmentsService(
      prisma,
      orgs,
      makeNotifications().service,
      cacheStub,
      queue,
      makeEmitterStub(),
    );

    await service.approve('organiser-1', approvalPublicId);

    expect(appointmentFindMany).not.toHaveBeenCalled();
    expect(appointmentUpdateMany).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
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
    const slotLockCount = jest.fn().mockResolvedValue(0);
    const appointmentRescheduleCreate = jest.fn().mockResolvedValue({});
    const appointmentUpdate = jest.fn().mockResolvedValue({});
    const slotLockDelete = jest.fn().mockResolvedValue({});
    const auditLogCreate = jest.fn().mockResolvedValue({});
    const appointmentFindUnique = jest.fn().mockResolvedValue({
      publicId: existingPublicId,
      status: AppointmentStatus.CONFIRMED,
    });

    const tx = {
      appointment: {
        aggregate: appointmentAggregate,
        update: appointmentUpdate,
        findUnique: appointmentFindUnique,
      },
      appointmentReschedule: { create: appointmentRescheduleCreate },
      slotLock: { count: slotLockCount, delete: slotLockDelete },
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
      makeQueueStub().queue,
      makeEmitterStub(),
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
