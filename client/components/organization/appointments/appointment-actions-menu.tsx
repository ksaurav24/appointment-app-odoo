"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/organization/appointments/reason-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";
import type { AppointmentStatus } from "@/types";

type Props = {
  publicId: string;
  status: AppointmentStatus;
  onReschedule?: () => void;
};

export function AppointmentActionsMenu({
  publicId,
  status,
  onReschedule,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { approveMutation, completeMutation, noShowMutation } =
    useOrgAppointmentMutations();

  const onError = (err: unknown) => {
    const msg = err instanceof ApiError ? err.messages[0] : "Action failed";
    toast.error(msg);
  };

  const items: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (status === "PENDING") {
    items.push({
      label: "Approve",
      onClick: () =>
        approveMutation.mutate(publicId, {
          onSuccess: () => toast.success("Approved"),
          onError,
        }),
    });
    items.push({
      label: "Reject",
      onClick: () => setRejectOpen(true),
      danger: true,
    });
  } else if (status === "CONFIRMED") {
    items.push({
      label: "Complete",
      onClick: () =>
        completeMutation.mutate(publicId, {
          onSuccess: () => toast.success("Marked complete"),
          onError,
        }),
    });
    items.push({
      label: "No-show",
      onClick: () =>
        noShowMutation.mutate(publicId, {
          onSuccess: () => toast.success("Marked no-show"),
          onError,
        }),
    });
    if (onReschedule) {
      items.push({ label: "Reschedule", onClick: onReschedule });
    }
    items.push({
      label: "Cancel",
      onClick: () => setCancelOpen(true),
      danger: true,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          ⋯
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item, i) => (
            <DropdownMenuItem
              key={i}
              onClick={item.onClick}
              className={item.danger ? "text-destructive" : ""}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
          {items.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            render={
              <Link href={`/organization/appointments/${publicId}`}>
                View details
              </Link>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        publicId={publicId}
        variant="reject"
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        publicId={publicId}
        variant="cancel"
      />
    </>
  );
}
