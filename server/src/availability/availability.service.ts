import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentTypeVisibility,
  AssignmentMode,
  DurationMode,
  EntityType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimeRange } from './helpers/range';
import { resolveScheduleWindowsForDate } from './helpers/schedule-windows';
import { dayOfWeekInZone, isIsoDate, wallTimeToUtc } from './helpers/time-zone';
import {
  BusyRange,
  computeFixedSlots,
  FixedSlot,
  SlotState,
} from './strategies/fixed.strategy';
import {
  computeVariableOpenRanges,
  enumerateValidDurations,
  VariableOpenRange,
} from './strategies/variable.strategy';

const APPOINTMENT_TYPE_INCLUDE = {
  entities: true,
  schedules: { include: { rules: true } },
} satisfies Prisma.AppointmentTypeInclude;

type LoadedAppointmentType = Prisma.AppointmentTypeGetPayload<{
  include: typeof APPOINTMENT_TYPE_INCLUDE;
}>;

type StaffAvailabilityOverride = {
  appointmentTypeId: string;
  timezone?: string;
  weeklyRules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  dateExceptions?: Array<{ date: string; reason?: string }>;
};

export interface AvailabilityRequest {
  appointmentTypeId: string;
  /** ISO calendar date (YYYY-MM-DD) in the schedule's timezone. */
  date: string;
  /** Optional explicit entity scope. Required when assignmentMode=MANUAL. */
  entityId?: string;
  /** Optional override TZ; defaults to the schedule's stored timezone. */
  timezone?: string;
}

export interface FixedAvailabilityResponse {
  appointmentTypeId: string;
  date: string;
  durationMode: 'FIXED';
  durationMinutes: number;
  timezone: string;
  entityId: string | null;
  /**
   * `manualConfirmation` is included so the client can pick the right CTA
   * ("Book now" vs "Request approval") and interpret per-slot `state`.
   */
  manualConfirmation: boolean;
  slots: {
    startTime: string;
    endTime: string;
    remainingCapacity: number;
    confirmedCount: number;
    pendingCount: number;
    state: SlotState;
  }[];
}

export interface VariableAvailabilityResponse {
  appointmentTypeId: string;
  date: string;
  durationMode: 'VARIABLE';
  minDurationMins: number;
  maxDurationMins: number;
  durationStepMins: number;
  timezone: string;
  entityId: string | null;
  openRanges: { startTime: string; endTime: string; durationMinutes: number }[];
}

export type AvailabilityResponse =
  | FixedAvailabilityResponse
  | VariableAvailabilityResponse;

export interface DurationOptionsRequest {
  appointmentTypeId: string;
  date: string;
  startTime: string;
  entityId?: string;
  timezone?: string;
}

export interface DurationOptionsResponse {
  startTime: string;
  durations: number[];
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(
    req: AvailabilityRequest,
  ): Promise<AvailabilityResponse> {
    if (!isIsoDate(req.date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const at = await this.loadAppointmentType(req.appointmentTypeId);
    const tz = this.resolveTimezone(at, req.timezone);
    const entityIds = await this.resolveEntityScope(at, req.entityId);

    const orgWindows = resolveScheduleWindowsForDate(
      at.scheduleType,
      at.schedules.flatMap((s) => s.rules),
      req.date,
      tz,
    );
    const windows = await this.resolveWindowsForScope(at, req, tz, orgWindows);

    const dayStartUtc = wallTimeToUtc(req.date, '00:00', tz);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);
    const bufferMs = (at.bufferMinutes ?? 0) * 60_000;
    const queryStart = new Date(dayStartUtc.getTime() - bufferMs);
    const queryEnd = new Date(dayEndUtc.getTime() + bufferMs);

    const [appointments, locks] = await Promise.all([
      this.fetchOverlappingAppointments(at, entityIds, queryStart, queryEnd),
      this.fetchActiveLocks(at, entityIds, queryStart, queryEnd),
    ]);

    if (at.durationMode === DurationMode.FIXED) {
      return this.buildFixedResponse(at, req, tz, windows, appointments, locks);
    }
    return this.buildVariableResponse(
      at,
      req,
      tz,
      windows,
      appointments,
      locks,
    );
  }

  /**
   * For a chosen start time in variable mode, return the list of valid
   * durations the customer may pick (PRD §5.2 step 6/7).
   */
  async getDurationOptions(
    req: DurationOptionsRequest,
  ): Promise<DurationOptionsResponse> {
    const at = await this.loadAppointmentType(req.appointmentTypeId);
    if (at.durationMode !== DurationMode.VARIABLE) {
      throw new BadRequestException(
        'Duration options only apply to VARIABLE appointment types',
      );
    }
    const availability = (await this.getAvailability({
      appointmentTypeId: req.appointmentTypeId,
      date: req.date,
      entityId: req.entityId,
      timezone: req.timezone,
    })) as VariableAvailabilityResponse;

    const startInstant = new Date(req.startTime);
    if (Number.isNaN(startInstant.getTime())) {
      throw new BadRequestException(
        'startTime must be a valid ISO 8601 instant',
      );
    }

    const containing = availability.openRanges.find((r) => {
      const rs = new Date(r.startTime).getTime();
      const re = new Date(r.endTime).getTime();
      return rs <= startInstant.getTime() && startInstant.getTime() < re;
    });
    if (!containing) {
      return { startTime: req.startTime, durations: [] };
    }
    const remainingMins = Math.floor(
      (new Date(containing.endTime).getTime() - startInstant.getTime()) /
        60_000,
    );
    const durations = enumerateValidDurations(
      remainingMins,
      at.minDurationMins!,
      at.maxDurationMins!,
      at.durationStepMins!,
    );
    return { startTime: req.startTime, durations };
  }

  // -------------------------------------------------------------------------
  // Internal: response building
  // -------------------------------------------------------------------------

  private buildFixedResponse(
    at: LoadedAppointmentType,
    req: AvailabilityRequest,
    tz: string,
    windows: TimeRange[],
    appointments: {
      startTime: Date;
      endTime: Date;
      capacityBooked: number;
      status: AppointmentStatus;
    }[],
    locks: { slotStart: Date; slotEnd: Date }[],
  ): FixedAvailabilityResponse {
    if (at.durationMinutes == null) {
      throw new BadRequestException(
        'Appointment type is missing durationMinutes',
      );
    }
    const busy: BusyRange[] = [
      ...appointments.map((a) => {
        // For manual-approval types, PENDING is a competing approval request:
        // it must be visible to other customers as `pending` (yellow) but
        // does NOT block the slot. For non-manual types PENDING is a real
        // hold (advance payment, organiser-created), so it counts as
        // confirmed for blocking purposes — preserves pre-existing semantics.
        const isPending = a.status === AppointmentStatus.PENDING;
        const showAsPending = at.manualConfirmation && isPending;
        return {
          start: this.withBuffer(a.startTime, at.bufferMinutes ?? 0, 'start'),
          end: this.withBuffer(a.endTime, at.bufferMinutes ?? 0, 'end'),
          confirmedCapacity: showAsPending ? 0 : a.capacityBooked,
          pendingCapacity: showAsPending ? a.capacityBooked : 0,
        };
      }),
      ...locks.map((l) => ({
        start: this.withBuffer(l.slotStart, at.bufferMinutes ?? 0, 'start'),
        end: this.withBuffer(l.slotEnd, at.bufferMinutes ?? 0, 'end'),
        confirmedCapacity: 1,
        pendingCapacity: 0,
      })),
    ];
    const slots: FixedSlot[] = computeFixedSlots({
      windows,
      busy,
      durationMinutes: at.durationMinutes,
      maxBookingsPerSlot: at.maxBookingsPerSlot,
    });
    return {
      appointmentTypeId: at.id,
      date: req.date,
      durationMode: 'FIXED',
      durationMinutes: at.durationMinutes,
      timezone: tz,
      entityId: req.entityId ?? null,
      manualConfirmation: at.manualConfirmation,
      slots: slots.map((s) => ({
        startTime: s.start.toISOString(),
        endTime: s.end.toISOString(),
        remainingCapacity: s.remainingCapacity,
        confirmedCount: s.confirmedCount,
        pendingCount: s.pendingCount,
        state: s.state,
      })),
    };
  }

  private buildVariableResponse(
    at: LoadedAppointmentType,
    req: AvailabilityRequest,
    tz: string,
    windows: TimeRange[],
    appointments: {
      startTime: Date;
      endTime: Date;
      status: AppointmentStatus;
    }[],
    locks: { slotStart: Date; slotEnd: Date }[],
  ): VariableAvailabilityResponse {
    if (
      at.minDurationMins == null ||
      at.maxDurationMins == null ||
      at.durationStepMins == null
    ) {
      throw new BadRequestException(
        'Appointment type is missing variable-duration policy',
      );
    }
    const busy = [
      ...appointments.map((a) => ({
        start: this.withBuffer(a.startTime, at.bufferMinutes ?? 0, 'start'),
        end: this.withBuffer(a.endTime, at.bufferMinutes ?? 0, 'end'),
      })),
      ...locks.map((l) => ({
        start: this.withBuffer(l.slotStart, at.bufferMinutes ?? 0, 'start'),
        end: this.withBuffer(l.slotEnd, at.bufferMinutes ?? 0, 'end'),
      })),
    ];
    const ranges: VariableOpenRange[] = computeVariableOpenRanges({
      windows,
      busy,
      minDurationMins: at.minDurationMins,
    });
    return {
      appointmentTypeId: at.id,
      date: req.date,
      durationMode: 'VARIABLE',
      minDurationMins: at.minDurationMins,
      maxDurationMins: at.maxDurationMins,
      durationStepMins: at.durationStepMins,
      timezone: tz,
      entityId: req.entityId ?? null,
      openRanges: ranges.map((r) => ({
        startTime: r.start.toISOString(),
        endTime: r.end.toISOString(),
        durationMinutes: r.durationMinutes,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Internal: data loading
  // -------------------------------------------------------------------------

  private async loadAppointmentType(
    id: string,
  ): Promise<LoadedAppointmentType> {
    const at = await this.prisma.appointmentType.findFirst({
      where: {
        id,
        visibility: { not: AppointmentTypeVisibility.ARCHIVED },
        organization: { approvalStatus: 'APPROVED', isActive: true },
      },
      include: APPOINTMENT_TYPE_INCLUDE,
    });
    if (!at) throw new NotFoundException('Appointment type not found');
    return at;
  }

  private resolveTimezone(
    at: LoadedAppointmentType,
    override?: string,
  ): string {
    return override ?? at.schedules[0]?.timezone ?? 'UTC';
  }

  /**
   * Returns the entity ids whose calendars participate in this availability
   * computation. MANUAL mode requires the caller to specify exactly one
   * entity. AUTO mode collapses across all linked entities.
   */
  private async resolveEntityScope(
    at: LoadedAppointmentType,
    requestedEntityId?: string,
  ): Promise<string[]> {
    const linked = at.entities
      .map((e) =>
        at.entityType === EntityType.PERSON
          ? e.bookablePersonId
          : e.bookableResourceId,
      )
      .filter((x): x is string => x != null);

    if (linked.length === 0) {
      throw new BadRequestException(
        'Appointment type has no linked entities; nothing is bookable',
      );
    }

    const activeLinked =
      at.entityType === EntityType.PERSON
        ? (
            await this.prisma.bookablePerson.findMany({
              where: { id: { in: linked }, isActive: true },
              select: { id: true },
            })
          ).map((p) => p.id)
        : (
            await this.prisma.bookableResource.findMany({
              where: { id: { in: linked }, isActive: true },
              select: { id: true },
            })
          ).map((r) => r.id);

    if (activeLinked.length === 0) {
      throw new BadRequestException(
        'No active entities are linked to this appointment type',
      );
    }

    if (requestedEntityId) {
      if (!activeLinked.includes(requestedEntityId)) {
        throw new BadRequestException(
          'entityId is not linked to this appointment type or is inactive',
        );
      }
      return [requestedEntityId];
    }

    if (at.assignmentMode === AssignmentMode.MANUAL) {
      throw new BadRequestException(
        'entityId is required for MANUAL assignment',
      );
    }
    return activeLinked;
  }

  private async resolveWindowsForScope(
    at: LoadedAppointmentType,
    req: AvailabilityRequest,
    tz: string,
    orgWindows: TimeRange[],
  ): Promise<TimeRange[]> {
    if (at.entityType !== EntityType.PERSON || !req.entityId) {
      return orgWindows;
    }

    const person = await this.prisma.bookablePerson.findFirst({
      where: {
        id: req.entityId,
        isActive: true,
      },
      select: { availabilityOverrides: true },
    });

    if (!person) return orgWindows;

    const overrides = this.parseStaffOverrides(person.availabilityOverrides);
    const override = overrides.find((o) => o.appointmentTypeId === at.id);
    if (!override) return orgWindows;

    if (
      override.dateExceptions?.some(
        (exception) => exception.date.slice(0, 10) === req.date,
      )
    ) {
      return [];
    }

    const overrideTz = override.timezone ?? tz;
    const day = dayOfWeekInZone(req.date, overrideTz);
    const windows = override.weeklyRules
      .filter((rule) => rule.dayOfWeek === day)
      .map((rule) => ({
        start: wallTimeToUtc(req.date, rule.startTime, overrideTz),
        end: wallTimeToUtc(req.date, rule.endTime, overrideTz),
      }))
      .filter((range) => range.end.getTime() > range.start.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    return windows.length > 0 ? windows : orgWindows;
  }

  private parseStaffOverrides(
    value: Prisma.JsonValue | null,
  ): StaffAvailabilityOverride[] {
    if (!Array.isArray(value)) return [];
    const overrides: StaffAvailabilityOverride[] = [];

    for (const item of value) {
      if (item == null || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }
      const entry = item as Record<string, Prisma.JsonValue>;
      if (typeof entry.appointmentTypeId !== 'string') continue;
      if (!Array.isArray(entry.weeklyRules)) continue;

      const weeklyRules: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      }> = [];
      for (const ruleItem of entry.weeklyRules) {
        if (
          ruleItem == null ||
          typeof ruleItem !== 'object' ||
          Array.isArray(ruleItem)
        ) {
          continue;
        }
        const weeklyRule = ruleItem as Record<string, Prisma.JsonValue>;
        if (
          typeof weeklyRule.dayOfWeek !== 'number' ||
          typeof weeklyRule.startTime !== 'string' ||
          typeof weeklyRule.endTime !== 'string'
        ) {
          continue;
        }
        weeklyRules.push({
          dayOfWeek: weeklyRule.dayOfWeek,
          startTime: weeklyRule.startTime,
          endTime: weeklyRule.endTime,
        });
      }
      if (weeklyRules.length === 0) continue;

      const dateExceptionsRaw = Array.isArray(entry.dateExceptions)
        ? entry.dateExceptions
        : [];
      const dateExceptions: Array<{ date: string; reason?: string }> = [];
      for (const exItem of dateExceptionsRaw) {
        if (
          exItem == null ||
          typeof exItem !== 'object' ||
          Array.isArray(exItem)
        ) {
          continue;
        }
        const exception = exItem as Record<string, Prisma.JsonValue>;
        if (typeof exception.date !== 'string') continue;
        const output: { date: string; reason?: string } = {
          date: exception.date,
        };
        if (typeof exception.reason === 'string') {
          output.reason = exception.reason;
        }
        dateExceptions.push(output);
      }

      const override: StaffAvailabilityOverride = {
        appointmentTypeId: entry.appointmentTypeId,
        weeklyRules,
      };
      if (typeof entry.timezone === 'string') {
        override.timezone = entry.timezone;
      }
      if (dateExceptions.length > 0) {
        override.dateExceptions = dateExceptions;
      }
      overrides.push(override);
    }

    return overrides;
  }

  private fetchOverlappingAppointments(
    at: LoadedAppointmentType,
    entityIds: string[],
    dayStart: Date,
    dayEnd: Date,
  ) {
    const entityFilter =
      at.entityType === EntityType.PERSON
        ? { bookablePersonId: { in: entityIds } }
        : { bookableResourceId: { in: entityIds } };
    return this.prisma.appointment.findMany({
      where: {
        appointmentTypeId: at.id,
        ...entityFilter,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: {
        startTime: true,
        endTime: true,
        capacityBooked: true,
        status: true,
      },
    });
  }

  private fetchActiveLocks(
    at: LoadedAppointmentType,
    entityIds: string[],
    dayStart: Date,
    dayEnd: Date,
  ) {
    const entityFilter =
      at.entityType === EntityType.PERSON
        ? { bookablePersonId: { in: entityIds } }
        : { bookableResourceId: { in: entityIds } };
    return this.prisma.slotLock.findMany({
      where: {
        appointmentTypeId: at.id,
        ...entityFilter,
        expiresAt: { gt: new Date() },
        slotStart: { lt: dayEnd },
        slotEnd: { gt: dayStart },
      },
      select: { slotStart: true, slotEnd: true },
    });
  }

  private withBuffer(
    value: Date,
    minutes: number,
    side: 'start' | 'end',
  ): Date {
    if (minutes <= 0) return value;
    const delta = minutes * 60_000 * (side === 'start' ? -1 : 1);
    return new Date(value.getTime() + delta);
  }
}
