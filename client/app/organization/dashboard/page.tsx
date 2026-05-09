"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  ChartLineData01Icon,
  HourglassIcon,
  MoneyBag02Icon,
  Settings01Icon,
  TimeQuarterPassIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { BusyHoursHeatmap } from "@/components/dashboard/busy-hours-heatmap";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickLinks } from "@/components/dashboard/quick-links";
import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useOrgByAppointmentType,
  useOrgBusyHours,
  useOrgDashboard,
  useOrgTimeseries,
} from "@/hooks/useOrgAnalytics";
import type { OrgTimeseriesMetric, TimeseriesGranularity } from "@/types";

const QUICK_LINKS = [
  {
    href: "/organization/appointments?status=PENDING",
    label: "Pending requests",
    description: "Approve or reject incoming bookings.",
    icon: HourglassIcon,
  },
  {
    href: "/organization/appointment-types",
    label: "Appointment types",
    description: "Create or update bookable services.",
    icon: Briefcase01Icon,
  },
  {
    href: "/organization/staff",
    label: "Staff",
    description: "Manage staff availability and assignments.",
    icon: UserGroupIcon,
  },
  {
    href: "/organization/resources",
    label: "Resources",
    description: "Track bookable rooms, equipment, and utilization.",
    icon: Briefcase01Icon,
  },
  {
    href: "/organization/settings",
    label: "Organization settings",
    description: "Profile, contact, and policies.",
    icon: Settings01Icon,
  },
];

const METRIC_LABEL: Record<OrgTimeseriesMetric, string> = {
  bookings: "Bookings",
  revenue: "Revenue",
  cancellations: "Cancellations",
};

export default function OrganizationDashboardPage() {
  const dashboard = useOrgDashboard();
  const [metric, setMetric] = useState<OrgTimeseriesMetric>("bookings");
  const [granularity] = useState<TimeseriesGranularity>("day");
  const timeseries = useOrgTimeseries({ metric, granularity });
  const byType = useOrgByAppointmentType();
  const busyHours = useOrgBusyHours();

  const d = dashboard.data;
  const currency = d?.revenue.currency ?? "INR";

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Organization dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Your bookings, revenue, and demand patterns.
          {d?.generatedAt ? (
            <span className="ml-2 text-xs">
              · Updated {new Date(d.generatedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
      </header>

      {dashboard.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Couldn&apos;t load analytics. If your organization is still pending
            approval, check back once it&apos;s approved.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total bookings"
          icon={Calendar01Icon}
          loading={dashboard.isPending}
          value={formatNumber(d?.bookings.total)}
          hint={
            d
              ? `${d.bookings.upcoming} upcoming · ${d.bookings.completed} completed`
              : undefined
          }
        />
        <KpiCard
          label="Pending requests"
          icon={HourglassIcon}
          loading={dashboard.isPending}
          value={formatNumber(d?.bookings.pending)}
          hint={
            d ? `${d.bookings.cancelled} cancelled all-time` : undefined
          }
        />
        <KpiCard
          label="Revenue this month"
          icon={MoneyBag02Icon}
          loading={dashboard.isPending}
          value={d ? formatCurrency(d.revenue.thisMonth, currency) : "—"}
          hint={
            d
              ? `All-time ${formatCurrency(d.revenue.allTime, currency)}`
              : undefined
          }
        />
        <KpiCard
          label="Cancellation rate"
          icon={CheckmarkCircle02Icon}
          loading={dashboard.isPending}
          value={d ? `${d.cancellationRatePct}%` : "—"}
          hint={
            d
              ? `Avg ${d.averagePerDayLast30.toFixed(2)} bookings/day (30d)`
              : undefined
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} className="size-4" />
              Trends (last 30 days)
            </CardTitle>
            <CardDescription>
              Switch between bookings, revenue, and cancellations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={metric}
              onValueChange={(v) => setMetric(v as OrgTimeseriesMetric)}
            >
              <TabsList>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
              </TabsList>
              <TabsContent value={metric} className="pt-4">
                <TimeseriesChart
                  data={timeseries.data}
                  loading={timeseries.isPending}
                  label={METRIC_LABEL[metric]}
                  granularity={granularity}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By appointment type</CardTitle>
            <CardDescription>Bookings + revenue per service.</CardDescription>
          </CardHeader>
          <CardContent>
            <ByTypeList
              loading={byType.isPending}
              data={byType.data ?? []}
              currency={currency}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={TimeQuarterPassIcon} className="size-4" />
              Busy hours (last 90 days)
            </CardTitle>
            <CardDescription>
              When customers actually book — by day of week and hour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusyHoursHeatmap
              matrix={busyHours.data?.matrix}
              loading={busyHours.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking status</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : d ? (
              <div className="space-y-2">
                <StatusRow label="Upcoming" value={d.bookings.upcoming} variant="default" />
                <StatusRow label="Pending" value={d.bookings.pending} variant="secondary" />
                <StatusRow label="Completed" value={d.bookings.completed} variant="outline" />
                <StatusRow label="Cancelled" value={d.bookings.cancelled} variant="destructive" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Quick links</h2>
        <QuickLinks links={QUICK_LINKS} />
      </section>
    </div>
  );
}

function ByTypeList({
  loading,
  data,
  currency,
}: {
  loading: boolean;
  data: { appointmentTypeId: string; name: string; bookings: number; revenue: number }[];
  currency: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No appointment types yet. Create one to start taking bookings.
      </p>
    );
  }
  const sorted = [...data].sort((a, b) => b.bookings - a.bookings).slice(0, 6);
  return (
    <ul className="space-y-3">
      {sorted.map((t) => (
        <li
          key={t.appointmentTypeId}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="truncate">{t.name}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{formatNumber(t.bookings)}</span>
            <span>·</span>
            <span className="font-mono">
              {formatCurrency(t.revenue, currency)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={variant}>{formatNumber(value)}</Badge>
    </div>
  );
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return "—";
  return new Intl.NumberFormat().format(n);
}

function formatCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
