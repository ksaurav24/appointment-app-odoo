"use client";

import Link from "next/link";
import { useState } from "react";

import { CancelDialog } from "@/components/booking/cancel-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDateTimeInZone,
  formatDuration,
  formatPrice,
} from "@/lib/format";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
};

type Props = { appointment: AppointmentWithRelations };

function isCancellable(a: AppointmentWithRelations, now = Date.now()): boolean {
  if (a.status === "CANCELLED" || a.status === "COMPLETED" || a.status === "NO_SHOW") {
    return false;
  }
  if (!a.appointmentType.cancellationAllowed) return false;
  const window = a.appointmentType.cancellationWindowHours;
  if (window == null) return true;
  const startMs = new Date(a.startTime).getTime();
  return startMs - now >= window * 3_600_000;
}

function isReschedulable(a: AppointmentWithRelations, now = Date.now()): boolean {
  if (a.status !== "PENDING" && a.status !== "CONFIRMED") return false;
  if (!a.appointmentType.rescheduleAllowed) return false;
  if (
    a.appointmentType.maxReschedulesAllowed != null &&
    a.rescheduleCount >= a.appointmentType.maxReschedulesAllowed
  ) {
    return false;
  }
  const window = a.appointmentType.rescheduleWindowHours;
  if (window == null) return true;
  const startMs = new Date(a.startTime).getTime();
  return startMs - now >= window * 3_600_000;
}

export function BookingDetailView({ appointment }: Props) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const tz = "UTC";
  const canCancel = isCancellable(appointment);
  const canReschedule = isReschedulable(appointment);

  const paymentLine = (() => {
    if (!appointment.appointmentType.advancePaymentEnabled) return "Free";
    if (appointment.paymentStatus === "PAID") return "Paid";
    if (appointment.paymentStatus === "PENDING") return "Payment processing";
    if (appointment.paymentStatus === "FAILED") return "Payment failed";
    if (appointment.paymentStatus === "REFUNDED") return "Refunded";
    return appointment.paymentStatus;
  })();

  const entityName =
    appointment.bookablePerson?.name ??
    appointment.bookableResource?.name ??
    null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="space-y-3">
        <Link href="/bookings" className="text-xs text-muted-foreground hover:underline">
          ← All bookings
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {appointment.appointmentType.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Confirmation code <code>{appointment.confirmationCode}</code>
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[appointment.status]}>
            {STATUS_LABEL[appointment.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <Card>
          <CardContent className="space-y-4 p-5 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">When</p>
              <p>{formatDateTimeInZone(appointment.startTime, tz)}</p>
              <p className="text-xs text-muted-foreground">
                Duration {formatDuration(appointment.durationMins)} · ends{" "}
                {formatDateTimeInZone(appointment.endTime, tz)}
              </p>
            </div>
            {entityName ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {appointment.bookablePerson ? "With" : "Resource"}
                </p>
                <p>{entityName}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase text-muted-foreground">Capacity</p>
              <p>
                {appointment.capacityBooked} seat
                {appointment.capacityBooked === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Payment</p>
              <p>{paymentLine}</p>
              {appointment.appointmentType.advancePaymentEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {formatPrice(appointment.appointmentType.advancePaymentAmount)}
                </p>
              ) : null}
            </div>
            {appointment.cancellationReason ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Cancellation reason
                </p>
                <p className="whitespace-pre-line">{appointment.cancellationReason}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {appointment.answers && appointment.answers.length > 0 ? (
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="text-xs uppercase text-muted-foreground">
                Your answers
              </p>
              <ul className="space-y-2">
                {appointment.answers.map((a, i) => (
                  <li key={i}>
                    <p className="text-xs text-muted-foreground">
                      {a.question.questionText}
                    </p>
                    <p>{a.answerText ?? "—"}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {canCancel || canReschedule ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              {canReschedule ? (
                <Button
                  variant="outline"
                  render={
                    <Link href={`/bookings/${appointment.publicId}/reschedule`} />
                  }
                >
                  Reschedule
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel booking
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        publicId={appointment.publicId}
      />
    </div>
  );
}
