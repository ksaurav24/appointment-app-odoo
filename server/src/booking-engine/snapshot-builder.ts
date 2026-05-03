import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ENGINE_APPOINTMENT_TYPE_INCLUDE = {
  entities: true,
  schedules: { include: { rules: true } },
} satisfies Prisma.AppointmentTypeInclude;

export type EngineAppointmentType = Prisma.AppointmentTypeGetPayload<{
  include: typeof ENGINE_APPOINTMENT_TYPE_INCLUDE;
}>;

type EngineSnapshotClient = Prisma.TransactionClient | PrismaService;

export interface EngineAvailabilitySnapshot {
  appointmentType: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: string | null;
    entityType: string;
    scheduleType: string;
    durationMode: string;
    durationMinutes: number | null;
    minDurationMins: number | null;
    maxDurationMins: number | null;
    durationStepMins: number | null;
    maxBookingsPerSlot: number;
    manageCapacity: boolean;
    manualConfirmation: boolean;
    advancePaymentEnabled: boolean;
    advancePaymentAmount: number | null;
    assignmentMode: string;
    cancellationAllowed: boolean;
    cancellationWindowHours: number | null;
    rescheduleAllowed: boolean;
    rescheduleWindowHours: number | null;
    maxReschedulesAllowed: number | null;
    isPublished: boolean;
    shareToken: string | null;
    createdAt: string;
    updatedAt: string;
  };
  schedule: {
    id: bigint;
    appointmentTypeId: string;
    scheduleType: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    rules: {
      id: bigint;
      scheduleId: bigint;
      dayOfWeek: number | null;
      specificDate: string | null;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[];
  };
  entityLinks: {
    id: bigint;
    appointmentTypeId: string;
    bookablePersonId: string | null;
    bookableResourceId: string | null;
    createdAt: string;
  }[];
  resources: {
    id: string;
    organizationId: string;
    name: string;
    resourceType: string;
    description: string | null;
    capacity: number;
    location: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  appointments: {
    id: bigint;
    appointmentTypeId: string;
    organizationId: string;
    customerId: string;
    bookablePersonId: string | null;
    bookableResourceId: string | null;
    startTime: string;
    endTime: string;
    durationMins: number;
    status: string;
    rescheduleCount: number;
    capacityBooked: number;
    totalAmount: number | null;
    paymentStatus: string;
    cancellationReason: string | null;
    cancelledAt: string | null;
    confirmationCode: string;
    createdAt: string;
    updatedAt: string;
  }[];
  activeHolds: {
    id: bigint;
    appointmentTypeId: string;
    customerId: string;
    bookablePersonId: string | null;
    bookableResourceId: string | null;
    slotStart: string;
    slotEnd: string;
    expiresAt: string;
    createdAt: string;
  }[];
}

interface BuildEngineSnapshotOptions {
  now?: Date;
  excludeAppointmentId?: bigint;
}

export async function buildEngineSnapshot(
  client: EngineSnapshotClient,
  appointmentType: EngineAppointmentType,
  range: { start: Date; end: Date },
  options: BuildEngineSnapshotOptions = {},
): Promise<EngineAvailabilitySnapshot> {
  const schedule = appointmentType.schedules[0];
  if (!schedule) {
    throw new BadRequestException('Appointment type has no schedule');
  }

  const now = options.now ?? new Date();
  const linkedResourceIds = appointmentType.entities
    .map((entity) => entity.bookableResourceId)
    .filter((resourceId): resourceId is string => resourceId != null);

  const [resources, appointments, activeHolds] = await Promise.all([
    linkedResourceIds.length === 0
      ? Promise.resolve([])
      : client.bookableResource.findMany({
          where: { id: { in: linkedResourceIds } },
          select: {
            id: true,
            organizationId: true,
            name: true,
            resourceType: true,
            description: true,
            capacity: true,
            location: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
    client.appointment.findMany({
      where: {
        appointmentTypeId: appointmentType.id,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lt: range.end },
        endTime: { gt: range.start },
        ...(options.excludeAppointmentId != null
          ? { id: { not: options.excludeAppointmentId } }
          : {}),
      },
      select: {
        id: true,
        appointmentTypeId: true,
        organizationId: true,
        customerId: true,
        bookablePersonId: true,
        bookableResourceId: true,
        startTime: true,
        endTime: true,
        durationMins: true,
        status: true,
        rescheduleCount: true,
        capacityBooked: true,
        totalAmount: true,
        paymentStatus: true,
        cancellationReason: true,
        cancelledAt: true,
        confirmationCode: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    client.slotLock.findMany({
      where: {
        appointmentTypeId: appointmentType.id,
        expiresAt: { gt: now },
        slotStart: { lt: range.end },
        slotEnd: { gt: range.start },
      },
      select: {
        id: true,
        appointmentTypeId: true,
        customerId: true,
        bookablePersonId: true,
        bookableResourceId: true,
        slotStart: true,
        slotEnd: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    appointmentType: {
      id: appointmentType.id,
      organizationId: appointmentType.organizationId,
      name: appointmentType.name,
      slug: appointmentType.slug,
      description: appointmentType.description,
      entityType: appointmentType.entityType,
      scheduleType: appointmentType.scheduleType,
      durationMode: appointmentType.durationMode,
      durationMinutes: appointmentType.durationMinutes,
      minDurationMins: appointmentType.minDurationMins,
      maxDurationMins: appointmentType.maxDurationMins,
      durationStepMins: appointmentType.durationStepMins,
      maxBookingsPerSlot: appointmentType.maxBookingsPerSlot,
      manageCapacity: appointmentType.manageCapacity,
      manualConfirmation: appointmentType.manualConfirmation,
      advancePaymentEnabled: appointmentType.advancePaymentEnabled,
      advancePaymentAmount:
        appointmentType.advancePaymentAmount == null
          ? null
          : Number(appointmentType.advancePaymentAmount),
      assignmentMode: appointmentType.assignmentMode,
      cancellationAllowed: appointmentType.cancellationAllowed,
      cancellationWindowHours: appointmentType.cancellationWindowHours,
      rescheduleAllowed: appointmentType.rescheduleAllowed,
      rescheduleWindowHours: appointmentType.rescheduleWindowHours,
      maxReschedulesAllowed: appointmentType.maxReschedulesAllowed,
      isPublished: appointmentType.isPublished,
      shareToken: appointmentType.shareToken,
      createdAt: appointmentType.createdAt.toISOString(),
      updatedAt: appointmentType.updatedAt.toISOString(),
    },
    schedule: {
      id: schedule.id,
      appointmentTypeId: schedule.appointmentTypeId,
      scheduleType: schedule.scheduleType,
      timezone: schedule.timezone,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      rules: schedule.rules.map((rule) => ({
        id: rule.id,
        scheduleId: rule.scheduleId,
        dayOfWeek: rule.dayOfWeek,
        specificDate: rule.specificDate
          ? rule.specificDate.toISOString().slice(0, 10)
          : null,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isAvailable: rule.isAvailable,
      })),
    },
    entityLinks: appointmentType.entities.map((entity) => ({
      id: entity.id,
      appointmentTypeId: entity.appointmentTypeId,
      bookablePersonId: entity.bookablePersonId,
      bookableResourceId: entity.bookableResourceId,
      createdAt: entity.createdAt.toISOString(),
    })),
    resources: resources.map((resource) => ({
      id: resource.id,
      organizationId: resource.organizationId,
      name: resource.name,
      resourceType: resource.resourceType ?? '',
      description: resource.description,
      capacity: resource.capacity,
      location: resource.location,
      isActive: resource.isActive,
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    })),
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      appointmentTypeId: appointment.appointmentTypeId,
      organizationId: appointment.organizationId,
      customerId: appointment.customerId,
      bookablePersonId: appointment.bookablePersonId,
      bookableResourceId: appointment.bookableResourceId,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      durationMins: appointment.durationMins,
      status: appointment.status,
      rescheduleCount: appointment.rescheduleCount,
      capacityBooked: appointment.capacityBooked,
      totalAmount:
        appointment.totalAmount == null ? null : Number(appointment.totalAmount),
      paymentStatus: appointment.paymentStatus,
      cancellationReason: appointment.cancellationReason,
      cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
      confirmationCode: appointment.confirmationCode,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    })),
    activeHolds: activeHolds.map((hold) => ({
      id: hold.id,
      appointmentTypeId: hold.appointmentTypeId,
      customerId: hold.customerId,
      bookablePersonId: hold.bookablePersonId,
      bookableResourceId: hold.bookableResourceId,
      slotStart: hold.slotStart.toISOString(),
      slotEnd: hold.slotEnd.toISOString(),
      expiresAt: hold.expiresAt.toISOString(),
      createdAt: hold.createdAt.toISOString(),
    })),
  };
}
