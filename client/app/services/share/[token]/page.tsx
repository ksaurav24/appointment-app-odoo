"use client";

import { use } from "react";

import { ServiceDetail } from "@/components/booking/service-detail";
import { PublicShell } from "@/components/layout/public-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentTypeByToken } from "@/hooks/usePublicAppointments";

type Params = { token: string };

export default function ServiceShareTokenPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = use(params);
  const { data, isPending, isError } = usePublicAppointmentTypeByToken(token);

  return (
    <PublicShell>
      {isPending ? (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-4 w-72" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Invalid link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link is invalid or has been revoked.
          </p>
        </div>
      ) : (
        <ServiceDetail type={data} shareToken={token} />
      )}
    </PublicShell>
  );
}
