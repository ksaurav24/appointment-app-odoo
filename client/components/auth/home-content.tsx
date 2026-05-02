"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export function HomeContent() {
  const { data: user, isPending } = useCurrentUser();

  return (
    <PublicShell showBrowseLink={false}>
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-xl space-y-6 text-center">
          {isPending ? (
            <Spinner className="size-6" />
          ) : (
            <>
              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                {user
                  ? `Welcome back, ${user.fullName.split(" ")[0]}.`
                  : "Appointments, simplified."}
              </h1>
              <p className="text-base text-muted-foreground">
                {user
                  ? "Browse services and book your next appointment."
                  : "Find a service, pick a time, and get booked in minutes."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" render={<Link href="/browse" />}>
                  Browse services
                </Button>
                {!user ? (
                  <Button
                    variant="ghost"
                    size="lg"
                    render={<Link href="/signup" />}
                  >
                    Create an account
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
