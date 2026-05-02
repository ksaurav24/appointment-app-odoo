# Phase 5–6 — Analytics & Settings Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Prerequisites:** Phase 1 complete. (Settings reuses Task 9's auth-mutation extensions.)

**Goal:** Build `/organization/analytics` (date-range over existing analytics hooks) and `/organization/settings` (read-only org profile + auth actions).

**Spec reference:** §6 and §7.

---

## Phase 5 — Analytics

### Task 21: Analytics page

**Files:**
- Create: `client/app/organization/analytics/page.tsx`

The dashboard already uses `<TimeseriesChart>` and `<BusyHoursHeatmap>` from `client/components/dashboard/`. This task wraps them with date-range controls and full-width layout — no new endpoints, no new hooks.

- [ ] **Step 1: Create page**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BusyHoursHeatmap } from "@/components/dashboard/busy-hours-heatmap";
import { TimeseriesChart } from "@/components/dashboard/timeseries-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useOrgBusyHours,
  useOrgByAppointmentType,
  useOrgTimeseries,
} from "@/hooks/useOrgAnalytics";
import type {
  OrgTimeseriesMetric,
  TimeseriesGranularity,
} from "@/types";

const METRIC_LABEL: Record<OrgTimeseriesMetric, string> = {
  bookings: "Bookings",
  revenue: "Revenue",
  cancellations: "Cancellations",
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const defaults = defaultRange();
  const from = search.get("from") ?? defaults.from;
  const to = search.get("to") ?? defaults.to;
  const granularity =
    (search.get("granularity") as TimeseriesGranularity | null) ?? "day";

  const [metric, setMetric] = useState<OrgTimeseriesMetric>("bookings");

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    router.push(`?${next.toString()}`);
  };

  const rangeValid = from <= to;
  const tsQuery = useOrgTimeseries({
    metric,
    granularity,
    from: rangeValid ? from : undefined,
    to: rangeValid ? to : undefined,
  });
  const byTypeQuery = useOrgByAppointmentType();
  const busyQuery = useOrgBusyHours();

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Drill into bookings, revenue, and demand patterns.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => updateParam("from", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => updateParam("to", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Granularity</Label>
            <select
              value={granularity}
              onChange={(e) => updateParam("granularity", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>
        {!rangeValid ? (
          <p className="text-xs text-destructive">
            “From” must be before “To”.
          </p>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>
            {METRIC_LABEL[metric]} from {from} to {to} ({granularity})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={metric}
            onValueChange={(v) => setMetric(v as OrgTimeseriesMetric)}
          >
            <TabsList>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
            </TabsList>
            <TabsContent value={metric} className="pt-4">
              <TimeseriesChart
                data={tsQuery.data}
                loading={tsQuery.isPending}
                label={METRIC_LABEL[metric]}
                granularity={granularity}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By appointment type (all-time)</CardTitle>
          <CardDescription>
            This breakdown is not date-filtered — backend doesn&apos;t
            support a range here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byTypeQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : byTypeQuery.data && byTypeQuery.data.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {byTypeQuery.data
                .slice()
                .sort((a, b) => b.bookings - a.bookings)
                .map((t) => (
                  <li
                    key={t.appointmentTypeId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.bookings} bookings · {t.revenue}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No data yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Busy hours (last 90 days)</CardTitle>
          <CardDescription>
            When customers actually book — by day-of-week and hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusyHoursHeatmap
            matrix={busyQuery.data?.matrix}
            loading={busyQuery.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: change date range, granularity, and metric; charts re-fetch.

```bash
git add client/app/organization/analytics
git commit -m "$(cat <<'EOF'
feat(organization): add analytics page with date-range controls

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Settings

### Task 22: Settings page

**Files:**
- Create: `client/app/organization/settings/page.tsx`
- Create: `client/components/organization/settings/org-profile-readonly.tsx`
- Create: `client/components/organization/settings/account-section.tsx`
- Create: `client/components/organization/settings/change-password-dialog.tsx`
- Create: `client/components/organization/settings/disable-2fa-dialog.tsx`

- [ ] **Step 1: org-profile-readonly.tsx**

```tsx
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
            <Field
              label="Address"
              value={query.data.address ?? "—"}
              full
            />
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
```

- [ ] **Step 2: change-password-dialog.tsx**

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/hooks/useAuth";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const mutation = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New password does not match confirmation.");
      return;
    }
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password updated");
          onOpenChange(false);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Update failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: disable-2fa-dialog.tsx**

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useDisableTwoFactor } from "@/hooks/useAuth";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function DisableTwoFactorDialog({ open, onOpenChange }: Props) {
  const mutation = useDisableTwoFactor();
  const [password, setPassword] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { currentPassword: password },
      {
        onSuccess: () => {
          toast.success("Two-factor disabled");
          setPassword("");
          onOpenChange(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Disable failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Confirm with current password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Working…" : "Disable"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: account-section.tsx**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ChangePasswordDialog } from "@/components/organization/settings/change-password-dialog";
import { DisableTwoFactorDialog } from "@/components/organization/settings/disable-2fa-dialog";
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
import {
  useCurrentUser,
  useEnableTwoFactor,
  useLogoutAll,
} from "@/hooks/useAuth";

export function AccountSection() {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();
  const enable2faMutation = useEnableTwoFactor();
  const logoutAllMutation = useLogoutAll();
  const [pwOpen, setPwOpen] = useState(false);
  const [disable2faOpen, setDisable2faOpen] = useState(false);

  const handleEnable = () => {
    enable2faMutation.mutate(undefined, {
      onSuccess: () => toast.success("Two-factor enabled"),
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Enable failed";
        toast.error(msg);
      },
    });
  };

  const handleLogoutAll = () => {
    if (!confirm("Sign out from all devices? You will need to log in again.")) {
      return;
    }
    logoutAllMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out everywhere");
        router.push("/login");
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Logout-all failed";
        toast.error(msg);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & security</CardTitle>
        <CardDescription>
          Password, two-factor, and active sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : user ? (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-muted-foreground">{user.email}</div>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">{user.role}</Badge>
              {user.emailVerified ? (
                <Badge variant="default">Email verified</Badge>
              ) : (
                <Badge variant="secondary">Email unverified</Badge>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Password</div>
              <div className="text-xs text-muted-foreground">
                Update your account password.
              </div>
            </div>
            <Button variant="outline" onClick={() => setPwOpen(true)}>
              Change password
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Two-factor</div>
              <div className="text-xs text-muted-foreground">
                {user?.twoFactorEnabled
                  ? "Currently enabled. A code is required at every login."
                  : "Currently disabled."}
              </div>
            </div>
            {user?.twoFactorEnabled ? (
              <Button
                variant="outline"
                onClick={() => setDisable2faOpen(true)}
              >
                Disable
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleEnable}
                disabled={enable2faMutation.isPending}
              >
                {enable2faMutation.isPending ? "Working…" : "Enable"}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Sessions</div>
              <div className="text-xs text-muted-foreground">
                Sign out of every device, including this one.
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogoutAll}
              disabled={logoutAllMutation.isPending}
            >
              {logoutAllMutation.isPending ? "Working…" : "Logout everywhere"}
            </Button>
          </div>
        </div>
      </CardContent>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <DisableTwoFactorDialog
        open={disable2faOpen}
        onOpenChange={setDisable2faOpen}
      />
    </Card>
  );
}
```

- [ ] **Step 5: page.tsx**

```tsx
import { AccountSection } from "@/components/organization/settings/account-section";
import { OrgProfileReadonly } from "@/components/organization/settings/org-profile-readonly";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Account, security, and organization profile.
        </p>
      </header>
      <OrgProfileReadonly />
      <AccountSection />
    </div>
  );
}
```

- [ ] **Step 6: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: org profile loads. Change password works (or fails with the right error toast). Enable then disable 2FA. Logout-all signs out and redirects to /login.

```bash
git add client/app/organization/settings client/components/organization/settings
git commit -m "$(cat <<'EOF'
feat(organization): add settings page with read-only org profile and security actions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phases 5–6 self-review:** Spec §6 and §7 covered. Analytics reuses dashboard components without modifying them. Settings respects the spec constraint (read-only org until backend `PATCH /organizations/me` exists). All four auth mutations from Task 9 are wired.

---

## Final implementation checklist

After all phases land, verify the full surface end-to-end:

- [ ] Dashboard quicklinks all resolve (`/organization/appointments?status=PENDING`, `/organization/appointment-types`, `/organization/inventory`, `/organization/settings`).
- [ ] Sidebar nav items in `client/app/organization/layout.tsx` all reach a real page (Dashboard, Appointments, Appointment types, Inventory, Analytics, Settings).
- [ ] No component imports from `@/lib/api` directly — only via hooks.
- [ ] `useAppStore` (zustand) is unchanged from before this work; no server state was added to it.
- [ ] `bun run typecheck` clean across the whole client.
- [ ] `bun run lint` clean.
- [ ] Manual organizer journey: log in → create inventory → create appointment type → publish → (as customer) book → (as organizer) approve / reschedule / complete.
