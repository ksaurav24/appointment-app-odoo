import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatDurationRange, formatPrice } from "@/lib/format";
import type { PublicAppointmentTypeListItem } from "@/types";

type ServiceCardProps = {
  type: PublicAppointmentTypeListItem;
};

function durationLabel(type: PublicAppointmentTypeListItem): string {
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

export function ServiceCard({ type }: ServiceCardProps) {
  const priceLabel = type.advancePaymentEnabled
    ? `Pay ${formatPrice(type.advancePaymentAmount)} in advance`
    : "Free";

  return (
    <Link href={`/services/${type.id}`} className="group block">
      <Card className="h-full transition-all group-hover:shadow-md group-hover:border-forest overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{type.organization?.name}</p>
            <h3 className="font-heading text-xl tracking-tight text-foreground group-hover:text-forest transition-colors">
              {type.name}
            </h3>
            {type.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed pt-1">
                {type.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-amber-pale px-2 py-1 text-xs font-medium text-amber-900 border border-amber/20">
              {durationLabel(type)}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-pale px-2 py-1 text-xs font-medium text-slate-mid border border-border">
              {priceLabel}
            </span>
            {type.manualConfirmation ? (
              <span className="inline-flex items-center rounded-md bg-slate-pale px-2 py-1 text-xs font-medium text-slate-mid border border-border">
                Manual confirmation
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
