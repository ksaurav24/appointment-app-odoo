# Phase 4 — Appointments Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Prerequisites:** Phase 1 complete. Phase 3 recommended (the type-filter dropdown reuses `useAppointmentTypes`).

**Goal:** Build `/organization/appointments` (list with filters + row actions) and `/organization/appointments/[publicId]` (detail with reschedule/cancel/etc.).

**Spec reference:** §4 of `docs/superpowers/specs/2026-05-03-organizer-pages-design.md`.

---

### Task 19: Appointments list with filters and row actions

**Files:**
- Create: `client/app/organization/appointments/page.tsx`
- Create: `client/components/organization/appointments/status-filter-bar.tsx`
- Create: `client/components/organization/appointments/appointments-table.tsx`
- Create: `client/components/organization/appointments/appointment-actions-menu.tsx`
- Create: `client/components/organization/appointments/reject-dialog.tsx`

- [ ] **Step 1: status-filter-bar.tsx**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import type { AppointmentStatus } from "@/types";

const STATUSES: { value: AppointmentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

export function StatusFilterBar() {
  const router = useRouter();
  const search = useSearchParams();
  const status = search.get("status") ?? "ALL";
  const appointmentTypeId = search.get("appointmentTypeId") ?? "";
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  const upcomingOnly = search.get("upcomingOnly") === "true";

  const types = useAppointmentTypes();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "status" && v === "ALL")) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    next.delete("skip");
    router.push(`?${next.toString()}`);
  };

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            variant={status === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => update({ status: s.value })}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Appointment type</Label>
          <select
            value={appointmentTypeId}
            onChange={(e) =>
              update({ appointmentTypeId: e.target.value || null })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All types</option>
            {(types.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => update({ from: e.target.value || null })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => update({ to: e.target.value || null })}
          />
        </div>
        <div className="flex items-end justify-between rounded-md border px-3 py-2">
          <Label className="text-sm font-normal">Upcoming only</Label>
          <Switch
            checked={upcomingOnly}
            onCheckedChange={(v) =>
              update({ upcomingOnly: v ? "true" : null })
            }
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: reject-dialog.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string;
  variant: "reject" | "cancel";
};

export function ReasonDialog({ open, onOpenChange, publicId, variant }: Props) {
  const { rejectMutation, cancelMutation } = useOrgAppointmentMutations();
  const [reason, setReason] = useState("");

  const mutation = variant === "reject" ? rejectMutation : cancelMutation;
  const title =
    variant === "reject" ? "Reject booking" : "Cancel appointment";

  const submit = () => {
    mutation.mutate(
      { publicId, body: { reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success(variant === "reject" ? "Rejected" : "Cancelled");
          onOpenChange(false);
          setReason("");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Action failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Visible to the customer in the notification."
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Working…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: appointment-actions-menu.tsx**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/organization/appointments/reject-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";
import type { AppointmentStatus } from "@/types";

type Props = {
  publicId: string;
  status: AppointmentStatus;
  onReschedule?: () => void;
};

export function AppointmentActionsMenu({
  publicId,
  status,
  onReschedule,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { approveMutation, completeMutation, noShowMutation } =
    useOrgAppointmentMutations();

  const onError = (err: unknown) => {
    const msg = err instanceof ApiError ? err.messages[0] : "Action failed";
    toast.error(msg);
  };

  const items: { label: string; onClick: () => void; danger?: boolean }[] = [];

  if (status === "PENDING") {
    items.push({
      label: "Approve",
      onClick: () =>
        approveMutation.mutate(publicId, {
          onSuccess: () => toast.success("Approved"),
          onError,
        }),
    });
    items.push({
      label: "Reject",
      onClick: () => setRejectOpen(true),
      danger: true,
    });
  } else if (status === "CONFIRMED") {
    items.push({
      label: "Complete",
      onClick: () =>
        completeMutation.mutate(publicId, {
          onSuccess: () => toast.success("Marked complete"),
          onError,
        }),
    });
    items.push({
      label: "No-show",
      onClick: () =>
        noShowMutation.mutate(publicId, {
          onSuccess: () => toast.success("Marked no-show"),
          onError,
        }),
    });
    if (onReschedule) {
      items.push({ label: "Reschedule", onClick: onReschedule });
    }
    items.push({
      label: "Cancel",
      onClick: () => setCancelOpen(true),
      danger: true,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            ⋯
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {items.map((item, i) => (
            <DropdownMenuItem
              key={i}
              onClick={item.onClick}
              className={item.danger ? "text-destructive" : ""}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
          {items.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem asChild>
            <Link href={`/organization/appointments/${publicId}`}>
              View details
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        publicId={publicId}
        variant="reject"
      />
      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        publicId={publicId}
        variant="cancel"
      />
    </>
  );
}
```

- [ ] **Step 4: appointments-table.tsx**

```tsx
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

export function AppointmentsTable() {
  const router = useRouter();
  const search = useSearchParams();
  const skip = Number(search.get("skip") ?? 0);

  const query: ListOrgAppointmentsQuery = {
    status:
      (search.get("status") as AppointmentStatus | null) ?? undefined,
    appointmentTypeId: search.get("appointmentTypeId") ?? undefined,
    from: search.get("from") ?? undefined,
    to: search.get("to") ?? undefined,
    upcomingOnly: search.get("upcomingOnly") === "true" ? true : undefined,
    skip,
    take: TAKE,
  };

  const list = useOrgAppointments(query);

  // The org-side endpoint returns an array (not paginated), per booking-flow.md.
  // If the backend later switches to pagination, replace this slicing.
  const items = list.data ?? [];

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
                  <TableCell>
                    <div>{a.customer.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.customer.email}
                    </div>
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
          Showing {items.length === 0 ? 0 : skip + 1}–{skip + items.length}
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
            disabled={items.length < TAKE}
            onClick={() => goPage(skip + TAKE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: page.tsx**

```tsx
import { AppointmentsTable } from "@/components/organization/appointments/appointments-table";
import { StatusFilterBar } from "@/components/organization/appointments/status-filter-bar";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointments
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve, manage, and review every booking.
        </p>
      </header>
      <StatusFilterBar />
      <AppointmentsTable />
    </div>
  );
}
```

- [ ] **Step 6: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: filter by status, type, date range, upcoming-only. Approve / reject / complete / no-show / cancel work.

```bash
git add client/app/organization/appointments client/components/organization/appointments
git commit -m "$(cat <<'EOF'
feat(organization): add appointments list with filters and row actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Appointment detail page + reschedule dialog

**Files:**
- Create: `client/app/organization/appointments/[publicId]/page.tsx`
- Create: `client/components/organization/appointments/reschedule-dialog.tsx`

The reschedule flow: organizer picks new start/end + (for MANUAL types) entity → component calls `acquireSlotLock` first → on success calls `rescheduleOrgAppointment` with the lock id → on success the lock is consumed by the server. If the second call fails, attempt `releaseSlotLock` to free the hold.

- [ ] **Step 1: reschedule-dialog.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentType } from "@/hooks/useAppointmentTypes";
import {
  useOrgAppointmentMutations,
  useSlotLockMutations,
} from "@/hooks/useOrgAppointments";
import type { OrgAppointmentDetail } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: OrgAppointmentDetail;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleDialog({ open, onOpenChange, appointment }: Props) {
  const typeQuery = useAppointmentType(appointment.appointmentTypeId);
  const { rescheduleMutation } = useOrgAppointmentMutations();
  const { acquireMutation, releaseMutation } = useSlotLockMutations();

  const [startTime, setStartTime] = useState(toLocalInput(appointment.startTime));
  const [endTime, setEndTime] = useState(toLocalInput(appointment.endTime));
  const [entityId, setEntityId] = useState<string>(
    appointment.bookablePersonId ?? appointment.bookableResourceId ?? "",
  );
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setStartTime(toLocalInput(appointment.startTime));
      setEndTime(toLocalInput(appointment.endTime));
      setEntityId(
        appointment.bookablePersonId ?? appointment.bookableResourceId ?? "",
      );
      setReason("");
    }
  }, [open, appointment]);

  const isManual = typeQuery.data?.assignmentMode === "MANUAL";
  const entities = typeQuery.data?.entities ?? [];

  const submit = async () => {
    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("End time must be after start time.");
      return;
    }
    if (isManual && !entityId) {
      toast.error("Pick an assignee.");
      return;
    }

    let lockId: string | null = null;
    try {
      const lock = await acquireMutation.mutateAsync({
        appointmentTypeId: appointment.appointmentTypeId,
        entityId: isManual ? entityId : undefined,
        startTime: startIso,
        endTime: endIso,
      });
      lockId = lock.id;
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Could not hold slot";
      toast.error(msg);
      return;
    }

    rescheduleMutation.mutate(
      {
        publicId: appointment.publicId,
        body: { slotLockId: lockId, reason: reason.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("Rescheduled");
          onOpenChange(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Reschedule failed";
          toast.error(msg);
          if (lockId) {
            releaseMutation.mutate(lockId);
          }
        },
      },
    );
  };

  const pending =
    acquireMutation.isPending || rescheduleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            The organizer override bypasses cancellation and reschedule
            windows.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>New start</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>New end</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {isManual ? (
            <div className="space-y-1">
              <Label>Assignee</Label>
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Pick one…</option>
                {entities.map((e) => (
                  <option key={e.entityId} value={e.entityId}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Working…" : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: [publicId]/page.tsx**

```tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AppointmentActionsMenu } from "@/components/organization/appointments/appointment-actions-menu";
import { RescheduleDialog } from "@/components/organization/appointments/reschedule-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useOrgAppointment } from "@/hooks/useOrgAppointments";

export default function AppointmentDetailPage() {
  const params = useParams<{ publicId: string }>();
  const query = useOrgAppointment(params.publicId);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(query.error as ApiError | undefined)?.messages[0] ??
          "Failed to load appointment"}
      </div>
    );
  }

  const a = query.data;
  const assignee = a.bookablePerson?.name ?? a.bookableResource?.name ?? "—";

  return (
    <div className="space-y-6">
      <Link
        href="/organization/appointments"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to list
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-2">
            <CardTitle className="font-mono text-lg">
              {a.confirmationCode}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge>{a.status}</Badge>
              <Badge variant="outline">{a.paymentStatus}</Badge>
            </div>
          </div>
          <AppointmentActionsMenu
            publicId={a.publicId}
            status={a.status}
            onReschedule={() => setRescheduleOpen(true)}
          />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Customer" value={a.customer.fullName} />
          <Field label="Email" value={a.customer.email} />
          <Field label="Type" value={a.appointmentType.name} />
          <Field label="Assignee" value={assignee} />
          <Field
            label="Starts"
            value={new Date(a.startTime).toLocaleString()}
          />
          <Field
            label="Ends"
            value={new Date(a.endTime).toLocaleString()}
          />
          {a.cancellationReason ? (
            <Field
              label="Cancellation reason"
              value={a.cancellationReason}
              full
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking questions</CardTitle>
        </CardHeader>
        <CardContent>
          {a.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No booking questions on this type.
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              {a.answers.map((ans) => (
                <div key={ans.id}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {ans.questionText}
                  </dt>
                  <dd className="mt-0.5">{ans.answerText ?? "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      {a.payment ? (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              {a.payment.gateway ?? "Manual"} · {a.payment.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {a.payment.amount} {a.payment.currency}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reschedule history</CardTitle>
        </CardHeader>
        <CardContent>
          {a.reschedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reschedules.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {a.reschedules.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-1 rounded-md border p-3"
                >
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()} ·{" "}
                    {r.rescheduledByRole ?? "?"}
                  </div>
                  <div>
                    <span className="line-through text-muted-foreground">
                      {new Date(r.previousStartTime).toLocaleString()}
                    </span>{" "}
                    → {new Date(a.startTime).toLocaleString()}
                  </div>
                  {r.reason ? (
                    <div className="text-muted-foreground">{r.reason}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={a}
      />

      <div>
        <Button
          variant="outline"
          onClick={() => setRescheduleOpen(true)}
          disabled={a.status !== "CONFIRMED"}
        >
          Reschedule
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: open a CONFIRMED appointment, reschedule it (works for AUTO; pick an assignee for MANUAL); confirm history updates after refetch.

```bash
git add client/app/organization/appointments client/components/organization/appointments/reschedule-dialog.tsx
git commit -m "$(cat <<'EOF'
feat(organization): add appointment detail page with reschedule dialog

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase 4 self-review:** Spec §4 covered. Reschedule flow accounts for the slot-lock requirement from `booking-flow.md`. Status-driven action menu matches spec status branches. Payment/answers/reschedules cards match the spec's stacked-section layout.
