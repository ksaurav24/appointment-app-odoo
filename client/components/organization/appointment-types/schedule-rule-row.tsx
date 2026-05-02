"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ScheduleRuleInput } from "@/types";

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
  rule: ScheduleRuleInput;
  onChange: (next: ScheduleRuleInput) => void;
  onDelete: () => void;
};

export function ScheduleRuleRow({ rule, onChange, onDelete }: Props) {
  const isSpecificDate = rule.specificDate != null;

  const handleModeToggle = () => {
    if (isSpecificDate) {
      // Switch to weekly mode
      onChange({
        ...rule,
        dayOfWeek: 1,
        specificDate: null,
      });
    } else {
      // Switch to specific-date mode
      onChange({
        ...rule,
        dayOfWeek: null,
        specificDate: new Date().toISOString().slice(0, 10),
      });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
      {/* Mode toggle */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Mode</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleModeToggle}
            className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            {isSpecificDate ? "Specific date" : "Weekly"}
          </button>
        </div>
      </div>

      {/* Day/date selector */}
      {isSpecificDate ? (
        <div className="space-y-1">
          <Label htmlFor={`date-${rule.specificDate}`} className="text-xs text-muted-foreground">
            Date
          </Label>
          <Input
            id={`date-${rule.specificDate}`}
            type="date"
            className="h-8 w-40 text-sm"
            value={rule.specificDate ?? ""}
            onChange={(e) =>
              onChange({ ...rule, specificDate: e.target.value })
            }
          />
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Day</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={rule.dayOfWeek ?? 1}
            onChange={(e) =>
              onChange({ ...rule, dayOfWeek: Number(e.target.value) })
            }
          >
            {DAY_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Start time */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Start</Label>
        <Input
          type="time"
          className="h-8 w-32 text-sm"
          value={rule.startTime}
          onChange={(e) => onChange({ ...rule, startTime: e.target.value })}
        />
      </div>

      {/* End time */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">End</Label>
        <Input
          type="time"
          className="h-8 w-32 text-sm"
          value={rule.endTime}
          onChange={(e) => onChange({ ...rule, endTime: e.target.value })}
        />
      </div>

      {/* Available switch */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Available</Label>
        <div className="flex h-8 items-center">
          <Switch
            checked={rule.isAvailable ?? true}
            onCheckedChange={(val) => onChange({ ...rule, isAvailable: val })}
          />
        </div>
      </div>

      {/* Delete */}
      <div className="flex h-8 items-center">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
