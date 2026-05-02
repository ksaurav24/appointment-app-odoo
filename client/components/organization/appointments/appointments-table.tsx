"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AppointmentActionsMenu } from "@/components/organization/appointments/appointment-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { useOrgAppointments } from "@/hooks/useOrgAppointments";
import type {
  AppointmentStatus,
  ListOrgAppointmentsQuery,
  PaymentStatus,
} from "@/types";

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const PAYMENT_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  PAID: "default",
  FAILED: "destructive",
  REFUNDED: "outline",
};

const TAKE = 20;

function shortCustomer(customerId: string): string {
  return `Customer #${customerId.slice(-8)}`;
}

export function AppointmentsTable() {
  const router = useRouter();
  const search = useSearchParams();
  const skip = Math.max(0, Number(search.get("skip") ?? 0));

  const query: ListOrgAppointmentsQuery = {
    status:
      (search.get("status") as AppointmentStatus | null) ?? undefined,
    appointmentTypeId: search.get("appointmentTypeId") ?? undefined,
    from: search.get("from") ?? undefined,
    to: search.get("to") ?? undefined,
    upcomingOnly: search.get("upcomingOnly") === "true" ? true : undefined,
  };

  const list = useOrgAppointments(query);
  const all = list.data ?? [];
  const items = all.slice(skip, skip + TAKE);

  const goPage = (newSkip: number) => {
    const next = new URLSearchParams(search.toString());
    if (newSkip <= 0) next.delete("skip");
    else next.set("skip", String(newSkip));
    router.push(`?${next.toString()}`);
  };

  return (
    <div className="space-y-3">
      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load appointments"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((a) => (
                <TableRow key={a.publicId}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/organization/appointments/${a.publicId}`}
                      className="hover:underline"
                    >
                      {new Date(a.startTime).toLocaleString()}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortCustomer(a.customerId)}
                  </TableCell>
                  <TableCell>{a.appointmentType.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.bookablePerson?.name ?? a.bookableResource?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PAYMENT_VARIANT[a.paymentStatus]}>
                      {a.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AppointmentActionsMenu
                      publicId={a.publicId}
                      status={a.status}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No appointments match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {items.length === 0
            ? "0"
            : `${skip + 1}–${skip + items.length}`}
          {all.length > 0 ? ` of ${all.length}` : ""}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={skip === 0}
            onClick={() => goPage(Math.max(0, skip - TAKE))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={skip + TAKE >= all.length}
            onClick={() => goPage(skip + TAKE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
