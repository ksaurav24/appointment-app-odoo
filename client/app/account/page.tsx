"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function AccountStubPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account settings are coming soon.
        </p>
        <Button className="mt-4" render={<Link href="/" />}>
          Home
        </Button>
      </div>
    </PublicShell>
  );
}
