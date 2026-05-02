import { BadRequestException } from '@nestjs/common';
import {
  AssignmentMode,
  DurationMode,
  EntityType,
  QuestionType,
  ScheduleType,
} from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface AppointmentTypePolicyInput {
  entityType: EntityType;
  durationMode: DurationMode;
  durationMinutes?: number | null;
  minDurationMins?: number | null;
  maxDurationMins?: number | null;
  durationStepMins?: number | null;
  maxBookingsPerSlot?: number | null;
  manageCapacity?: boolean | null;
  manualConfirmation?: boolean | null;
  advancePaymentEnabled?: boolean | null;
  advancePaymentAmount?: number | string | null;
  assignmentMode?: AssignmentMode | null;
  cancellationAllowed?: boolean | null;
  cancellationWindowHours?: number | null;
  rescheduleAllowed?: boolean | null;
  rescheduleWindowHours?: number | null;
  maxReschedulesAllowed?: number | null;
}

export interface NormalizedPolicy {
  durationMinutes: number | null;
  minDurationMins: number | null;
  maxDurationMins: number | null;
  durationStepMins: number | null;
  maxBookingsPerSlot: number;
  manageCapacity: boolean;
  manualConfirmation: boolean;
  advancePaymentEnabled: boolean;
  advancePaymentAmount: number | null;
  cancellationAllowed: boolean;
  cancellationWindowHours: number | null;
  rescheduleAllowed: boolean;
  rescheduleWindowHours: number | null;
  maxReschedulesAllowed: number | null;
}

/**
 * Cross-field policy validation for appointment types. Mirrors PRD §4.1.
 * Returns the normalized values (irrelevant fields nulled / coerced) so the
 * caller can persist them directly without redundant null-checks.
 */
export function validateAppointmentTypePolicy(
  input: AppointmentTypePolicyInput,
): NormalizedPolicy {
  // Duration
  let durationMinutes: number | null = null;
  let minDurationMins: number | null = null;
  let maxDurationMins: number | null = null;
  let durationStepMins: number | null = null;

  if (input.durationMode === DurationMode.FIXED) {
    if (!input.durationMinutes || input.durationMinutes <= 0) {
      throw new BadRequestException(
        'durationMinutes is required and must be > 0 when durationMode=FIXED',
      );
    }
    durationMinutes = input.durationMinutes;
  } else {
    const min = input.minDurationMins ?? 0;
    const max = input.maxDurationMins ?? 0;
    const step = input.durationStepMins ?? 0;
    if (min <= 0 || max <= 0 || step <= 0) {
      throw new BadRequestException(
        'minDurationMins, maxDurationMins, and durationStepMins are required and must be > 0 when durationMode=VARIABLE',
      );
    }
    if (min > max) {
      throw new BadRequestException(
        'minDurationMins must be <= maxDurationMins',
      );
    }
    if ((max - min) % step !== 0) {
      throw new BadRequestException(
        'durationStepMins must evenly divide (maxDurationMins - minDurationMins)',
      );
    }
    minDurationMins = min;
    maxDurationMins = max;
    durationStepMins = step;
  }

  // Capacity
  const manageCapacity = input.manageCapacity === true;
  let maxBookingsPerSlot = input.maxBookingsPerSlot ?? 1;
  if (manageCapacity) {
    if (maxBookingsPerSlot < 2) {
      throw new BadRequestException(
        'maxBookingsPerSlot must be >= 2 when manageCapacity=true',
      );
    }
  } else {
    maxBookingsPerSlot = 1;
  }

  // Payment
  const advancePaymentEnabled = input.advancePaymentEnabled === true;
  let advancePaymentAmount: number | null = null;
  if (advancePaymentEnabled) {
    const amount =
      typeof input.advancePaymentAmount === 'string'
        ? Number(input.advancePaymentAmount)
        : (input.advancePaymentAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        'advancePaymentAmount must be > 0 when advancePaymentEnabled=true',
      );
    }
    advancePaymentAmount = amount;
  }

  // Cancellation
  const cancellationAllowed = input.cancellationAllowed !== false;
  let cancellationWindowHours: number | null = null;
  if (cancellationAllowed && input.cancellationWindowHours != null) {
    if (input.cancellationWindowHours < 0) {
      throw new BadRequestException('cancellationWindowHours must be >= 0');
    }
    cancellationWindowHours = input.cancellationWindowHours;
  }

  // Reschedule
  const rescheduleAllowed = input.rescheduleAllowed !== false;
  let rescheduleWindowHours: number | null = null;
  if (rescheduleAllowed && input.rescheduleWindowHours != null) {
    if (input.rescheduleWindowHours < 0) {
      throw new BadRequestException('rescheduleWindowHours must be >= 0');
    }
    rescheduleWindowHours = input.rescheduleWindowHours;
  }
  let maxReschedulesAllowed: number | null = null;
  if (rescheduleAllowed && input.maxReschedulesAllowed != null) {
    if (input.maxReschedulesAllowed < 0) {
      throw new BadRequestException('maxReschedulesAllowed must be >= 0');
    }
    maxReschedulesAllowed = input.maxReschedulesAllowed;
  }

  return {
    durationMinutes,
    minDurationMins,
    maxDurationMins,
    durationStepMins,
    maxBookingsPerSlot,
    manageCapacity,
    manualConfirmation: input.manualConfirmation === true,
    advancePaymentEnabled,
    advancePaymentAmount,
    cancellationAllowed,
    cancellationWindowHours,
    rescheduleAllowed,
    rescheduleWindowHours,
    maxReschedulesAllowed,
  };
}

export interface ScheduleRuleInput {
  dayOfWeek?: number | null;
  specificDate?: string | Date | null;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export interface NormalizedScheduleRule {
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function validateScheduleRules(
  scheduleType: ScheduleType,
  rules: ScheduleRuleInput[],
): NormalizedScheduleRule[] {
  return rules.map((rule, idx) => {
    if (!TIME_REGEX.test(rule.startTime) || !TIME_REGEX.test(rule.endTime)) {
      throw new BadRequestException(
        `schedule.rules[${idx}]: startTime and endTime must be HH:MM (24h)`,
      );
    }
    if (rule.endTime <= rule.startTime) {
      throw new BadRequestException(
        `schedule.rules[${idx}]: endTime must be greater than startTime`,
      );
    }

    if (scheduleType === ScheduleType.WEEKLY) {
      if (rule.dayOfWeek == null || rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
        throw new BadRequestException(
          `schedule.rules[${idx}]: dayOfWeek (0-6) is required for WEEKLY schedules`,
        );
      }
      if (rule.specificDate != null) {
        throw new BadRequestException(
          `schedule.rules[${idx}]: specificDate is not allowed for WEEKLY schedules`,
        );
      }
      return {
        dayOfWeek: rule.dayOfWeek,
        specificDate: null,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isAvailable: rule.isAvailable ?? true,
      };
    }

    // FLEXIBLE
    if (rule.specificDate == null) {
      throw new BadRequestException(
        `schedule.rules[${idx}]: specificDate is required for FLEXIBLE schedules`,
      );
    }
    if (rule.dayOfWeek != null) {
      throw new BadRequestException(
        `schedule.rules[${idx}]: dayOfWeek is not allowed for FLEXIBLE schedules`,
      );
    }
    const date =
      rule.specificDate instanceof Date
        ? rule.specificDate
        : new Date(rule.specificDate);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `schedule.rules[${idx}]: specificDate must be a valid date`,
      );
    }
    return {
      dayOfWeek: null,
      specificDate: date,
      startTime: rule.startTime,
      endTime: rule.endTime,
      isAvailable: rule.isAvailable ?? true,
    };
  });
}

export interface BookingQuestionInput {
  questionText: string;
  questionType: QuestionType;
  isRequired?: boolean;
  options?: string[] | null;
  displayOrder?: number;
}

export interface NormalizedBookingQuestion {
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: string[] | null;
  displayOrder: number;
}

export function validateBookingQuestions(
  questions: BookingQuestionInput[],
): NormalizedBookingQuestion[] {
  return questions.map((q, idx) => {
    const requiresOptions =
      q.questionType === QuestionType.SINGLE_CHOICE ||
      q.questionType === QuestionType.MULTIPLE_CHOICE;
    if (requiresOptions) {
      if (!Array.isArray(q.options) || q.options.length === 0) {
        throw new BadRequestException(
          `bookingQuestions[${idx}]: options must be a non-empty array for ${q.questionType}`,
        );
      }
    }
    return {
      questionText: q.questionText.trim(),
      questionType: q.questionType,
      isRequired: q.isRequired === true,
      options: requiresOptions ? q.options! : null,
      displayOrder: q.displayOrder ?? idx,
    };
  });
}
