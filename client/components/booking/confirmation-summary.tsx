"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildGoogleCalendarUrl } from "@/lib/calendar-link";
import { formatDateTimeInZone, formatDuration } from "@/lib/format";
import type { AppointmentWithRelations } from "@/types";

type ConfirmationSummaryProps = {
  appointment: AppointmentWithRelations;
};

export function ConfirmationSummary({ appointment }: ConfirmationSummaryProps) {
  // Render the time in the org's configured zone so the confirmation matches
  // the wall-clock time the customer picked in the slot list.
  const tz = appointment.appointmentType.organization.timezone;

  // PENDING means two different things depending on the appointment type:
  // an advance-payment hold (payment in flight) vs a manual-approval request
  // (organiser must approve, possibly choosing among competing applicants).
  const isApprovalPending =
    appointment.status === "PENDING" &&
    appointment.appointmentType.manualConfirmation &&
    !appointment.appointmentType.advancePaymentEnabled;

  const headline =
    appointment.status === "CONFIRMED"
      ? "You're booked!"
      : isApprovalPending
        ? "Request submitted"
        : appointment.status === "PENDING"
          ? "Awaiting organizer confirmation"
          : `Booking ${appointment.status.toLowerCase()}`;

  const paymentLine = (() => {
    if (appointment.paymentStatus === "PAID") return "Paid";
    if (appointment.paymentStatus === "PENDING") return "Payment processing";
    if (appointment.paymentStatus === "FAILED") return "Payment failed";
    if (appointment.paymentStatus === "REFUNDED") return "Refunded";
    return appointment.paymentStatus;
  })();

  const calendarUrl = buildGoogleCalendarUrl({
    title: appointment.appointmentType.name,
    startIso: appointment.startTime,
    endIso: appointment.endTime,
    description: `Confirmation code: ${appointment.confirmationCode}`,
  });

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-6 py-12">
      <div className="text-center">
        <div
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-forest-pale"
        >
          <span className="text-2xl text-forest">✓</span>
        </div>
        <h1 className="mt-4 font-heading text-3xl tracking-tight">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirmation code <code className="text-foreground font-medium">{appointment.confirmationCode}</code>
        </p>
      </div>

      {/* Booking summary card — matches booking-card spec from design system */}
      <div className="overflow-hidden rounded-[18px] border border-cream2">
        <div className="bg-forest px-5 py-5">
          <p className="font-heading text-xl text-white">{appointment.appointmentType.name}</p>
          <p className="text-xs text-white/70">
            Booking confirmation · {appointment.confirmationCode}
          </p>
        </div>
        <div className="bg-white px-5 py-4 divide-y divide-cream2">
          <div className="flex justify-between items-center py-2.5 text-[13px]">
            <span className="text-slate-light">When</span>
            <span className="font-medium text-foreground">{formatDateTimeInZone(appointment.startTime, tz)}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 text-[13px]">
            <span className="text-slate-light">Duration</span>
            <span className="font-medium text-foreground">{formatDuration(appointment.durationMins)}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 text-[13px]">
            <span className="text-slate-light">Payment</span>
            <span className="font-medium text-foreground">{paymentLine}</span>
          </div>
        </div>
      </div>

      {appointment.paymentStatus === "PENDING" &&
      appointment.appointmentType.advancePaymentEnabled ? (
        <div className="rounded-[10px] border border-amber bg-amber-pale p-3 text-xs text-amber-deep">
          Payment is being processed. We&apos;ll update this page when it
          confirms.
        </div>
      ) : null}

      {isApprovalPending ? (
        <div className="rounded-[10px] border border-amber bg-amber-pale p-3 text-xs text-amber-deep">
          Other customers may also have requested this slot. The organizer
          will choose who to confirm — you&apos;ll get an email either way.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button render={<a href={calendarUrl} target="_blank" rel="noreferrer" />}>
          Add to Google Calendar
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/bookings/${appointment.publicId}`} />}
        >
          Manage booking
        </Button>
        <Button variant="ghost" render={<Link href="/browse" />}>
          Book another
        </Button>
      </div>
    </div>
  );
}
