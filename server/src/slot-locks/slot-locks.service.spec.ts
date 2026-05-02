import { ConflictException } from '@nestjs/common';
import { AssignmentMode, EntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlotLocksService } from './slot-locks.service';

interface PrismaMockState {
  appointmentTypeFindFirst: jest.Mock;
  appointmentAggregate: jest.Mock;
  slotLockCount: jest.Mock;
  slotLockCreate: jest.Mock;
}

function makePrismaMock(state: PrismaMockState): PrismaService {
  const tx = {
    appointment: { aggregate: state.appointmentAggregate },
    slotLock: { count: state.slotLockCount, create: state.slotLockCreate },
  };
  return {
    appointmentType: { findFirst: state.appointmentTypeFindFirst },
    appointment: { aggregate: state.appointmentAggregate },
    slotLock: { count: state.slotLockCount, create: state.slotLockCreate },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
}

const baseAppointmentType = {
  id: 'at-1',
  entityType: EntityType.RESOURCE,
  assignmentMode: AssignmentMode.MANUAL,
  maxBookingsPerSlot: 1,
  isPublished: true,
  shareToken: null,
  entities: [
    {
      id: 1n,
      bookablePersonId: null,
      bookableResourceId: 'res-1',
    },
  ],
  schedules: [],
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
      appointmentTypeFindFirst: jest
        .fn()
        .mockResolvedValue(baseAppointmentType),
      appointmentAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      slotLockCount: jest.fn().mockResolvedValue(0),
      slotLockCreate: jest.fn().mockResolvedValue({ id: 1n }),
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

  it('auto-picks the first available entity in AUTO mode', async () => {
    state.appointmentTypeFindFirst.mockResolvedValue({
      ...baseAppointmentType,
      assignmentMode: AssignmentMode.AUTO,
      entities: [
        { id: 1n, bookablePersonId: null, bookableResourceId: 'res-1' },
        { id: 2n, bookablePersonId: null, bookableResourceId: 'res-2' },
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
