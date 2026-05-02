import { BadRequestException } from '@nestjs/common';
import {
  AssignmentMode,
  DurationMode,
  EntityType,
  QuestionType,
  ScheduleType,
} from '@prisma/client';
import {
  validateAppointmentTypePolicy,
  validateBookingQuestions,
  validateScheduleRules,
} from './validate-appointment-type';

const baseInput = {
  entityType: EntityType.PERSON,
  durationMode: DurationMode.FIXED,
  durationMinutes: 30,
  assignmentMode: AssignmentMode.AUTO,
};

describe('validateAppointmentTypePolicy', () => {
  describe('duration', () => {
    it('accepts FIXED with positive durationMinutes', () => {
      const result = validateAppointmentTypePolicy(baseInput);
      expect(result.durationMinutes).toBe(30);
      expect(result.minDurationMins).toBeNull();
    });

    it('rejects FIXED without durationMinutes', () => {
      expect(() =>
        validateAppointmentTypePolicy({
          ...baseInput,
          durationMinutes: undefined,
        }),
      ).toThrow(BadRequestException);
    });

    it('accepts VARIABLE with min/max/step', () => {
      const result = validateAppointmentTypePolicy({
        ...baseInput,
        durationMode: DurationMode.VARIABLE,
        durationMinutes: undefined,
        minDurationMins: 60,
        maxDurationMins: 240,
        durationStepMins: 60,
      });
      expect(result.minDurationMins).toBe(60);
      expect(result.maxDurationMins).toBe(240);
      expect(result.durationStepMins).toBe(60);
      expect(result.durationMinutes).toBeNull();
    });

    it('rejects VARIABLE with min > max', () => {
      expect(() =>
        validateAppointmentTypePolicy({
          ...baseInput,
          durationMode: DurationMode.VARIABLE,
          durationMinutes: undefined,
          minDurationMins: 120,
          maxDurationMins: 60,
          durationStepMins: 30,
        }),
      ).toThrow(/minDurationMins must be <= maxDurationMins/);
    });

    it('rejects VARIABLE when step does not divide range', () => {
      expect(() =>
        validateAppointmentTypePolicy({
          ...baseInput,
          durationMode: DurationMode.VARIABLE,
          durationMinutes: undefined,
          minDurationMins: 60,
          maxDurationMins: 200,
          durationStepMins: 60,
        }),
      ).toThrow(/evenly divide/);
    });
  });

  describe('capacity', () => {
    it('coerces maxBookingsPerSlot=1 when manageCapacity is false', () => {
      const result = validateAppointmentTypePolicy({
        ...baseInput,
        manageCapacity: false,
        maxBookingsPerSlot: 5,
      });
      expect(result.maxBookingsPerSlot).toBe(1);
    });

    it('rejects manageCapacity=true with maxBookingsPerSlot=1', () => {
      expect(() =>
        validateAppointmentTypePolicy({
          ...baseInput,
          manageCapacity: true,
          maxBookingsPerSlot: 1,
        }),
      ).toThrow(/manageCapacity=true/);
    });
  });

  describe('payment', () => {
    it('rejects advance payment enabled without amount', () => {
      expect(() =>
        validateAppointmentTypePolicy({
          ...baseInput,
          advancePaymentEnabled: true,
          advancePaymentAmount: 0,
        }),
      ).toThrow(/advancePaymentAmount/);
    });

    it('nulls amount when payment disabled', () => {
      const result = validateAppointmentTypePolicy({
        ...baseInput,
        advancePaymentEnabled: false,
        advancePaymentAmount: 500,
      });
      expect(result.advancePaymentAmount).toBeNull();
    });
  });

  describe('cancellation/reschedule', () => {
    it('drops cancellation window when cancellation disabled', () => {
      const result = validateAppointmentTypePolicy({
        ...baseInput,
        cancellationAllowed: false,
        cancellationWindowHours: 24,
      });
      expect(result.cancellationAllowed).toBe(false);
      expect(result.cancellationWindowHours).toBeNull();
    });

    it('keeps cancellation window when allowed', () => {
      const result = validateAppointmentTypePolicy({
        ...baseInput,
        cancellationAllowed: true,
        cancellationWindowHours: 48,
      });
      expect(result.cancellationWindowHours).toBe(48);
    });
  });
});

describe('validateScheduleRules', () => {
  it('accepts WEEKLY rule with dayOfWeek', () => {
    const result = validateScheduleRules(ScheduleType.WEEKLY, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
    expect(result[0].dayOfWeek).toBe(1);
    expect(result[0].specificDate).toBeNull();
  });

  it('rejects WEEKLY rule with specificDate', () => {
    expect(() =>
      validateScheduleRules(ScheduleType.WEEKLY, [
        {
          dayOfWeek: 1,
          specificDate: '2026-05-04',
          startTime: '09:00',
          endTime: '17:00',
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects FLEXIBLE rule without specificDate', () => {
    expect(() =>
      validateScheduleRules(ScheduleType.FLEXIBLE, [
        { startTime: '09:00', endTime: '17:00' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects endTime <= startTime', () => {
    expect(() =>
      validateScheduleRules(ScheduleType.WEEKLY, [
        { dayOfWeek: 1, startTime: '17:00', endTime: '09:00' },
      ]),
    ).toThrow(/endTime must be greater/);
  });

  it('rejects malformed time strings', () => {
    expect(() =>
      validateScheduleRules(ScheduleType.WEEKLY, [
        { dayOfWeek: 1, startTime: '9:00', endTime: '17:00' },
      ]),
    ).toThrow(/HH:MM/);
  });
});

describe('validateBookingQuestions', () => {
  it('requires options for SINGLE_CHOICE', () => {
    expect(() =>
      validateBookingQuestions([
        {
          questionText: 'Color?',
          questionType: QuestionType.SINGLE_CHOICE,
          options: [],
        },
      ]),
    ).toThrow(/non-empty array/);
  });

  it('strips options for non-choice question types', () => {
    const result = validateBookingQuestions([
      {
        questionText: 'Symptoms?',
        questionType: QuestionType.TEXT,
        options: ['ignored'],
      },
    ]);
    expect(result[0].options).toBeNull();
  });

  it('defaults displayOrder to array index', () => {
    const result = validateBookingQuestions([
      { questionText: 'A', questionType: QuestionType.TEXT },
      { questionText: 'B', questionType: QuestionType.TEXT },
    ]);
    expect(result.map((q) => q.displayOrder)).toEqual([0, 1]);
  });
});
