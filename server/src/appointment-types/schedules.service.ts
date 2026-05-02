import { Injectable } from '@nestjs/common';
import { Prisma, ScheduleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NormalizedScheduleRule,
  ScheduleRuleInput,
  validateScheduleRules,
} from './helpers/validate-appointment-type';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replace the schedule (and all rules) for an appointment type. The
   * appointment_types.scheduleType column is the source of truth for the
   * mode; the per-Schedule row mirrors it for convenience.
   */
  async replaceSchedule(
    appointmentTypeId: string,
    scheduleType: ScheduleType,
    timezone: string,
    rules: ScheduleRuleInput[],
    tx: PrismaTx,
  ): Promise<NormalizedScheduleRule[]> {
    const normalizedRules = validateScheduleRules(scheduleType, rules);

    await tx.schedule.deleteMany({ where: { appointmentTypeId } });

    const schedule = await tx.schedule.create({
      data: { appointmentTypeId, scheduleType, timezone },
    });

    if (normalizedRules.length > 0) {
      await tx.scheduleRule.createMany({
        data: normalizedRules.map((r) => ({
          scheduleId: schedule.id,
          dayOfWeek: r.dayOfWeek,
          specificDate: r.specificDate,
          startTime: r.startTime,
          endTime: r.endTime,
          isAvailable: r.isAvailable,
        })),
      });
    }
    return normalizedRules;
  }
}
