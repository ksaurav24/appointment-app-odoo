import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BookableResource,
  PaymentStatus,
} from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookableResourceDto } from './dto/create-bookable-resource.dto';
import { UpdateBookableResourceDto } from './dto/update-bookable-resource.dto';

type WindowKey = 'day' | 'week' | 'month';

const WINDOW_MINUTES: Record<WindowKey, number> = {
  day: 24 * 60,
  week: 7 * 24 * 60,
  month: 30 * 24 * 60,
};

const WINDOW_MS: Record<WindowKey, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export type ResourceUtilizationReport = {
  generatedAt: string;
  items: Array<{
    resourceId: string;
    name: string;
    resourceType: string | null;
    capacity: number;
    location: string | null;
    isActive: boolean;
    utilizationPercent: Record<WindowKey, number>;
    revenue: {
      day: number;
      week: number;
      month: number;
      total: number;
    };
  }>;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getOverlapMinutes(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const overlapStart = Math.max(start.getTime(), windowStart.getTime());
  const overlapEnd = Math.min(end.getTime(), windowEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / (60 * 1000);
}

@Injectable()
export class BookableResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async create(
    organiserId: string,
    input: CreateBookableResourceDto,
  ): Promise<BookableResource> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookableResource.create({
      data: {
        organizationId: org.id,
        name: input.name.trim(),
        resourceType: input.resourceType.trim().toUpperCase(),
        description: input.description,
        capacity: input.capacity ?? 1,
        location: input.location,
        isActive: input.isActive ?? true,
      },
    });
  }

  async list(
    organiserId: string,
    includeInactive = false,
  ): Promise<BookableResource[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.prisma.bookableResource.findMany({
      where: {
        organizationId: org.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForOrganiser(
    organiserId: string,
    id: string,
  ): Promise<BookableResource> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const resource = await this.prisma.bookableResource.findFirst({
      where: { id, organizationId: org.id },
    });
    if (!resource) throw new NotFoundException('Bookable resource not found');
    return resource;
  }

  async update(
    organiserId: string,
    id: string,
    input: UpdateBookableResourceDto,
  ): Promise<BookableResource> {
    await this.findOneForOrganiser(organiserId, id);
    return this.prisma.bookableResource.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        resourceType:
          input.resourceType === undefined
            ? undefined
            : input.resourceType.trim().toUpperCase(),
        description: input.description,
        capacity: input.capacity,
        location: input.location,
        isActive: input.isActive,
      },
    });
  }

  async remove(
    organiserId: string,
    id: string,
  ): Promise<{ deleted: 'soft' | 'hard' }> {
    const resource = await this.findOneForOrganiser(organiserId, id);

    const [appointmentCount, entityLinkCount] = await Promise.all([
      this.prisma.appointment.count({ where: { bookableResourceId: id } }),
      this.prisma.appointmentTypeEntity.count({
        where: { bookableResourceId: id },
      }),
    ]);

    if (appointmentCount > 0 || entityLinkCount > 0) {
      if (!resource.isActive) {
        throw new ConflictException(
          'Bookable resource is already inactive and cannot be hard-deleted while booking history exists',
        );
      }
      await this.prisma.bookableResource.update({
        where: { id },
        data: { isActive: false },
      });
      return { deleted: 'soft' };
    }

    await this.prisma.bookableResource.delete({ where: { id } });
    return { deleted: 'hard' };
  }

  async utilizationReport(
    organiserId: string,
  ): Promise<ResourceUtilizationReport> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const resources = await this.prisma.bookableResource.findMany({
      where: { organizationId: org.id },
      orderBy: { name: 'asc' },
    });

    const report: ResourceUtilizationReport = {
      generatedAt: new Date().toISOString(),
      items: [],
    };

    if (resources.length === 0) {
      return report;
    }

    const windowEnd = new Date();
    const windowStart: Record<WindowKey, Date> = {
      day: new Date(windowEnd.getTime() - WINDOW_MS.day),
      week: new Date(windowEnd.getTime() - WINDOW_MS.week),
      month: new Date(windowEnd.getTime() - WINDOW_MS.month),
    };
    const resourceIds = resources.map((resource) => resource.id);

    const [appointments, revenueTotal, revenueDay, revenueWeek, revenueMonth] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: {
            organizationId: org.id,
            bookableResourceId: { in: resourceIds },
            status: { not: AppointmentStatus.CANCELLED },
            startTime: { lt: windowEnd },
            endTime: { gt: windowStart.month },
          },
          select: {
            bookableResourceId: true,
            startTime: true,
            endTime: true,
          },
        }),
        this.prisma.appointment.groupBy({
          by: ['bookableResourceId'],
          where: {
            organizationId: org.id,
            bookableResourceId: { in: resourceIds },
            paymentStatus: PaymentStatus.PAID,
            totalAmount: { not: null },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['bookableResourceId'],
          where: {
            organizationId: org.id,
            bookableResourceId: { in: resourceIds },
            paymentStatus: PaymentStatus.PAID,
            totalAmount: { not: null },
            startTime: { gte: windowStart.day },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['bookableResourceId'],
          where: {
            organizationId: org.id,
            bookableResourceId: { in: resourceIds },
            paymentStatus: PaymentStatus.PAID,
            totalAmount: { not: null },
            startTime: { gte: windowStart.week },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.appointment.groupBy({
          by: ['bookableResourceId'],
          where: {
            organizationId: org.id,
            bookableResourceId: { in: resourceIds },
            paymentStatus: PaymentStatus.PAID,
            totalAmount: { not: null },
            startTime: { gte: windowStart.month },
          },
          _sum: { totalAmount: true },
        }),
      ]);

    const utilizationMinutes = new Map<string, Record<WindowKey, number>>(
      resourceIds.map((id) => [
        id,
        {
          day: 0,
          week: 0,
          month: 0,
        },
      ]),
    );

    for (const appointment of appointments) {
      const resourceId = appointment.bookableResourceId;
      if (!resourceId) continue;
      const totals = utilizationMinutes.get(resourceId);
      if (!totals) continue;
      totals.day += getOverlapMinutes(
        appointment.startTime,
        appointment.endTime,
        windowStart.day,
        windowEnd,
      );
      totals.week += getOverlapMinutes(
        appointment.startTime,
        appointment.endTime,
        windowStart.week,
        windowEnd,
      );
      totals.month += getOverlapMinutes(
        appointment.startTime,
        appointment.endTime,
        windowStart.month,
        windowEnd,
      );
    }

    const sumByResource = (
      rows: Array<{
        bookableResourceId: string | null;
        _sum: { totalAmount: unknown };
      }>,
    ): Map<string, number> => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (!row.bookableResourceId) continue;
        map.set(row.bookableResourceId, round2(toNumber(row._sum.totalAmount)));
      }
      return map;
    };

    const revenueTotalMap = sumByResource(revenueTotal);
    const revenueDayMap = sumByResource(revenueDay);
    const revenueWeekMap = sumByResource(revenueWeek);
    const revenueMonthMap = sumByResource(revenueMonth);

    report.items = resources.map((resource) => {
      const minutes = utilizationMinutes.get(resource.id) ?? {
        day: 0,
        week: 0,
        month: 0,
      };
      const effectiveCapacity = Math.max(resource.capacity, 1);

      return {
        resourceId: resource.id,
        name: resource.name,
        resourceType: resource.resourceType,
        capacity: resource.capacity,
        location: resource.location,
        isActive: resource.isActive,
        utilizationPercent: {
          day: round2(
            Math.min(
              100,
              (minutes.day / (WINDOW_MINUTES.day * effectiveCapacity)) * 100,
            ),
          ),
          week: round2(
            Math.min(
              100,
              (minutes.week / (WINDOW_MINUTES.week * effectiveCapacity)) * 100,
            ),
          ),
          month: round2(
            Math.min(
              100,
              (minutes.month / (WINDOW_MINUTES.month * effectiveCapacity)) *
                100,
            ),
          ),
        },
        revenue: {
          day: revenueDayMap.get(resource.id) ?? 0,
          week: revenueWeekMap.get(resource.id) ?? 0,
          month: revenueMonthMap.get(resource.id) ?? 0,
          total: revenueTotalMap.get(resource.id) ?? 0,
        },
      };
    });

    return report;
  }
}
