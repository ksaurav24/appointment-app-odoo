"use client";

import Link from "next/link";

import { ServiceCard } from "@/components/booking/service-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentTypes } from "@/hooks/usePublicAppointments";

const PREVIEW_LIMIT = 6;

export function LandingServicesPreview() {
  const { data, isPending, isError } = usePublicAppointmentTypes();

  if (isError) return null;

  const services = data?.slice(0, PREVIEW_LIMIT) ?? [];

  if (!isPending && services.length === 0) return null;

  return (
    <section className="border-t bg-muted/20 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Popular services
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A few of the appointments people are booking right now.
            </p>
          </div>
          <Button variant="ghost" size="sm" render={<Link href="/browse" />}>
            Browse all →
          </Button>
        </div>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((type) => (
              <ServiceCard key={type.id} type={type} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
