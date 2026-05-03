"use client";

import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import type { Schedule, ScheduleRule } from "@/types";

type AvailabilityCalendarProps = {
  schedules: Schedule[];
  selected: string | undefined;
  onSelect: (dateIso: string) => void;
};

function weeklyDays(rules: ScheduleRule[]): Set<number> {
  return new Set(
    rules
      .filter((r) => r.isAvailable && r.dayOfWeek != null)
      .map((r) => r.dayOfWeek as number),
  );
}

function specificDates(rules: ScheduleRule[]): Set<string> {
  return new Set(
    rules
      .filter((r) => r.isAvailable && r.specificDate != null)
      .map((r) => r.specificDate as string),
  );
}

export function AvailabilityCalendar({
  schedules,
  selected,
  onSelect,
}: AvailabilityCalendarProps) {
  const allRules = schedules.flatMap((s) => s.rules);
  const days = weeklyDays(allRules);
  const dates = specificDates(allRules);
  // No rules means the caller has no client-side schedule data (e.g. reschedule
  // flow): allow any future date and defer to the server's per-date availability.
  const hasRules = days.size > 0 || dates.size > 0;

  const isDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (!hasRules) return false;

    const yyyymmdd = format(date, "yyyy-MM-dd");
    if (dates.has(yyyymmdd)) return false;
    return !days.has(date.getDay());
  };

  return (
    <Calendar
      mode="single"
      selected={selected ? new Date(selected) : undefined}
      onSelect={(date) => {
        if (date) onSelect(format(date, "yyyy-MM-dd"));
      }}
      disabled={isDisabled}
    />
  );
}
