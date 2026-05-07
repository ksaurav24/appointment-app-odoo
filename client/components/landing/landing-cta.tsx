import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl space-y-5 text-center">
        <h2 className="font-heading text-3xl tracking-tight sm:text-4xl">
          Ready to book your next appointment?
        </h2>
        <p className="text-sm text-muted-foreground">
          Create a free account to track your bookings, save providers, and
          reschedule in one click.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Button size="lg" render={<Link href="/signup" />}>
            Create an account
          </Button>
          <Button variant="ghost" size="lg" render={<Link href="/browse" />}>
            Browse services
          </Button>
        </div>
      </div>
    </section>
  );
}
