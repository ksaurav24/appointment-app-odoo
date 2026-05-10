import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types";

type LandingHeroProps = {
  user: SafeUser | null | undefined;
};

export function LandingHero({ user }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-36">
      {/* Decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-forest-pale opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-amber-pale opacity-40 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl space-y-8 text-center">
        {/* Pill badge */}
        {!user ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest-pale px-4 py-1.5 text-xs font-medium text-forest">
            <span className="size-1.5 rounded-full bg-forest animate-pulse" />
            Real-time appointment scheduling
          </div>
        ) : null}

        <h1 className="font-heading text-5xl leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
          {user ? (
            `Welcome back, ${user.fullName.split(" ")[0]}.`
          ) : (
            <>
              Book appointments,
              <br />
              <span className="text-forest">without the chaos.</span>
            </>
          )}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {user
            ? "Browse services and book your next appointment in minutes."
            : "Appointly connects customers with service providers through a smooth, real-time booking experience. No calls, no back-and-forth — just book."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            className="h-12 px-8 text-base"
            render={<Link href="/browse" />}
          >
            Browse services
          </Button>
          {!user ? (
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
              render={<Link href="/signup" />}
            >
              Start for free →
            </Button>
          ) : null}
        </div>

        {/* Social proof */}
        {!user ? (
          <p className="text-xs text-muted-foreground pt-2">
            Trusted by 500+ service providers · No credit card required
          </p>
        ) : null}
      </div>
    </section>
  );
}
