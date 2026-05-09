import { AppointmentStatus, EntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { countConsumedCapacity } from './capacity';

describe('countConsumedCapacity', () => {
  it('expands overlap range by bufferMinutes for appointments and locks', async () => {
    const aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { capacityBooked: 2 } });
    const lockCount = jest.fn().mockResolvedValue(1);
    const client = {
      appointment: { aggregate },
      slotLock: { count: lockCount },
    } as unknown as PrismaService;

    const start = new Date('2026-05-05T09:00:00.000Z');
    const end = new Date('2026-05-05T10:00:00.000Z');

    const total = await countConsumedCapacity(
      client,
      { id: 'at-1', entityType: EntityType.PERSON, bufferMinutes: 15 },
      'person-1',
      { start, end },
    );

    const expectedStart = new Date('2026-05-05T08:45:00.000Z');
    const expectedEnd = new Date('2026-05-05T10:15:00.000Z');

    expect(total).toBe(3);
    expect(aggregate).toHaveBeenCalledWith({
      _sum: { capacityBooked: true },
      where: expect.objectContaining({
        appointmentTypeId: 'at-1',
        bookablePersonId: 'person-1',
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lt: expectedEnd },
        endTime: { gt: expectedStart },
      }),
    });
    expect(lockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        appointmentTypeId: 'at-1',
        bookablePersonId: 'person-1',
        slotStart: { lt: expectedEnd },
        slotEnd: { gt: expectedStart },
      }),
    });
  });

  it('skips slot locks when mode is confirmed_only', async () => {
    const aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { capacityBooked: 4 } });
    const lockCount = jest.fn();
    const client = {
      appointment: { aggregate },
      slotLock: { count: lockCount },
    } as unknown as PrismaService;

    const total = await countConsumedCapacity(
      client,
      { id: 'at-2', entityType: EntityType.RESOURCE, bufferMinutes: 5 },
      'resource-1',
      {
        start: new Date('2026-05-05T12:00:00.000Z'),
        end: new Date('2026-05-05T13:00:00.000Z'),
      },
      {},
      'confirmed_only',
    );

    expect(total).toBe(4);
    expect(lockCount).not.toHaveBeenCalled();
    expect(aggregate).toHaveBeenCalledWith({
      _sum: { capacityBooked: true },
      where: expect.objectContaining({
        appointmentTypeId: 'at-2',
        bookableResourceId: 'resource-1',
        status: AppointmentStatus.CONFIRMED,
      }),
    });
  });
});
