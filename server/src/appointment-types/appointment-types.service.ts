import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentType,
  AppointmentTypeEntity,
  BookingQuestion,
  Prisma,
  Schedule,
  ScheduleRule,
} from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentTypeEntitiesService } from './appointment-type-entities.service';
import { BookingQuestionsService } from './booking-questions.service';
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto';
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto';
import { generateShareToken } from './helpers/share-token';
import { validateAppointmentTypePolicy } from './helpers/validate-appointment-type';
import { SchedulesService } from './schedules.service';
import { slugify, SLUG_REGEX } from '../utils/slug';

export interface AppointmentTypeWithRelations extends AppointmentType {
  entities: AppointmentTypeEntity[];
  schedules: (Schedule & { rules: ScheduleRule[] })[];
  bookingQuestions: BookingQuestion[];
}

const FULL_INCLUDE = {
  entities: true,
  schedules: { include: { rules: true } },
  bookingQuestions: { orderBy: { displayOrder: 'asc' } },
} as const;

@Injectable()
export class AppointmentTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly entities: AppointmentTypeEntitiesService,
    private readonly schedules: SchedulesService,
    private readonly bookingQuestions: BookingQuestionsService,
  ) {}

  async create(
    organiserId: string,
    input: CreateAppointmentTypeDto,
  ): Promise<AppointmentTypeWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const slug = await this.resolveSlug(org.id, input.name, input.slug);

    const policy = validateAppointmentTypePolicy({
      entityType: input.entityType,
      durationMode: input.durationMode,
      durationMinutes: input.durationMinutes,
      minDurationMins: input.minDurationMins,
      maxDurationMins: input.maxDurationMins,
      durationStepMins: input.durationStepMins,
      maxBookingsPerSlot: input.maxBookingsPerSlot,
      manageCapacity: input.manageCapacity,
      manualConfirmation: input.manualConfirmation,
      advancePaymentEnabled: input.advancePaymentEnabled,
      advancePaymentAmount: input.advancePaymentAmount,
      assignmentMode: input.assignmentMode,
      cancellationAllowed: input.cancellationAllowed,
      cancellationWindowHours: input.cancellationWindowHours,
      rescheduleAllowed: input.rescheduleAllowed,
      rescheduleWindowHours: input.rescheduleWindowHours,
      maxReschedulesAllowed: input.maxReschedulesAllowed,
    });

    await this.entities.verifyEntitiesForOrganization(
      org.id,
      input.entityType,
      input.entityIds,
    );

    const timezone = input.timezone ?? org.timezone;

    const id = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointmentType.create({
        data: {
          organizationId: org.id,
          name: input.name.trim(),
          slug,
          description: input.description,
          entityType: input.entityType,
          scheduleType: input.scheduleType,
          durationMode: input.durationMode,
          durationMinutes: policy.durationMinutes,
          minDurationMins: policy.minDurationMins,
          maxDurationMins: policy.maxDurationMins,
          durationStepMins: policy.durationStepMins,
          maxBookingsPerSlot: policy.maxBookingsPerSlot,
          manageCapacity: policy.manageCapacity,
          manualConfirmation: policy.manualConfirmation,
          advancePaymentEnabled: policy.advancePaymentEnabled,
          advancePaymentAmount: policy.advancePaymentAmount,
          assignmentMode: input.assignmentMode,
          cancellationAllowed: policy.cancellationAllowed,
          cancellationWindowHours: policy.cancellationWindowHours,
          rescheduleAllowed: policy.rescheduleAllowed,
          rescheduleWindowHours: policy.rescheduleWindowHours,
          maxReschedulesAllowed: policy.maxReschedulesAllowed,
        },
      });

      await this.entities.replaceEntities(
        created.id,
        input.entityType,
        input.entityIds,
        tx,
      );
      await this.schedules.replaceSchedule(
        created.id,
        input.scheduleType,
        timezone,
        input.scheduleRules,
        tx,
      );
      if (input.bookingQuestions && input.bookingQuestions.length > 0) {
        await this.bookingQuestions.replaceQuestions(
          created.id,
          input.bookingQuestions,
          tx,
        );
      }
      return created.id;
    });

    return this.findOneForOrganiser(organiserId, id);
  }

  async list(
    organiserId: string,
    published?: boolean,
  ): Promise<AppointmentType[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.appointmentType.findMany({
      where: {
        organizationId: org.id,
        ...(published === undefined ? {} : { isPublished: published }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOrganiser(
    organiserId: string,
    id: string,
  ): Promise<AppointmentTypeWithRelations> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const found = await this.prisma.appointmentType.findFirst({
      where: { id, organizationId: org.id },
      include: FULL_INCLUDE,
    });
    if (!found) throw new NotFoundException('Appointment type not found');
    return found;
  }

  async update(
    organiserId: string,
    id: string,
    input: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeWithRelations> {
    const existing = await this.findOneForOrganiser(organiserId, id);
    const org = await this.organizations.requireForOrganiser(organiserId);

    const bookingCount = await this.prisma.appointment.count({
      where: { appointmentTypeId: id },
    });
    if (bookingCount > 0) {
      if (input.entityType && input.entityType !== existing.entityType) {
        throw new ConflictException(
          'entityType cannot be changed after bookings exist',
        );
      }
      if (input.durationMode && input.durationMode !== existing.durationMode) {
        throw new ConflictException(
          'durationMode cannot be changed after bookings exist',
        );
      }
    }

    const slug =
      input.slug && input.slug !== existing.slug
        ? await this.resolveSlug(
            org.id,
            input.name ?? existing.name,
            input.slug,
            id,
          )
        : existing.slug;

    const merged = {
      entityType: input.entityType ?? existing.entityType,
      durationMode: input.durationMode ?? existing.durationMode,
      durationMinutes: input.durationMinutes ?? existing.durationMinutes,
      minDurationMins: input.minDurationMins ?? existing.minDurationMins,
      maxDurationMins: input.maxDurationMins ?? existing.maxDurationMins,
      durationStepMins: input.durationStepMins ?? existing.durationStepMins,
      maxBookingsPerSlot:
        input.maxBookingsPerSlot ?? existing.maxBookingsPerSlot,
      manageCapacity: input.manageCapacity ?? existing.manageCapacity,
      manualConfirmation:
        input.manualConfirmation ?? existing.manualConfirmation,
      advancePaymentEnabled:
        input.advancePaymentEnabled ?? existing.advancePaymentEnabled,
      advancePaymentAmount:
        input.advancePaymentAmount ??
        (existing.advancePaymentAmount
          ? Number(existing.advancePaymentAmount)
          : null),
      assignmentMode: input.assignmentMode ?? existing.assignmentMode,
      cancellationAllowed:
        input.cancellationAllowed ?? existing.cancellationAllowed,
      cancellationWindowHours:
        input.cancellationWindowHours ?? existing.cancellationWindowHours,
      rescheduleAllowed: input.rescheduleAllowed ?? existing.rescheduleAllowed,
      rescheduleWindowHours:
        input.rescheduleWindowHours ?? existing.rescheduleWindowHours,
      maxReschedulesAllowed:
        input.maxReschedulesAllowed ?? existing.maxReschedulesAllowed,
    };
    const policy = validateAppointmentTypePolicy(merged);

    await this.prisma.appointmentType.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        slug,
        description: input.description,
        entityType: merged.entityType,
        durationMode: merged.durationMode,
        durationMinutes: policy.durationMinutes,
        minDurationMins: policy.minDurationMins,
        maxDurationMins: policy.maxDurationMins,
        durationStepMins: policy.durationStepMins,
        maxBookingsPerSlot: policy.maxBookingsPerSlot,
        manageCapacity: policy.manageCapacity,
        manualConfirmation: policy.manualConfirmation,
        advancePaymentEnabled: policy.advancePaymentEnabled,
        advancePaymentAmount: policy.advancePaymentAmount,
        assignmentMode: merged.assignmentMode,
        cancellationAllowed: policy.cancellationAllowed,
        cancellationWindowHours: policy.cancellationWindowHours,
        rescheduleAllowed: policy.rescheduleAllowed,
        rescheduleWindowHours: policy.rescheduleWindowHours,
        maxReschedulesAllowed: policy.maxReschedulesAllowed,
      },
    });

    return this.findOneForOrganiser(organiserId, id);
  }

  async remove(organiserId: string, id: string): Promise<void> {
    await this.findOneForOrganiser(organiserId, id);
    const bookingCount = await this.prisma.appointment.count({
      where: { appointmentTypeId: id },
    });
    if (bookingCount > 0) {
      throw new ConflictException(
        'Appointment type has bookings; unpublish it instead of deleting',
      );
    }
    await this.prisma.appointmentType.delete({ where: { id } });
  }

  async publish(
    organiserId: string,
    id: string,
  ): Promise<AppointmentTypeWithRelations> {
    const at = await this.findOneForOrganiser(organiserId, id);
    if (at.entities.length === 0) {
      throw new BadRequestException(
        'Cannot publish: at least one entity must be assigned',
      );
    }
    const totalRules = at.schedules.reduce((sum, s) => sum + s.rules.length, 0);
    if (totalRules === 0) {
      throw new BadRequestException(
        'Cannot publish: at least one schedule rule is required',
      );
    }
    await this.prisma.appointmentType.update({
      where: { id },
      data: {
        isPublished: true,
        shareToken: at.shareToken ?? generateShareToken(),
      },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  async unpublish(
    organiserId: string,
    id: string,
  ): Promise<AppointmentTypeWithRelations> {
    await this.findOneForOrganiser(organiserId, id);
    await this.prisma.appointmentType.update({
      where: { id },
      data: { isPublished: false },
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  async regenerateShareToken(
    organiserId: string,
    id: string,
  ): Promise<{ shareToken: string }> {
    await this.findOneForOrganiser(organiserId, id);
    const updated = await this.prisma.appointmentType.update({
      where: { id },
      data: { shareToken: generateShareToken() },
      select: { shareToken: true },
    });
    return { shareToken: updated.shareToken! };
  }

  /** Replace entity assignments in a transaction (validates org + type). */
  async setEntities(
    organiserId: string,
    id: string,
    entityIds: string[],
  ): Promise<AppointmentTypeWithRelations> {
    const at = await this.findOneForOrganiser(organiserId, id);
    const org = await this.organizations.requireForOrganiser(organiserId);
    await this.entities.verifyEntitiesForOrganization(
      org.id,
      at.entityType,
      entityIds,
    );
    await this.prisma.$transaction(async (tx) => {
      await this.entities.replaceEntities(id, at.entityType, entityIds, tx);
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  /** Replace schedule (and all rules) in a transaction. */
  async setSchedule(
    organiserId: string,
    id: string,
    scheduleType: import('@prisma/client').ScheduleType,
    timezone: string | undefined,
    rules: import('./helpers/validate-appointment-type').ScheduleRuleInput[],
  ): Promise<AppointmentTypeWithRelations> {
    const at = await this.findOneForOrganiser(organiserId, id);
    const org = await this.organizations.requireForOrganiser(organiserId);
    const tz = timezone ?? at.schedules[0]?.timezone ?? org.timezone;

    await this.prisma.$transaction(async (tx) => {
      await tx.appointmentType.update({
        where: { id },
        data: { scheduleType },
      });
      await this.schedules.replaceSchedule(id, scheduleType, tz, rules, tx);
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  /** Replace booking questions in a transaction. */
  async setBookingQuestions(
    organiserId: string,
    id: string,
    questions: import('./helpers/validate-appointment-type').BookingQuestionInput[],
  ): Promise<AppointmentTypeWithRelations> {
    await this.findOneForOrganiser(organiserId, id);
    await this.prisma.$transaction(async (tx) => {
      await this.bookingQuestions.replaceQuestions(id, questions, tx);
    });
    return this.findOneForOrganiser(organiserId, id);
  }

  // -------------------------------------------------------------------------
  // Public (customer-facing) reads
  // -------------------------------------------------------------------------

  publicList(): Promise<AppointmentType[]> {
    return this.prisma.appointmentType.findMany({
      where: this.publicWhereClause(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async publicFindById(id: string): Promise<AppointmentTypeWithRelations> {
    const found = await this.prisma.appointmentType.findFirst({
      where: { id, ...this.publicWhereClause() },
      include: FULL_INCLUDE,
    });
    if (!found) throw new NotFoundException('Appointment type not found');
    return found;
  }

  async publicFindByShareToken(
    token: string,
  ): Promise<AppointmentTypeWithRelations> {
    const found = await this.prisma.appointmentType.findFirst({
      where: {
        shareToken: token,
        organization: { approvalStatus: 'APPROVED', isActive: true },
      },
      include: FULL_INCLUDE,
    });
    if (!found) throw new NotFoundException('Appointment type not found');
    return found;
  }

  private publicWhereClause(): Prisma.AppointmentTypeWhereInput {
    return {
      isPublished: true,
      organization: { approvalStatus: 'APPROVED', isActive: true },
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async resolveSlug(
    organizationId: string,
    name: string,
    requestedSlug: string | undefined,
    excludeId?: string,
  ): Promise<string> {
    const base = (requestedSlug ?? slugify(name)).toLowerCase();
    if (!base || !SLUG_REGEX.test(base)) {
      throw new BadRequestException(
        'Could not derive a valid slug from name; supply slug explicitly',
      );
    }
    const conflict = await this.prisma.appointmentType.findFirst({
      where: {
        organizationId,
        slug: base,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        `Slug "${base}" already exists in this organization`,
      );
    }
    return base;
  }
}
