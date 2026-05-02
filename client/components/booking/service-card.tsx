import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatDurationRange, formatPrice } from "@/lib/format";
import type { AppointmentType } from "@/types";

type ServiceCardProps = {
  type: AppointmentType;
};

function durationLabel(type: AppointmentType): string {
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
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              {type.name}
            </h3>
            {type.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {type.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{durationLabel(type)}</Badge>
            <Badge variant="outline">{priceLabel}</Badge>
            {type.manualConfirmation ? (
              <Badge variant="outline">Manual confirmation</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
