"use client";

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeInZone, formatDuration } from "@/lib/format";
import type { AppointmentStatus, AppointmentWithRelations } from "@/types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
  COMPLETED: "bg-blue-50 text-blue-700 border border-blue-200",
  NO_SHOW: "bg-slate-100 text-slate-600 border border-slate-200",
};

type BookingCardProps = { appointment: AppointmentWithRelations };

export function BookingCard({ appointment }: BookingCardProps) {
  return (
    <Link href={`/bookings/${appointment.publicId}`} className="block">
      <Card className="transition-all hover:shadow-md hover:border-amber overflow-hidden border-l-[3px] border-l-border hover:border-l-amber">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-lg tracking-tight text-foreground">
              {appointment.appointmentType.name}
            </h3>
            <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[appointment.status]}`}>
              {STATUS_LABEL[appointment.status]}
            </span>
          </div>
          <p className="text-[13px] text-foreground">{formatDateTimeInZone(appointment.startTime, "UTC")}</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(appointment.durationMins)} · code {appointment.confirmationCode}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
