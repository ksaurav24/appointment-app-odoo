"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useAuth";

import { PoliciesSummary } from "@/components/booking/policies-summary";
import { ScheduleSummary } from "@/components/booking/schedule-summary";
import { ShareDialog } from "@/components/booking/share-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDuration,
  formatDurationRange,
  formatPrice,
} from "@/lib/format";
import type { AppointmentTypeWithRelations } from "@/types";

type ServiceDetailProps = {
  type: AppointmentTypeWithRelations;
  shareToken?: string;
};

function durationLabel(type: AppointmentTypeWithRelations): string {
  if (type.durationMode === "FIXED" && type.durationMinutes != null) {
    return formatDuration(type.durationMinutes);
  }
  if (
    type.durationMode === "VARIABLE" &&
    type.minDurationMins != null &&
    type.maxDurationMins != null
  ) {
    return formatDurationRange(type.minDurationMins, type.maxDurationMins);
  }
  return "Variable";
}

export function ServiceDetail({ type, shareToken }: ServiceDetailProps) {
  const router = useRouter();
  const { data: user, isPending: isUserPending } = useCurrentUser();

  const baseBookHref = shareToken
    ? `/book/${type.id}?token=${encodeURIComponent(shareToken)}`
    : `/book/${type.id}`;

  const finalBookHref = !isUserPending && !user 
    ? `/login?next=${encodeURIComponent(baseBookHref)}` 
    : baseBookHref;

  const entityCount = type.entities.length;
  const priceLabel = type.advancePaymentEnabled
    ? `Pay ${formatPrice(type.advancePaymentAmount)} in advance`
    : "Free";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_300px]">
      {/* Main content */}
      <div className="space-y-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest">{type.organization.name}</p>
          {type.organization.address ? (
            <p className="text-xs text-muted-foreground">{type.organization.address}</p>
          ) : null}
          {type.organization.description ? (
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {type.organization.description}
            </p>
          ) : null}
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            {type.name}
          </h1>
          {type.description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{type.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
              ⏱ {durationLabel(type)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              💳 {priceLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
              {type.entityType === "PERSON" ? "👤" : "📦"} {type.entityType === "PERSON" ? "Staff" : "Resource"}: {entityCount}
            </span>
            {type.maxBookingsPerSlot > 1 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-200">
                👥 Up to {type.maxBookingsPerSlot} per slot
              </span>
            ) : null}
            {type.manualConfirmation ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                ✋ Approval required
              </span>
            ) : null}
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">Availability</h2>
          <ScheduleSummary schedules={type.schedules} />
          <p className="text-xs font-semibold text-slate-light">
            * Times shown in {type.schedules[0]?.timezone ?? type.organization.timezone}.
          </p>
        </section>

        <section className="space-y-4 pt-4 border-t border-border">
          <h2 className="font-heading text-xl font-semibold">Booking policies</h2>
          <div className="rounded-xl border border-cream2 bg-white p-5">
            <PoliciesSummary type={type} />
          </div>
        </section>
      </div>

      {/* Sticky sidebar CTA */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-border shadow-md">
          <div className="bg-forest px-5 py-5">
            <p className="font-heading text-lg font-semibold text-white">{type.name}</p>
            <p className="mt-1 text-xs text-white/70">{type.organization.name}</p>
          </div>
          <div className="bg-card px-5 py-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</p>
              <p className="mt-1 text-xl font-bold text-foreground">{priceLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
              <p className="mt-1 text-sm font-medium text-foreground">{durationLabel(type)}</p>
            </div>
            <Button size="lg" className="w-full" render={<Link href={finalBookHref} />}>
              Book now
            </Button>
            <ShareDialog
              shareUrl={typeof window !== "undefined" ? `${window.location.origin}/services/${type.id}` : ""}
              title={type.name}
              trigger={
                <Button variant="outline" size="sm" className="w-full">
                  Share service
                </Button>
              }
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
