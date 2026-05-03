"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppointmentActionsMenu } from "@/components/organization/appointments/appointment-actions-menu";
import { RescheduleDialog } from "@/components/organization/appointments/reschedule-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useOrgAppointment } from "@/hooks/useOrgAppointments";

export default function AppointmentDetailPage() {
  const params = useParams<{ publicId: string }>();
  const query = useOrgAppointment(params.publicId);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(query.error as ApiError | undefined)?.messages[0] ??
          "Failed to load appointment"}
      </div>
    );
  }

  const a = query.data;
  const assignee = a.bookablePerson?.name ?? a.bookableResource?.name ?? "—";
  const customerLabel = `Customer #${a.customerId.slice(-8)}`;
  const totalLabel =
    a.totalAmount != null ? a.totalAmount : null;

  return (
    <div className="space-y-6">
      <Link
        href="/organization/appointments"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to list
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-2">
            <CardTitle className="font-mono text-lg">
              {a.confirmationCode}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge>{a.status}</Badge>
              <Badge variant="outline">{a.paymentStatus}</Badge>
            </div>
          </div>
          <AppointmentActionsMenu
            publicId={a.publicId}
            status={a.status}
            onReschedule={() => setRescheduleOpen(true)}
          />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Customer" value={customerLabel} mono />
          <Field label="Type" value={a.appointmentType.name} />
          <Field label="Assignee" value={assignee} />
          <Field
            label="Starts"
            value={new Date(a.startTime).toLocaleString()}
          />
          <Field
            label="Ends"
            value={new Date(a.endTime).toLocaleString()}
          />
          <Field label="Duration" value={`${a.durationMins} min`} />
          {totalLabel ? <Field label="Amount" value={totalLabel} /> : null}
          {a.cancellationReason ? (
            <Field
              label="Cancellation reason"
              value={a.cancellationReason}
              full
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking questions</CardTitle>
        </CardHeader>
        <CardContent>
          {!a.answers || a.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No booking questions on this type.
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              {a.answers.map((ans, i) => (
                <div key={ans.question.id ?? i}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {ans.question.questionText}
                  </dt>
                  <dd className="mt-0.5">{ans.answerText ?? "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={a}
      />

      {a.status === "CONFIRMED" ? (
        <div>
          <Button
            variant="outline"
            onClick={() => setRescheduleOpen(true)}
          >
            Reschedule
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  full,
  mono,
}: {
  label: string;
  value: string;
  full?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
