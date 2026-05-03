"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useMyOrganization } from "@/hooks/useOrganization";

export function OrgProfileReadonly() {
  const query = useMyOrganization();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>
          Editing org details is coming soon — contact support for changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            {(query.error as ApiError | undefined)?.messages[0] ??
              "Failed to load organization"}
          </p>
        ) : !query.data ? (
          <p className="text-sm text-muted-foreground">
            No organization on this account.
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Field label="Name" value={query.data.name} />
            <Field label="Slug" value={query.data.slug} />
            <Field label="Contact email" value={query.data.contactEmail} />
            <Field
              label="Contact phone"
              value={query.data.contactPhone ?? "—"}
            />
            <Field label="Address" value={query.data.address ?? "—"} full />
            <Field label="Timezone" value={query.data.timezone} />
            <Field
              label="Status"
              value={query.data.approvalStatus}
              badge={
                query.data.approvalStatus === "APPROVED"
                  ? "default"
                  : query.data.approvalStatus === "PENDING"
                    ? "secondary"
                    : "destructive"
              }
            />
            <Field
              label="Active"
              value={query.data.isActive ? "Yes" : "No"}
              badge={query.data.isActive ? "default" : "outline"}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  full,
  badge,
}: {
  label: string;
  value: string;
  full?: boolean;
  badge?: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">
        {badge ? <Badge variant={badge}>{value}</Badge> : value}
      </dd>
    </div>
  );
}
