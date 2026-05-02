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
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{label}</span>
          {icon ? (
            <HugeiconsIcon
              icon={icon}
              className="size-4 text-muted-foreground"
            />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className="font-heading text-2xl font-semibold tracking-tight">
            {value}
          </p>
        )}
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
