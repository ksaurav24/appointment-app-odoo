"use client";

import Link from "next/link";
import { use } from "react";

import { BookingStepper } from "@/components/booking/booking-stepper";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentType } from "@/hooks/usePublicAppointments";

type Params = { id: string };

export default function BookPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { data, isPending, isError } = usePublicAppointmentType(id);

  if (isPending) {
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
            Service not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This service is no longer accepting bookings.
          </p>
          <Button className="mt-4" render={<Link href="/browse" />}>
            Back to browse
          </Button>
        </div>
      </CheckoutShell>
    );
  }

  return <BookingStepper type={data} />;
}
