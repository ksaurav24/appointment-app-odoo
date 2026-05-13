"use client"

import { useMemo, useState } from "react"

import { TimeseriesChart } from "@/components/dashboard/timeseries-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useAdminDashboard,
  useAdminTimeseries,
  useTopOrganizations,
} from "@/hooks/useAdminAnalytics"
import type {
  AdminTimeseriesMetric,
  TimeseriesGranularity,
  TopOrganization,
} from "@/types"

const METRICS: { value: AdminTimeseriesMetric; label: string }[] = [
  { value: "appointments", label: "Appointments" },
  { value: "revenue", label: "Revenue" },
  { value: "signups", label: "Signups" },
]

const GRANULARITIES: { value: TimeseriesGranularity; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

const TOP_METRICS = [
  { value: "bookings" as const, label: "Bookings" },
  { value: "revenue" as const, label: "Revenue" },
]

function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  }
}

export default function AdminAnalyticsPage() {
  const dashboard = useAdminDashboard()
  const initial = useMemo(defaultDateRange, [])
  const [metric, setMetric] = useState<AdminTimeseriesMetric>("appointments")
  const [granularity, setGranularity] = useState<TimeseriesGranularity>("day")
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [topMetric, setTopMetric] = useState<"bookings" | "revenue">("bookings")

  const fromIso = from ? new Date(from).toISOString() : undefined
  const toIso = to ? new Date(to).toISOString() : undefined

  const timeseries = useAdminTimeseries({
    metric,
    granularity,
    from: fromIso,
    to: toIso,
  })
  const topOrgs = useTopOrganizations({ metric: topMetric, limit: 10 })

  const d = dashboard.data
  const currency = d?.revenue.currency ?? "INR"

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide trends and segmentation.
          {d?.generatedAt ? (
            <span className="ml-2 text-xs">
              · Updated {new Date(d.generatedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total users"
          loading={dashboard.isPending}
          value={formatNumber(d?.users.total)}
          hint={d ? `${formatNumber(d.users.activeTotal)} active` : undefined}
        />
        <SummaryCard
          label="Total organizations"
          loading={dashboard.isPending}
          value={formatNumber(d?.organizations.total)}
          hint={d ? `${d.organizations.active} active` : undefined}
        />
        <SummaryCard
          label="Appointments"
          loading={dashboard.isPending}
          value={formatNumber(d?.appointments.allTime)}
          hint={d ? `${d.appointments.thisMonth} this month` : undefined}
        />
        <SummaryCard
          label={`Revenue (this month)`}
          loading={dashboard.isPending}
          value={d ? formatCurrency(d.revenue.thisMonth, currency) : "—"}
          hint={
            d
              ? `All-time ${formatCurrency(d.revenue.allTime, currency)}`
              : undefined
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Timeseries</CardTitle>
          <CardDescription>
            Choose a metric, granularity, and date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Metric</Label>
              <Tabs
                value={metric}
                onValueChange={(v) => setMetric(v as AdminTimeseriesMetric)}
              >
                <TabsList>
                  {METRICS.map((m) => (
                    <TabsTrigger key={m.value} value={m.value}>
                      {m.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Granularity</Label>
              <Tabs
                value={granularity}
                onValueChange={(v) =>
                  setGranularity(v as TimeseriesGranularity)
                }
              >
                <TabsList>
                  {GRANULARITIES.map((g) => (
                    <TabsTrigger key={g.value} value={g.value}>
                      {g.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from" className="text-xs">
                From
              </Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to" className="text-xs">
                To
              </Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const reset = defaultDateRange()
                setFrom(reset.from)
                setTo(reset.to)
              }}
            >
              Reset to last 30d
            </Button>
          </div>

          <TimeseriesChart
            data={timeseries.data}
            loading={timeseries.isPending}
            label={METRICS.find((m) => m.value === metric)?.label ?? metric}
            granularity={granularity}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top organizations</CardTitle>
              <CardDescription>Ranked by selected metric.</CardDescription>
            </div>
            <Tabs
              value={topMetric}
              onValueChange={(v) => setTopMetric(v as "bookings" | "revenue")}
            >
              <TabsList>
                {TOP_METRICS.map((m) => (
                  <TabsTrigger key={m.value} value={m.value}>
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <TopOrgsList
              loading={topOrgs.isPending}
              data={topOrgs.data ?? []}
              isCurrency={topMetric === "revenue"}
              currency={currency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakdown</CardTitle>
            <CardDescription>Snapshot of platform composition.</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : d ? (
              <div className="grid grid-cols-2 gap-3">
                <Tile label="Customers" value={d.users.byRole.CUSTOMER} />
                <Tile label="Organizers" value={d.users.byRole.ORGANIZER} />
                <Tile label="Admins" value={d.users.byRole.ADMIN} />
                <Tile label="Pending orgs" value={d.organizations.pending} />
                <Tile label="Approved orgs" value={d.organizations.approved} />
                <Tile label="Rejected orgs" value={d.organizations.rejected} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string
  value: string
  hint?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="space-y-1 py-5">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="font-heading text-2xl font-semibold">{value}</p>
        )}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant="secondary">{formatNumber(value)}</Badge>
    </div>
  )
}

function TopOrgsList({
  loading,
  data,
  isCurrency,
  currency,
}: {
  loading: boolean
  data: TopOrganization[]
  isCurrency: boolean
  currency: string
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
              {isCurrency
                ? formatCurrency(org.value, currency)
                : formatNumber(org.value)}
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
