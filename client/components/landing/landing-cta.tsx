import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-forest px-8 py-16 text-center space-y-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full border border-white/10"
        />

        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Get started today
        </p>
        <h2 className="font-heading text-4xl text-white tracking-tight">
          Ready to simplify bookings?
        </h2>
        <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
          Join thousands of service providers using Appointly to save time,
          reduce no-shows, and delight customers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            className="h-12 px-8 bg-white text-forest font-semibold hover:bg-white/90"
            render={<Link href="/signup" />}
          >
            Get started free
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 px-8 border-white/30 text-white hover:bg-white/10"
            render={<Link href="/browse" />}
          >
            Browse services
          </Button>
        </div>
      </div>
    </section>
  );
}
