"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ExportButtons } from "@/components/organization/analytics/export-buttons";
import { BusyHoursHeatmap } from "@/components/dashboard/busy-hours-heatmap";
import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useOrgBusyHours,
  useOrgByAppointmentType,
  useOrgTimeseries,
  useOrgStaffPerformance,
} from "@/hooks/useOrgAnalytics";
import type {
  OrgTimeseriesMetric,
  TimeseriesGranularity,
} from "@/types";

const METRIC_LABEL: Record<OrgTimeseriesMetric, string> = {
  bookings: "Bookings",
  revenue: "Revenue",
  cancellations: "Cancellations",
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const defaults = defaultRange();
  const from = search.get("from") ?? defaults.from;
  const to = search.get("to") ?? defaults.to;
  const granularity =
    (search.get("granularity") as TimeseriesGranularity | null) ?? "day";

  const [metric, setMetric] = useState<OrgTimeseriesMetric>("bookings");

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.push(`?${next.toString()}`);
  };

  const rangeValid = from <= to;
  const tsQuery = useOrgTimeseries({
    metric,
    granularity,
    from: rangeValid ? from : undefined,
    to: rangeValid ? to : undefined,
  });
  const byTypeQuery = useOrgByAppointmentType();
  const busyQuery = useOrgBusyHours();
  const staffPerfQuery = useOrgStaffPerformance();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Drill into bookings, revenue, and demand patterns.
          </p>
        </div>
        <div className="mb-4">
          <ExportButtons />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => updateParam("from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => updateParam("to", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Granularity</Label>
            <select
              value={granularity}
              onChange={(e) => updateParam("granularity", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        {!rangeValid ? (
          <p className="text-xs text-destructive">
            &quot;From&quot; must be before &quot;To&quot;.
          </p>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>
            {METRIC_LABEL[metric]} from {from} to {to} ({granularity})
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
                data={tsQuery.data}
                loading={tsQuery.isPending}
                label={METRIC_LABEL[metric]}
                granularity={granularity}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By appointment type (all-time)</CardTitle>
          <CardDescription>
            This breakdown is not date-filtered — backend doesn&apos;t
            support a range here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byTypeQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : byTypeQuery.data && byTypeQuery.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {byTypeQuery.data
                .slice()
                .sort((a, b) => b.bookings - a.bookings)
                .map((t) => (
                  <li
                    key={t.appointmentTypeId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.bookings} bookings · {t.revenue}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Busy hours (last 90 days)</CardTitle>
          <CardDescription>
            When customers actually book — by day-of-week and hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusyHoursHeatmap
            matrix={busyQuery.data?.matrix}
            loading={busyQuery.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <CardDescription>
            Performance metrics across bookable persons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffPerfQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : staffPerfQuery.data && staffPerfQuery.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-2">Staff Member</th>
                    <th className="px-4 py-2 text-right">Bookings</th>
                    <th className="px-4 py-2 text-right">Cancellations</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerfQuery.data.map((staff) => (
                    <tr key={staff.personId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{staff.name}</td>
                      <td className="px-4 py-3 text-right">{staff.bookings}</td>
                      <td className="px-4 py-3 text-right">{staff.cancellations}</td>
                      <td className="px-4 py-3 text-right">{staff.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No staff data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
