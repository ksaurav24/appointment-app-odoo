import { dayOfWeekName, formatHHMM } from "@/lib/format";
import type { Schedule, ScheduleRule } from "@/types";

type ScheduleSummaryProps = {
  schedules: Schedule[];
};

function summarizeRule(rule: ScheduleRule): string {
  const range = `${formatHHMM(rule.startTime)}–${formatHHMM(rule.endTime)}`;
  if (rule.dayOfWeek != null) {
    return `${dayOfWeekName(rule.dayOfWeek)} ${range}`;
  }
  if (rule.specificDate) {
    return `${rule.specificDate} ${range}`;
  }
  return range;
}

export function ScheduleSummary({ schedules }: ScheduleSummaryProps) {
  const rules = schedules.flatMap((s) => s.rules.filter((r) => r.isAvailable));
  const weekly = rules.filter((r) => r.dayOfWeek != null);
  const overrides = rules.filter((r) => r.specificDate != null);

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No availability configured.</p>
    );
  }

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {weekly.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            Weekly
          </p>
          <ul className="mt-1 space-y-0.5">
            {weekly.map((r) => (
              <li key={r.id}>{summarizeRule(r)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {overrides.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            Specific dates
          </p>
          <ul className="mt-1 space-y-0.5">
            {overrides.map((r) => (
              <li key={r.id}>{summarizeRule(r)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
