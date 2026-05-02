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
  const tz = "UTC";

  const headline =
    appointment.status === "CONFIRMED"
      ? "You're booked!"
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
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-foreground/5"
        >
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirmation code <code>{appointment.confirmationCode}</code>
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Service</p>
            <p>{appointment.appointmentType.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">When</p>
            <p>{formatDateTimeInZone(appointment.startTime, tz)}</p>
            <p className="text-xs text-muted-foreground">
              Duration {formatDuration(appointment.durationMins)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Payment</p>
            <p>{paymentLine}</p>
          </div>
        </CardContent>
      </Card>

      {appointment.paymentStatus === "PENDING" &&
      appointment.appointmentType.advancePaymentEnabled ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-xs dark:bg-amber-950/30">
          Payment is being processed. We&apos;ll update this page when it
          confirms.
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
