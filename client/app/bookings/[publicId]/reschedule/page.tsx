"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

import { RescheduleStepper } from "@/components/booking/reschedule-stepper";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { useAppointment } from "@/hooks/useBooking";

type Params = { publicId: string };

export default function ReschedulePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { publicId } = use(params);
  const router = useRouter();
  const { data: user, isPending: userPending } = useCurrentUser();
  const { data, isPending, isError } = useAppointment(publicId);

  useEffect(() => {
    if (!userPending && !user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/bookings/${publicId}/reschedule`)}`,
      );
    }
  }, [user, userPending, router, publicId]);

  if (userPending || isPending) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CheckoutShell>
    );
  }

  if (isError || !data) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load this booking.
          </p>
        </div>
      </CheckoutShell>
    );
  }

  if (!data.appointmentType.rescheduleAllowed) {
    return (
      <CheckoutShell exitHref={`/bookings/${publicId}`}>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Reschedule not allowed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This appointment type doesn&apos;t support rescheduling.
          </p>
        </div>
      </CheckoutShell>
    );
  }

  return <RescheduleStepper appointment={data} />;
}
