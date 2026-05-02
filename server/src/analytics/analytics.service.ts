import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  OrganizationApprovalStatus,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsCacheService } from './cache/analytics-cache.service';
import {
  AdminTimeseriesMetric,
  AdminTimeseriesQuery,
  OrgTimeseriesMetric,
  OrgTimeseriesQuery,
  TimeseriesGranularity,
} from './dto/timeseries.query';

const ADMIN_DASHBOARD_TTL_SECONDS = 300;
const ORG_DASHBOARD_TTL_SECONDS = 60;

const startOfDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfWeek = (d: Date): Date => {
  const copy = startOfDay(d);
  // Treat weeks as Monday-anchored; matches `date_trunc('week', ...)` in PG.
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
};

const startOfMonth = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

const daysAgo = (n: number): Date => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
};

const truncSql = (granularity: TimeseriesGranularity): Prisma.Sql => {
  switch (granularity) {
    case TimeseriesGranularity.DAY:
      return Prisma.raw(`'day'`);
    case TimeseriesGranularity.WEEK:
      return Prisma.raw(`'week'`);
    case TimeseriesGranularity.MONTH:
      return Prisma.raw(`'month'`);
  }
};

const resolveRange = (
  from: string | undefined,
  to: string | undefined,
  fallbackDays: number,
): { from: Date; to: Date } => {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : daysAgo(fallbackDays);
  return { from: fromDate, to: toDate };
};

export interface TimeBucket {
  bucket: string;
  value: number;
}

export interface AdminDashboard {
  users: {
    total: number;
    byRole: Record<Role, number>;
    activeTotal: number;
  };
  organizations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    active: number;
  };
  appointments: {
    allTime: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  revenue: {
    currency: string;
    thisMonth: string;
    allTime: string;
  };
  generatedAt: string;
}

export interface OrgDashboard {
  organizationId: string;
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    pending: number;
  };
  cancellationRatePct: number;
  revenue: {
    currency: string;
    thisMonth: string;
    allTime: string;
  };
  averagePerDayLast30: number;
  generatedAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly organizations: OrganizationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  adminDashboard(): Promise<AdminDashboard> {
    return this.cache.getOrSet(
      'analytics:admin:dashboard',
      ADMIN_DASHBOARD_TTL_SECONDS,
      () => this.computeAdminDashboard(),
    );
  }

  private async computeAdminDashboard(): Promise<AdminDashboard> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [
      usersTotal,
      activeUsers,
      usersByRoleRaw,
      orgsTotal,
      orgsByStatus,
      activeOrgs,
      apptsAllTime,
      apptsToday,
      apptsThisWeek,
      apptsThisMonth,
      revenueAllTime,
      revenueThisMonth,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.organization.count(),
      this.prisma.organization.groupBy({
        by: ['approvalStatus'],
        _count: { id: true },
        orderBy: { approvalStatus: 'asc' },
      }),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.appointment.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.prisma.appointment.count({
        where: { createdAt: { gte: monthStart } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID, createdAt: { gte: monthStart } },
      }),
    ]);

    const byRole: Record<Role, number> = {
      ADMIN: 0,
      ORGANIZER: 0,
      CUSTOMER: 0,
    };
    for (const row of usersByRoleRaw) {
      const count = row._count;
      byRole[row.role] =
        typeof count === 'object' && count !== null ? (count.id ?? 0) : 0;
    }

    const byApproval: Record<OrganizationApprovalStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    for (const row of orgsByStatus) {
      const count = row._count;
      byApproval[row.approvalStatus] =
        typeof count === 'object' && count !== null ? (count.id ?? 0) : 0;
    }

    const currency = (await this.firstPaymentCurrency()) ?? 'INR';

    return {
      users: {
        total: usersTotal,
        byRole,
        activeTotal: activeUsers,
      },
      organizations: {
        total: orgsTotal,
        pending: byApproval.PENDING,
        approved: byApproval.APPROVED,
        rejected: byApproval.REJECTED,
        active: activeOrgs,
      },
      appointments: {
        allTime: apptsAllTime,
        today: apptsToday,
        thisWeek: apptsThisWeek,
        thisMonth: apptsThisMonth,
      },
      revenue: {
        currency,
        thisMonth: (revenueThisMonth._sum.amount ?? 0).toString(),
        allTime: (revenueAllTime._sum.amount ?? 0).toString(),
      },
      generatedAt: now.toISOString(),
    };
  }

  adminTimeseries(query: AdminTimeseriesQuery): Promise<TimeBucket[]> {
    const { from, to } = resolveRange(query.from, query.to, 30);
    const cacheKey = `analytics:admin:timeseries:${query.metric}:${query.granularity}:${from.toISOString()}:${to.toISOString()}`;
    return this.cache.getOrSet(cacheKey, ADMIN_DASHBOARD_TTL_SECONDS, () =>
      this.computeAdminTimeseries(query.metric, query.granularity, from, to),
    );
  }

  private async computeAdminTimeseries(
    metric: AdminTimeseriesMetric,
    granularity: TimeseriesGranularity,
    from: Date,
    to: Date,
  ): Promise<TimeBucket[]> {
    const trunc = truncSql(granularity);

    switch (metric) {
      case AdminTimeseriesMetric.APPOINTMENTS: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: bigint }[]
        >`
          SELECT date_trunc(${trunc}, "createdAt") AS bucket,
                 COUNT(*)::bigint AS value
          FROM appointments
          WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value),
        }));
      }
      case AdminTimeseriesMetric.REVENUE: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: Prisma.Decimal | null }[]
        >`
          SELECT date_trunc(${trunc}, "createdAt") AS bucket,
                 COALESCE(SUM(amount), 0) AS value
          FROM payments
          WHERE status = 'PAID'
            AND "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value ?? 0),
        }));
      }
      case AdminTimeseriesMetric.SIGNUPS: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: bigint }[]
        >`
          SELECT date_trunc(${trunc}, "createdAt") AS bucket,
                 COUNT(*)::bigint AS value
          FROM users
          WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value),
        }));
      }
    }
  }

  topOrganizations(
    metric: 'bookings' | 'revenue',
    limit: number,
  ): Promise<unknown> {
    const cacheKey = `analytics:admin:top-organizations:${metric}:${limit}`;
    return this.cache.getOrSet(cacheKey, ADMIN_DASHBOARD_TTL_SECONDS, () =>
      this.computeTopOrganizations(metric, limit),
    );
  }

  private async computeTopOrganizations(
    metric: 'bookings' | 'revenue',
    limit: number,
  ): Promise<unknown> {
    if (metric === 'bookings') {
      const rows = await this.prisma.$queryRaw<
        {
          organizationId: string;
          name: string;
          slug: string;
          value: bigint;
        }[]
      >`
        SELECT a."organizationId", o.name, o.slug, COUNT(*)::bigint AS value
        FROM appointments a
        JOIN organizations o ON o.id = a."organizationId"
        GROUP BY a."organizationId", o.name, o.slug
        ORDER BY value DESC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
        organizationId: r.organizationId,
        name: r.name,
        slug: r.slug,
        value: Number(r.value),
      }));
    }
    const rows = await this.prisma.$queryRaw<
      {
        organizationId: string;
        name: string;
        slug: string;
        value: Prisma.Decimal | null;
      }[]
    >`
      SELECT a."organizationId", o.name, o.slug,
             COALESCE(SUM(p.amount), 0) AS value
      FROM payments p
      JOIN appointments a ON a.id = p."appointmentId"
      JOIN organizations o ON o.id = a."organizationId"
      WHERE p.status = 'PAID'
      GROUP BY a."organizationId", o.name, o.slug
      ORDER BY value DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      organizationId: r.organizationId,
      name: r.name,
      slug: r.slug,
      value: Number(r.value ?? 0),
    }));
  }

  // ---------------------------------------------------------------------------
  // Organiser
  // ---------------------------------------------------------------------------

  async organiserDashboard(organiserId: string): Promise<OrgDashboard> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.cache.getOrSet(
      `analytics:org:${org.id}:dashboard`,
      ORG_DASHBOARD_TTL_SECONDS,
      () => this.computeOrganiserDashboard(org.id),
    );
  }

  private async computeOrganiserDashboard(
    organizationId: string,
  ): Promise<OrgDashboard> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = daysAgo(30);

    const [
      total,
      upcoming,
      completed,
      cancelled,
      pending,
      revenueAllTime,
      revenueThisMonth,
      last30Count,
    ] = await this.prisma.$transaction([
      this.prisma.appointment.count({ where: { organizationId } }),
      this.prisma.appointment.count({
        where: {
          organizationId,
          status: {
            in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
          },
          startTime: { gte: now },
        },
      }),
      this.prisma.appointment.count({
        where: { organizationId, status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.appointment.count({
        where: { organizationId, status: AppointmentStatus.CANCELLED },
      }),
      this.prisma.appointment.count({
        where: { organizationId, status: AppointmentStatus.PENDING },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.PAID,
          appointment: { organizationId },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.PAID,
          createdAt: { gte: monthStart },
          appointment: { organizationId },
        },
      }),
      this.prisma.appointment.count({
        where: {
          organizationId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const cancellationRatePct =
      total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

    const currency = (await this.firstPaymentCurrency()) ?? 'INR';

    return {
      organizationId,
      bookings: { total, upcoming, completed, cancelled, pending },
      cancellationRatePct,
      revenue: {
        currency,
        thisMonth: (revenueThisMonth._sum.amount ?? 0).toString(),
        allTime: (revenueAllTime._sum.amount ?? 0).toString(),
      },
      averagePerDayLast30: Math.round((last30Count / 30) * 100) / 100,
      generatedAt: now.toISOString(),
    };
  }

  async organiserTimeseries(
    organiserId: string,
    query: OrgTimeseriesQuery,
  ): Promise<TimeBucket[]> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    const { from, to } = resolveRange(query.from, query.to, 30);
    const cacheKey = `analytics:org:${org.id}:timeseries:${query.metric}:${query.granularity}:${from.toISOString()}:${to.toISOString()}`;
    return this.cache.getOrSet(cacheKey, ORG_DASHBOARD_TTL_SECONDS, () =>
      this.computeOrgTimeseries(
        org.id,
        query.metric,
        query.granularity,
        from,
        to,
      ),
    );
  }

  private async computeOrgTimeseries(
    organizationId: string,
    metric: OrgTimeseriesMetric,
    granularity: TimeseriesGranularity,
    from: Date,
    to: Date,
  ): Promise<TimeBucket[]> {
    const trunc = truncSql(granularity);

    switch (metric) {
      case OrgTimeseriesMetric.BOOKINGS: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: bigint }[]
        >`
          SELECT date_trunc(${trunc}, "createdAt") AS bucket,
                 COUNT(*)::bigint AS value
          FROM appointments
          WHERE "organizationId"::text = ${organizationId}
            AND "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value),
        }));
      }
      case OrgTimeseriesMetric.CANCELLATIONS: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: bigint }[]
        >`
          SELECT date_trunc(${trunc}, "cancelledAt") AS bucket,
                 COUNT(*)::bigint AS value
          FROM appointments
          WHERE "organizationId"::text = ${organizationId}
            AND status = 'CANCELLED'
            AND "cancelledAt" IS NOT NULL
            AND "cancelledAt" >= ${from} AND "cancelledAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value),
        }));
      }
      case OrgTimeseriesMetric.REVENUE: {
        const rows = await this.prisma.$queryRaw<
          { bucket: Date; value: Prisma.Decimal | null }[]
        >`
          SELECT date_trunc(${trunc}, p."createdAt") AS bucket,
                 COALESCE(SUM(p.amount), 0) AS value
          FROM payments p
          JOIN appointments a ON a.id = p."appointmentId"
          WHERE a."organizationId"::text = ${organizationId}
            AND p.status = 'PAID'
            AND p."createdAt" >= ${from} AND p."createdAt" <= ${to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `;
        return rows.map((r) => ({
          bucket: r.bucket.toISOString(),
          value: Number(r.value ?? 0),
        }));
      }
    }
  }

  async organiserByAppointmentType(organiserId: string): Promise<unknown> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.cache.getOrSet(
      `analytics:org:${org.id}:by-type`,
      ORG_DASHBOARD_TTL_SECONDS,
      () => this.computeByAppointmentType(org.id),
    );
  }

  private async computeByAppointmentType(
    organizationId: string,
  ): Promise<unknown> {
    const rows = await this.prisma.$queryRaw<
      {
        appointmentTypeId: string;
        name: string;
        bookings: bigint;
        revenue: Prisma.Decimal | null;
      }[]
    >`
      SELECT at.id AS "appointmentTypeId",
             at.name,
             COUNT(a.id)::bigint AS bookings,
             COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) AS revenue
      FROM appointment_types at
      LEFT JOIN appointments a ON a."appointmentTypeId" = at.id
      LEFT JOIN payments p ON p."appointmentId" = a.id
      WHERE at."organizationId"::text = ${organizationId}
      GROUP BY at.id, at.name
      ORDER BY bookings DESC
    `;
    return rows.map((r) => ({
      appointmentTypeId: r.appointmentTypeId,
      name: r.name,
      bookings: Number(r.bookings),
      revenue: Number(r.revenue ?? 0),
    }));
  }

  async organiserBusyHours(organiserId: string): Promise<unknown> {
    const org = await this.organizations.requireForOrganiser(organiserId);
    return this.cache.getOrSet(
      `analytics:org:${org.id}:busy-hours`,
      ORG_DASHBOARD_TTL_SECONDS,
      () => this.computeBusyHours(org.id),
    );
  }

  private async computeBusyHours(organizationId: string): Promise<unknown> {
    const since = daysAgo(90);
    const rows = await this.prisma.$queryRaw<
      { dayOfWeek: number; hour: number; value: bigint }[]
    >`
      SELECT EXTRACT(DOW FROM "startTime")::int AS "dayOfWeek",
             EXTRACT(HOUR FROM "startTime")::int AS hour,
             COUNT(*)::bigint AS value
      FROM appointments
      WHERE "organizationId"::text = ${organizationId}
        AND "startTime" >= ${since}
        AND status <> 'CANCELLED'
      GROUP BY "dayOfWeek", hour
      ORDER BY "dayOfWeek", hour
    `;

    const matrix: number[][] = Array.from({ length: 7 }, () =>
      new Array<number>(24).fill(0),
    );
    for (const row of rows) {
      matrix[row.dayOfWeek][row.hour] = Number(row.value);
    }
    return { since: since.toISOString(), matrix };
  }

  // ---------------------------------------------------------------------------
  // Cache invalidation entrypoints used by write paths
  // ---------------------------------------------------------------------------

  async invalidateForOrganization(organizationId: string): Promise<void> {
    await Promise.all([
      this.cache.invalidateOrgScope(organizationId),
      this.cache.invalidateAdminScope(),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async firstPaymentCurrency(): Promise<string | null> {
    const row = await this.prisma.payment.findFirst({
      select: { currency: true },
      orderBy: { createdAt: 'desc' },
    });
    return row?.currency ?? null;
  }
}
