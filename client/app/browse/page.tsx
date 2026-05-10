"use client";

import { useMemo, useState } from "react";

import { ServiceCard } from "@/components/booking/service-card";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentTypes } from "@/hooks/usePublicAppointments";

export default function BrowsePage() {
  const { data, isPending, isError, refetch } = usePublicAppointmentTypes();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((t) => {
      const haystack = `${t.name} ${t.description ?? ""} ${t.slug} ${t.category ?? ""} ${t.organization?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

  return (
    <PublicShell showBrowseLink={false}>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-8 space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Browse services
          </h1>
          <p className="text-sm text-muted-foreground">
            Find a service and pick a time that works for you.
          </p>
          <Input
            placeholder="Search services…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
        </header>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load services.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? "No services match your search." : "No services available yet."}
            </p>
            {query ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((type) => (
              <ServiceCard key={type.id} type={type} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
