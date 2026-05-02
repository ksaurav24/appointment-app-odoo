# Organizer Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all missing organizer pages under `client/app/organization/` (inventory, appointment-types, appointments, analytics, settings) wired to existing NestJS endpoints, following the per-resource hook pattern.

**Architecture:** Phase 1 builds the foundation (types → `lib/api.ts` functions → React Query hook files). Phases 2–6 build pages on top. Components import only from `@/hooks/*`; never from `@/lib/api`. Zustand is not touched — all server state lives in React Query.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + TanStack Query (already in use) + axios (existing shared instance) + shadcn/ui + sonner + recharts. **No new dependencies.** Forms use plain `useState` + `<form onSubmit>` (matching existing `LoginForm` style — react-hook-form is not installed and not required).

**Verification model:** The client has no test framework set up. Verification is `bun run typecheck` + `bun run lint` + manual smoke test in the dev server (`bun run dev`). Each task lists explicit verification commands — run them and confirm output before committing.

**Working directory:** All paths in this plan are relative to repo root `C:\Users\ksaur\code\appointment-app-odoo`. Bash commands assume that as cwd unless prefixed with `cd client &&`.

**Spec reference:** `docs/superpowers/specs/2026-05-03-organizer-pages-design.md`. Re-read the spec section for any task you're unsure about — don't paraphrase from this plan if the spec disagrees.

**Doc cross-references for endpoint contracts** (load when implementing the matching task):
- `docs/api/modules/bookable-inventory.md` — Tasks 3, 6
- `docs/api/modules/appointment-types.md` — Tasks 4, 7, 12–18
- `docs/api/modules/booking-flow.md` (organizer endpoints, slot-locks) — Tasks 5, 8, 19, 20
- `docs/api/02-conventions.md` — slug regex, BigInt-string handling, error shape
- `docs/api/03-enums.md` — exact enum values

---

## Phase 1 — Foundation (types, API, hooks)

### Task 1: Add bookable-inventory types

**Files:**
- Modify: `client/types/index.ts` (append at end)

- [ ] **Step 1: Append types**

Append to `client/types/index.ts`:

```ts
// ─── Bookable inventory ────────────────────────────────────────
export type BookablePerson = {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookablePersonInput = {
  name: string;
  contactEmail: string;
  phone?: string;
  designation?: string;
  isActive?: boolean;
};

export type UpdateBookablePersonInput = Partial<CreateBookablePersonInput>;

export type BookableResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string | null;
  description: string | null;
  capacity: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookableResourceInput = {
  name: string;
  resourceType?: string;
  description?: string;
  capacity?: number;
  location?: string;
  isActive?: boolean;
};

export type UpdateBookableResourceInput = Partial<CreateBookableResourceInput>;

export type DeleteResult = { deleted: "soft" | "hard" };
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add client/types/index.ts
git commit -m "$(cat <<'EOF'
types: add bookable-inventory types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add appointment-types and org-appointment types

**Files:**
- Modify: `client/types/index.ts` (append after Task 1 additions)

- [ ] **Step 1: Append types**

Append to `client/types/index.ts`:

```ts
// ─── Appointment types ─────────────────────────────────────────
export type EntityType = "PERSON" | "RESOURCE";
export type ScheduleType = "WEEKLY" | "FLEXIBLE";
export type DurationMode = "FIXED" | "VARIABLE";
export type AssignmentMode = "AUTO" | "MANUAL";
export type QuestionType =
  | "TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "NUMBER"
  | "DATE";

export type ScheduleRule = {
  id?: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type BookingQuestion = {
  id?: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: string[] | null;
  displayOrder: number;
};

export type AppointmentType = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  entityType: EntityType;
  assignmentMode: AssignmentMode;
  durationMode: DurationMode;
  durationMinutes: number | null;
  minDurationMins: number | null;
  maxDurationMins: number | null;
  durationStepMins: number | null;
  scheduleType: ScheduleType;
  timezone: string | null;
  maxBookingsPerSlot: number;
  manageCapacity: boolean;
  manualConfirmation: boolean;
  advancePaymentEnabled: boolean;
  advancePaymentAmount: string | null;
  cancellationAllowed: boolean;
  cancellationWindowHours: number | null;
  rescheduleAllowed: boolean;
  rescheduleWindowHours: number | null;
  maxReschedulesAllowed: number | null;
  isPublished: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentTypeWithRelations = AppointmentType & {
  entities: { id: string; entityId: string; name: string }[];
  scheduleRules: ScheduleRule[];
  bookingQuestions: BookingQuestion[];
};

export type CreateAppointmentTypeInput = {
  name: string;
  slug?: string;
  description?: string;
  entityType: EntityType;
  assignmentMode: AssignmentMode;
  entityIds: string[];
  durationMode: DurationMode;
  durationMinutes?: number;
  minDurationMins?: number;
  maxDurationMins?: number;
  durationStepMins?: number;
  scheduleType: ScheduleType;
  timezone?: string;
  scheduleRules: ScheduleRule[];
  maxBookingsPerSlot?: number;
  manageCapacity?: boolean;
  manualConfirmation?: boolean;
  advancePaymentEnabled?: boolean;
  advancePaymentAmount?: number;
  cancellationAllowed?: boolean;
  cancellationWindowHours?: number;
  rescheduleAllowed?: boolean;
  rescheduleWindowHours?: number;
  maxReschedulesAllowed?: number;
  bookingQuestions?: BookingQuestion[];
};

export type UpdateAppointmentTypeInput = Partial<
  Omit<
    CreateAppointmentTypeInput,
    "entityIds" | "scheduleRules" | "bookingQuestions"
  >
>;

export type SetEntitiesInput = { entityIds: string[] };
export type SetScheduleInput = {
  scheduleType: ScheduleType;
  timezone?: string;
  rules: ScheduleRule[];
};
export type SetBookingQuestionsInput = { questions: BookingQuestion[] };
export type ListAppointmentTypesQuery = { published?: boolean };

// ─── Organizer appointments ────────────────────────────────────
// Cross-check shape against `docs/api/modules/booking-flow.md` (organizer
// endpoints section). Same shape as AdminAppointmentItem currently.
export type OrgAppointmentItem = AdminAppointmentItem;

export type AppointmentAnswer = {
  id: string;
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  answerText: string | null;
};

export type AppointmentReschedule = {
  id: string;
  previousStartTime: string;
  previousEndTime: string;
  rescheduledById: string | null;
  rescheduledByRole: Role | null;
  reason: string | null;
  createdAt: string;
};

export type OrgAppointmentDetail = OrgAppointmentItem & {
  answers: AppointmentAnswer[];
  reschedules: AppointmentReschedule[];
  payment: {
    id: string;
    amount: string;
    currency: string;
    status: PaymentStatus;
    gateway: string | null;
  } | null;
};

export type ListOrgAppointmentsQuery = {
  status?: AppointmentStatus;
  appointmentTypeId?: string;
  bookablePersonId?: string;
  bookableResourceId?: string;
  from?: string;
  to?: string;
  upcomingOnly?: boolean;
  skip?: number;
  take?: number;
};

export type RescheduleAppointmentInput = {
  slotLockId: string;
  reason?: string;
};

export type CancelAppointmentInput = { reason?: string };
export type RejectAppointmentInput = { reason?: string };

// ─── Slot locks (organizer reschedule needs these) ─────────────
export type SlotLock = {
  id: string;
  appointmentTypeId: string;
  entityId: string | null;
  startTime: string;
  endTime: string;
  expiresAt: string;
  createdAt: string;
};

export type AcquireSlotLockInput = {
  appointmentTypeId: string;
  entityId?: string;
  startTime: string;
  endTime: string;
};
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/types/index.ts
git commit -m "$(cat <<'EOF'
types: add appointment-type, org-appointment, and slot-lock types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Add bookable-persons + bookable-resources API functions

**Files:**
- Modify: `client/lib/api.ts` (append after the existing admin section)

Reference: `docs/api/modules/bookable-inventory.md`.

- [ ] **Step 1: Add imports + functions**

In the import block at top of `client/lib/api.ts`, add:

```ts
  BookablePerson,
  BookableResource,
  CreateBookablePersonInput,
  CreateBookableResourceInput,
  DeleteResult,
  UpdateBookablePersonInput,
  UpdateBookableResourceInput,
```

(Keep alphabetical order with existing imports.)

Append at the end of the file:

```ts
// ─── Bookable persons ──────────────────────────────────────────

export async function listBookablePersons(
  includeInactive = false,
): Promise<BookablePerson[]> {
  try {
    const { data } = await api.get<BookablePerson[]>("/bookable-persons", {
      params: { includeInactive },
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getBookablePerson(id: string): Promise<BookablePerson> {
  try {
    const { data } = await api.get<BookablePerson>(`/bookable-persons/${id}`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createBookablePerson(
  body: CreateBookablePersonInput,
): Promise<BookablePerson> {
  try {
    const { data } = await api.post<BookablePerson>("/bookable-persons", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateBookablePerson(
  id: string,
  body: UpdateBookablePersonInput,
): Promise<BookablePerson> {
  try {
    const { data } = await api.patch<BookablePerson>(
      `/bookable-persons/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteBookablePerson(id: string): Promise<DeleteResult> {
  try {
    const { data } = await api.delete<DeleteResult>(`/bookable-persons/${id}`);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Bookable resources ────────────────────────────────────────

export async function listBookableResources(
  includeInactive = false,
): Promise<BookableResource[]> {
  try {
    const { data } = await api.get<BookableResource[]>("/bookable-resources", {
      params: { includeInactive },
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getBookableResource(
  id: string,
): Promise<BookableResource> {
  try {
    const { data } = await api.get<BookableResource>(
      `/bookable-resources/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createBookableResource(
  body: CreateBookableResourceInput,
): Promise<BookableResource> {
  try {
    const { data } = await api.post<BookableResource>(
      "/bookable-resources",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateBookableResource(
  id: string,
  body: UpdateBookableResourceInput,
): Promise<BookableResource> {
  try {
    const { data } = await api.patch<BookableResource>(
      `/bookable-resources/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteBookableResource(
  id: string,
): Promise<DeleteResult> {
  try {
    const { data } = await api.delete<DeleteResult>(
      `/bookable-resources/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/api.ts
git commit -m "$(cat <<'EOF'
api: add bookable-persons and bookable-resources endpoints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add appointment-types API functions

**Files:**
- Modify: `client/lib/api.ts` (append)

Reference: `docs/api/modules/appointment-types.md`.

- [ ] **Step 1: Add imports + functions**

Add to the import block at top:

```ts
  AppointmentType,
  AppointmentTypeWithRelations,
  CreateAppointmentTypeInput,
  ListAppointmentTypesQuery,
  SetBookingQuestionsInput,
  SetEntitiesInput,
  SetScheduleInput,
  UpdateAppointmentTypeInput,
```

Append:

```ts
// ─── Appointment types ─────────────────────────────────────────

export async function listAppointmentTypes(
  query: ListAppointmentTypesQuery = {},
): Promise<AppointmentType[]> {
  try {
    const { data } = await api.get<AppointmentType[]>("/appointment-types", {
      params: query,
    });
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/appointment-types/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function createAppointmentType(
  body: CreateAppointmentTypeInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      "/appointment-types",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function updateAppointmentType(
  id: string,
  body: UpdateAppointmentTypeInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.patch<AppointmentTypeWithRelations>(
      `/appointment-types/${id}`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function deleteAppointmentType(id: string): Promise<void> {
  try {
    await api.delete(`/appointment-types/${id}`);
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeEntities(
  id: string,
  body: SetEntitiesInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/entities`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeSchedule(
  id: string,
  body: SetScheduleInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/schedule`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function setAppointmentTypeQuestions(
  id: string,
  body: SetBookingQuestionsInput,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.put<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/questions`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function publishAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/publish`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function unpublishAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.post<AppointmentTypeWithRelations>(
      `/appointment-types/${id}/unpublish`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function regenerateShareToken(
  id: string,
): Promise<{ shareToken: string }> {
  try {
    const { data } = await api.post<{ shareToken: string }>(
      `/appointment-types/${id}/share-token`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/api.ts
git commit -m "$(cat <<'EOF'
api: add appointment-types CRUD + lifecycle endpoints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add organizer-appointments + slot-lock API functions

**Files:**
- Modify: `client/lib/api.ts` (append)

Reference: `docs/api/modules/booking-flow.md` (organizer endpoints section + slot-locks section).

- [ ] **Step 1: Add imports + functions**

Add to import block:

```ts
  AcquireSlotLockInput,
  CancelAppointmentInput,
  ListOrgAppointmentsQuery,
  OrgAppointmentDetail,
  OrgAppointmentItem,
  RejectAppointmentInput,
  RescheduleAppointmentInput,
  SlotLock,
```

Append:

```ts
// ─── Organizer appointments ────────────────────────────────────

export async function listOrgAppointments(
  query: ListOrgAppointmentsQuery = {},
): Promise<OrgAppointmentItem[]> {
  try {
    const { data } = await api.get<OrgAppointmentItem[]>(
      "/organizations/me/appointments",
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getOrgAppointment(
  publicId: string,
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.get<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function approveOrgAppointment(
  publicId: string,
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/approve`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rejectOrgAppointment(
  publicId: string,
  body: RejectAppointmentInput = {},
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/reject`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function completeOrgAppointment(
  publicId: string,
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/complete`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function noShowOrgAppointment(
  publicId: string,
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/no-show`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function cancelOrgAppointment(
  publicId: string,
  body: CancelAppointmentInput = {},
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/cancel`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function rescheduleOrgAppointment(
  publicId: string,
  body: RescheduleAppointmentInput,
): Promise<OrgAppointmentDetail> {
  try {
    const { data } = await api.post<OrgAppointmentDetail>(
      `/organizations/me/appointments/${publicId}/reschedule`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Slot locks (organizer-side reschedule needs these) ────────

export async function acquireSlotLock(
  body: AcquireSlotLockInput,
): Promise<SlotLock> {
  try {
    const { data } = await api.post<SlotLock>("/slot-locks", body);
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function releaseSlotLock(id: string): Promise<void> {
  try {
    await api.delete(`/slot-locks/${id}`);
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/api.ts
git commit -m "$(cat <<'EOF'
api: add organizer-appointment actions and slot-lock helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Create useBookablePersons + useBookableResources hooks

**Files:**
- Create: `client/hooks/useBookablePersons.ts`
- Create: `client/hooks/useBookableResources.ts`

- [ ] **Step 1: Create useBookablePersons.ts**

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createBookablePerson,
  deleteBookablePerson,
  getBookablePerson,
  listBookablePersons,
  updateBookablePerson,
} from "@/lib/api";
import type {
  BookablePerson,
  CreateBookablePersonInput,
  DeleteResult,
  UpdateBookablePersonInput,
} from "@/types";

const KEY = "bookable-persons" as const;

export function useBookablePersons(includeInactive = false) {
  return useQuery<BookablePerson[]>({
    queryKey: [KEY, "list", { includeInactive }],
    queryFn: () => listBookablePersons(includeInactive),
    staleTime: 30_000,
  });
}

export function useBookablePerson(id: string | undefined) {
  return useQuery<BookablePerson>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getBookablePerson(id!),
    enabled: !!id,
  });
}

export function useBookablePersonMutations() {
  const qc = useQueryClient();
  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: [KEY, "list"] });

  const createMutation = useMutation<
    BookablePerson,
    Error,
    CreateBookablePersonInput
  >({
    mutationFn: createBookablePerson,
    onSuccess: invalidateList,
  });

  const updateMutation = useMutation<
    BookablePerson,
    Error,
    { id: string; body: UpdateBookablePersonInput }
  >({
    mutationFn: ({ id, body }) => updateBookablePerson(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "list"] });
      qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
    },
  });

  const deleteMutation = useMutation<DeleteResult, Error, string>({
    mutationFn: deleteBookablePerson,
    onSuccess: invalidateList,
  });

  return { createMutation, updateMutation, deleteMutation };
}
```

- [ ] **Step 2: Create useBookableResources.ts**

Identical structure with the resource types and api functions:

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createBookableResource,
  deleteBookableResource,
  getBookableResource,
  listBookableResources,
  updateBookableResource,
} from "@/lib/api";
import type {
  BookableResource,
  CreateBookableResourceInput,
  DeleteResult,
  UpdateBookableResourceInput,
} from "@/types";

const KEY = "bookable-resources" as const;

export function useBookableResources(includeInactive = false) {
  return useQuery<BookableResource[]>({
    queryKey: [KEY, "list", { includeInactive }],
    queryFn: () => listBookableResources(includeInactive),
    staleTime: 30_000,
  });
}

export function useBookableResource(id: string | undefined) {
  return useQuery<BookableResource>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getBookableResource(id!),
    enabled: !!id,
  });
}

export function useBookableResourceMutations() {
  const qc = useQueryClient();
  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: [KEY, "list"] });

  const createMutation = useMutation<
    BookableResource,
    Error,
    CreateBookableResourceInput
  >({
    mutationFn: createBookableResource,
    onSuccess: invalidateList,
  });

  const updateMutation = useMutation<
    BookableResource,
    Error,
    { id: string; body: UpdateBookableResourceInput }
  >({
    mutationFn: ({ id, body }) => updateBookableResource(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "list"] });
      qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
    },
  });

  const deleteMutation = useMutation<DeleteResult, Error, string>({
    mutationFn: deleteBookableResource,
    onSuccess: invalidateList,
  });

  return { createMutation, updateMutation, deleteMutation };
}
```

- [ ] **Step 3: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/hooks/useBookablePersons.ts client/hooks/useBookableResources.ts
git commit -m "$(cat <<'EOF'
hooks: add useBookablePersons and useBookableResources

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Create useAppointmentTypes hook

**Files:**
- Create: `client/hooks/useAppointmentTypes.ts`

- [ ] **Step 1: Create file**

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createAppointmentType,
  deleteAppointmentType,
  getAppointmentType,
  listAppointmentTypes,
  publishAppointmentType,
  regenerateShareToken,
  setAppointmentTypeEntities,
  setAppointmentTypeQuestions,
  setAppointmentTypeSchedule,
  unpublishAppointmentType,
  updateAppointmentType,
} from "@/lib/api";
import type {
  AppointmentType,
  AppointmentTypeWithRelations,
  CreateAppointmentTypeInput,
  ListAppointmentTypesQuery,
  SetBookingQuestionsInput,
  SetEntitiesInput,
  SetScheduleInput,
  UpdateAppointmentTypeInput,
} from "@/types";

const KEY = "appointment-types" as const;

export function useAppointmentTypes(query: ListAppointmentTypesQuery = {}) {
  return useQuery<AppointmentType[]>({
    queryKey: [KEY, "list", query],
    queryFn: () => listAppointmentTypes(query),
    staleTime: 30_000,
  });
}

export function useAppointmentType(id: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getAppointmentType(id!),
    enabled: !!id,
  });
}

export function useAppointmentTypeMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => qc.invalidateQueries({ queryKey: [KEY] });
  const invalidateDetail = (id: string) => {
    qc.invalidateQueries({ queryKey: [KEY, "list"] });
    qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
  };

  const createMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    CreateAppointmentTypeInput
  >({
    mutationFn: createAppointmentType,
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    { id: string; body: UpdateAppointmentTypeInput }
  >({
    mutationFn: ({ id, body }) => updateAppointmentType(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteAppointmentType,
    onSuccess: invalidateAll,
  });

  const setEntitiesMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    { id: string; body: SetEntitiesInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeEntities(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const setScheduleMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    { id: string; body: SetScheduleInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeSchedule(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const setQuestionsMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    { id: string; body: SetBookingQuestionsInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeQuestions(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const publishMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    string
  >({
    mutationFn: publishAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const unpublishMutation = useMutation<
    AppointmentTypeWithRelations,
    Error,
    string
  >({
    mutationFn: unpublishAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const regenerateShareTokenMutation = useMutation<
    { shareToken: string },
    Error,
    string
  >({
    mutationFn: regenerateShareToken,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    setEntitiesMutation,
    setScheduleMutation,
    setQuestionsMutation,
    publishMutation,
    unpublishMutation,
    regenerateShareTokenMutation,
  };
}
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/useAppointmentTypes.ts
git commit -m "$(cat <<'EOF'
hooks: add useAppointmentTypes with CRUD + lifecycle mutations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Create useOrgAppointments hook

**Files:**
- Create: `client/hooks/useOrgAppointments.ts`

- [ ] **Step 1: Create file**

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  acquireSlotLock,
  approveOrgAppointment,
  cancelOrgAppointment,
  completeOrgAppointment,
  getOrgAppointment,
  listOrgAppointments,
  noShowOrgAppointment,
  rejectOrgAppointment,
  releaseSlotLock,
  rescheduleOrgAppointment,
} from "@/lib/api";
import type {
  AcquireSlotLockInput,
  CancelAppointmentInput,
  ListOrgAppointmentsQuery,
  OrgAppointmentDetail,
  OrgAppointmentItem,
  RejectAppointmentInput,
  RescheduleAppointmentInput,
  SlotLock,
} from "@/types";

const KEY = "org-appointments" as const;
const ANALYTICS_KEY = "org-analytics" as const;

export function useOrgAppointments(query: ListOrgAppointmentsQuery = {}) {
  return useQuery<OrgAppointmentItem[]>({
    queryKey: [KEY, "list", query],
    queryFn: () => listOrgAppointments(query),
    staleTime: 15_000,
  });
}

export function useOrgAppointment(publicId: string | undefined) {
  return useQuery<OrgAppointmentDetail>({
    queryKey: [KEY, "detail", publicId],
    queryFn: () => getOrgAppointment(publicId!),
    enabled: !!publicId,
  });
}

export function useOrgAppointmentMutations() {
  const qc = useQueryClient();
  const invalidateAfterAction = (publicId: string) => {
    qc.invalidateQueries({ queryKey: [KEY, "list"] });
    qc.invalidateQueries({ queryKey: [KEY, "detail", publicId] });
    qc.invalidateQueries({ queryKey: [ANALYTICS_KEY] });
  };

  const approveMutation = useMutation<OrgAppointmentDetail, Error, string>({
    mutationFn: approveOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const rejectMutation = useMutation<
    OrgAppointmentDetail,
    Error,
    { publicId: string; body: RejectAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => rejectOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  const completeMutation = useMutation<OrgAppointmentDetail, Error, string>({
    mutationFn: completeOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const noShowMutation = useMutation<OrgAppointmentDetail, Error, string>({
    mutationFn: noShowOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const cancelMutation = useMutation<
    OrgAppointmentDetail,
    Error,
    { publicId: string; body: CancelAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => cancelOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  const rescheduleMutation = useMutation<
    OrgAppointmentDetail,
    Error,
    { publicId: string; body: RescheduleAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) =>
      rescheduleOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  return {
    approveMutation,
    rejectMutation,
    completeMutation,
    noShowMutation,
    cancelMutation,
    rescheduleMutation,
  };
}

// Slot-lock helpers used by the reschedule dialog. Not React Query — plain
// thin wrappers so the dialog can acquire then immediately consume.
export function useSlotLockMutations() {
  const acquireMutation = useMutation<SlotLock, Error, AcquireSlotLockInput>({
    mutationFn: acquireSlotLock,
  });
  const releaseMutation = useMutation<void, Error, string>({
    mutationFn: releaseSlotLock,
  });
  return { acquireMutation, releaseMutation };
}
```

- [ ] **Step 2: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/useOrgAppointments.ts
git commit -m "$(cat <<'EOF'
hooks: add useOrgAppointments with action mutations + slot-lock helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Extend useAuth with change-password / 2FA / logout-all

**Files:**
- Modify: `client/hooks/useAuth.ts`

- [ ] **Step 1: Read existing useAuth.ts**

Read the current file to confirm imports and exports before appending.

- [ ] **Step 2: Append mutations**

Add these imports if missing (keep alphabetical):

```ts
import {
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  logoutAll,
} from "@/lib/api";
import type {
  ChangePasswordInput,
  DisableTwoFactorInput,
  GenericMessage,
} from "@/types";
```

Append at end of file:

```ts
const AUTH_KEY = ["auth", "me"] as const;

export function useChangePassword() {
  return useMutation<GenericMessage, Error, ChangePasswordInput>({
    mutationFn: changePassword,
  });
}

export function useEnableTwoFactor() {
  const qc = useQueryClient();
  return useMutation<GenericMessage, Error, void>({
    mutationFn: enableTwoFactor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}

export function useDisableTwoFactor() {
  const qc = useQueryClient();
  return useMutation<GenericMessage, Error, DisableTwoFactorInput>({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}

export function useLogoutAll() {
  const qc = useQueryClient();
  return useMutation<GenericMessage, Error, void>({
    mutationFn: logoutAll,
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, null);
    },
  });
}
```

If `useQueryClient` is not already imported in `useAuth.ts`, add it to the existing `@tanstack/react-query` import line. If `AUTH_KEY` (or an equivalent) already exists in the file, reuse the existing constant instead of redeclaring.

- [ ] **Step 3: Verify**

Run: `cd client && bun run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/hooks/useAuth.ts
git commit -m "$(cat <<'EOF'
hooks(auth): add change-password, 2FA, and logout-all mutations

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase 1 complete.** The full data layer is now in place. From here pages can be built in any order, but Phase 2 (Inventory) is the lightest smoke test of the new hooks before tackling appointment-types.

The remaining phases (2–6) are documented in companion plan files to keep individual files reviewable:

- `2026-05-03-organizer-pages-phase2-inventory.md` — Tasks 10–11
- `2026-05-03-organizer-pages-phase3-appointment-types.md` — Tasks 12–18
- `2026-05-03-organizer-pages-phase4-appointments.md` — Tasks 19–20
- `2026-05-03-organizer-pages-phase5-analytics.md` — Task 21
- `2026-05-03-organizer-pages-phase6-settings.md` — Task 22

Each phase file has the same header and follows the same TDD-style step structure (write code → typecheck → manual smoke test → commit). Phase files can be written and reviewed independently once Phase 1 is complete.

---

## Self-review

This plan covers spec Section 2 (foundation) in full. Phases 2–6 are scoped into companion files (listed above) per spec Section 9 ordering — they need to be written next before execution can start on the UI tasks.

**Spec coverage in this file:** §2.1 (types), §2.2 (api functions), §2.3 (hooks), §2.4 (auth extensions). Tasks 1–9 map 1:1.

**Placeholder scan:** none. Cross-references to API docs are reads, not gaps.

**Type consistency:** verified — types defined in Tasks 1–2 are used in Tasks 3–9 with matching names (`BookablePerson`, `OrgAppointmentDetail`, `SlotLock`, etc.). Mutation hook signatures match their api-function signatures.
