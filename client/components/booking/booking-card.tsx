"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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

type BookingCardProps = { appointment: AppointmentWithRelations };

export function BookingCard({ appointment }: BookingCardProps) {
  return (
    <Link href={`/bookings/${appointment.publicId}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-base tracking-tight text-foreground">
              {appointment.appointmentType.name}
            </h3>
            <Badge variant={STATUS_VARIANT[appointment.status]}>
              {STATUS_LABEL[appointment.status]}
            </Badge>
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
