import { AppointmentStatus, EntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityEmitter } from './availability.emitter';
import { AvailabilityGateway, availabilityRoom } from './availability.gateway';

interface PrismaMockHandles {
  appointmentTypeFindUnique: jest.Mock;
  confirmedAggregate: jest.Mock;
  pendingAggregate: jest.Mock;
}

function makePrisma(handles: PrismaMockHandles): PrismaService {
  return {
    appointmentType: { findUnique: handles.appointmentTypeFindUnique },
    appointment: {
      aggregate: jest.fn(({ where }: { where: { status: string } }) => {
        if (where.status === AppointmentStatus.CONFIRMED) {
          return handles.confirmedAggregate();
        }
        return handles.pendingAggregate();
      }),
    },
  } as unknown as PrismaService;
}

interface ServerEmitMock {
  emit: jest.Mock;
}

function makeGateway(): { gateway: AvailabilityGateway; toMock: jest.Mock } {
  const emit: jest.Mock = jest.fn();
  const toMock: jest.Mock = jest.fn((): ServerEmitMock => ({ emit }));
  const gateway = {
    server: { to: toMock },
  } as unknown as AvailabilityGateway;
  // Expose emit through toMock so tests can assert on the payload.
  (toMock as jest.Mock & { _emit: jest.Mock })._emit = emit;
  return { gateway, toMock };
}

const baseAppointmentType = {
  id: 'at-1',
  entityType: EntityType.RESOURCE,
  manualConfirmation: false,
  maxBookingsPerSlot: 2,
  schedules: [{ timezone: 'UTC' }],
};

describe('AvailabilityEmitter', () => {
  it('publishes to both the wildcard room and the entity room', async () => {
    const handles: PrismaMockHandles = {
      appointmentTypeFindUnique: jest
        .fn()
        .mockResolvedValue(baseAppointmentType),
      confirmedAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      pendingAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
    };
    const { gateway, toMock } = makeGateway();
    const emitter = new AvailabilityEmitter(makePrisma(handles), gateway);

    await emitter.emitForSlot({
      appointmentTypeId: 'at-1',
      entityId: 'res-1',
      slotStart: new Date('2026-05-05T09:00:00.000Z'),
      slotEnd: new Date('2026-05-05T10:00:00.000Z'),
    });

    expect(toMock).toHaveBeenCalledTimes(1);
    expect(toMock).toHaveBeenCalledWith([
      availabilityRoom('at-1', '2026-05-05', null),
      availabilityRoom('at-1', '2026-05-05', 'res-1'),
    ]);
  });

  it('marks the slot as `pending` for manualConfirmation types with PENDING capacity', async () => {
    const handles: PrismaMockHandles = {
      appointmentTypeFindUnique: jest.fn().mockResolvedValue({
        ...baseAppointmentType,
        manualConfirmation: true,
      }),
      confirmedAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      pendingAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 1 } }),
    };
    const { gateway, toMock } = makeGateway();
    const emitter = new AvailabilityEmitter(makePrisma(handles), gateway);

    await emitter.emitForSlot({
      appointmentTypeId: 'at-1',
      entityId: 'res-1',
      slotStart: new Date('2026-05-05T09:00:00.000Z'),
      slotEnd: new Date('2026-05-05T10:00:00.000Z'),
    });

    const emit = (toMock as unknown as { _emit: jest.Mock })._emit;
    expect(emit).toHaveBeenCalledWith(
      'slot:updated',
      expect.objectContaining({
        state: 'pending',
        confirmedCount: 0,
        pendingCount: 1,
        remainingCapacity: 2,
      }),
    );
  });

  it('marks the slot as `booked` once CONFIRMED reaches maxBookingsPerSlot', async () => {
    const handles: PrismaMockHandles = {
      appointmentTypeFindUnique: jest
        .fn()
        .mockResolvedValue(baseAppointmentType),
      confirmedAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 2 } }),
      pendingAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
    };
    const { gateway, toMock } = makeGateway();
    const emitter = new AvailabilityEmitter(makePrisma(handles), gateway);

    await emitter.emitForSlot({
      appointmentTypeId: 'at-1',
      entityId: 'res-1',
      slotStart: new Date('2026-05-05T09:00:00.000Z'),
      slotEnd: new Date('2026-05-05T10:00:00.000Z'),
    });

    const emit = (toMock as unknown as { _emit: jest.Mock })._emit;
    expect(emit).toHaveBeenCalledWith(
      'slot:updated',
      expect.objectContaining({
        state: 'booked',
        remainingCapacity: 0,
      }),
    );
  });

  it('emits twice when a slot crosses midnight in the schedule timezone', async () => {
    const handles: PrismaMockHandles = {
      appointmentTypeFindUnique: jest.fn().mockResolvedValue({
        ...baseAppointmentType,
        schedules: [{ timezone: 'Asia/Kolkata' }],
      }),
      confirmedAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
      pendingAggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { capacityBooked: 0 } }),
    };
    const { gateway, toMock } = makeGateway();
    const emitter = new AvailabilityEmitter(makePrisma(handles), gateway);

    await emitter.emitForSlot({
      appointmentTypeId: 'at-1',
      entityId: 'res-1',
      // 23:30→00:30 IST spans 2026-05-05 and 2026-05-06.
      slotStart: new Date('2026-05-05T18:00:00.000Z'),
      slotEnd: new Date('2026-05-05T19:00:00.000Z'),
    });

    expect(toMock).toHaveBeenCalledTimes(2);
    const calledRooms = toMock.mock.calls.flatMap((c) => c[0] as string[]);
    expect(calledRooms).toEqual(
      expect.arrayContaining([
        availabilityRoom('at-1', '2026-05-05', null),
        availabilityRoom('at-1', '2026-05-06', null),
      ]),
    );
  });

  it('swallows errors so a failed emit cannot bubble into the calling service', async () => {
    const handles: PrismaMockHandles = {
      appointmentTypeFindUnique: jest
        .fn()
        .mockRejectedValue(new Error('db is down')),
      confirmedAggregate: jest.fn(),
      pendingAggregate: jest.fn(),
    };
    const { gateway } = makeGateway();
    const emitter = new AvailabilityEmitter(makePrisma(handles), gateway);

    await expect(
      emitter.emitForSlot({
        appointmentTypeId: 'at-1',
        entityId: 'res-1',
        slotStart: new Date('2026-05-05T09:00:00.000Z'),
        slotEnd: new Date('2026-05-05T10:00:00.000Z'),
      }),
    ).resolves.toBeUndefined();
  });
});
