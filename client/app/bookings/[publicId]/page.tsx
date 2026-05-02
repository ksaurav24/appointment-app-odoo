"use client";

import Link from "next/link";
import { use } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

type Params = { publicId: string };

export default function BookingDetailStubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { publicId } = use(params);
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">Booking</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full booking-management view is coming soon.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Confirmation reference <code>{publicId}</code>
        </p>
        <Button className="mt-6" render={<Link href="/browse" />}>
          Browse services
        </Button>
      </div>
    </PublicShell>
  );
}
