import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: Parameters<typeof HugeiconsIcon>[0]["icon"];
  loading?: boolean;
  className?: string;
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  loading,
  className,
}: KpiCardProps) {
  return (
    <Card size="sm" className={cn("gap-3", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-light">
          <span>{label}</span>
          {icon ? (
            <HugeiconsIcon
              icon={icon}
              className="size-4 text-slate-light"
            />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="font-heading text-[28px] text-foreground">
            {value}
          </p>
        )}
        {hint ? (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
