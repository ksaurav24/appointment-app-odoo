import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types";

type LandingHeroProps = {
  user: SafeUser | null | undefined;
};

export function LandingHero({ user }: LandingHeroProps) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="font-heading text-5xl tracking-tight sm:text-6xl">
          {user
            ? `Welcome back, ${user.fullName.split(" ")[0]}.`
            : "Book your perfect appointment"}
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {user
            ? "Browse services and book your next appointment in minutes."
            : "Find a service, pick a time, and get booked in minutes — no calls, no back-and-forth."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button size="lg" render={<Link href="/browse" />}>
            Browse services
          </Button>
          {!user ? (
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/signup" />}
            >
              Create an account
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
