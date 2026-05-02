import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type BusyHoursHeatmapProps = {
  matrix: number[][] | undefined;
  loading?: boolean;
};

export function BusyHoursHeatmap({ matrix, loading }: BusyHoursHeatmapProps) {
  if (loading || !matrix) {
    return <Skeleton className="h-44 w-full" />;
  }

  const max = matrix.reduce(
    (m, row) => row.reduce((mm, v) => Math.max(mm, v), m),
    0,
  );

  return (
    <div className="space-y-1.5 overflow-x-auto">
      <div className="flex items-center gap-1 pl-9 text-[10px] text-muted-foreground">
        {Array.from({ length: 24 }).map((_, h) => (
          <span key={h} className="w-4 text-center">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
      </div>
      {matrix.map((row, day) => (
        <div key={day} className="flex items-center gap-1">
          <span className="w-8 shrink-0 text-xs text-muted-foreground">
            {DAYS[day]}
          </span>
          {row.map((value, hour) => {
            const intensity = max === 0 ? 0 : value / max;
            return (
              <div
                key={hour}
                title={`${DAYS[day]} ${hour}:00 — ${value} bookings`}
                className={cn(
                  "h-4 w-4 rounded-sm border border-border/30",
                )}
                style={{
                  backgroundColor:
                    intensity === 0
                      ? "transparent"
                      : `color-mix(in srgb, var(--chart-1) ${Math.max(15, intensity * 100)}%, transparent)`,
                }}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0.15, 0.4, 0.65, 0.9].map((v) => (
          <div
            key={v}
            className="h-3 w-3 rounded-sm border border-border/30"
            style={{
              backgroundColor: `color-mix(in srgb, var(--chart-1) ${v * 100}%, transparent)`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
