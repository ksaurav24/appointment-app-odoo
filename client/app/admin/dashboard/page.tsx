"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Analytics01Icon,
  Building01Icon,
  Calendar01Icon,
  ChartLineData01Icon,
  MoneyBag02Icon,
  Note01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { QuickLinks } from "@/components/dashboard/quick-links"
import { TimeseriesChart } from "@/components/dashboard/timeseries-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  useAdminDashboard,
  useAdminTimeseries,
  useTopOrganizations,
} from "@/hooks/useAdminAnalytics"
import type { AdminTimeseriesMetric, TimeseriesGranularity } from "@/types"

const QUICK_LINKS = [
  {
    href: "/admin/organizations?status=PENDING",
    label: "Pending approvals",
    description: "Review and approve organization requests.",
    icon: Building01Icon,
  },
  {
    href: "/admin/users",
    label: "Manage users",
    description: "Search, change roles, deactivate accounts.",
    icon: UserMultiple02Icon,
  },
  {
    href: "/admin/analytics",
    label: "Full analytics",
    description: "Time-series, segmentation, and reports.",
    icon: Analytics01Icon,
  },
  {
    href: "/admin/audit-logs",
    label: "Audit logs",
    description: "Track admin and platform activity.",
    icon: Note01Icon,
  },
]

const METRIC_LABEL: Record<AdminTimeseriesMetric, string> = {
  appointments: "Appointments",
  revenue: "Revenue",
  signups: "Signups",
}

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard()
  const [metric, setMetric] = useState<AdminTimeseriesMetric>("appointments")
  const [granularity] = useState<TimeseriesGranularity>("day")
  const timeseries = useAdminTimeseries({ metric, granularity })
  const topOrgs = useTopOrganizations({ metric: "bookings", limit: 5 })

  const d = dashboard.data
  const currency = d?.revenue.currency ?? "INR"

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Admin dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide health at a glance.
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
            Couldn&apos;t load dashboard. Please refresh.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total users"
          icon={UserMultiple02Icon}
          loading={dashboard.isPending}
          value={formatNumber(d?.users.total)}
          hint={
            d
              ? `${formatNumber(d.users.activeTotal)} active · ${d.users.byRole.ORGANIZER} organizers`
              : undefined
          }
        />
        <KpiCard
          label="Organizations"
          icon={Building01Icon}
          loading={dashboard.isPending}
          value={formatNumber(d?.organizations.total)}
          hint={
            d
              ? `${d.organizations.pending} pending · ${d.organizations.active} active`
              : undefined
          }
        />
        <KpiCard
          label="Appointments (all time)"
          icon={Calendar01Icon}
          loading={dashboard.isPending}
          value={formatNumber(d?.appointments.allTime)}
          hint={
            d
              ? `${d.appointments.today} today · ${d.appointments.thisWeek} this week`
              : undefined
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
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} className="size-4" />
              Trends (last 30 days)
            </CardTitle>
            <CardDescription>
              Toggle between key platform metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={metric}
              onValueChange={(v) => setMetric(v as AdminTimeseriesMetric)}
            >
              <TabsList>
                <TabsTrigger value="appointments">Appointments</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="signups">Signups</TabsTrigger>
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
            <CardTitle>Top organizations</CardTitle>
            <CardDescription>By bookings, all-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopOrgsList
              loading={topOrgs.isPending}
              data={topOrgs.data ?? []}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users by role</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersByRoleChart
              loading={dashboard.isPending}
              admin={d?.users.byRole.ADMIN ?? 0}
              organizer={d?.users.byRole.ORGANIZER ?? 0}
              customer={d?.users.byRole.CUSTOMER ?? 0}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization status</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : d ? (
              <div className="grid grid-cols-2 gap-3">
                <StatusTile
                  label="Pending"
                  value={d.organizations.pending}
                  tone="warning"
                />
                <StatusTile
                  label="Approved"
                  value={d.organizations.approved}
                  tone="success"
                />
                <StatusTile
                  label="Active"
                  value={d.organizations.active}
                  tone="info"
                />
                <StatusTile
                  label="Rejected"
                  value={d.organizations.rejected}
                  tone="danger"
                />
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
  )
}

function TopOrgsList({
  loading,
  data,
}: {
  loading: boolean
  data: { organizationId: string; name: string; slug: string; value: number }[]
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No organizations yet.
      </p>
    )
  }
  const max = Math.max(...data.map((o) => o.value), 1)
  return (
    <ol className="space-y-3">
      {data.map((org, i) => (
        <li key={org.organizationId} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">
              <span className="text-muted-foreground">{i + 1}.</span>{" "}
              <span className="font-medium">{org.name}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatNumber(org.value)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${(org.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}

function UsersByRoleChart({
  loading,
  admin,
  organizer,
  customer,
}: {
  loading: boolean
  admin: number
  organizer: number
  customer: number
}) {
  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }
  const data = [
    { role: "Customers", value: customer },
    { role: "Organizers", value: organizer },
    { role: "Admins", value: admin },
  ]
  const config: ChartConfig = {
    value: { label: "Users", color: "var(--chart-2)" },
  }
  return (
    <ChartContainer config={config} className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="role"
            tickLine={false}
            axisLine={false}
            width={80}
            fontSize={12}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "danger" | "info"
}) {
  const bgColors = {
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/30">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bgColors[tone]}`}
      >
        {formatNumber(value)}
      </span>
    </div>
  )
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return "—"
  return new Intl.NumberFormat().format(n)
}

function formatCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount
  if (Number.isNaN(value)) return "—"
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}
