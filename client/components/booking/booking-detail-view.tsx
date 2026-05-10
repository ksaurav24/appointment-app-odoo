"use client";

import Link from "next/link";
import { useState } from "react";

import { CancelDialog } from "@/components/booking/cancel-dialog";
import { CheckInQrDialog } from "@/components/booking/check-in-qr-dialog";
import { RateReviewDialog } from "@/components/booking/rate-review-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildGoogleCalendarUrl } from "@/lib/calendar-link";
import { downloadIcs } from "@/lib/ics-generator";
import { downloadReceipt } from "@/lib/pdf-receipt";
import {
  formatDateTimeInZone,
  formatDuration,
  formatPrice,
} from "@/lib/format";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "⏳ Pending",
  CONFIRMED: "✓ Confirmed",
  CANCELLED: "✕ Cancelled",
  COMPLETED: "✓ Completed",
  NO_SHOW: "✕ No-show",
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
  const [qrOpen, setQrOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  
  const tz = appointment.appointmentType.organization.timezone;
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
        <Link href="/bookings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← All bookings
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl tracking-tight text-foreground">
              {appointment.appointmentType.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Confirmation code <code className="text-foreground font-medium">{appointment.confirmationCode}</code>
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[appointment.status]}>
            {STATUS_LABEL[appointment.status]}
          </Badge>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Booking details card — styled like booking-card from design system */}
        <div className="overflow-hidden rounded-[18px] border border-cream2">
          <div className="bg-forest px-5 py-5">
            <p className="font-heading text-xl text-white">{appointment.appointmentType.name}</p>
            <p className="text-xs text-white/70">
              Booking details · {appointment.confirmationCode}
            </p>
          </div>
          <div className="bg-white divide-y divide-cream2">
            <div className="flex justify-between items-center px-5 py-3 text-[13px]">
              <span className="text-slate-light">When</span>
              <span className="font-medium text-foreground">{formatDateTimeInZone(appointment.startTime, tz)}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3 text-[13px]">
              <span className="text-slate-light">Duration</span>
              <span className="font-medium text-foreground">
                {formatDuration(appointment.durationMins)}
              </span>
            </div>
            {entityName ? (
              <div className="flex justify-between items-center px-5 py-3 text-[13px]">
                <span className="text-slate-light">
                  {appointment.bookablePerson ? "Provider" : "Resource"}
                </span>
                <span className="font-medium text-foreground">{entityName}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center px-5 py-3 text-[13px]">
              <span className="text-slate-light">Capacity</span>
              <span className="font-medium text-foreground">
                {appointment.capacityBooked} seat{appointment.capacityBooked === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex justify-between items-center px-5 py-3 text-[13px]">
              <span className="text-slate-light">Payment</span>
              <span className="font-medium text-foreground">{paymentLine}</span>
            </div>
            {appointment.appointmentType.advancePaymentEnabled ? (
              <div className="flex justify-between items-center px-5 py-3 text-[13px]">
                <span className="text-slate-light">Amount</span>
                <span className="font-medium text-foreground">
                  {formatPrice(appointment.appointmentType.advancePaymentAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between items-center px-5 py-3 text-[13px]">
              <span className="text-slate-light">Status</span>
              <Badge variant={STATUS_VARIANT[appointment.status]}>
                {STATUS_LABEL[appointment.status]}
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-slate-pale px-5 py-3.5 border-b border-cream2">
            {(appointment.status === "CONFIRMED" || appointment.status === "PENDING") ? (
              <>
                <Button variant="outline" size="sm" onClick={() => downloadIcs(appointment)}>
                  Add to Calendar
                </Button>
                {appointment.status === "CONFIRMED" ? (
                  <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                    Check-in QR
                  </Button>
                ) : null}
              </>
            ) : null}
            
            {appointment.paymentStatus === "PAID" ? (
              <Button variant="outline" size="sm" onClick={() => downloadReceipt(appointment)}>
                Download Receipt
              </Button>
            ) : null}

            {appointment.status === "COMPLETED" ? (
              <Button variant="outline" size="sm" onClick={() => setRateOpen(true)}>
                Rate & Review
              </Button>
            ) : null}

            {(appointment.status === "COMPLETED" || appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") ? (
              <Button variant="outline" size="sm" render={<Link href={`/book/${appointment.appointmentTypeId}`} />}>
                Re-book
              </Button>
            ) : null}
          </div>

          {(canCancel || canReschedule) ? (
            <div className="flex gap-2 bg-slate-pale px-5 py-3.5">
              {canReschedule ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  render={
                    <Link href={`/bookings/${appointment.publicId}/reschedule`} />
                  }
                >
                  Reschedule
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel booking
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {appointment.cancellationReason ? (
          <div className="rounded-[10px] border border-coral bg-coral-pale p-4 text-sm">
            <p className="text-xs font-semibold text-coral mb-1">Cancellation reason</p>
            <p className="text-muted-foreground whitespace-pre-line">{appointment.cancellationReason}</p>
          </div>
        ) : null}

        {appointment.answers && appointment.answers.length > 0 ? (
          <div className="rounded-[14px] border border-cream2 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-light mb-3">
              Your answers
            </p>
            <ul className="space-y-3">
              {appointment.answers.map((a, i) => (
                <li key={i} className="border-b border-cream2 pb-3 last:border-b-0 last:pb-0">
                  <p className="text-xs text-muted-foreground">
                    {a.question.questionText}
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{a.answerText ?? "—"}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        publicId={appointment.publicId}
      />
      <CheckInQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        confirmationCode={appointment.confirmationCode}
        serviceName={appointment.appointmentType.name}
      />
      <RateReviewDialog
        open={rateOpen}
        onOpenChange={setRateOpen}
        publicId={appointment.publicId}
      />
    </div>
  );
}
