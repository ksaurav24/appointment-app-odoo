import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  CheckmarkCircle02Icon,
  TimeQuarterPassIcon,
} from "@hugeicons/core-free-icons";

import { Card, CardContent } from "@/components/ui/card";

const FEATURES: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  title: string;
  body: string;
}[] = [
  {
    icon: Calendar01Icon,
    title: "Real-time availability",
    body: "See open slots the moment they're added — no double-bookings, no guessing.",
  },
  {
    icon: CheckmarkCircle02Icon,
    title: "Instant confirmation",
    body: "Get a confirmation code and calendar invite the second you book.",
  },
  {
    icon: TimeQuarterPassIcon,
    title: "Reschedule anytime",
    body: "Plans change — move or cancel your appointment within the policy window.",
  },
];

export function LandingFeatures() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Built for both sides of the booking.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Whether you&apos;re booking a haircut or running a clinic, the
            workflow stays out of your way.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} size="sm" className="h-full">
              <CardContent className="space-y-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <HugeiconsIcon icon={f.icon} className="size-5" />
                </div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
