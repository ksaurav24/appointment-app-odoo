import { ConflictException } from '@nestjs/common';
import { AssignmentMode, EntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlotLocksService } from './slot-locks.service';

interface PrismaMockState {
  appointmentTypeFindFirst: jest.Mock;
  appointmentAggregate: jest.Mock;
  appointmentFindMany: jest.Mock;
  slotLockCount: jest.Mock;
  slotLockFindMany: jest.Mock;
  slotLockCreate: jest.Mock;
  bookableResourceFindMany: jest.Mock;
  txExecuteRaw: jest.Mock;
}

function makePrismaMock(state: PrismaMockState): PrismaService {
  const tx = {
    appointment: {
      aggregate: state.appointmentAggregate,
      findMany: state.appointmentFindMany,
    },
    slotLock: {
      count: state.slotLockCount,
      create: state.slotLockCreate,
      findMany: state.slotLockFindMany,
    },
    bookableResource: { findMany: state.bookableResourceFindMany },
    $executeRaw: state.txExecuteRaw,
  };
  return {
    appointmentType: { findFirst: state.appointmentTypeFindFirst },
    appointment: {
      aggregate: state.appointmentAggregate,
      findMany: state.appointmentFindMany,
    },
    slotLock: {
      count: state.slotLockCount,
      create: state.slotLockCreate,
      findMany: state.slotLockFindMany,
    },
    bookableResource: { findMany: state.bookableResourceFindMany },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
}

const baseAppointmentType = {
  id: 'at-1',
  organizationId: 'org-1',
  name: 'Test service',
  slug: 'test-service',
  description: null,
  entityType: EntityType.RESOURCE,
  scheduleType: 'WEEKLY',
  durationMode: 'FIXED',
  durationMinutes: 60,
  minDurationMins: null,
  maxDurationMins: null,
  durationStepMins: null,
  assignmentMode: AssignmentMode.MANUAL,
  maxBookingsPerSlot: 1,
  manageCapacity: false,
  manualConfirmation: false,
  advancePaymentEnabled: false,
  advancePaymentAmount: null,
  cancellationAllowed: true,
  cancellationWindowHours: null,
  rescheduleAllowed: true,
  rescheduleWindowHours: null,
  maxReschedulesAllowed: null,
  isPublished: true,
  shareToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  entities: [
    {
      id: 1n,
      appointmentTypeId: 'at-1',
      bookablePersonId: null,
      bookableResourceId: 'res-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  schedules: [
    {
      id: 1n,
      appointmentTypeId: 'at-1',
      scheduleType: 'WEEKLY',
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
      ],
    },
  ],
};

const validRequest = {
  appointmentTypeId: 'at-1',
  entityId: 'res-1',
  startTime: '2026-05-05T09:00:00.000Z',
  endTime: '2026-05-05T10:00:00.000Z',
};

describe('SlotLocksService.acquire', () => {
  let state: PrismaMockState;
  let service: SlotLocksService;

  beforeEach(() => {
    state = {
      appointmentTypeFindFirst: jest.fn().mockResolvedValue(baseAppointmentType),
      appointmentAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      appointmentFindMany: jest.fn().mockResolvedValue([]),
      slotLockCount: jest.fn().mockResolvedValue(0),
      slotLockFindMany: jest.fn().mockResolvedValue([]),
      slotLockCreate: jest.fn().mockResolvedValue({ id: 1n }),
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
      txExecuteRaw: jest.fn().mockResolvedValue(1),
    };
    service = new SlotLocksService(makePrismaMock(state));
  });

  it('creates a lock when the slot is free', async () => {
    const lock = await service.acquire('cust-1', validRequest);
    expect(lock.id).toBe(1n);
    expect(state.slotLockCreate).toHaveBeenCalledTimes(1);
  });

  it('throws Conflict when an overlapping appointment already consumes capacity', async () => {
    state.appointmentAggregate.mockResolvedValue({
      _sum: { capacityBooked: 1 },
    });
    await expect(service.acquire('cust-1', validRequest)).rejects.toThrow(
      ConflictException,
    );
    expect(state.slotLockCreate).not.toHaveBeenCalled();
  });

  it('throws Conflict when a competing lock already exists', async () => {
    state.slotLockCount.mockResolvedValue(1);
    await expect(service.acquire('cust-1', validRequest)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects an entityId that is not linked to the appointment type', async () => {
    await expect(
      service.acquire('cust-1', { ...validRequest, entityId: 'res-other' }),
    ).rejects.toThrow(/not linked/);
  });

  it('requires entityId in MANUAL assignment mode', async () => {
    await expect(
      service.acquire('cust-1', { ...validRequest, entityId: undefined }),
    ).rejects.toThrow(/entityId is required/);
  });

  it('takes a per-slot advisory lock inside the transaction before checking capacity', async () => {
    await service.acquire('cust-1', validRequest);

    expect(state.txExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, key] = state.txExecuteRaw.mock.calls[0] as [
      TemplateStringsArray,
      string,
    ];
    expect(strings.join('')).toMatch(/pg_advisory_xact_lock/);
    expect(key).toContain('at-1');
    expect(key).toContain('res-1');
    expect(key).toContain('2026-05-05T09:00:00');

    // Advisory lock must be acquired BEFORE the capacity recheck — otherwise
    // it doesn't actually serialise the race.
    expect(state.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      state.appointmentAggregate.mock.invocationCallOrder[0],
    );
    expect(state.txExecuteRaw.mock.invocationCallOrder[0]).toBeLessThan(
      state.slotLockCount.mock.invocationCallOrder[0],
    );
  });

  it('auto-picks the first available entity in AUTO mode', async () => {
    state.appointmentTypeFindFirst.mockResolvedValue({
      ...baseAppointmentType,
      assignmentMode: AssignmentMode.AUTO,
      entities: [
        {
          id: 1n,
          appointmentTypeId: 'at-1',
          bookablePersonId: null,
          bookableResourceId: 'res-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 2n,
          appointmentTypeId: 'at-1',
          bookablePersonId: null,
          bookableResourceId: 'res-2',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    // First candidate is busy; second is free.
    state.appointmentAggregate
      .mockResolvedValueOnce({ _sum: { capacityBooked: 1 } })
      .mockResolvedValueOnce({ _sum: { capacityBooked: 0 } })
      .mockResolvedValueOnce({ _sum: { capacityBooked: 0 } });
    state.slotLockCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await service.acquire('cust-1', { ...validRequest, entityId: undefined });
    const created = state.slotLockCreate.mock.calls[0][0] as {
      data: { bookableResourceId: string };
    };
    expect(created.data.bookableResourceId).toBe('res-2');
  });
});
