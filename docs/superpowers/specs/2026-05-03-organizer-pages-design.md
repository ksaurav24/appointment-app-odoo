# Organizer Pages — Design Spec

**Date:** 2026-05-03
**Scope:** Implement the missing pages under `client/app/organization/` so an
organizer can manage inventory, appointment types, appointments, analytics,
and basic account settings end-to-end against the existing NestJS backend.
**Out of scope:** new backend endpoints, organization-profile editing, CSV
export, drag-to-reorder questions, optimistic UI, organizer-side
notifications inbox.

The organization layout (`client/app/organization/layout.tsx`) and the
dashboard page already exist and stay unchanged. This spec only adds
sibling pages and the API/hook surface they need.

---

## 1. Routes & file layout

```
client/app/organization/
  layout.tsx                                  (exists; unchanged)
  dashboard/page.tsx                          (exists; unchanged)
  inventory/page.tsx                          NEW — tabs: Persons | Resources
  appointment-types/
    page.tsx                                  NEW — list + "Create" button
    new/page.tsx                              NEW — short skeleton create form
    [id]/page.tsx                             NEW — stacked-cards detail/edit
  appointments/
    page.tsx                                  NEW — list + filters + row actions
    [publicId]/page.tsx                       NEW — detail + actions
  analytics/page.tsx                          NEW — date-range + bigger charts
  settings/page.tsx                           NEW — read-only org + auth actions

client/components/organization/               NEW dir — page-specific components
  inventory/
    persons-table.tsx, person-form-dialog.tsx
    resources-table.tsx, resource-form-dialog.tsx
  appointment-types/
    types-table.tsx
    create-skeleton-form.tsx
    section-basics.tsx, section-inventory.tsx
    section-schedule.tsx, section-questions.tsx
    section-policy.tsx
    publish-bar.tsx
    schedule-rule-row.tsx, booking-question-row.tsx, entity-picker.tsx
  appointments/
    appointments-table.tsx, status-filter-bar.tsx
    appointment-actions-menu.tsx
    reschedule-dialog.tsx, cancel-dialog.tsx
  settings/
    org-profile-readonly.tsx, account-section.tsx, security-section.tsx
    change-password-dialog.tsx, disable-2fa-dialog.tsx

client/hooks/                                 NEW files
  useBookablePersons.ts
  useBookableResources.ts
  useAppointmentTypes.ts
  useOrgAppointments.ts

client/lib/api.ts                             EXTEND with new endpoint functions
client/types/index.ts                         EXTEND with new types
client/hooks/useAuth.ts                       EXTEND with change-password / 2FA / logout-all mutations
```

### Conventions (per `appointment-app-api-integration` skill)

- Components import only from `@/hooks/*` — never from `@/lib/api` directly.
- Each new hook file follows the existing pattern: list query, detail query,
  mutations object with `onSuccess` invalidation.
- Query keys: namespaced by resource first.
  - `["bookable-persons", "list", { includeInactive }]`
  - `["bookable-persons", "detail", id]`
  - `["bookable-resources", "list", { includeInactive }]`
  - `["bookable-resources", "detail", id]`
  - `["appointment-types", "list", { published }]`
  - `["appointment-types", "detail", id]`
  - `["org-appointments", "list", query]`
  - `["org-appointments", "detail", publicId]`
- BigInt-string IDs (e.g. `AppointmentTypeEntity.id`, `Schedule.id`,
  `Appointment.id`) are treated as opaque strings — never `Number()`.
- `Appointment.publicId` (cuid) is the URL key — internal numeric `id`
  is never exposed in routes or UI.
- All mutations rely on server response + invalidate + refetch. No
  optimistic UI in v1.

---

## 2. API + types + hook layer (built first, no UI yet)

### 2.1 Type additions to `client/types/index.ts`

Pulled verbatim from `docs/api/modules/bookable-inventory.md`,
`appointment-types.md`, and `booking-flow.md`. Field names and optionality
copied from the DTO tables, not paraphrased.

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

// ─── Appointment types ─────────────────────────────────────────
export type EntityType = "PERSON" | "RESOURCE";
export type ScheduleType = "WEEKLY" | "FLEXIBLE";
export type DurationMode = "FIXED" | "VARIABLE";
export type AssignmentMode = "AUTO" | "MANUAL";
export type QuestionType =
  | "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "NUMBER" | "DATE";

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
// endpoints section) before implementing — the organizer payload is
// expected to match `AdminAppointmentItem` but verify field-by-field.
export type OrgAppointmentItem = AdminAppointmentItem;
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
  startTime: string;
  endTime: string;
  bookablePersonId?: string;
  bookableResourceId?: string;
};
export type CancelAppointmentInput = { reason?: string };
export type RejectAppointmentInput = { reason?: string };
```

### 2.2 `client/lib/api.ts` additions

Plain async functions, one per endpoint, all using the shared `api` axios
instance and `extractApiError`. No React Query references inside this file.

Endpoints to add (exact routes verified against
`docs/api/modules/bookable-inventory.md`,
`docs/api/modules/appointment-types.md`, and
`docs/api/modules/booking-flow.md` — re-check the controllers if a doc
is unclear; controllers are source of truth):

- `listBookablePersons(includeInactive?)`, `getBookablePerson(id)`,
  `createBookablePerson(body)`, `updateBookablePerson(id, body)`,
  `deleteBookablePerson(id)`
- Same shape for `bookableResources`
- `listAppointmentTypes(query)`, `getAppointmentType(id)`,
  `createAppointmentType(body)`, `updateAppointmentType(id, body)`,
  `deleteAppointmentType(id)`,
  `setAppointmentTypeEntities(id, body)`,
  `setAppointmentTypeSchedule(id, body)`,
  `setAppointmentTypeQuestions(id, body)`,
  `publishAppointmentType(id)`,
  `unpublishAppointmentType(id)`,
  `regenerateShareToken(id)`
- `listOrgAppointments(query)`, `getOrgAppointment(publicId)`,
  `approveOrgAppointment(publicId)`,
  `rejectOrgAppointment(publicId, body)`,
  `completeOrgAppointment(publicId)`,
  `noShowOrgAppointment(publicId)`,
  `cancelOrgAppointment(publicId, body)`,
  `rescheduleOrgAppointment(publicId, body)`

The exact paths for the organizer-side appointment actions are taken from
`docs/api/modules/booking-flow.md` (organizer endpoints section). When
implementing, open that doc + the matching controller before writing each
function.

### 2.3 New hook files

Each follows the pattern in `client/hooks/useOrgAnalytics.ts` and the
example in the api-integration skill. Public surface:

```ts
// useBookablePersons.ts
useBookablePersons(includeInactive?: boolean)
useBookablePerson(id?: string)
useBookablePersonMutations()  // → { createMutation, updateMutation, deleteMutation }

// useBookableResources.ts (same shape)

// useAppointmentTypes.ts
useAppointmentTypes(query?: ListAppointmentTypesQuery)
useAppointmentType(id?: string)
useAppointmentTypeMutations()  // → { createMutation, updateMutation, deleteMutation,
                                //     setEntitiesMutation, setScheduleMutation,
                                //     setQuestionsMutation, publishMutation,
                                //     unpublishMutation, regenerateShareTokenMutation }

// useOrgAppointments.ts
useOrgAppointments(query: ListOrgAppointmentsQuery)
useOrgAppointment(publicId?: string)
useOrgAppointmentMutations()  // → { approveMutation, rejectMutation, completeMutation,
                               //     noShowMutation, cancelMutation, rescheduleMutation }
```

Invalidation policy:

- List mutations invalidate `[KEY, "list"]` (broad — covers all filter
  variants).
- Detail-bearing mutations also invalidate `[KEY, "detail", id]`.
- Cross-resource invalidation is **not** done. Inventory mutations don't
  touch appointment-types; appointment-type mutations don't touch
  inventory. The join table is updated only via
  `setAppointmentTypeEntities`, which invalidates appointment-types only.
- Appointment mutations also invalidate `["org-analytics"]` so the
  dashboard KPIs reflect status changes.

### 2.4 `useAuth.ts` extensions

Add (do not duplicate the existing `useCurrentUser` / `useLogin` / etc.):

- `useChangePassword()` — wraps `changePassword` mutation; no cache
  invalidation needed.
- `useEnableTwoFactor()` — invalidates `["auth", "me"]` on success so the
  `twoFactorEnabled` flag updates.
- `useDisableTwoFactor()` — same.
- `useLogoutAll()` — on success, invalidates `["auth", "me"]` and routes
  to `/login` (the user's other sessions are gone; current session is
  also invalidated server-side).

---

## 3. Inventory page

Path: `/organization/inventory`. Single page, two tabs (`Tabs` from
`@/components/ui/tabs`): "Persons" and "Resources".

### Persons tab
- Table columns: Name, Designation, Email, Phone, Active (Badge), Actions.
- "Add person" button opens `<PersonFormDialog>` (modal). Fields per the
  DTO: name (required), contactEmail (required, email validation),
  phone, designation, isActive (default true). Submit → `createMutation`.
- Edit reuses the dialog pre-filled. Submit → `updateMutation`.
- "Show inactive" toggle drives the `includeInactive` query param.
- Delete confirmation dialog. After delete, toast: "Deleted" for
  `{ deleted: "hard" }`, "Marked inactive (referenced by appointments)"
  for `{ deleted: "soft" }`.

### Resources tab
Same shape, fields: name, resourceType, description, capacity, location,
isActive. `<ResourceFormDialog>` is a sibling of `<PersonFormDialog>` —
they don't share a base component since field sets diverge.

### Loading / error / empty
- Loading: skeleton rows (4 placeholder rows in the table body).
- Error: destructive Card with `(query.error as ApiError).messages[0]`.
- Empty: centered "No bookable persons yet" + Add button.

---

## 4. Appointments pages

### List (`/organization/appointments`)

Sticky filter bar:
- Status dropdown (All / PENDING / CONFIRMED / COMPLETED / CANCELLED /
  NO_SHOW). Reads/writes `?status=` URL query param so the dashboard's
  "Pending requests" quicklink works.
- Appointment-type dropdown — options from `useAppointmentTypes()`.
- Date range (`from` / `to` `<input type="date">`).
- "Upcoming only" toggle (drives `upcomingOnly` query).

Table columns: Date+time (formatted in org timezone),
Customer (name + email), Appointment type, Assignee (person/resource
name or em-dash), Status (Badge), Payment (Badge), Actions menu.

`<AppointmentActionsMenu>` items depend on current status:
- `PENDING` → Approve, Reject (modal with optional reason ≤ 500 chars)
- `CONFIRMED` → Complete, No-show, Cancel, Reschedule
- `COMPLETED` / `CANCELLED` / `NO_SHOW` → "View details" (link only)

Pagination via `skip` / `take` (default `take=20`, max 100). URL-backed.
"Prev / Next" buttons + "Showing X-Y of Z" label.

### Detail (`/organization/appointments/[publicId]`)

Stacked sections:

1. **Header card** — confirmation code, status badge, customer
   name+email, assignee, scheduled time, primary action buttons (same
   logic as row menu). Back link to list.
2. **Booking questions card** — list of `{ question, answer }` pairs
   from the appointment payload's relations. "No booking questions" if
   empty.
3. **Payment card** — total amount + currency, payment status badge,
   gateway info if present. Hidden if appointment type doesn't require
   advance payment.
4. **Reschedule history card** — list from the reschedules relation:
   previous time → new time, who rescheduled, when, reason. "No
   reschedules" if empty.

`<RescheduleDialog>` — start/end datetime inputs (datetime-local), optional
re-assign picker (only entities linked to this appointment-type, fetched
from the appointment-type detail). Submit → `rescheduleMutation`. On
success, invalidates list + detail.

`<CancelDialog>` — small textarea (optional reason, max 500 chars).
Submit → `cancelMutation`.

---

## 5. Appointment-types pages

### List (`/organization/appointment-types`)

Filter chips: All / Published / Drafts. Table columns: Name, Type
(PERSON/RESOURCE badge), Duration ("30 min" or "15–60 min, step 15"),
Schedule (WEEKLY/FLEXIBLE), Published (Badge), Updated, Actions
(View/Delete). Click row → detail page. "Create" button → `/new`.

Empty state: "No appointment types yet" + Create button.

### Create skeleton (`/organization/appointment-types/new`)

Short form, only the fields that are either irrevocable
(`entityType`, `durationMode` — backend rejects changing them once
appointments exist) or required by the create endpoint
(min 1 entity, min 1 schedule rule):

- Name (required)
- Slug (auto-generated from name; editable; validates against the slug
  regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
- Description (optional)
- Entity type radio: Person / Resource
- Assignment mode radio: Auto / Manual
- Entities multi-select (`<EntityPicker>`) — reads from
  `useBookablePersons` or `useBookableResources` based on `entityType`.
  Empty inventory shows "Add inventory first" link to
  `/organization/inventory`. Min 1 required.
- Duration mode radio: Fixed / Variable
  - Fixed → `durationMinutes` input
  - Variable → `minDurationMins`, `maxDurationMins`, `durationStepMins`
- Schedule type radio: Weekly / Flexible
- One initial schedule rule: day-of-week select, start time, end time
  (HH:MM 24h)

Submit builds `CreateAppointmentTypeInput` (omits `bookingQuestions`,
sends `scheduleRules: [thatOneRule]`). On success, route to
`/organization/appointment-types/[id]` to finish setup.

### Detail / edit (`/organization/appointment-types/[id]`)

Top: `<PublishBar>` — name, draft/published badge, share-token copy
button (visible when `shareToken` is set), "Regenerate share token"
action, "Publish" / "Unpublish" button. Publish prereqs (≥1 entity AND
≥1 schedule rule) checked client-side first; if not met, the button is
disabled with a tooltip listing missing prereqs. Server-side 400 errors
("Cannot publish: at least one entity must be assigned" /
"Cannot publish: at least one schedule rule is required") are surfaced
verbatim if they slip past client check.

Stacked cards below, each with its own Edit/Save toggle:

1. **Basics card** — name, slug, description, manualConfirmation toggle,
   advancePaymentEnabled toggle (+ amount when enabled, decimal up to 2).
   Save → `updateMutation` (PATCH).
2. **Inventory card** — read view: assigned entities as chips. Edit
   mode: same `<EntityPicker>` as create. Save → `setEntitiesMutation`
   (PUT `/entities`). The `entityType` field is read-only here (locked
   once appointments exist; even when not, switching it would invalidate
   all linked entities — defer that to a future "duplicate as new type"
   feature).
3. **Schedule card** — read view groups rules by day name (or shows
   "On YYYY-MM-DD" for `specificDate` rules). Edit mode: list of
   `<ScheduleRuleRow>` (dayOfWeek/specificDate toggle, start time,
   end time, isAvailable checkbox, delete) + "Add rule" button.
   `scheduleType` select + `timezone` input. Save →
   `setScheduleMutation`. Validation: ≥1 rule, mutually exclusive
   `dayOfWeek`/`specificDate`, time regex `^([01]\d|2[0-3]):[0-5]\d$`.
4. **Questions card** — read view: numbered list (questionText, type
   badge, required asterisk). Edit mode: list of
   `<BookingQuestionRow>` (questionText, questionType select, isRequired
   checkbox, displayOrder up/down buttons, options textarea when type
   is `SINGLE_CHOICE` / `MULTIPLE_CHOICE`, delete button) + "Add
   question". Save → `setQuestionsMutation`. Reordering via up/down
   buttons that mutate `displayOrder`.
5. **Policy card** — `cancellationAllowed`, `cancellationWindowHours`,
   `rescheduleAllowed`, `rescheduleWindowHours`,
   `maxReschedulesAllowed`, `maxBookingsPerSlot`, `manageCapacity`.
   Save → `updateMutation`.
6. **Danger zone card** — Delete button. Confirmation dialog. On 409
   error, show the server message verbatim ("Appointment type has
   bookings; unpublish it instead of deleting") and don't pretend the
   delete worked.

**Form state pattern:** each card holds local form state via
`react-hook-form` (already a project dependency by way of shadcn). No
global form for the whole page. Each card's "Cancel" reverts to the
latest `useAppointmentType(id).data`. Mutations invalidate
`["appointment-types","detail",id]` and `["appointment-types","list"]`
on success — react-query refetches and re-renders the read view.

---

## 6. Analytics page (`/organization/analytics`)

Thin layer over existing `useOrgAnalytics` hooks. No new endpoints.

Header: title + date-range picker (`from`, `to`, `YYYY-MM-DD`) +
granularity toggle (`day` / `week` / `month`). State held in URL query
params so the view is shareable. Default range: last 30 days.

Sections:
1. **Timeseries chart** (full-width) — same `<TimeseriesChart>` as
   dashboard, with tab switcher for `bookings` / `revenue` /
   `cancellations`. Wired to
   `useOrgTimeseries({ metric, granularity, from, to })`.
2. **By appointment type** (full-width) — same `<ByTypeList>`-style
   visualization as dashboard. Wired to `useOrgByAppointmentType()`.
   Labelled "all-time" since the endpoint takes no date-range params.
3. **Busy hours heatmap** (full-width) — same `<BusyHoursHeatmap>`,
   already 90-day backed by the endpoint. Same hook
   (`useOrgBusyHours()`).

Validation: `from` ≤ `to`. Empty range shows the chart's existing empty
state.

---

## 7. Settings page (`/organization/settings`)

Two stacked cards:

### Organization profile (read-only)
`useMyOrganization()`. Shows: name, slug, contactEmail, contactPhone,
address, timezone, approvalStatus (badge), isActive (badge), createdAt.
No edit affordance. Note: "Editing organization profile coming soon —
contact support to update."

### Account & security
`useCurrentUser()` for the displayed row. Action buttons:

- **Change password** → `<ChangePasswordDialog>` (currentPassword,
  newPassword, confirm). Submit → `useChangePassword`.
- **2FA toggle** — Enable: directly calls `useEnableTwoFactor` (no
  password needed per the existing API). Disable: opens
  `<DisableTwoFactorDialog>` which collects current password and calls
  `useDisableTwoFactor`.
- **Logout from all devices** — confirm dialog → `useLogoutAll`. On
  success, navigate to `/login` (the current session is gone too).

---

## 8. Cross-cutting UI conventions

- **Loading:** `isPending` → `<Skeleton>` placeholders (skeleton rows
  for tables, skeleton chart for analytics). No spinners over content.
- **Query error:** in-place destructive Card with
  `(query.error as ApiError).messages[0]`. No toast.
- **Mutation error:** sonner toast with the same message. 429 status →
  "Too many requests, try again later." Do not retry.
- **Mutation success:** sonner toast with action-specific message
  ("Person added", "Appointment approved", etc.).
- **Empty:** centered message with a primary action when actionable
  ("No bookable persons yet — Add one").
- **401 retry path:** already handled globally by the axios interceptor
  in `client/lib/api.ts`. No per-page work.
- **No optimistic UI in v1.** All mutations rely on server response →
  invalidate → refetch.

---

## 9. Implementation order

1. **API + hook layer for all four resources** — types, `lib/api.ts`
   functions, `hooks/use*.ts`. No UI yet. Verify each endpoint against
   the controller (`server/src/<feature>/*.controller.ts`) when the
   doc is ambiguous.
2. **Inventory page** — simplest UI; smoke-tests the new hook layer
   with two sibling CRUDs.
3. **Appointment types** — list, create skeleton, detail/edit.
4. **Appointments** — list with filters/actions, detail page.
5. **Analytics** — date-range page over existing hooks.
6. **Settings** — read-only org + account/security card; auth-hook
   extensions.

Each step should be reviewable independently.

---

## 10. Out of scope (explicit)

- New backend endpoints. In particular, no `PATCH /organizations/me`;
  org profile editing waits for a follow-up spec where backend +
  frontend land together.
- CSV export from analytics.
- Drag-to-reorder for booking questions (up/down buttons are enough).
- Optimistic UI for status changes.
- Organizer-side notifications inbox.
- Audit-log views for organizers.
- Changing the existing dashboard, admin pages, or auth pages.
