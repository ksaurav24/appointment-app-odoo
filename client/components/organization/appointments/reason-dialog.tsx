"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string;
  variant: "reject" | "cancel";
};

export function ReasonDialog({
  open,
  onOpenChange,
  publicId,
  variant,
}: Props) {
  const { rejectMutation, cancelMutation } = useOrgAppointmentMutations();
  const [reason, setReason] = useState("");

  const mutation = variant === "reject" ? rejectMutation : cancelMutation;
  const title = variant === "reject" ? "Reject booking" : "Cancel appointment";

  const submit = () => {
    mutation.mutate(
      { publicId, body: { reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(variant === "reject" ? "Rejected" : "Cancelled");
          onOpenChange(false);
          setReason("");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Action failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Visible to the customer in the notification."
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
