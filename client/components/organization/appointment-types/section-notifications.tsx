"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

/** Convert raw minutes into a human-readable label. */
function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

const QUICK_PRESETS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "1 h", minutes: 60 },
  { label: "2 h", minutes: 120 },
  { label: "24 h", minutes: 1440 },
  { label: "48 h", minutes: 2880 },
];

export function SectionNotifications({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { updateMutation } = useAppointmentTypeMutations();

  const [intervals, setIntervals] = useState<number[]>(
    [...(type.reminderIntervals ?? [])].sort((a, b) => b - a),
  );
  const [customMinutes, setCustomMinutes] = useState("");

  const handleEdit = () => {
    setIntervals([...(type.reminderIntervals ?? [])].sort((a, b) => b - a));
    setCustomMinutes("");
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const addInterval = (minutes: number) => {
    if (minutes < 1) {
      toast.error("Interval must be at least 1 minute");
      return;
    }
    if (intervals.includes(minutes)) {
      toast.error("This interval is already added");
      return;
    }
    setIntervals((prev) => [...prev, minutes].sort((a, b) => b - a));
  };

  const removeInterval = (minutes: number) => {
    setIntervals((prev) => prev.filter((m) => m !== minutes));
  };

  const addCustom = () => {
    const val = parseInt(customMinutes, 10);
    if (isNaN(val) || val < 1) {
      toast.error("Enter a positive number of minutes");
      return;
    }
    addInterval(val);
    setCustomMinutes("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: type.id,
        body: { reminderIntervals: intervals },
      },
      {
        onSuccess: () => {
          toast.success("Notification settings saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Failed to save";
          toast.error(msg);
        },
      },
    );
  };

  const currentIntervals = [...(type.reminderIntervals ?? [])].sort(
    (a, b) => b - a,
  );

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {currentIntervals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reminder intervals configured. Customers will not receive
              automated reminders for this appointment type.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Auto-reminders will be sent:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentIntervals.map((m) => (
                  <Badge key={m} variant="secondary">
                    {formatInterval(m)} before
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label className="mb-2 block">
              Reminder intervals (before appointment)
            </Label>
            {intervals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reminders configured — add one below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {intervals.map((m) => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {formatInterval(m)} before
                    <button
                      type="button"
                      onClick={() => removeInterval(m)}
                      className="ml-0.5 rounded hover:text-destructive"
                      aria-label={`Remove ${formatInterval(m)} reminder`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Quick add
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((p) => (
                <Button
                  key={p.minutes}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={intervals.includes(p.minutes)}
                  onClick={() => addInterval(p.minutes)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom interval */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-custom-minutes" className="text-xs uppercase tracking-wide text-muted-foreground">
              Custom (minutes)
            </Label>
            <div className="flex gap-2">
              <Input
                id="notif-custom-minutes"
                type="number"
                min={1}
                step={1}
                className="w-36"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="e.g. 720"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustom}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              e.g. 720 = 12 hours before, 1440 = 24 hours before
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
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
