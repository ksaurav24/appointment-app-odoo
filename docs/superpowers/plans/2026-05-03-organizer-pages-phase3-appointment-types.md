# Phase 3 — Appointment Types Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Prerequisites:** Phase 1 complete. Phase 2 recommended (its hooks are reused by the entity-picker).

**Goal:** Build `/organization/appointment-types` (list), `/new` (create skeleton), and `[id]` (stacked-cards detail/edit).

**Verification:** `bun run typecheck` + `bun run lint` + manual smoke test in dev server.

**Spec reference:** §5 of `docs/superpowers/specs/2026-05-03-organizer-pages-design.md`.

---

### Task 12: Appointment-types list page

**Files:**
- Create: `client/app/organization/appointment-types/page.tsx`
- Create: `client/components/organization/appointment-types/types-table.tsx`

- [ ] **Step 1: Create types-table.tsx**

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useAppointmentTypeMutations,
  useAppointmentTypes,
} from "@/hooks/useAppointmentTypes";
import type { AppointmentType, ListAppointmentTypesQuery } from "@/types";

function formatDuration(t: AppointmentType): string {
  if (t.durationMode === "FIXED") return `${t.durationMinutes ?? "?"} min`;
  return `${t.minDurationMins ?? "?"}–${t.maxDurationMins ?? "?"} min, step ${t.durationStepMins ?? "?"}`;
}

const FILTERS: { label: string; value: "all" | "published" | "drafts" }[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Drafts", value: "drafts" },
];

export function TypesTable() {
  const [filter, setFilter] = useState<"all" | "published" | "drafts">("all");
  const query: ListAppointmentTypesQuery =
    filter === "all"
      ? {}
      : { published: filter === "published" };

  const list = useAppointmentTypes(query);
  const { deleteMutation } = useAppointmentTypeMutations();

  const handleDelete = (t: AppointmentType) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    deleteMutation.mutate(t.id, {
      onSuccess: () => toast.success("Deleted"),
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link href="/organization/appointment-types/new">Create</Link>
        </Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load appointment types"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.data && list.data.length > 0 ? (
              list.data.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/organization/appointment-types/${t.id}`}
                      className="hover:underline"
                    >
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.entityType}</Badge>
                  </TableCell>
                  <TableCell>{formatDuration(t)}</TableCell>
                  <TableCell>{t.scheduleType}</TableCell>
                  <TableCell>
                    <Badge variant={t.isPublished ? "default" : "secondary"}>
                      {t.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋯
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/organization/appointment-types/${t.id}`}
                          >
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(t)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No appointment types yet — create one to start taking
                  bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
import { TypesTable } from "@/components/organization/appointment-types/types-table";

export default function AppointmentTypesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointment types
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure the services customers can book.
        </p>
      </header>
      <TypesTable />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Run: `cd client && bun run dev`
- Visit `/organization/appointment-types`. List loads (likely empty).
- Filter chips toggle. Create button links to `/new` (404 expected for now).

- [ ] **Step 4: Commit**

```bash
git add client/app/organization/appointment-types/page.tsx client/components/organization/appointment-types/types-table.tsx
git commit -m "feat(organization): add appointment-types list page"
```

---

### Task 13: Create-skeleton page + EntityPicker

**Files:**
- Create: `client/components/organization/appointment-types/entity-picker.tsx`
- Create: `client/app/organization/appointment-types/new/page.tsx`

Reference: `docs/api/02-conventions.md` for the slug regex.

- [ ] **Step 1: Create entity-picker.tsx**

```tsx
"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookablePersons } from "@/hooks/useBookablePersons";
import { useBookableResources } from "@/hooks/useBookableResources";
import type { EntityType } from "@/types";

type Props = {
  entityType: EntityType;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function EntityPicker({ entityType, selectedIds, onChange }: Props) {
  const personsQuery = useBookablePersons(false);
  const resourcesQuery = useBookableResources(false);
  const query = entityType === "PERSON" ? personsQuery : resourcesQuery;
  const items = query.data ?? [];

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (query.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No {entityType === "PERSON" ? "persons" : "resources"} yet.{" "}
        <Link
          href="/organization/inventory"
          className="text-primary hover:underline"
        >
          Add some →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border p-2">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-accent"
        >
          <Checkbox
            checked={selectedIds.includes(item.id)}
            onCheckedChange={() => toggle(item.id)}
          />
          <span className="flex-1 text-sm">{item.name}</span>
          {!item.isActive ? (
            <Badge variant="outline">Inactive</Badge>
          ) : null}
        </label>
      ))}
    </div>
  );
}
```

If `client/components/ui/checkbox.tsx` is missing:

```bash
cd client && bunx shadcn@latest add checkbox
```

- [ ] **Step 2: Create new/page.tsx**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EntityPicker } from "@/components/organization/appointment-types/entity-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type {
  AssignmentMode,
  CreateAppointmentTypeInput,
  DurationMode,
  EntityType,
  ScheduleType,
} from "@/types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function NewAppointmentTypePage() {
  const router = useRouter();
  const { createMutation } = useAppointmentTypeMutations();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("PERSON");
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("AUTO");
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [durationMode, setDurationMode] = useState<DurationMode>("FIXED");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [minDurationMins, setMinDurationMins] = useState(15);
  const [maxDurationMins, setMaxDurationMins] = useState(60);
  const [durationStepMins, setDurationStepMins] = useState(15);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Auto-slug from name unless user has touched the slug field
  const effectiveSlug = slugTouched ? slug : slugify(name);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveSlug && !SLUG_REGEX.test(effectiveSlug)) {
      toast.error("Slug must be lowercase letters, numbers, and dashes only.");
      return;
    }
    if (entityIds.length === 0) {
      toast.error("Select at least one entity.");
      return;
    }
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      toast.error("Times must be HH:MM (24h).");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time.");
      return;
    }

    const body: CreateAppointmentTypeInput = {
      name: name.trim(),
      slug: effectiveSlug || undefined,
      description: description.trim() || undefined,
      entityType,
      assignmentMode,
      entityIds,
      durationMode,
      ...(durationMode === "FIXED"
        ? { durationMinutes }
        : {
            minDurationMins,
            maxDurationMins,
            durationStepMins,
          }),
      scheduleType,
      scheduleRules: [
        {
          dayOfWeek,
          specificDate: null,
          startTime,
          endTime,
          isAvailable: true,
        },
      ],
    };

    createMutation.mutate(body, {
      onSuccess: (created) => {
        toast.success("Appointment type created");
        router.push(`/organization/appointment-types/${created.id}`);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Create failed";
        toast.error(msg);
      },
    });
  };

  if (
    durationMode === "VARIABLE" &&
    minDurationMins >= maxDurationMins
  ) {
    // Soft-validation message handled at submit; no inline error state for v1
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Create appointment type
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the basics. You&apos;ll add more schedule rules and questions
          on the next page.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="at-name">Name</Label>
              <Input
                id="at-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-slug">Slug</Label>
              <Input
                id="at-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder={slugify(name) || "consultation-30min"}
                pattern={SLUG_REGEX.source}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, dashes. Auto-filled from name.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-desc">Description</Label>
              <Textarea
                id="at-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Entity type</Label>
              <RadioGroup
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as EntityType);
                  setEntityIds([]);
                }}
                className="mt-2 flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="PERSON" /> Person
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="RESOURCE" /> Resource
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>Assignment</Label>
              <RadioGroup
                value={assignmentMode}
                onValueChange={(v) => setAssignmentMode(v as AssignmentMode)}
                className="mt-2 flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="AUTO" /> Auto-assign
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="MANUAL" /> Customer chooses
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>Available {entityType === "PERSON" ? "persons" : "resources"}</Label>
              <div className="mt-2">
                <EntityPicker
                  entityType={entityType}
                  selectedIds={entityIds}
                  onChange={setEntityIds}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={durationMode}
              onValueChange={(v) => setDurationMode(v as DurationMode)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="FIXED" /> Fixed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="VARIABLE" /> Variable
              </label>
            </RadioGroup>
            {durationMode === "FIXED" ? (
              <div className="space-y-1">
                <Label htmlFor="at-dur">Duration (minutes)</Label>
                <Input
                  id="at-dur"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Math.max(1, Number(e.target.value) || 1))
                  }
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="at-min">Min</Label>
                  <Input
                    id="at-min"
                    type="number"
                    min={1}
                    value={minDurationMins}
                    onChange={(e) =>
                      setMinDurationMins(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-max">Max</Label>
                  <Input
                    id="at-max"
                    type="number"
                    min={1}
                    value={maxDurationMins}
                    onChange={(e) =>
                      setMaxDurationMins(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-step">Step</Label>
                  <Input
                    id="at-step"
                    type="number"
                    min={1}
                    value={durationStepMins}
                    onChange={(e) =>
                      setDurationStepMins(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initial schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="WEEKLY" /> Weekly recurring
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="FLEXIBLE" /> Flexible
              </label>
            </RadioGroup>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="at-day">Day of week</Label>
                <select
                  id="at-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="at-start">Start</Label>
                <Input
                  id="at-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="at-end">End</Label>
                <Input
                  id="at-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can add more rules after creating the type.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

If `radio-group` is missing:

```bash
cd client && bunx shadcn@latest add radio-group
```

- [ ] **Step 3: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Run: `cd client && bun run dev`
- Click Create from the list page. Fill form. Confirm error toasts on bad input. Successfully create one and confirm redirect to `/organization/appointment-types/[id]` (will 404 until Task 14).

- [ ] **Step 4: Commit**

```bash
git add client/app/organization/appointment-types/new client/components/organization/appointment-types
git commit -m "$(cat <<'EOF'
feat(organization): add appointment-type create wizard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Detail page shell + PublishBar

**Files:**
- Create: `client/app/organization/appointment-types/[id]/page.tsx`
- Create: `client/components/organization/appointment-types/publish-bar.tsx`

- [ ] **Step 1: Create publish-bar.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = { type: AppointmentTypeWithRelations };

export function PublishBar({ type }: Props) {
  const {
    publishMutation,
    unpublishMutation,
    regenerateShareTokenMutation,
  } = useAppointmentTypeMutations();
  const [copied, setCopied] = useState(false);

  const missing: string[] = [];
  if (type.entities.length === 0) missing.push("at least one entity");
  if (type.scheduleRules.length === 0) missing.push("at least one schedule rule");
  const canPublish = missing.length === 0;

  const onError = (err: unknown) => {
    const msg = err instanceof ApiError ? err.messages[0] : "Action failed";
    toast.error(msg);
  };

  const handlePublish = () => {
    publishMutation.mutate(type.id, {
      onSuccess: () => toast.success("Published"),
      onError,
    });
  };
  const handleUnpublish = () => {
    unpublishMutation.mutate(type.id, {
      onSuccess: () => toast.success("Unpublished"),
      onError,
    });
  };
  const handleRegenerate = () => {
    regenerateShareTokenMutation.mutate(type.id, {
      onSuccess: () => toast.success("Share token regenerated"),
      onError,
    });
  };
  const copyShareLink = async () => {
    if (!type.shareToken) return;
    const url = `${window.location.origin}/book/${type.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-4">
      <div className="flex-1 min-w-0">
        <h2 className="font-heading text-xl font-semibold">{type.name}</h2>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={type.isPublished ? "default" : "secondary"}>
            {type.isPublished ? "Published" : "Draft"}
          </Badge>
          {type.shareToken ? (
            <Badge variant="outline">Share link available</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {type.shareToken ? (
          <>
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              {copied ? "Copied" : "Copy share link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateShareTokenMutation.isPending}
            >
              Regenerate
            </Button>
          </>
        ) : null}
        {type.isPublished ? (
          <Button
            variant="outline"
            onClick={handleUnpublish}
            disabled={unpublishMutation.isPending}
          >
            Unpublish
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublish || publishMutation.isPending}
                  >
                    Publish
                  </Button>
                </span>
              </TooltipTrigger>
              {!canPublish ? (
                <TooltipContent>
                  Missing: {missing.join(", ")}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
```

If `tooltip` is missing:

```bash
cd client && bunx shadcn@latest add tooltip
```

- [ ] **Step 2: Create [id]/page.tsx (shell that loads the type)**

```tsx
"use client";

import { useParams } from "next/navigation";

import { PublishBar } from "@/components/organization/appointment-types/publish-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAppointmentType } from "@/hooks/useAppointmentTypes";

export default function AppointmentTypeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useAppointmentType(id);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(query.error as ApiError | undefined)?.messages[0] ??
          "Failed to load appointment type"}
      </div>
    );
  }

  const type = query.data;

  return (
    <div className="space-y-6">
      <PublishBar type={type} />
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Section cards (Basics, Inventory, Schedule, Questions, Policy,
        Danger zone) come in the next tasks.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Smoke test: visit a detail page. Confirm publish bar shows; publishing fails with the disabled-tooltip listing missing prereqs (or succeeds if seeded data has entities + a rule).

- [ ] **Step 4: Commit**

```bash
git add client/app/organization/appointment-types/\[id\]/page.tsx client/components/organization/appointment-types/publish-bar.tsx
git commit -m "$(cat <<'EOF'
feat(organization): add appointment-type detail shell with PublishBar

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Basics + Policy section cards

**Files:**
- Create: `client/components/organization/appointment-types/section-basics.tsx`
- Create: `client/components/organization/appointment-types/section-policy.tsx`
- Create: `client/components/organization/appointment-types/section-danger.tsx`
- Modify: `client/app/organization/appointment-types/[id]/page.tsx`

- [ ] **Step 1: section-basics.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = { type: AppointmentTypeWithRelations };

export function SectionBasics({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(type.name);
  const [slug, setSlug] = useState(type.slug);
  const [description, setDescription] = useState(type.description ?? "");
  const [manualConfirmation, setManualConfirmation] = useState(
    type.manualConfirmation,
  );
  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState(
    type.advancePaymentEnabled,
  );
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState(
    type.advancePaymentAmount ? Number(type.advancePaymentAmount) : 0,
  );
  const { updateMutation } = useAppointmentTypeMutations();

  const cancel = () => {
    setName(type.name);
    setSlug(type.slug);
    setDescription(type.description ?? "");
    setManualConfirmation(type.manualConfirmation);
    setAdvancePaymentEnabled(type.advancePaymentEnabled);
    setAdvancePaymentAmount(
      type.advancePaymentAmount ? Number(type.advancePaymentAmount) : 0,
    );
    setEditing(false);
  };

  const save = () => {
    updateMutation.mutate(
      {
        id: type.id,
        body: {
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          manualConfirmation,
          advancePaymentEnabled,
          advancePaymentAmount: advancePaymentEnabled
            ? advancePaymentAmount
            : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Save failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Basics</CardTitle>
        {editing ? null : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="text-sm font-normal">Manual confirmation</Label>
              <Switch
                checked={manualConfirmation}
                onCheckedChange={setManualConfirmation}
              />
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">
                  Advance payment required
                </Label>
                <Switch
                  checked={advancePaymentEnabled}
                  onCheckedChange={setAdvancePaymentEnabled}
                />
              </div>
              {advancePaymentEnabled ? (
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={advancePaymentAmount}
                    onChange={(e) =>
                      setAdvancePaymentAmount(
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        ) : (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Field label="Name" value={type.name} />
            <Field label="Slug" value={type.slug} />
            <Field
              label="Description"
              value={type.description ?? "—"}
              full
            />
            <Field
              label="Manual confirmation"
              value={type.manualConfirmation ? "Yes" : "No"}
            />
            <Field
              label="Advance payment"
              value={
                type.advancePaymentEnabled
                  ? `Required (${type.advancePaymentAmount ?? "?"})`
                  : "Not required"
              }
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

- [ ] **Step 2: section-policy.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = { type: AppointmentTypeWithRelations };

export function SectionPolicy({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const [cancellationAllowed, setCancellationAllowed] = useState(
    type.cancellationAllowed,
  );
  const [cancellationWindowHours, setCancellationWindowHours] = useState(
    type.cancellationWindowHours ?? 24,
  );
  const [rescheduleAllowed, setRescheduleAllowed] = useState(
    type.rescheduleAllowed,
  );
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState(
    type.rescheduleWindowHours ?? 24,
  );
  const [maxReschedulesAllowed, setMaxReschedulesAllowed] = useState(
    type.maxReschedulesAllowed ?? 3,
  );
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState(
    type.maxBookingsPerSlot,
  );
  const [manageCapacity, setManageCapacity] = useState(type.manageCapacity);
  const { updateMutation } = useAppointmentTypeMutations();

  const cancel = () => {
    setCancellationAllowed(type.cancellationAllowed);
    setCancellationWindowHours(type.cancellationWindowHours ?? 24);
    setRescheduleAllowed(type.rescheduleAllowed);
    setRescheduleWindowHours(type.rescheduleWindowHours ?? 24);
    setMaxReschedulesAllowed(type.maxReschedulesAllowed ?? 3);
    setMaxBookingsPerSlot(type.maxBookingsPerSlot);
    setManageCapacity(type.manageCapacity);
    setEditing(false);
  };

  const save = () => {
    updateMutation.mutate(
      {
        id: type.id,
        body: {
          cancellationAllowed,
          cancellationWindowHours: cancellationAllowed
            ? cancellationWindowHours
            : undefined,
          rescheduleAllowed,
          rescheduleWindowHours: rescheduleAllowed
            ? rescheduleWindowHours
            : undefined,
          maxReschedulesAllowed: rescheduleAllowed
            ? maxReschedulesAllowed
            : undefined,
          maxBookingsPerSlot,
          manageCapacity,
        },
      },
      {
        onSuccess: () => {
          toast.success("Saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Save failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Policy & capacity</CardTitle>
        {editing ? null : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Allow cancellation</Label>
                <Switch
                  checked={cancellationAllowed}
                  onCheckedChange={setCancellationAllowed}
                />
              </div>
              {cancellationAllowed ? (
                <div className="space-y-1">
                  <Label>Cancellation window (hours)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={cancellationWindowHours}
                    onChange={(e) =>
                      setCancellationWindowHours(
                        Math.max(0, Number(e.target.value) || 0),
                      )
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Allow reschedule</Label>
                <Switch
                  checked={rescheduleAllowed}
                  onCheckedChange={setRescheduleAllowed}
                />
              </div>
              {rescheduleAllowed ? (
                <>
                  <div className="space-y-1">
                    <Label>Reschedule window (hours)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={rescheduleWindowHours}
                      onChange={(e) =>
                        setRescheduleWindowHours(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Max reschedules allowed</Label>
                    <Input
                      type="number"
                      min={0}
                      value={maxReschedulesAllowed}
                      onChange={(e) =>
                        setMaxReschedulesAllowed(
                          Math.max(0, Number(e.target.value) || 0),
                        )
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="space-y-1">
                <Label>Max bookings per slot</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxBookingsPerSlot}
                  onChange={(e) =>
                    setMaxBookingsPerSlot(
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Manage capacity</Label>
                <Switch
                  checked={manageCapacity}
                  onCheckedChange={setManageCapacity}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        ) : (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Field
              label="Cancellation"
              value={
                type.cancellationAllowed
                  ? `Up to ${type.cancellationWindowHours ?? "?"}h before`
                  : "Not allowed"
              }
            />
            <Field
              label="Reschedule"
              value={
                type.rescheduleAllowed
                  ? `Up to ${type.rescheduleWindowHours ?? "?"}h before · max ${type.maxReschedulesAllowed ?? "∞"}`
                  : "Not allowed"
              }
            />
            <Field
              label="Bookings per slot"
              value={String(type.maxBookingsPerSlot)}
            />
            <Field
              label="Capacity tracking"
              value={type.manageCapacity ? "On" : "Off"}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 3: section-danger.tsx**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";

type Props = { id: string; name: string };

export function SectionDanger({ id, name }: Props) {
  const router = useRouter();
  const { deleteMutation } = useAppointmentTypeMutations();

  const handleDelete = () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Deleted");
        router.push("/organization/appointment-types");
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Deleting an appointment type that has bookings is not allowed —
          unpublish it instead.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Deleting…" : "Delete appointment type"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Wire into [id]/page.tsx**

Replace the placeholder in `client/app/organization/appointment-types/[id]/page.tsx` with:

```tsx
      <PublishBar type={type} />
      <SectionBasics type={type} />
      <SectionPolicy type={type} />
      <SectionDanger id={type.id} name={type.name} />
```

Add the imports at top:

```tsx
import { SectionBasics } from "@/components/organization/appointment-types/section-basics";
import { SectionPolicy } from "@/components/organization/appointment-types/section-policy";
import { SectionDanger } from "@/components/organization/appointment-types/section-danger";
```

- [ ] **Step 5: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Smoke test: edit basics, edit policy, confirm save round-trips. Try delete on a type with bookings → expect 409 toast verbatim.

- [ ] **Step 6: Commit**

```bash
git add client/app/organization/appointment-types client/components/organization/appointment-types
git commit -m "$(cat <<'EOF'
feat(organization): add basics, policy, and danger zone sections

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Inventory section card

**Files:**
- Create: `client/components/organization/appointment-types/section-inventory.tsx`
- Modify: `client/app/organization/appointment-types/[id]/page.tsx`

- [ ] **Step 1: section-inventory.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { EntityPicker } from "@/components/organization/appointment-types/entity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = { type: AppointmentTypeWithRelations };

export function SectionInventory({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    type.entities.map((e) => e.entityId),
  );
  const { setEntitiesMutation } = useAppointmentTypeMutations();

  const cancel = () => {
    setSelected(type.entities.map((e) => e.entityId));
    setEditing(false);
  };

  const save = () => {
    if (selected.length === 0) {
      toast.error("Select at least one entity.");
      return;
    }
    setEntitiesMutation.mutate(
      { id: type.id, body: { entityIds: selected } },
      {
        onSuccess: () => {
          toast.success("Inventory updated");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Save failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Inventory ({type.entityType})</CardTitle>
          <CardDescription>
            {type.assignmentMode === "AUTO"
              ? "Server picks an entity automatically."
              : "Customer picks one of these at checkout."}
          </CardDescription>
        </div>
        {editing ? null : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <EntityPicker
              entityType={type.entityType}
              selectedIds={selected}
              onChange={setSelected}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={setEntitiesMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={setEntitiesMutation.isPending}
              >
                {setEntitiesMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : type.entities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entities assigned. Add some before publishing.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {type.entities.map((e) => (
              <Badge key={e.id} variant="secondary">
                {e.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add to detail page**

Insert `<SectionInventory type={type} />` between `<SectionBasics />` and `<SectionPolicy />`. Add the import.

- [ ] **Step 3: Verify**

Typecheck + lint + smoke test (edit inventory, confirm save round-trips).

- [ ] **Step 4: Commit**

```bash
git add client/app/organization/appointment-types client/components/organization/appointment-types/section-inventory.tsx
git commit -m "feat(organization): add appointment-type inventory section"
```

---

### Task 17: Schedule section card

**Files:**
- Create: `client/components/organization/appointment-types/section-schedule.tsx`
- Create: `client/components/organization/appointment-types/schedule-rule-row.tsx`
- Modify: `client/app/organization/appointment-types/[id]/page.tsx`

- [ ] **Step 1: schedule-rule-row.tsx**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ScheduleRule } from "@/types";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type Props = {
  rule: ScheduleRule;
  onChange: (next: ScheduleRule) => void;
  onDelete: () => void;
};

export function ScheduleRuleRow({ rule, onChange, onDelete }: Props) {
  const useSpecificDate = rule.specificDate !== null;

  const setMode = (specific: boolean) => {
    if (specific) {
      onChange({
        ...rule,
        dayOfWeek: null,
        specificDate: rule.specificDate ?? new Date().toISOString().slice(0, 10),
      });
    } else {
      onChange({
        ...rule,
        dayOfWeek: rule.dayOfWeek ?? 1,
        specificDate: null,
      });
    }
  };

  return (
    <div className="grid grid-cols-12 items-end gap-2 rounded-md border p-3">
      <div className="col-span-12 flex items-center gap-2 sm:col-span-3">
        <Label className="text-xs text-muted-foreground">
          {useSpecificDate ? "Date override" : "Weekly day"}
        </Label>
        <Switch
          checked={useSpecificDate}
          onCheckedChange={(v) => setMode(v)}
        />
      </div>
      <div className="col-span-6 sm:col-span-3">
        {useSpecificDate ? (
          <Input
            type="date"
            value={rule.specificDate ?? ""}
            onChange={(e) =>
              onChange({ ...rule, specificDate: e.target.value })
            }
          />
        ) : (
          <select
            value={rule.dayOfWeek ?? 1}
            onChange={(e) =>
              onChange({ ...rule, dayOfWeek: Number(e.target.value) })
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="col-span-3 sm:col-span-2">
        <Input
          type="time"
          value={rule.startTime}
          onChange={(e) => onChange({ ...rule, startTime: e.target.value })}
        />
      </div>
      <div className="col-span-3 sm:col-span-2">
        <Input
          type="time"
          value={rule.endTime}
          onChange={(e) => onChange({ ...rule, endTime: e.target.value })}
        />
      </div>
      <div className="col-span-6 sm:col-span-1 flex items-center gap-2">
        <Switch
          checked={rule.isAvailable}
          onCheckedChange={(v) => onChange({ ...rule, isAvailable: v })}
        />
        <span className="text-xs text-muted-foreground">Avail</span>
      </div>
      <div className="col-span-6 flex justify-end sm:col-span-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: section-schedule.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ScheduleRuleRow } from "@/components/organization/appointment-types/schedule-rule-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type {
  AppointmentTypeWithRelations,
  ScheduleRule,
  ScheduleType,
} from "@/types";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Props = { type: AppointmentTypeWithRelations };

export function SectionSchedule({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    type.scheduleType,
  );
  const [timezone, setTimezone] = useState(type.timezone ?? "");
  const [rules, setRules] = useState<ScheduleRule[]>(type.scheduleRules);
  const { setScheduleMutation } = useAppointmentTypeMutations();

  const cancel = () => {
    setScheduleType(type.scheduleType);
    setTimezone(type.timezone ?? "");
    setRules(type.scheduleRules);
    setEditing(false);
  };

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      {
        dayOfWeek: 1,
        specificDate: null,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
      },
    ]);
  };

  const updateRule = (index: number, next: ScheduleRule) => {
    setRules((prev) => prev.map((r, i) => (i === index ? next : r)));
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    if (rules.length === 0) {
      toast.error("Add at least one rule.");
      return;
    }
    for (const r of rules) {
      if (!TIME_REGEX.test(r.startTime) || !TIME_REGEX.test(r.endTime)) {
        toast.error("Times must be HH:MM (24h).");
        return;
      }
      if (r.startTime >= r.endTime) {
        toast.error("End time must be after start time.");
        return;
      }
      if (r.dayOfWeek === null && r.specificDate === null) {
        toast.error("Each rule needs a day of week or a specific date.");
        return;
      }
      if (r.dayOfWeek !== null && r.specificDate !== null) {
        toast.error(
          "A rule cannot have both day of week and specific date.",
        );
        return;
      }
    }
    setScheduleMutation.mutate(
      {
        id: type.id,
        body: {
          scheduleType,
          timezone: timezone.trim() || undefined,
          rules,
        },
      },
      {
        onSuccess: () => {
          toast.success("Schedule saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Save failed";
          toast.error(msg);
        },
      },
    );
  };

  const grouped = type.scheduleRules.reduce<Record<string, ScheduleRule[]>>(
    (acc, r) => {
      const key =
        r.specificDate !== null
          ? `On ${r.specificDate}`
          : DAY_LABELS[r.dayOfWeek ?? 0];
      acc[key] ??= [];
      acc[key].push(r);
      return acc;
    },
    {},
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Schedule</CardTitle>
        {editing ? null : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Schedule type</Label>
                <select
                  value={scheduleType}
                  onChange={(e) =>
                    setScheduleType(e.target.value as ScheduleType)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="WEEKLY">Weekly recurring</option>
                  <option value="FLEXIBLE">Flexible</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Timezone (IANA, optional)</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Asia/Kolkata"
                  maxLength={64}
                />
              </div>
            </div>
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <ScheduleRuleRow
                  key={i}
                  rule={rule}
                  onChange={(next) => updateRule(i, next)}
                  onDelete={() => removeRule(i)}
                />
              ))}
              <Button variant="outline" size="sm" onClick={addRule}>
                + Add rule
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={setScheduleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={setScheduleMutation.isPending}
              >
                {setScheduleMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No schedule rules yet. Add at least one before publishing.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {Object.entries(grouped).map(([key, rs]) => (
              <div key={key} className="flex items-baseline gap-3">
                <div className="w-32 font-medium">{key}</div>
                <div className="text-muted-foreground">
                  {rs
                    .map(
                      (r) =>
                        `${r.startTime}–${r.endTime}${r.isAvailable ? "" : " (closed)"}`,
                    )
                    .join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Wire into [id]/page.tsx**

Insert `<SectionSchedule type={type} />` after `<SectionInventory />`. Add the import.

- [ ] **Step 4: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: edit schedule, add and remove rules, save round-trips.

```bash
git add client/app/organization/appointment-types client/components/organization/appointment-types/section-schedule.tsx client/components/organization/appointment-types/schedule-rule-row.tsx
git commit -m "feat(organization): add appointment-type schedule section"
```

---

### Task 18: Questions section card

**Files:**
- Create: `client/components/organization/appointment-types/booking-question-row.tsx`
- Create: `client/components/organization/appointment-types/section-questions.tsx`
- Modify: `client/app/organization/appointment-types/[id]/page.tsx`

- [ ] **Step 1: booking-question-row.tsx**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BookingQuestion, QuestionType } from "@/types";

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "SINGLE_CHOICE", label: "Single choice" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
];

type Props = {
  question: BookingQuestion;
  onChange: (next: BookingQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

export function BookingQuestionRow({
  question,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const needsOptions =
    question.questionType === "SINGLE_CHOICE" ||
    question.questionType === "MULTIPLE_CHOICE";

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label="Move up"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label="Move down"
          >
            ↓
          </Button>
        </div>
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <Label>Question</Label>
            <Input
              value={question.questionText}
              onChange={(e) =>
                onChange({ ...question, questionText: e.target.value })
              }
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                value={question.questionType}
                onChange={(e) =>
                  onChange({
                    ...question,
                    questionType: e.target.value as QuestionType,
                    options:
                      e.target.value === "SINGLE_CHOICE" ||
                      e.target.value === "MULTIPLE_CHOICE"
                        ? (question.options ?? [])
                        : null,
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3">
              <Label className="text-sm font-normal">Required</Label>
              <Switch
                checked={question.isRequired}
                onCheckedChange={(v) =>
                  onChange({ ...question, isRequired: v })
                }
              />
            </div>
          </div>
          {needsOptions ? (
            <div className="space-y-1">
              <Label>Options (one per line)</Label>
              <Textarea
                value={(question.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    ...question,
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
              />
            </div>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: section-questions.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { BookingQuestionRow } from "@/components/organization/appointment-types/booking-question-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type {
  AppointmentTypeWithRelations,
  BookingQuestion,
} from "@/types";

type Props = { type: AppointmentTypeWithRelations };

export function SectionQuestions({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const [questions, setQuestions] = useState<BookingQuestion[]>(
    [...type.bookingQuestions].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    ),
  );
  const { setQuestionsMutation } = useAppointmentTypeMutations();

  const cancel = () => {
    setQuestions(
      [...type.bookingQuestions].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      ),
    );
    setEditing(false);
  };

  const add = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        questionType: "TEXT",
        isRequired: false,
        options: null,
        displayOrder: prev.length,
      },
    ]);
  };

  const update = (index: number, next: BookingQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
  };

  const remove = (index: number) => {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, displayOrder: i })),
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((q, i) => ({ ...q, displayOrder: i }));
    });
  };

  const save = () => {
    for (const q of questions) {
      if (!q.questionText.trim()) {
        toast.error("Each question needs text.");
        return;
      }
      if (
        (q.questionType === "SINGLE_CHOICE" ||
          q.questionType === "MULTIPLE_CHOICE") &&
        (!q.options || q.options.length === 0)
      ) {
        toast.error("Choice questions need at least one option.");
        return;
      }
    }
    setQuestionsMutation.mutate(
      {
        id: type.id,
        body: { questions },
      },
      {
        onSuccess: () => {
          toast.success("Questions saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Save failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Booking questions</CardTitle>
        {editing ? null : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <BookingQuestionRow
                key={i}
                question={q}
                onChange={(next) => update(i, next)}
                onDelete={() => remove(i)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                isFirst={i === 0}
                isLast={i === questions.length - 1}
              />
            ))}
            <Button variant="outline" size="sm" onClick={add}>
              + Add question
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={cancel}
                disabled={setQuestionsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={setQuestionsMutation.isPending}
              >
                {setQuestionsMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : type.bookingQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions yet. Customers will only need to pick a time.
          </p>
        ) : (
          <ol className="space-y-2 text-sm">
            {[...type.bookingQuestions]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((q, i) => (
                <li key={q.id ?? i} className="flex items-baseline gap-3">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1">
                    {q.questionText}
                    {q.isRequired ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </span>
                  <Badge variant="outline">{q.questionType}</Badge>
                </li>
              ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Wire into [id]/page.tsx**

Insert `<SectionQuestions type={type} />` after `<SectionSchedule />`. Final layout:

```tsx
      <PublishBar type={type} />
      <SectionBasics type={type} />
      <SectionInventory type={type} />
      <SectionSchedule type={type} />
      <SectionQuestions type={type} />
      <SectionPolicy type={type} />
      <SectionDanger id={type.id} name={type.name} />
```

- [ ] **Step 4: Verify + commit**

```bash
cd client && bun run typecheck && bun run lint
```

Smoke test: add and reorder questions, switch types between TEXT and SINGLE_CHOICE, save round-trips.

```bash
git add client/app/organization/appointment-types client/components/organization/appointment-types
git commit -m "$(cat <<'EOF'
feat(organization): add appointment-type questions section

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase 3 self-review:** Spec §5 covered. All section cards use the same edit/save pattern with `react-query` mutations. Type names match: `AppointmentTypeWithRelations`, `ScheduleRule`, `BookingQuestion` flow consistently from Phase 1 types. Tooltip-based publish prereqs match the spec.
