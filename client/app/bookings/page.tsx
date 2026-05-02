"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function BookingsStubPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">My bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming soon. You&apos;ll see all your appointments here.
        </p>
        <Button className="mt-4" render={<Link href="/browse" />}>
          Browse services
        </Button>
      </div>
    </PublicShell>
  );
}
