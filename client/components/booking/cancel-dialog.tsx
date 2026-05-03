"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelAppointment } from "@/hooks/useBooking";

type CancelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string;
  onCancelled?: () => void;
};

export function CancelDialog({
  open,
  onOpenChange,
  publicId,
  onCancelled,
}: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const cancel = useCancelAppointment();

  const onSubmit = () => {
    cancel.mutate(
      { publicId, body: reason.trim() ? { reason: reason.trim() } : undefined },
      {
        onSuccess: () => {
          toast.success("Booking cancelled.");
          onOpenChange(false);
          setReason("");
          onCancelled?.();
        },
        onError: (err) => {
          toast.error(err.messages[0] ?? "Couldn't cancel booking.");
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            This action can&apos;t be undone. If a payment was made, refund handling
            depends on the appointment type policy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason" className="text-sm">
            Reason (optional)
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Let the organizer know why"
            rows={3}
            maxLength={500}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>
            Keep booking
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSubmit} disabled={cancel.isPending}>
            {cancel.isPending ? "Cancelling…" : "Cancel booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
