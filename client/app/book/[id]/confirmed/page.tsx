"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { ConfirmationSummary } from "@/components/booking/confirmation-summary";
import { PublicShell } from "@/components/layout/public-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointment, appointmentKey } from "@/hooks/useBooking";

const POLL_INTERVAL_MS = 3_000;
const POLL_DURATION_MS = 30_000;

export default function ConfirmedPage() {
  const searchParams = useSearchParams();
  const publicId = searchParams?.get("appointment") ?? undefined;
  const { data, isPending, isError } = useAppointment(publicId);
  const qc = useQueryClient();

  const pollRef = useRef<{ started: number; interval?: ReturnType<typeof setInterval> }>({
    started: 0,
  });
  useEffect(() => {
    if (!data || !publicId) return;
    if (!data.appointmentType.advancePaymentEnabled) return;
    if (data.paymentStatus !== "PENDING") return;
    if (pollRef.current.interval) return;
    pollRef.current.started = Date.now();
    pollRef.current.interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: appointmentKey(publicId) });
      if (Date.now() - pollRef.current.started > POLL_DURATION_MS) {
        clearInterval(pollRef.current.interval!);
        pollRef.current.interval = undefined;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current.interval) {
        clearInterval(pollRef.current.interval);
        pollRef.current.interval = undefined;
      }
    };
  }, [data, publicId, qc]);

  return (
    <PublicShell showBrowseLink={false}>
      {isPending ? (
        <div className="mx-auto max-w-xl space-y-4 px-6 py-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load this confirmation.
          </p>
        </div>
      ) : (
        <ConfirmationSummary appointment={data} />
      )}
    </PublicShell>
  );
}
