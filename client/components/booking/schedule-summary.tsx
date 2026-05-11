import { dayOfWeekName, formatHHMM } from "@/lib/format";
import type { Schedule, ScheduleRule } from "@/types";

type ScheduleSummaryProps = {
  schedules: Schedule[];
};

function parseRule(rule: ScheduleRule): { label: string; time: string } {
  const time = `${formatHHMM(rule.startTime)} – ${formatHHMM(rule.endTime)}`;
  if (rule.dayOfWeek != null) {
    return { label: dayOfWeekName(rule.dayOfWeek), time };
  }
  if (rule.specificDate) {
    return { label: rule.specificDate, time };
  }
  return { label: "Always", time };
}

export function ScheduleSummary({ schedules }: ScheduleSummaryProps) {
  const rules = schedules.flatMap((s) => s.rules.filter((r) => r.isAvailable));
  const weekly = rules.filter((r) => r.dayOfWeek != null);
  const overrides = rules.filter((r) => r.specificDate != null);

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground text-center">No availability configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {weekly.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-cream2 bg-white">
          <div className="bg-cream px-4 py-2 border-b border-cream2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-mid">
              Weekly Schedule
            </p>
          </div>
          <div className="divide-y divide-cream2">
            {weekly.map((r) => {
              const { label, time } = parseRule(r);
              return (
                <div key={r.id} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-slate-mid font-medium bg-cream2 px-2.5 py-1 rounded-md">{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {overrides.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-cream2 bg-white">
          <div className="bg-cream px-4 py-2 border-b border-cream2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-mid">
              Specific dates
            </p>
          </div>
          <div className="divide-y divide-cream2">
            {overrides.map((r) => {
              const { label, time } = parseRule(r);
              return (
                <div key={r.id} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-slate-mid font-medium bg-cream2 px-2.5 py-1 rounded-md">{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
