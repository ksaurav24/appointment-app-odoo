"use client";

import Link from "next/link";

import { PoliciesSummary } from "@/components/booking/policies-summary";
import { ScheduleSummary } from "@/components/booking/schedule-summary";
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
  const bookHref = shareToken
    ? `/book/${type.id}?token=${encodeURIComponent(shareToken)}`
    : `/book/${type.id}`;

  const entityCount = type.entities.length;
  const priceLabel = type.advancePaymentEnabled
    ? `Pay ${formatPrice(type.advancePaymentAmount)} in advance`
    : "Free";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">{type.organization.name}</p>
          {type.organization.address ? (
            <p className="text-xs text-muted-foreground">
              {type.organization.address}
            </p>
          ) : null}
          {type.organization.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {type.organization.description}
            </p>
          ) : null}
        </section>

        <Separator />

        <section className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {type.name}
          </h1>
          {type.description ? (
            <p className="whitespace-pre-line text-sm">{type.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{durationLabel(type)}</Badge>
            <Badge variant="outline">{priceLabel}</Badge>
            <Badge variant="outline">
              {type.entityType === "PERSON" ? "Staff" : "Resource"}: {entityCount}
            </Badge>
            {type.maxBookingsPerSlot > 1 ? (
              <Badge variant="outline">
                Up to {type.maxBookingsPerSlot} per slot
              </Badge>
            ) : null}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">Availability</h2>
          <ScheduleSummary schedules={type.schedules} />
          <p className="text-xs text-muted-foreground">
            Times shown in {type.schedules[0]?.timezone ?? type.organization.timezone}.
          </p>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">Policies</h2>
          <PoliciesSummary type={type} />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Price
              </p>
              <p className="mt-1 text-lg font-semibold">{priceLabel}</p>
            </div>
            <Button size="lg" className="w-full" render={<Link href={bookHref} />}>
              Book this
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
