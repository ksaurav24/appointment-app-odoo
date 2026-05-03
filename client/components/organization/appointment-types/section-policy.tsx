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
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

export function SectionPolicy({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { updateMutation } = useAppointmentTypeMutations();

  const [cancellationAllowed, setCancellationAllowed] = useState(
    type.cancellationAllowed,
  );
  const [cancellationWindowHours, setCancellationWindowHours] = useState<string>(
    type.cancellationWindowHours?.toString() ?? "",
  );
  const [rescheduleAllowed, setRescheduleAllowed] = useState(
    type.rescheduleAllowed,
  );
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState<string>(
    type.rescheduleWindowHours?.toString() ?? "",
  );
  const [maxReschedulesAllowed, setMaxReschedulesAllowed] = useState<string>(
    type.maxReschedulesAllowed?.toString() ?? "",
  );
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState<string>(
    type.maxBookingsPerSlot.toString(),
  );
  const [manageCapacity, setManageCapacity] = useState(type.manageCapacity);

  const handleEdit = () => {
    setCancellationAllowed(type.cancellationAllowed);
    setCancellationWindowHours(type.cancellationWindowHours?.toString() ?? "");
    setRescheduleAllowed(type.rescheduleAllowed);
    setRescheduleWindowHours(type.rescheduleWindowHours?.toString() ?? "");
    setMaxReschedulesAllowed(type.maxReschedulesAllowed?.toString() ?? "");
    setMaxBookingsPerSlot(type.maxBookingsPerSlot.toString());
    setManageCapacity(type.manageCapacity);
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: type.id,
        body: {
          cancellationAllowed,
          cancellationWindowHours: cancellationAllowed
            ? Number(cancellationWindowHours) || undefined
            : undefined,
          rescheduleAllowed,
          rescheduleWindowHours: rescheduleAllowed
            ? Number(rescheduleWindowHours) || undefined
            : undefined,
          maxReschedulesAllowed: rescheduleAllowed
            ? Number(maxReschedulesAllowed) || undefined
            : undefined,
          maxBookingsPerSlot: Number(maxBookingsPerSlot),
          manageCapacity,
        },
      },
      {
        onSuccess: () => {
          toast.success("Saved");
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

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Policy</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cancellation</dt>
            <dd>
              {type.cancellationAllowed
                ? `Allowed (window: ${type.cancellationWindowHours != null ? `${type.cancellationWindowHours}h` : "—"})`
                : "Not allowed"}
            </dd>
            <dt className="text-muted-foreground">Reschedule</dt>
            <dd>
              {type.rescheduleAllowed
                ? [
                    "Allowed",
                    type.rescheduleWindowHours != null
                      ? `window: ${type.rescheduleWindowHours}h`
                      : null,
                    type.maxReschedulesAllowed != null
                      ? `max: ${type.maxReschedulesAllowed}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "Not allowed"}
            </dd>
            <dt className="text-muted-foreground">Bookings per slot</dt>
            <dd>{type.maxBookingsPerSlot}</dd>
            <dt className="text-muted-foreground">Manage capacity</dt>
            <dd>{type.manageCapacity ? "Yes" : "No"}</dd>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Cancellation */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="policy-cancellation"
                checked={cancellationAllowed}
                onCheckedChange={setCancellationAllowed}
              />
              <Label htmlFor="policy-cancellation">Cancellation allowed</Label>
            </div>
            {cancellationAllowed && (
              <div className="space-y-1.5 pl-9">
                <Label htmlFor="policy-cancel-window">
                  Window (hours)
                </Label>
                <Input
                  id="policy-cancel-window"
                  type="number"
                  min={0}
                  step={1}
                  className="w-36"
                  value={cancellationWindowHours}
                  onChange={(e) => setCancellationWindowHours(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Reschedule */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="policy-reschedule"
                checked={rescheduleAllowed}
                onCheckedChange={setRescheduleAllowed}
              />
              <Label htmlFor="policy-reschedule">Reschedule allowed</Label>
            </div>
            {rescheduleAllowed && (
              <div className="space-y-3 pl-9">
                <div className="space-y-1.5">
                  <Label htmlFor="policy-reschedule-window">
                    Window (hours)
                  </Label>
                  <Input
                    id="policy-reschedule-window"
                    type="number"
                    min={0}
                    step={1}
                    className="w-36"
                    value={rescheduleWindowHours}
                    onChange={(e) => setRescheduleWindowHours(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="policy-max-reschedules">
                    Max reschedules
                  </Label>
                  <Input
                    id="policy-max-reschedules"
                    type="number"
                    min={0}
                    step={1}
                    className="w-36"
                    value={maxReschedulesAllowed}
                    onChange={(e) => setMaxReschedulesAllowed(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            <Label htmlFor="policy-max-bookings">Max bookings per slot</Label>
            <Input
              id="policy-max-bookings"
              type="number"
              min={1}
              step={1}
              className="w-36"
              value={maxBookingsPerSlot}
              onChange={(e) => setMaxBookingsPerSlot(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="policy-manage-capacity"
              checked={manageCapacity}
              onCheckedChange={setManageCapacity}
            />
            <Label htmlFor="policy-manage-capacity">Manage capacity</Label>
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
