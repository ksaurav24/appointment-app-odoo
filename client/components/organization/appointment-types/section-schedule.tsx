"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import { ScheduleRuleRow } from "@/components/organization/appointment-types/schedule-rule-row";
import type {
  AppointmentTypeWithRelations,
  ScheduleRuleInput,
  ScheduleType,
} from "@/types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Props = {
  type: AppointmentTypeWithRelations;
};

function formatRule(rule: ScheduleRuleInput): string {
  const dayPart =
    rule.specificDate != null
      ? `On ${rule.specificDate}`
      : (DAY_NAMES[rule.dayOfWeek ?? 0] ?? `Day ${rule.dayOfWeek ?? "?"}`);
  return `${dayPart}: ${rule.startTime}–${rule.endTime}${rule.isAvailable === false ? " (unavailable)" : ""}`;
}

export function SectionSchedule({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { setScheduleMutation, updateMutation } = useAppointmentTypeMutations();

  const initialSchedule = type.schedules[0];

  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initialSchedule?.scheduleType ?? type.scheduleType,
  );
  const [timezone, setTimezone] = useState(initialSchedule?.timezone ?? "");
  const [rules, setRules] = useState<ScheduleRuleInput[]>(
    (initialSchedule?.rules ?? []).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      specificDate: r.specificDate,
      startTime: r.startTime,
      endTime: r.endTime,
      isAvailable: r.isAvailable,
    })),
  );
  const [advanceBookingWindowDays, setAdvanceBookingWindowDays] = useState<string>(
    type.advanceBookingWindowDays?.toString() ?? "30",
  );
  const [minimumNoticePeriodHours, setMinimumNoticePeriodHours] = useState<string>(
    type.minimumNoticePeriodHours?.toString() ?? "0",
  );

  const handleEdit = () => {
    const sched = type.schedules[0];
    setScheduleType(sched?.scheduleType ?? type.scheduleType);
    setTimezone(sched?.timezone ?? "");
    setRules(
      (sched?.rules ?? []).map((r) => ({
        dayOfWeek: r.dayOfWeek,
        specificDate: r.specificDate,
        startTime: r.startTime,
        endTime: r.endTime,
        isAvailable: r.isAvailable,
      })),
    );
    setAdvanceBookingWindowDays(type.advanceBookingWindowDays?.toString() ?? "30");
    setMinimumNoticePeriodHours(type.minimumNoticePeriodHours?.toString() ?? "0");
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        dayOfWeek: 1,
        specificDate: null,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
      },
    ]);
  };

  const handleRuleChange = (idx: number, next: ScheduleRuleInput) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? next : r)));
  };

  const handleRuleDelete = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const validate = (): string | null => {
    if (rules.length === 0) return "Add at least one rule";
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!TIME_RE.test(r.startTime) || !TIME_RE.test(r.endTime)) {
        return `Rule ${i + 1}: invalid time format`;
      }
      if (r.startTime >= r.endTime) {
        return `Rule ${i + 1}: start must be before end`;
      }
      const hasDay = r.dayOfWeek != null;
      const hasDate = r.specificDate != null && r.specificDate !== "";
      if (hasDay === hasDate) {
        return `Rule ${i + 1}: must have exactly one of day-of-week or specific date`;
      }
    }
    return null;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setScheduleMutation.mutate(
      {
        id: type.id,
        body: {
          scheduleType,
          timezone: timezone.trim() || undefined,
          rules,
        },
      },
      {
        onSuccess: () => {
          // Also persist advance booking window + notice period via update
          updateMutation.mutate(
            {
              id: type.id,
              body: {
                advanceBookingWindowDays: Number(advanceBookingWindowDays) || 30,
                minimumNoticePeriodHours: Number(minimumNoticePeriodHours) || 0,
              },
            },
            {
              onSuccess: () => {
                toast.success("Saved");
                setEditing(false);
              },
              onError: (err) => {
                const msg =
                  err instanceof ApiError ? err.messages[0] : "Failed to save booking window";
                toast.error(msg);
              },
            },
          );
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Failed to save";
          toast.error(msg);
        },
      },
    );
  };

  if (!editing) {
    const displayRules = (initialSchedule?.rules ?? []).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      specificDate: r.specificDate,
      startTime: r.startTime,
      endTime: r.endTime,
      isAvailable: r.isAvailable,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{initialSchedule?.scheduleType ?? type.scheduleType}</dd>
            <dt className="text-muted-foreground">Timezone</dt>
            <dd>{initialSchedule?.timezone || <span className="text-muted-foreground">—</span>}</dd>
            <dt className="text-muted-foreground">Advance booking window</dt>
            <dd>
              {type.advanceBookingWindowDays != null
                ? `${type.advanceBookingWindowDays} days`
                : "Unlimited"}
            </dd>
            <dt className="text-muted-foreground">Minimum notice</dt>
            <dd>
              {type.minimumNoticePeriodHours != null
                ? `${type.minimumNoticePeriodHours}h`
                : "None"}
            </dd>
          </dl>
          {displayRules.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No schedule rules configured yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {displayRules.map((r, i) => (
                <li key={i}>{formatRule(r)}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="schedule-type">Schedule type</Label>
            <select
              id="schedule-type"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
            >
              <option value="WEEKLY">WEEKLY</option>
              <option value="FLEXIBLE">FLEXIBLE</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schedule-tz">Timezone (IANA)</Label>
            <Input
              id="schedule-tz"
              value={timezone}
              maxLength={64}
              placeholder="e.g. America/New_York"
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRule}
              >
                Add rule
              </Button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rules yet — add one.</p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <ScheduleRuleRow
                    key={idx}
                    rule={rule}
                    onChange={(next) => handleRuleChange(idx, next)}
                    onDelete={() => handleRuleDelete(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-advance-window">
                Advance booking window (days)
              </Label>
              <Input
                id="schedule-advance-window"
                type="number"
                min={0}
                step={1}
                value={advanceBookingWindowDays}
                onChange={(e) => setAdvanceBookingWindowDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                How many days ahead customers can book. Leave 0 for unlimited.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-notice-period">
                Minimum notice period (hours)
              </Label>
              <Input
                id="schedule-notice-period"
                type="number"
                min={0}
                step={1}
                value={minimumNoticePeriodHours}
                onChange={(e) => setMinimumNoticePeriodHours(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                How many hours before slot a booking can be made.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={setScheduleMutation.isPending || updateMutation.isPending}
            >
              {setScheduleMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
