import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon,
  CheckmarkCircle02Icon,
  TimeQuarterPassIcon,
  CreditCardIcon,
  Notification01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

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
  {
    icon: CreditCardIcon,
    title: "Advance payments",
    body: "Secure upfront payment via Razorpay eliminates no-shows and protects revenue.",
  },
  {
    icon: Notification01Icon,
    title: "Smart notifications",
    body: "Automated email reminders for customers and organizers at configurable intervals.",
  },
  {
    icon: UserGroupIcon,
    title: "Multi-staff support",
    body: "Assign bookings to specific staff or let the system do it automatically.",
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-slate-pale px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-4xl tracking-tight">
            Everything you need to grow.
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-sm text-muted-foreground leading-relaxed">
            Whether you&apos;re booking a haircut or running a clinic, Appointly
            stays out of your way and keeps things moving.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-forest-pale text-forest">
                <HugeiconsIcon icon={f.icon} className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
