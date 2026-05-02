"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentType } from "@/hooks/useAppointmentTypes";
import {
  useAcquireSlotLock,
  useReleaseSlotLock,
} from "@/hooks/useBooking";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";
import type { AppointmentWithRelations } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentWithRelations;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
}: Props) {
  const typeQuery = useAppointmentType(appointment.appointmentTypeId);
  const { rescheduleMutation } = useOrgAppointmentMutations();
  const acquireMutation = useAcquireSlotLock();
  const releaseMutation = useReleaseSlotLock();

  const [startTime, setStartTime] = useState(toLocalInput(appointment.startTime));
  const [endTime, setEndTime] = useState(toLocalInput(appointment.endTime));
  const [entityId, setEntityId] = useState<string>(
    appointment.bookablePersonId ?? appointment.bookableResourceId ?? "",
  );
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setStartTime(toLocalInput(appointment.startTime));
      setEndTime(toLocalInput(appointment.endTime));
      setEntityId(
        appointment.bookablePersonId ?? appointment.bookableResourceId ?? "",
      );
      setReason("");
    }
  }, [open, appointment]);

  const isManual = typeQuery.data?.assignmentMode === "MANUAL";
  const entities = typeQuery.data?.entities ?? [];

  const submit = async () => {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("End time must be after start time.");
      return;
    }
    if (isManual && !entityId) {
      toast.error("Pick an assignee.");
      return;
    }

    let lockId: string | null = null;
    try {
      const lock = await acquireMutation.mutateAsync({
        appointmentTypeId: appointment.appointmentTypeId,
        entityId: isManual ? entityId : undefined,
        startTime: startIso,
        endTime: endIso,
      });
      lockId = lock.id;
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Could not hold slot";
      toast.error(msg);
      return;
    }

    rescheduleMutation.mutate(
      {
        publicId: appointment.publicId,
        body: { slotLockId: lockId, reason: reason.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("Rescheduled");
          onOpenChange(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Reschedule failed";
          toast.error(msg);
          if (lockId) {
            releaseMutation.mutate(lockId);
          }
        },
      },
    );
  };

  const pending = acquireMutation.isPending || rescheduleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Organizer override bypasses cancellation and reschedule windows.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>New start</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>New end</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {isManual ? (
            <div className="space-y-1">
              <Label>Assignee</Label>
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Pick one…</option>
                {entities.map((e) => {
                  const id = e.bookablePersonId ?? e.bookableResourceId;
                  const name =
                    e.bookablePerson?.name ?? e.bookableResource?.name ?? "—";
                  if (!id) return null;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Working…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
