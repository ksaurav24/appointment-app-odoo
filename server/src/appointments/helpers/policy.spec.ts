import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { assertCancellable, assertReschedulable, hoursUntil } from './policy';

const NOW = new Date('2026-05-02T12:00:00.000Z');

function appointment(
  overrides: Partial<{ startTime: Date; rescheduleCount: number }> = {},
) {
  return {
    status: AppointmentStatus.CONFIRMED,
    startTime: new Date('2026-05-05T12:00:00.000Z'), // 72h from NOW
    rescheduleCount: 0,
    ...overrides,
  };
}

function policy(overrides: Partial<AppointmentType> = {}): AppointmentType {
  return {
    cancellationAllowed: true,
    cancellationWindowHours: null,
    rescheduleAllowed: true,
    rescheduleWindowHours: null,
    maxReschedulesAllowed: null,
    ...overrides,
  } as AppointmentType;
}

describe('hoursUntil', () => {
  it('computes positive hours for future times', () => {
    const start = new Date('2026-05-02T15:00:00.000Z');
    expect(hoursUntil(start, NOW)).toBe(3);
  });

  it('computes negative hours for past times', () => {
    const start = new Date('2026-05-02T09:00:00.000Z');
    expect(hoursUntil(start, NOW)).toBe(-3);
  });
});

describe('assertCancellable', () => {
  it('passes when cancellationAllowed and no window', () => {
    expect(() => assertCancellable(appointment(), policy(), NOW)).not.toThrow();
  });

  it('throws ForbiddenException when cancellationAllowed=false', () => {
    expect(() =>
      assertCancellable(
        appointment(),
        policy({ cancellationAllowed: false }),
        NOW,
      ),
    ).toThrow(ForbiddenException);
  });

  it('passes when remaining hours >= window', () => {
    expect(() =>
      assertCancellable(
        appointment({ startTime: new Date('2026-05-03T12:01:00.000Z') }),
        policy({ cancellationWindowHours: 24 }),
        NOW,
      ),
    ).not.toThrow();
  });

  it('throws BadRequestException when remaining hours < window', () => {
    expect(() =>
      assertCancellable(
        appointment({ startTime: new Date('2026-05-03T11:59:00.000Z') }),
        policy({ cancellationWindowHours: 24 }),
        NOW,
      ),
    ).toThrow(BadRequestException);
  });

  it('passes when window is 0 and start time is in the future', () => {
    expect(() =>
      assertCancellable(
        appointment({ startTime: new Date('2026-05-02T12:01:00.000Z') }),
        policy({ cancellationWindowHours: 0 }),
        NOW,
      ),
    ).not.toThrow();
  });
});

describe('assertReschedulable', () => {
  it('throws ForbiddenException when rescheduleAllowed=false', () => {
    expect(() =>
      assertReschedulable(
        appointment(),
        policy({ rescheduleAllowed: false }),
        NOW,
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws BadRequestException when at the maxReschedulesAllowed cap', () => {
    expect(() =>
      assertReschedulable(
        appointment({ rescheduleCount: 2 }),
        policy({ maxReschedulesAllowed: 2 }),
        NOW,
      ),
    ).toThrow(BadRequestException);
  });

  it('passes when below the maxReschedulesAllowed cap', () => {
    expect(() =>
      assertReschedulable(
        appointment({ rescheduleCount: 1 }),
        policy({ maxReschedulesAllowed: 2 }),
        NOW,
      ),
    ).not.toThrow();
  });

  it('throws BadRequestException when remaining hours < rescheduleWindowHours', () => {
    expect(() =>
      assertReschedulable(
        appointment({ startTime: new Date('2026-05-02T13:00:00.000Z') }),
        policy({ rescheduleWindowHours: 4 }),
        NOW,
      ),
    ).toThrow(BadRequestException);
  });

  it('null maxReschedulesAllowed means unlimited reschedules', () => {
    expect(() =>
      assertReschedulable(
        appointment({ rescheduleCount: 99 }),
        policy({ maxReschedulesAllowed: null }),
        NOW,
      ),
    ).not.toThrow();
  });
});
