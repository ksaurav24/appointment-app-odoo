"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeBucket, TimeseriesGranularity } from "@/types";

type TimeseriesChartProps = {
  data: TimeBucket[] | undefined;
  loading?: boolean;
  label: string;
  granularity: TimeseriesGranularity;
  color?: string;
};

const FORMATTERS: Record<TimeseriesGranularity, Intl.DateTimeFormat> = {
  day: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  week: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }),
  month: new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "2-digit",
  }),
};

export function TimeseriesChart({
  data,
  loading,
  label,
  granularity,
  color = "var(--chart-1)",
}: TimeseriesChartProps) {
  const config: ChartConfig = useMemo(
    () => ({ value: { label, color } }),
    [label, color],
  );

  const points = useMemo(
    () =>
      (data ?? []).map((b) => ({
        ...b,
        label: FORMATTERS[granularity].format(new Date(b.bucket)),
      })),
    [data, granularity],
  );

  if (loading && !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!loading && points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data for the selected range.
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ts-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={32}
            fontSize={11}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#ts-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
