"use client";

import { useState } from "react";

import { useAdminAppointments } from "@/hooks/useAdminAppointments";
import type {
  AppointmentStatus,
  ListAdminAppointmentsQuery,
} from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES: Array<AppointmentStatus | "ANY"> = [
  "ANY",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const PAGE_SIZE = 20;

export default function AdminAppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | "ANY">("ANY");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [skip, setSkip] = useState(0);

  const query: ListAdminAppointmentsQuery = {
    take: PAGE_SIZE,
    skip,
    ...(status !== "ANY" ? { status } : {}),
    ...(upcomingOnly ? { upcomingOnly: true } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
  };

  const appointmentsQuery = useAdminAppointments(query);
  const items = appointmentsQuery.data?.items ?? [];
  const total = appointmentsQuery.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointments
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-organization appointment listing for support and moderation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">Status</Label>
              <div className="flex flex-wrap gap-1">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={status === s ? "default" : "outline"}
                    onClick={() => {
                      setStatus(s);
                      setSkip(0);
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="appt-from" className="text-xs">
                From
              </Label>
              <Input
                id="appt-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setSkip(0);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="appt-to" className="text-xs">
                To
              </Label>
              <Input
                id="appt-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setSkip(0);
                }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Label className="flex items-center gap-2 text-xs">
              <Switch
                checked={upcomingOnly}
                onCheckedChange={(checked) => {
                  setUpcomingOnly(checked);
                  setSkip(0);
                }}
              />
              Upcoming only
            </Label>
            <div className="text-xs text-muted-foreground">
              {appointmentsQuery.isFetching ? (
                <Spinner className="size-4" />
              ) : (
                <span>
                  {total.toLocaleString()} appointment
                  {total === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Confirmation</TableHead>
                <TableHead>Start time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointmentsQuery.isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No appointments match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((appt) => (
                  <TableRow key={appt.publicId}>
                    <TableCell className="font-mono text-xs">
                      {appt.confirmationCode}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(appt.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm">{appt.customer.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {appt.customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm">{appt.organization.name}</div>
                        <div className="text-xs text-muted-foreground">
                          /{appt.organization.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.appointmentType.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={appt.paymentStatus} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        skip={skip}
        take={PAGE_SIZE}
        total={total}
        onChange={setSkip}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<
    AppointmentStatus,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    PENDING: { variant: "secondary", label: "Pending" },
    CONFIRMED: { variant: "default", label: "Confirmed" },
    COMPLETED: { variant: "outline", label: "Completed" },
    CANCELLED: { variant: "destructive", label: "Cancelled" },
    NO_SHOW: { variant: "destructive", label: "No-show" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function PaymentBadge({
  status,
}: {
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
}) {
  const map: Record<
    typeof status,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    PAID: { variant: "default", label: "Paid" },
    PENDING: { variant: "secondary", label: "Pending" },
    FAILED: { variant: "destructive", label: "Failed" },
    REFUNDED: { variant: "outline", label: "Refunded" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function Pagination({
  skip,
  take,
  total,
  onChange,
}: {
  skip: number;
  take: number;
  total: number;
  onChange: (next: number) => void;
}) {
  const page = Math.floor(skip / take) + 1;
  const totalPages = Math.max(1, Math.ceil(total / take));
  if (total <= take) return null;
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={skip === 0}
          onClick={() => onChange(Math.max(0, skip - take))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={skip + take >= total}
          onClick={() => onChange(skip + take)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
