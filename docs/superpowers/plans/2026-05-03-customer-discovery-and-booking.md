# Customer Discovery & Booking Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the customer-facing path from "logged-out visitor" to "confirmed appointment" — public discovery (`/browse`, `/services/[id]`, `/services/share/[token]`), the multi-step booking flow at `/book/[id]`, and the self-contained confirmation page at `/book/[id]/confirmed`.

**Architecture:** Next.js 16 App Router under `client/`. Server state via React Query; booking-stepper local state via a pure reducer; draft persistence via `sessionStorage`. Two layout shells: `public-shell` for discovery + confirmation, `checkout-shell` for the booking flow. Razorpay SDK loaded lazily on the Payment step.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query (already installed), axios (already installed), react-day-picker (already installed), Tailwind 4, shadcn-ui primitives, sonner toasts, date-fns.

**Spec:** `docs/superpowers/specs/2026-05-03-customer-discovery-and-booking-design.md`

**Verification model:** No automated tests in v1 (per spec section 8). Each task verifies via `npm run typecheck` and `npm run lint` from `client/`. Page-introducing tasks add a manual smoke step (run dev server, hit the route).

**Branch / commits:** Work continues on the current branch (`saurav-dev`). Each task ends with a small, single-purpose commit so the history is reviewable.

---

## File map (created or modified)

### New files

```
client/lib/booking-draft.ts
client/lib/calendar-link.ts
client/lib/format.ts
client/lib/booking-stepper-machine.ts
client/hooks/usePublicAppointments.ts
client/hooks/useBooking.ts
client/components/layout/public-shell.tsx
client/components/layout/checkout-shell.tsx
client/components/booking/service-card.tsx
client/components/booking/policies-summary.tsx
client/components/booking/schedule-summary.tsx
client/components/booking/service-detail.tsx
client/components/booking/entity-picker.tsx
client/components/booking/availability-calendar.tsx
client/components/booking/slot-list.tsx
client/components/booking/open-range-picker.tsx
client/components/booking/duration-picker.tsx
client/components/booking/question-form.tsx
client/components/booking/slot-lock-countdown.tsx
client/components/booking/step-indicator.tsx
client/components/booking/razorpay-checkout.tsx
client/components/booking/booking-stepper.tsx
client/components/booking/confirmation-summary.tsx
client/app/browse/page.tsx
client/app/services/[id]/page.tsx
client/app/services/share/[token]/page.tsx
client/app/book/[id]/page.tsx
client/app/book/[id]/confirmed/page.tsx
client/app/bookings/page.tsx                 (stub for sub-project B)
client/app/bookings/[publicId]/page.tsx      (stub for sub-project B)
client/app/account/page.tsx                  (stub for sub-project C)
```

### Modified files

```
client/types/index.ts                         (extend with booking types)
client/lib/api.ts                             (add public + booking + payment fns)
client/components/auth/home-content.tsx       (consume public-shell, add Browse CTA)
client/components/auth/login-form.tsx         (honor `next` query param)
client/components/auth/verify-email-form.tsx  (honor `next` query param)
client/components/auth/reset-password-form.tsx (preserve `next` if present — verify only)
```

---

## Task 1: Extend types with booking domain shapes

**Files:**
- Modify: `client/types/index.ts` (append new types at end)

- [ ] **Step 1: Append the following exports to `client/types/index.ts`** (do not duplicate existing types like `AppointmentStatus` / `PaymentStatus` — they already exist):

```ts
// ─── Booking: appointment types (public + organizer-shared) ──────

export type EntityType = "PERSON" | "RESOURCE";
export type AssignmentMode = "AUTO" | "MANUAL";
export type ScheduleType = "WEEKLY" | "FLEXIBLE";
export type DurationMode = "FIXED" | "VARIABLE";
export type QuestionType =
  | "TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "NUMBER"
  | "DATE";

export type BookablePerson = {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

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

export type AppointmentType = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  entityType: EntityType;
  scheduleType: ScheduleType;
  durationMode: DurationMode;
  durationMinutes: number | null;
  minDurationMins: number | null;
  maxDurationMins: number | null;
  durationStepMins: number | null;
  maxBookingsPerSlot: number;
  manageCapacity: boolean;
  manualConfirmation: boolean;
  advancePaymentEnabled: boolean;
  advancePaymentAmount: string | null;
  assignmentMode: AssignmentMode;
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

export type AppointmentTypeEntity = {
  id: string;
  appointmentTypeId: string;
  bookablePersonId: string | null;
  bookablePerson: BookablePerson | null;
  bookableResourceId: string | null;
  bookableResource: BookableResource | null;
  createdAt: string;
};

export type ScheduleRule = {
  id: string;
  scheduleId: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type Schedule = {
  id: string;
  appointmentTypeId: string;
  scheduleType: ScheduleType;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  rules: ScheduleRule[];
};

export type BookingQuestion = {
  id: string;
  appointmentTypeId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: string[] | null;
  displayOrder: number;
};

export type AppointmentTypeWithRelations = AppointmentType & {
  entities: AppointmentTypeEntity[];
  schedules: Schedule[];
  bookingQuestions: BookingQuestion[];
  organization: Organization;
};

// ─── Booking: availability (discriminated union) ─────────────────

export type FixedAvailability = {
  appointmentTypeId: string;
  date: string;
  durationMode: "FIXED";
  durationMinutes: number;
  timezone: string;
  entityId: string | null;
  slots: Array<{
    startTime: string;
    endTime: string;
    remainingCapacity: number;
  }>;
};

export type VariableAvailability = {
  appointmentTypeId: string;
  date: string;
  durationMode: "VARIABLE";
  minDurationMins: number;
  maxDurationMins: number;
  durationStepMins: number;
  timezone: string;
  entityId: string | null;
  openRanges: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
};

export type AvailabilityResponse = FixedAvailability | VariableAvailability;

export type AvailabilityQuery = {
  date: string;
  entityId?: string;
  timezone?: string;
};

export type DurationOptionsResponse = {
  startTime: string;
  durations: number[];
};

export type DurationOptionsQuery = {
  date: string;
  startTime: string;
  entityId?: string;
  timezone?: string;
};

// ─── Booking: slot locks ─────────────────────────────────────────

export type SlotLock = {
  id: string;
  appointmentTypeId: string;
  bookablePersonId: string | null;
  bookableResourceId: string | null;
  slotStart: string;
  slotEnd: string;
  customerId: string;
  expiresAt: string;
  createdAt: string;
};

export type AcquireSlotLockInput = {
  appointmentTypeId: string;
  entityId?: string;
  startTime: string;
  endTime: string;
};

// ─── Booking: appointments ───────────────────────────────────────

export type AppointmentAnswerInput = {
  questionId: string;
  answerText: string | null;
};

export type CreateAppointmentInput = {
  slotLockId: string;
  capacityBooked?: number;
  answers?: AppointmentAnswerInput[];
};

export type AppointmentAnswer = {
  question: BookingQuestion;
  answerText: string | null;
  createdAt: string;
};

export type Appointment = {
  publicId: string;
  appointmentTypeId: string;
  customerId: string;
  organizationId: string;
  bookablePersonId: string | null;
  bookableResourceId: string | null;
  startTime: string;
  endTime: string;
  durationMins: number;
  status: AppointmentStatus;
  rescheduleCount: number;
  capacityBooked: number;
  totalAmount: string | null;
  paymentStatus: PaymentStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmationCode: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentWithRelations = Appointment & {
  appointmentType: AppointmentType;
  bookablePerson: BookablePerson | null;
  bookableResource: BookableResource | null;
  answers?: AppointmentAnswer[];
};

export type CancelAppointmentInput = {
  reason?: string;
};

// ─── Booking: payments ───────────────────────────────────────────

export type CreatePaymentIntentInput = {
  appointmentPublicId: string;
};

export type CreatePaymentIntentResult = {
  paymentPublicId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type VerifyPaymentInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type VerifyPaymentResult = {
  paymentPublicId: string;
};
```

- [ ] **Step 2: Run typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add client/types/index.ts
git commit -m "feat(types): add customer booking domain types"
```

---

## Task 2: Add public discovery + availability API functions

**Files:**
- Modify: `client/lib/api.ts` (append new functions)

- [ ] **Step 1: Append imports and functions to `client/lib/api.ts`**

Add to the existing import block (alphabetize as you go):

```ts
import type {
  // ...existing imports stay...
  AppointmentTypeWithRelations,
  AvailabilityQuery,
  AvailabilityResponse,
  DurationOptionsQuery,
  DurationOptionsResponse,
  AppointmentType,
} from "@/types";
```

Append the following functions to the end of the file:

```ts
// ─── Public discovery ────────────────────────────────────────────

export async function listPublicAppointmentTypes(): Promise<AppointmentType[]> {
  try {
    const { data } = await api.get<AppointmentType[]>(
      "/public/appointment-types",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getPublicAppointmentType(
  id: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/public/appointment-types/${id}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getPublicAppointmentTypeByToken(
  token: string,
): Promise<AppointmentTypeWithRelations> {
  try {
    const { data } = await api.get<AppointmentTypeWithRelations>(
      `/public/appointment-types/share/${token}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getAvailability(
  appointmentTypeId: string,
  query: AvailabilityQuery,
): Promise<AvailabilityResponse> {
  try {
    const { data } = await api.get<AvailabilityResponse>(
      `/public/appointment-types/${appointmentTypeId}/availability`,
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getDurationOptions(
  appointmentTypeId: string,
  query: DurationOptionsQuery,
): Promise<DurationOptionsResponse> {
  try {
    const { data } = await api.get<DurationOptionsResponse>(
      `/public/appointment-types/${appointmentTypeId}/availability/duration-options`,
      { params: query },
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 2: Run typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/api.ts
git commit -m "feat(api): add public appointment-type and availability endpoints"
```

---

## Task 3: Add slot lock + appointment + payment API functions

**Files:**
- Modify: `client/lib/api.ts` (append more functions)

- [ ] **Step 1: Append types to the import block** (in `client/lib/api.ts`)

```ts
import type {
  // ...existing imports stay...
  AcquireSlotLockInput,
  AppointmentWithRelations,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  SlotLock,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/types";
```

- [ ] **Step 2: Append the following functions to the end of `client/lib/api.ts`**

```ts
// ─── Slot locks ──────────────────────────────────────────────────

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

export async function extendSlotLock(id: string): Promise<SlotLock> {
  try {
    const { data } = await api.post<SlotLock>(`/slot-locks/${id}/extend`);
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

// Best-effort release using sendBeacon for tab-close. No-op if unsupported.
export function releaseSlotLockBeacon(id: string): void {
  if (typeof navigator === "undefined" || !("sendBeacon" in navigator)) return;
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const url = `${baseURL}/slot-locks/${id}`;
  // sendBeacon does not support DELETE; we POST a tombstone the server's
  // existing DELETE handles. For now, we attempt fetch with keepalive as
  // the most reliable cross-browser option.
  try {
    fetch(url, { method: "DELETE", credentials: "include", keepalive: true });
  } catch {
    // best-effort only
  }
}

// ─── Appointments (customer) ─────────────────────────────────────

export async function createAppointment(
  body: CreateAppointmentInput,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      "/appointments",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function getMyAppointment(
  publicId: string,
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.get<AppointmentWithRelations>(
      `/appointments/${publicId}`,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function cancelMyAppointment(
  publicId: string,
  body: CancelAppointmentInput = {},
): Promise<AppointmentWithRelations> {
  try {
    const { data } = await api.post<AppointmentWithRelations>(
      `/appointments/${publicId}/cancel`,
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

// ─── Payments ────────────────────────────────────────────────────

export async function createPaymentIntent(
  body: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  try {
    const { data } = await api.post<CreatePaymentIntentResult>(
      "/payments/intent",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}

export async function verifyPayment(
  body: VerifyPaymentInput,
): Promise<VerifyPaymentResult> {
  try {
    const { data } = await api.post<VerifyPaymentResult>(
      "/payments/verify",
      body,
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 3: Run typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client/lib/api.ts
git commit -m "feat(api): add slot-lock, appointment, and payment endpoints"
```

---

## Task 4: Implement `lib/format.ts`

**Files:**
- Create: `client/lib/format.ts`

- [ ] **Step 1: Create file with content**

```ts
// Formatters for booking UI: prices, durations, times, dates.
// All pure — safe to call from server components.

export function formatPrice(decimalString: string | null, currency = "INR"): string {
  if (!decimalString) return "Free";
  const n = Number(decimalString);
  if (!Number.isFinite(n) || n <= 0) return "Free";
  if (currency === "INR") return `₹${n.toFixed(2)}`;
  return `${currency} ${n.toFixed(2)}`;
}

// Razorpay returns amounts in minor units (paise). Convert to display.
export function formatMinorUnits(amount: number, currency = "INR"): string {
  const major = amount / 100;
  if (currency === "INR") return `₹${major.toFixed(2)}`;
  return `${currency} ${major.toFixed(2)}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationRange(
  min: number,
  max: number,
): string {
  if (min === max) return formatDuration(min);
  return `${min}–${max} min`;
}

export function formatTimeInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

export function formatDateInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  });
}

export function formatDateTimeInZone(iso: string, timeZone: string): string {
  return `${formatDateInZone(iso, timeZone)} at ${formatTimeInZone(iso, timeZone)}`;
}

// "Mon", "Tue", … from a 0..6 dayOfWeek (0=Sun).
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dayOfWeekName(day: number): string {
  return DAY_NAMES[day] ?? "";
}

// Format a HH:MM string (e.g. "09:00") to "9:00 AM".
export function formatHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const date = new Date(2000, 0, 1, h, m);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Compute the difference from now to an ISO timestamp, formatted as M:SS.
// Returns "0:00" when the timestamp is in the past.
export function formatRemaining(toIso: string, nowMs: number = Date.now()): string {
  const diffMs = new Date(toIso).getTime() - nowMs;
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/format.ts
git commit -m "feat(lib): add booking-flow formatters"
```

---

## Task 5: Implement `lib/calendar-link.ts`

**Files:**
- Create: `client/lib/calendar-link.ts`

- [ ] **Step 1: Create file with content**

```ts
// Build a Google Calendar template URL for an appointment.
// Pure function — no side effects.

type CalendarInput = {
  title: string;
  startIso: string;
  endIso: string;
  description?: string;
  location?: string;
};

function toGoogleDate(iso: string): string {
  // Google Calendar wants YYYYMMDDTHHmmssZ in UTC.
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function buildGoogleCalendarUrl(input: CalendarInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGoogleDate(input.startIso)}/${toGoogleDate(input.endIso)}`,
  });
  if (input.description) params.set("details", input.description);
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/calendar-link.ts
git commit -m "feat(lib): add Google Calendar URL builder"
```

---

## Task 6: Implement `lib/booking-draft.ts`

**Files:**
- Create: `client/lib/booking-draft.ts`

- [ ] **Step 1: Create file with content**

```ts
// Typed sessionStorage helpers for the booking-flow draft.
// Used to survive the login redirect mid-flow.

const KEY_PREFIX = "booking-draft:";

export type BookingDraft = {
  step: string;
  entityId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  capacityBooked: number;
  answers: Record<string, string>;
  // Lock state is intentionally NOT persisted — locks are server-side
  // and only valid for 5 minutes. We re-acquire on resume.
  savedAt: number;
};

const MAX_DRAFT_AGE_MS = 30 * 60 * 1000; // 30 minutes

function key(appointmentTypeId: string): string {
  return `${KEY_PREFIX}${appointmentTypeId}`;
}

export function saveBookingDraft(
  appointmentTypeId: string,
  draft: Omit<BookingDraft, "savedAt">,
): void {
  if (typeof window === "undefined") return;
  const payload: BookingDraft = { ...draft, savedAt: Date.now() };
  try {
    window.sessionStorage.setItem(key(appointmentTypeId), JSON.stringify(payload));
  } catch {
    // Quota or disabled storage — silently ignore.
  }
}

export function loadBookingDraft(appointmentTypeId: string): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key(appointmentTypeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.step !== "string" ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.capacityBooked !== "number" ||
      typeof parsed.answers !== "object"
    ) {
      clearBookingDraft(appointmentTypeId);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_DRAFT_AGE_MS) {
      clearBookingDraft(appointmentTypeId);
      return null;
    }
    return parsed;
  } catch {
    clearBookingDraft(appointmentTypeId);
    return null;
  }
}

export function clearBookingDraft(appointmentTypeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key(appointmentTypeId));
  } catch {
    // ignore
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/booking-draft.ts
git commit -m "feat(lib): add sessionStorage booking-draft helpers"
```

---

## Task 7: Implement `lib/booking-stepper-machine.ts`

**Files:**
- Create: `client/lib/booking-stepper-machine.ts`

- [ ] **Step 1: Create file with content**

```ts
// Pure reducer + step transition logic for the booking stepper.
// Kept separate from the React component so it can be reasoned about
// (and later tested) in isolation.

import type { AppointmentTypeWithRelations } from "@/types";

export type BookingStep =
  | "entity"
  | "date"
  | "time"
  | "duration"
  | "questions"
  | "review"
  | "payment";

export type BookingState = {
  step: BookingStep;
  entityId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  capacityBooked: number;
  answers: Record<string, string>;
  slotLockId?: string;
  slotLockExpiresAt?: string;
  appointmentPublicId?: string;
};

export type BookingAction =
  | { type: "SET_ENTITY"; entityId: string }
  | { type: "SET_DATE"; date: string }
  | { type: "SET_TIME"; startTime: string; endTime?: string }
  | { type: "SET_DURATION"; durationMinutes: number; endTime: string }
  | { type: "SET_ANSWERS"; answers: Record<string, string> }
  | { type: "SET_CAPACITY"; capacityBooked: number }
  | {
      type: "SET_SLOT_LOCK";
      slotLockId: string;
      slotLockExpiresAt: string;
    }
  | { type: "CLEAR_SLOT_LOCK" }
  | { type: "SET_APPOINTMENT"; appointmentPublicId: string }
  | { type: "GO_TO_STEP"; step: BookingStep }
  | { type: "HYDRATE"; state: Partial<BookingState> & { step: BookingStep } };

export const INITIAL_STATE: BookingState = {
  step: "date",
  capacityBooked: 1,
  answers: {},
};

export function bookingReducer(
  state: BookingState,
  action: BookingAction,
): BookingState {
  switch (action.type) {
    case "SET_ENTITY":
      return { ...state, entityId: action.entityId };
    case "SET_DATE":
      return {
        ...state,
        date: action.date,
        // Clear downstream selections when date changes.
        startTime: undefined,
        endTime: undefined,
        durationMinutes: undefined,
      };
    case "SET_TIME":
      return {
        ...state,
        startTime: action.startTime,
        endTime: action.endTime ?? state.endTime,
        durationMinutes: undefined,
      };
    case "SET_DURATION":
      return {
        ...state,
        durationMinutes: action.durationMinutes,
        endTime: action.endTime,
      };
    case "SET_ANSWERS":
      return { ...state, answers: action.answers };
    case "SET_CAPACITY":
      return { ...state, capacityBooked: action.capacityBooked };
    case "SET_SLOT_LOCK":
      return {
        ...state,
        slotLockId: action.slotLockId,
        slotLockExpiresAt: action.slotLockExpiresAt,
      };
    case "CLEAR_SLOT_LOCK":
      return {
        ...state,
        slotLockId: undefined,
        slotLockExpiresAt: undefined,
      };
    case "SET_APPOINTMENT":
      return { ...state, appointmentPublicId: action.appointmentPublicId };
    case "GO_TO_STEP":
      return { ...state, step: action.step };
    case "HYDRATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

// Active steps for a given appointment type. Order is meaningful.
export function activeSteps(type: AppointmentTypeWithRelations): BookingStep[] {
  const steps: BookingStep[] = [];
  if (type.assignmentMode === "MANUAL") steps.push("entity");
  steps.push("date", "time");
  if (type.durationMode === "VARIABLE") steps.push("duration");
  if (type.bookingQuestions.length > 0) steps.push("questions");
  steps.push("review");
  if (type.advancePaymentEnabled) steps.push("payment");
  return steps;
}

export function nextStep(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): BookingStep | null {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  if (idx === -1 || idx === steps.length - 1) return null;
  return steps[idx + 1];
}

export function prevStep(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): BookingStep | null {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  if (idx <= 0) return null;
  return steps[idx - 1];
}

export function stepNumber(
  current: BookingStep,
  type: AppointmentTypeWithRelations,
): { current: number; total: number } {
  const steps = activeSteps(type);
  const idx = steps.indexOf(current);
  return { current: idx + 1, total: steps.length };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/lib/booking-stepper-machine.ts
git commit -m "feat(lib): add pure booking-stepper reducer and step transitions"
```

---

## Task 8: Implement `hooks/usePublicAppointments.ts`

**Files:**
- Create: `client/hooks/usePublicAppointments.ts`

- [ ] **Step 1: Create file with content**

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAvailability,
  getDurationOptions,
  getPublicAppointmentType,
  getPublicAppointmentTypeByToken,
  listPublicAppointmentTypes,
} from "@/lib/api";
import type {
  AppointmentType,
  AppointmentTypeWithRelations,
  AvailabilityQuery,
  AvailabilityResponse,
  DurationOptionsQuery,
  DurationOptionsResponse,
} from "@/types";

const ROOT_KEY = ["public", "appointment-types"] as const;

export function publicAppointmentTypeKey(id: string) {
  return [...ROOT_KEY, id] as const;
}

export function usePublicAppointmentTypes() {
  return useQuery<AppointmentType[]>({
    queryKey: ROOT_KEY,
    queryFn: listPublicAppointmentTypes,
    staleTime: 60_000,
  });
}

export function usePublicAppointmentType(id: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: id ? publicAppointmentTypeKey(id) : ["public", "appointment-types", "none"],
    queryFn: () => getPublicAppointmentType(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePublicAppointmentTypeByToken(token: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: ["public", "appointment-types", "share", token ?? "none"],
    queryFn: () => getPublicAppointmentTypeByToken(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useAvailability(
  appointmentTypeId: string | undefined,
  query: Partial<AvailabilityQuery>,
) {
  const enabled = !!appointmentTypeId && !!query.date;
  return useQuery<AvailabilityResponse>({
    queryKey: [
      "public",
      "appointment-types",
      appointmentTypeId,
      "availability",
      query,
    ],
    queryFn: () =>
      getAvailability(appointmentTypeId!, {
        date: query.date!,
        entityId: query.entityId,
        timezone: query.timezone,
      }),
    enabled,
    staleTime: 15_000,
  });
}

export function useDurationOptions(
  appointmentTypeId: string | undefined,
  query: Partial<DurationOptionsQuery>,
) {
  const enabled =
    !!appointmentTypeId && !!query.date && !!query.startTime;
  return useQuery<DurationOptionsResponse>({
    queryKey: [
      "public",
      "appointment-types",
      appointmentTypeId,
      "duration-options",
      query,
    ],
    queryFn: () =>
      getDurationOptions(appointmentTypeId!, {
        date: query.date!,
        startTime: query.startTime!,
        entityId: query.entityId,
        timezone: query.timezone,
      }),
    enabled,
    staleTime: 15_000,
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/usePublicAppointments.ts
git commit -m "feat(hooks): add public appointment-type and availability queries"
```

---

## Task 9: Implement `hooks/useBooking.ts`

**Files:**
- Create: `client/hooks/useBooking.ts`

- [ ] **Step 1: Create file with content**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acquireSlotLock,
  ApiError,
  cancelMyAppointment,
  createAppointment,
  createPaymentIntent,
  extendSlotLock,
  getMyAppointment,
  releaseSlotLock,
  verifyPayment,
} from "@/lib/api";
import type {
  AcquireSlotLockInput,
  AppointmentWithRelations,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  SlotLock,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/types";

export function appointmentKey(publicId: string) {
  return ["appointments", "me", publicId] as const;
}

export function useAcquireSlotLock() {
  return useMutation<SlotLock, ApiError, AcquireSlotLockInput>({
    mutationFn: acquireSlotLock,
  });
}

export function useExtendSlotLock() {
  return useMutation<SlotLock, ApiError, string>({
    mutationFn: (id) => extendSlotLock(id),
  });
}

export function useReleaseSlotLock() {
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => releaseSlotLock(id),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation<AppointmentWithRelations, ApiError, CreateAppointmentInput>({
    mutationFn: createAppointment,
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
    },
  });
}

export function useAppointment(publicId: string | undefined) {
  return useQuery<AppointmentWithRelations>({
    queryKey: publicId ? appointmentKey(publicId) : ["appointments", "me", "none"],
    queryFn: () => getMyAppointment(publicId!),
    enabled: !!publicId,
    refetchOnWindowFocus: false,
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body?: CancelAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => cancelMyAppointment(publicId, body),
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
    },
  });
}

export function useCreatePaymentIntent() {
  return useMutation<CreatePaymentIntentResult, ApiError, CreatePaymentIntentInput>({
    mutationFn: createPaymentIntent,
  });
}

export function useVerifyPayment() {
  return useMutation<VerifyPaymentResult, ApiError, VerifyPaymentInput>({
    mutationFn: verifyPayment,
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/useBooking.ts
git commit -m "feat(hooks): add slot-lock, appointment, and payment mutations"
```

---

## Task 10: Implement `components/layout/public-shell.tsx`

**Files:**
- Create: `client/components/layout/public-shell.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";

type PublicShellProps = {
  children: ReactNode;
  showBrowseLink?: boolean;
};

export function PublicShell({ children, showBrowseLink = true }: PublicShellProps) {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: (res) => toast.success(res.message),
    });
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-heading text-base font-semibold tracking-tight"
        >
          appointly
        </Link>

        <nav className="flex items-center gap-3">
          {showBrowseLink ? (
            <Button variant="ghost" size="sm" render={<Link href="/browse" />}>
              Browse services
            </Button>
          ) : null}

          {isPending ? (
            <Spinner className="size-4" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                {user.fullName}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/bookings" />}>
                  My bookings
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account" />}>
                  Account settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} disabled={logout.isPending}>
                  {logout.isPending ? <Spinner className="mr-2 size-4" /> : null}
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button size="sm" render={<Link href="/signup" />}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t px-6 py-6 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>© appointly</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/browse" className="hover:underline">
              Browse
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Verify the dropdown-menu primitive exists**

```bash
ls client/components/ui/dropdown-menu.tsx
```

If missing, install via shadcn-ui CLI from inside `client/`:

```bash
cd client && npx shadcn@latest add dropdown-menu
```

- [ ] **Step 3: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/components/layout/public-shell.tsx client/components/ui/dropdown-menu.tsx 2>/dev/null || git add client/components/layout/public-shell.tsx
git commit -m "feat(layout): add public-shell with auth-aware header and footer"
```

---

## Task 11: Implement `components/layout/checkout-shell.tsx`

**Files:**
- Create: `client/components/layout/checkout-shell.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CheckoutShellProps = {
  children: ReactNode;
  // Confirms before exit only when this is true.
  confirmExit?: boolean;
  // Optional step indicator slot — usually rendered by booking-stepper.
  stepIndicator?: ReactNode;
  // Where Exit goes. Defaults to "/browse".
  exitHref?: string;
};

export function CheckoutShell({
  children,
  confirmExit = false,
  stepIndicator,
  exitHref = "/browse",
}: CheckoutShellProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const handleExitClick = () => {
    if (confirmExit) {
      setConfirming(true);
    } else {
      router.push(exitHref);
    }
  };

  const handleConfirmExit = () => {
    setConfirming(false);
    router.push(exitHref);
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link
          href="/"
          className="font-heading text-base font-semibold tracking-tight"
        >
          appointly
        </Link>

        <div className="flex-1 px-6">
          <div className="mx-auto max-w-md">{stepIndicator}</div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleExitClick}>
          Exit
        </Button>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Your selections will be discarded and any held slot will be released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/layout/checkout-shell.tsx
git commit -m "feat(layout): add checkout-shell with exit-confirmation dialog"
```

---

## Task 12: Refactor `home-content.tsx` to use public-shell

**Files:**
- Modify: `client/components/auth/home-content.tsx`

- [ ] **Step 1: Replace the file's contents** with:

```tsx
"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export function HomeContent() {
  const { data: user, isPending } = useCurrentUser();

  return (
    <PublicShell showBrowseLink={false}>
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-xl space-y-6 text-center">
          {isPending ? (
            <Spinner className="size-6" />
          ) : (
            <>
              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                {user
                  ? `Welcome back, ${user.fullName.split(" ")[0]}.`
                  : "Appointments, simplified."}
              </h1>
              <p className="text-base text-muted-foreground">
                {user
                  ? "Browse services and book your next appointment."
                  : "Find a service, pick a time, and get booked in minutes."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" render={<Link href="/browse" />}>
                  Browse services
                </Button>
                {!user ? (
                  <Button
                    variant="ghost"
                    size="lg"
                    render={<Link href="/signup" />}
                  >
                    Create an account
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/auth/home-content.tsx
git commit -m "feat(home): use public-shell, add Browse services CTA"
```

---

## Task 13: Thread `next` query param through login form

**Files:**
- Modify: `client/components/auth/login-form.tsx`

- [ ] **Step 1: Read the existing file to understand the redirect**

```bash
cat client/components/auth/login-form.tsx
```

- [ ] **Step 2: Update the file**

Find the imports block and add (if not already present):

```tsx
import { useSearchParams } from "next/navigation";
```

Inside the component body, near the top, add:

```tsx
const searchParams = useSearchParams();
const nextParam = searchParams?.get("next") ?? null;
const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;
```

Find the `onSuccess` (or equivalent post-login redirect) block. Wherever it currently redirects (e.g. `router.push("/dashboard/...")`), wrap that target so `safeNext` takes precedence:

```tsx
router.push(safeNext ?? defaultDestinationForRole(user.role));
```

If the redirect logic is conditional on user role, keep the role-based default as the fallback when `safeNext` is null. Define `defaultDestinationForRole` inline in the file if it doesn't exist:

```tsx
function defaultDestinationForRole(role: "ADMIN" | "ORGANIZER" | "CUSTOMER"): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "ORGANIZER") return "/organization/dashboard";
  return "/";
}
```

If a 2FA branch redirects to `/login/2fa` or similar, append `?next=<encoded safeNext>` to that URL when `safeNext` is set, so the 2FA verify form can carry it forward.

If the form has a "Sign up" link, append `?next=<encoded>` to it as well so the sign-up path preserves intent:

```tsx
<Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup"}>
  Create account
</Link>
```

Likewise, the "Forgot password" link:

```tsx
<Link href={safeNext ? `/forgot-password?next=${encodeURIComponent(safeNext)}` : "/forgot-password"}>
  Forgot password?
</Link>
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client/components/auth/login-form.tsx
git commit -m "feat(auth): honor next query param in login redirect"
```

---

## Task 14: Thread `next` query param through verify-email and signup

**Files:**
- Modify: `client/components/auth/verify-email-form.tsx`
- Modify: `client/components/auth/signup-form.tsx`

- [ ] **Step 1: In `verify-email-form.tsx`, read `next` from search params and use it in the post-verify redirect**

Imports:
```tsx
import { useSearchParams } from "next/navigation";
```

Near the top of the component:
```tsx
const searchParams = useSearchParams();
const nextParam = searchParams?.get("next") ?? null;
const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;
```

In the success handler, replace any hard-coded redirect with:
```tsx
router.push(safeNext ?? "/login");
```

If the form also offers "Resend OTP" and links back to login, append `?next=<encoded>`:
```tsx
<Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}>
  Back to sign in
</Link>
```

- [ ] **Step 2: In `signup-form.tsx`, do the same — preserve `next` and forward it**

Imports:
```tsx
import { useSearchParams } from "next/navigation";
```

Body:
```tsx
const searchParams = useSearchParams();
const nextParam = searchParams?.get("next") ?? null;
const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;
```

After successful signup, when the form redirects to `/verify-email` (or wherever it goes), append `?next=<encoded>`:
```tsx
const verifyUrl = safeNext
  ? `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext)}`
  : `/verify-email?email=${encodeURIComponent(email)}`;
router.push(verifyUrl);
```

The exact URL shape depends on the existing form — match its pattern, only adding `next`.

If there's a "Sign in" link, also append `next`:
```tsx
<Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"}>
  Sign in
</Link>
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client/components/auth/verify-email-form.tsx client/components/auth/signup-form.tsx
git commit -m "feat(auth): preserve next query param across signup/verify-email"
```

---

## Task 15: Implement `service-card.tsx`

**Files:**
- Create: `client/components/booking/service-card.tsx`

- [ ] **Step 1: Create file with content**

```tsx
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatDurationRange, formatPrice } from "@/lib/format";
import type { AppointmentType } from "@/types";

type ServiceCardProps = {
  type: AppointmentType;
};

function durationLabel(type: AppointmentType): string {
  if (type.durationMode === "FIXED" && type.durationMinutes != null) {
    return formatDuration(type.durationMinutes);
  }
  if (
    type.durationMode === "VARIABLE" &&
    type.minDurationMins != null &&
    type.maxDurationMins != null
  ) {
    return formatDurationRange(type.minDurationMins, type.maxDurationMins);
  }
  return "Variable";
}

export function ServiceCard({ type }: ServiceCardProps) {
  const priceLabel = type.advancePaymentEnabled
    ? `Pay ${formatPrice(type.advancePaymentAmount)} in advance`
    : "Free";

  return (
    <Link href={`/services/${type.id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              {type.name}
            </h3>
            {type.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {type.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{durationLabel(type)}</Badge>
            <Badge variant="outline">{priceLabel}</Badge>
            {type.manualConfirmation ? (
              <Badge variant="outline">Manual confirmation</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/service-card.tsx
git commit -m "feat(booking): add ServiceCard for browse grid"
```

---

## Task 16: Implement `/browse` page

**Files:**
- Create: `client/app/browse/page.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useMemo, useState } from "react";

import { ServiceCard } from "@/components/booking/service-card";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentTypes } from "@/hooks/usePublicAppointments";

export default function BrowsePage() {
  const { data, isPending, isError, refetch } = usePublicAppointmentTypes();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((t) => {
      const haystack = `${t.name} ${t.description ?? ""} ${t.slug}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

  return (
    <PublicShell showBrowseLink={false}>
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-8 space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Browse services
          </h1>
          <p className="text-sm text-muted-foreground">
            Find a service and pick a time that works for you.
          </p>
          <Input
            placeholder="Search services…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
        </header>

        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load services.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {query ? "No services match your search." : "No services available yet."}
            </p>
            {query ? (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((type) => (
              <ServiceCard key={type.id} type={type} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Smoke test**

```bash
cd client && npm run dev
```

Open `http://localhost:3000/browse` in a browser. Confirm:
- Page renders.
- Skeleton appears while loading.
- Search input filters cards client-side.
- Clicking a card navigates to `/services/<id>` (404 expected — not built yet).

Stop the dev server with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add client/app/browse/page.tsx
git commit -m "feat(browse): add /browse page with client-side search"
```

---

## Task 17: Implement `policies-summary.tsx`

**Files:**
- Create: `client/components/booking/policies-summary.tsx`

- [ ] **Step 1: Create file with content**

```tsx
import type { AppointmentType } from "@/types";

type PoliciesSummaryProps = {
  type: AppointmentType;
};

export function PoliciesSummary({ type }: PoliciesSummaryProps) {
  const cancellation = (() => {
    if (!type.cancellationAllowed) return "Cancellation not allowed.";
    if (type.cancellationWindowHours == null)
      return "Cancellation allowed any time before the appointment.";
    return `Cancellation allowed up to ${type.cancellationWindowHours} hour${type.cancellationWindowHours === 1 ? "" : "s"} before the appointment.`;
  })();

  const reschedule = (() => {
    if (!type.rescheduleAllowed) return "Rescheduling not allowed.";
    const window =
      type.rescheduleWindowHours == null
        ? "any time before the appointment"
        : `up to ${type.rescheduleWindowHours} hour${type.rescheduleWindowHours === 1 ? "" : "s"} before the appointment`;
    const max =
      type.maxReschedulesAllowed == null
        ? ""
        : ` (up to ${type.maxReschedulesAllowed} time${type.maxReschedulesAllowed === 1 ? "" : "s"})`;
    return `Rescheduling allowed ${window}${max}.`;
  })();

  return (
    <ul className="space-y-1 text-sm text-muted-foreground">
      <li>{cancellation}</li>
      <li>{reschedule}</li>
      {type.manualConfirmation ? (
        <li>Bookings require organizer confirmation before they&apos;re final.</li>
      ) : null}
      {type.advancePaymentEnabled ? <li>Advance payment required.</li> : null}
    </ul>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/policies-summary.tsx
git commit -m "feat(booking): add PoliciesSummary for service detail"
```

---

## Task 18: Implement `schedule-summary.tsx`

**Files:**
- Create: `client/components/booking/schedule-summary.tsx`

- [ ] **Step 1: Create file with content**

```tsx
import { dayOfWeekName, formatHHMM } from "@/lib/format";
import type { Schedule, ScheduleRule } from "@/types";

type ScheduleSummaryProps = {
  schedules: Schedule[];
};

function summarizeRule(rule: ScheduleRule): string {
  const range = `${formatHHMM(rule.startTime)}–${formatHHMM(rule.endTime)}`;
  if (rule.dayOfWeek != null) {
    return `${dayOfWeekName(rule.dayOfWeek)} ${range}`;
  }
  if (rule.specificDate) {
    return `${rule.specificDate} ${range}`;
  }
  return range;
}

export function ScheduleSummary({ schedules }: ScheduleSummaryProps) {
  const rules = schedules.flatMap((s) => s.rules.filter((r) => r.isAvailable));
  const weekly = rules.filter((r) => r.dayOfWeek != null);
  const overrides = rules.filter((r) => r.specificDate != null);

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No availability configured.</p>
    );
  }

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {weekly.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            Weekly
          </p>
          <ul className="mt-1 space-y-0.5">
            {weekly.map((r) => (
              <li key={r.id}>{summarizeRule(r)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {overrides.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            Specific dates
          </p>
          <ul className="mt-1 space-y-0.5">
            {overrides.map((r) => (
              <li key={r.id}>{summarizeRule(r)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/schedule-summary.tsx
git commit -m "feat(booking): add ScheduleSummary"
```

---

## Task 19: Implement `service-detail.tsx`

**Files:**
- Create: `client/components/booking/service-detail.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import Link from "next/link";

import { PoliciesSummary } from "@/components/booking/policies-summary";
import { ScheduleSummary } from "@/components/booking/schedule-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDuration,
  formatDurationRange,
  formatPrice,
} from "@/lib/format";
import type { AppointmentTypeWithRelations } from "@/types";

type ServiceDetailProps = {
  type: AppointmentTypeWithRelations;
  shareToken?: string;
};

function durationLabel(type: AppointmentTypeWithRelations): string {
  if (type.durationMode === "FIXED" && type.durationMinutes != null) {
    return formatDuration(type.durationMinutes);
  }
  if (
    type.durationMode === "VARIABLE" &&
    type.minDurationMins != null &&
    type.maxDurationMins != null
  ) {
    return formatDurationRange(type.minDurationMins, type.maxDurationMins);
  }
  return "Variable";
}

export function ServiceDetail({ type, shareToken }: ServiceDetailProps) {
  const bookHref = shareToken
    ? `/book/${type.id}?token=${encodeURIComponent(shareToken)}`
    : `/book/${type.id}`;

  const entityCount = type.entities.length;
  const priceLabel = type.advancePaymentEnabled
    ? `Pay ${formatPrice(type.advancePaymentAmount)} in advance`
    : "Free";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">{type.organization.name}</p>
          {type.organization.address ? (
            <p className="text-xs text-muted-foreground">
              {type.organization.address}
            </p>
          ) : null}
          {type.organization.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {type.organization.description}
            </p>
          ) : null}
        </section>

        <Separator />

        <section className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {type.name}
          </h1>
          {type.description ? (
            <p className="whitespace-pre-line text-sm">{type.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{durationLabel(type)}</Badge>
            <Badge variant="outline">{priceLabel}</Badge>
            <Badge variant="outline">
              {type.entityType === "PERSON" ? "Staff" : "Resource"}: {entityCount}
            </Badge>
            {type.maxBookingsPerSlot > 1 ? (
              <Badge variant="outline">
                Up to {type.maxBookingsPerSlot} per slot
              </Badge>
            ) : null}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">Availability</h2>
          <ScheduleSummary schedules={type.schedules} />
          <p className="text-xs text-muted-foreground">
            Times shown in {type.schedules[0]?.timezone ?? type.organization.timezone}.
          </p>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold">Policies</h2>
          <PoliciesSummary type={type} />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Price
              </p>
              <p className="mt-1 text-lg font-semibold">{priceLabel}</p>
            </div>
            <Button size="lg" className="w-full" render={<Link href={bookHref} />}>
              Book this
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/service-detail.tsx
git commit -m "feat(booking): add ServiceDetail two-column layout"
```

---

## Task 20: Implement `/services/[id]` page

**Files:**
- Create: `client/app/services/[id]/page.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { use } from "react";

import { ServiceDetail } from "@/components/booking/service-detail";
import { PublicShell } from "@/components/layout/public-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentType } from "@/hooks/usePublicAppointments";

type Params = { id: string };

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = use(params);
  const { data, isPending, isError } = usePublicAppointmentType(id);

  return (
    <PublicShell>
      {isPending ? (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-4 w-72" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Service not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This service couldn&apos;t be loaded. It may have been unpublished.
          </p>
        </div>
      ) : (
        <ServiceDetail type={data} />
      )}
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Smoke test**

```bash
cd client && npm run dev
```

Open `/browse`, click any card. Confirm `/services/<id>` renders the detail page.

- [ ] **Step 4: Commit**

```bash
git add client/app/services/[id]/page.tsx
git commit -m "feat(services): add public service detail page"
```

---

## Task 21: Implement `/services/share/[token]` page

**Files:**
- Create: `client/app/services/share/[token]/page.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { use } from "react";

import { ServiceDetail } from "@/components/booking/service-detail";
import { PublicShell } from "@/components/layout/public-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentTypeByToken } from "@/hooks/usePublicAppointments";

type Params = { token: string };

export default function ServiceShareTokenPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = use(params);
  const { data, isPending, isError } = usePublicAppointmentTypeByToken(token);

  return (
    <PublicShell>
      {isPending ? (
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-4 w-72" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">Invalid link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link is invalid or has been revoked.
          </p>
        </div>
      ) : (
        <ServiceDetail type={data} shareToken={token} />
      )}
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add client/app/services/share/[token]/page.tsx
git commit -m "feat(services): add share-token detail page"
```

---

## Task 22: Implement `entity-picker.tsx`

**Files:**
- Create: `client/components/booking/entity-picker.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentTypeWithRelations } from "@/types";

type EntityPickerProps = {
  type: AppointmentTypeWithRelations;
  value: string | undefined; // bookablePersonId / bookableResourceId
  onChange: (entityId: string) => void;
};

type EntityOption = {
  id: string;
  name: string;
  subtitle?: string;
};

function entityOptions(type: AppointmentTypeWithRelations): EntityOption[] {
  return type.entities.map((e) => {
    if (e.bookablePerson) {
      return {
        id: e.bookablePerson.id,
        name: e.bookablePerson.name,
        subtitle: e.bookablePerson.designation ?? undefined,
      };
    }
    if (e.bookableResource) {
      return {
        id: e.bookableResource.id,
        name: e.bookableResource.name,
        subtitle: e.bookableResource.location ?? undefined,
      };
    }
    return { id: e.id, name: "Unknown" };
  });
}

export function EntityPicker({ type, value, onChange }: EntityPickerProps) {
  const options = entityOptions(type);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <Card
            key={opt.id}
            className={`cursor-pointer transition-colors ${
              selected ? "border-foreground" : "hover:border-foreground/40"
            }`}
            onClick={() => onChange(opt.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChange(opt.id);
            }}
          >
            <CardContent className="p-4">
              <p className="font-medium">{opt.name}</p>
              {opt.subtitle ? (
                <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/entity-picker.tsx
git commit -m "feat(booking): add EntityPicker for MANUAL assignment step"
```

---

## Task 23: Implement `availability-calendar.tsx`

**Files:**
- Create: `client/components/booking/availability-calendar.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { format } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import type { Schedule, ScheduleRule } from "@/types";

type AvailabilityCalendarProps = {
  schedules: Schedule[];
  selected: string | undefined; // YYYY-MM-DD
  onSelect: (dateIso: string) => void;
};

// Returns the set of weekdays (0..6) covered by any weekly rule.
function weeklyDays(rules: ScheduleRule[]): Set<number> {
  return new Set(
    rules
      .filter((r) => r.isAvailable && r.dayOfWeek != null)
      .map((r) => r.dayOfWeek as number),
  );
}

// Returns the set of YYYY-MM-DD specific-date overrides.
function specificDates(rules: ScheduleRule[]): Set<string> {
  return new Set(
    rules
      .filter((r) => r.isAvailable && r.specificDate != null)
      .map((r) => r.specificDate as string),
  );
}

export function AvailabilityCalendar({
  schedules,
  selected,
  onSelect,
}: AvailabilityCalendarProps) {
  const allRules = schedules.flatMap((s) => s.rules);
  const days = weeklyDays(allRules);
  const dates = specificDates(allRules);

  const isDisabled = (date: Date) => {
    // Past dates are disabled.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const yyyymmdd = format(date, "yyyy-MM-dd");
    if (dates.has(yyyymmdd)) return false;
    return !days.has(date.getDay());
  };

  return (
    <Calendar
      mode="single"
      selected={selected ? new Date(selected) : undefined}
      onSelect={(date) => {
        if (date) onSelect(format(date, "yyyy-MM-dd"));
      }}
      disabled={isDisabled}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS. If `Calendar` props don't match this shape, adjust to whatever the existing wrapper exposes (it's react-day-picker under the hood).

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/availability-calendar.tsx
git commit -m "feat(booking): add AvailabilityCalendar with schedule-aware date disabling"
```

---

## Task 24: Implement `slot-list.tsx`

**Files:**
- Create: `client/components/booking/slot-list.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { formatTimeInZone } from "@/lib/format";
import type { FixedAvailability } from "@/types";

type SlotListProps = {
  availability: FixedAvailability;
  selectedStart: string | undefined;
  onSelect: (startTime: string, endTime: string) => void;
};

export function SlotList({
  availability,
  selectedStart,
  onSelect,
}: SlotListProps) {
  if (availability.slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No times available on this day.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {availability.slots.map((slot) => {
        const isFull = slot.remainingCapacity <= 0;
        const isSelected = selectedStart === slot.startTime;
        return (
          <Button
            key={slot.startTime}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={isFull}
            onClick={() => onSelect(slot.startTime, slot.endTime)}
          >
            {formatTimeInZone(slot.startTime, availability.timezone)}
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/slot-list.tsx
git commit -m "feat(booking): add SlotList for FIXED-duration time selection"
```

---

## Task 25: Implement `open-range-picker.tsx`

**Files:**
- Create: `client/components/booking/open-range-picker.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatTimeInZone } from "@/lib/format";
import type { VariableAvailability } from "@/types";

type OpenRangePickerProps = {
  availability: VariableAvailability;
  selectedStart: string | undefined;
  onSelect: (startTime: string) => void;
};

// Generate the set of possible start times within an open range,
// stepped by `durationStepMins`. The customer can start at any of these
// as long as a duration >= minDurationMins fits afterwards.
function generateStartTimes(
  rangeStart: string,
  rangeEnd: string,
  rangeDurationMins: number,
  minDurationMins: number,
  stepMins: number,
): string[] {
  if (rangeDurationMins < minDurationMins) return [];
  const out: string[] = [];
  const start = new Date(rangeStart).getTime();
  const end = new Date(rangeEnd).getTime();
  for (
    let t = start;
    t + minDurationMins * 60_000 <= end;
    t += stepMins * 60_000
  ) {
    out.push(new Date(t).toISOString());
  }
  return out;
}

export function OpenRangePicker({
  availability,
  selectedStart,
  onSelect,
}: OpenRangePickerProps) {
  const startTimes = useMemo(() => {
    return availability.openRanges.flatMap((r) =>
      generateStartTimes(
        r.startTime,
        r.endTime,
        r.durationMinutes,
        availability.minDurationMins,
        availability.durationStepMins,
      ),
    );
  }, [availability]);

  if (startTimes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No times available on this day.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {startTimes.map((iso) => (
        <Button
          key={iso}
          variant={selectedStart === iso ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(iso)}
        >
          {formatTimeInZone(iso, availability.timezone)}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/open-range-picker.tsx
git commit -m "feat(booking): add OpenRangePicker for VARIABLE start-time selection"
```

---

## Task 26: Implement `duration-picker.tsx`

**Files:**
- Create: `client/components/booking/duration-picker.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

type DurationPickerProps = {
  durations: number[];
  selected: number | undefined;
  onSelect: (mins: number) => void;
  isLoading?: boolean;
};

export function DurationPicker({
  durations,
  selected,
  onSelect,
  isLoading,
}: DurationPickerProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading durations…</p>;
  }
  if (durations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No durations fit at this start time.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {durations.map((mins) => (
        <Button
          key={mins}
          variant={selected === mins ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(mins)}
        >
          {formatDuration(mins)}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/duration-picker.tsx
git commit -m "feat(booking): add DurationPicker for VARIABLE duration step"
```

---

## Task 27: Implement `question-form.tsx`

**Files:**
- Create: `client/components/booking/question-form.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { BookingQuestion } from "@/types";

type QuestionFormProps = {
  questions: BookingQuestion[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
};

export function QuestionForm({ questions, values, onChange }: QuestionFormProps) {
  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  const setValue = (id: string, val: string) => {
    onChange({ ...values, [id]: val });
  };

  return (
    <div className="space-y-6">
      {sorted.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label className="text-sm font-medium">
            {q.questionText}
            {q.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>

          {q.questionType === "TEXT" ? (
            <Textarea
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
              placeholder="Your answer"
              rows={3}
            />
          ) : q.questionType === "NUMBER" ? (
            <Input
              type="number"
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
            />
          ) : q.questionType === "DATE" ? (
            <Input
              type="date"
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
            />
          ) : q.questionType === "SINGLE_CHOICE" ? (
            <RadioGroup
              value={values[q.id] ?? ""}
              onValueChange={(v) => setValue(q.id, v)}
            >
              {(q.options ?? []).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : q.questionType === "MULTIPLE_CHOICE" ? (
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => {
                const selected = (values[q.id] ?? "")
                  .split(",")
                  .filter(Boolean);
                const checked = selected.includes(opt);
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      id={`${q.id}-${opt}`}
                      checked={checked}
                      onCheckedChange={(next) => {
                        const set = new Set(selected);
                        if (next) set.add(opt);
                        else set.delete(opt);
                        setValue(q.id, [...set].join(","));
                      }}
                    />
                    <Label htmlFor={`${q.id}-${opt}`} className="text-sm">
                      {opt}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Validation: returns null if valid, else array of error messages
// keyed by question id (for surfacing per-field). Mirrors server rules.
export function validateAnswers(
  questions: BookingQuestion[],
  values: Record<string, string>,
): { fieldErrors: Record<string, string>; isValid: boolean } {
  const fieldErrors: Record<string, string> = {};
  for (const q of questions) {
    const raw = (values[q.id] ?? "").trim();
    if (q.isRequired && raw === "") {
      fieldErrors[q.id] = "This question is required.";
      continue;
    }
    if (raw === "") continue;
    if (q.questionType === "SINGLE_CHOICE") {
      if (!q.options?.includes(raw)) {
        fieldErrors[q.id] = "Pick one of the options.";
      }
    } else if (q.questionType === "MULTIPLE_CHOICE") {
      const parts = raw.split(",");
      if (parts.some((p) => !q.options?.includes(p))) {
        fieldErrors[q.id] = "All selections must be from the options.";
      }
    } else if (q.questionType === "NUMBER") {
      if (!Number.isFinite(Number(raw))) {
        fieldErrors[q.id] = "Enter a number.";
      }
    } else if (q.questionType === "DATE") {
      if (Number.isNaN(Date.parse(raw))) {
        fieldErrors[q.id] = "Enter a valid date.";
      }
    }
  }
  return { fieldErrors, isValid: Object.keys(fieldErrors).length === 0 };
}
```

- [ ] **Step 2: Verify required UI primitives exist**

```bash
ls client/components/ui/checkbox.tsx client/components/ui/radio-group.tsx client/components/ui/textarea.tsx
```

If any are missing, install via shadcn-ui CLI from inside `client/` (e.g. `npx shadcn@latest add checkbox radio-group textarea`).

- [ ] **Step 3: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/components/booking/question-form.tsx
git commit -m "feat(booking): add QuestionForm with per-type renderers and client-side validation"
```

---

## Task 28: Implement `slot-lock-countdown.tsx`

**Files:**
- Create: `client/components/booking/slot-lock-countdown.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { formatRemaining } from "@/lib/format";

type SlotLockCountdownProps = {
  expiresAt: string;
  onExtend: () => void;
  onExpired: () => void;
};

const EXTEND_THRESHOLD_MS = 60_000; // 60 seconds

export function SlotLockCountdown({
  expiresAt,
  onExtend,
  onExpired,
}: SlotLockCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const extendedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset the extended-once flag whenever a new `expiresAt` arrives.
  useEffect(() => {
    extendedRef.current = false;
  }, [expiresAt]);

  const remainingMs = new Date(expiresAt).getTime() - now;

  useEffect(() => {
    if (remainingMs <= 0) {
      onExpired();
      return;
    }
    if (
      remainingMs > 0 &&
      remainingMs <= EXTEND_THRESHOLD_MS &&
      !extendedRef.current
    ) {
      extendedRef.current = true;
      onExtend();
    }
  }, [remainingMs, onExtend, onExpired]);

  const isAmber = remainingMs <= EXTEND_THRESHOLD_MS;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm ${
        isAmber
          ? "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-foreground/10 bg-muted/40 text-foreground"
      }`}
    >
      Your slot is held for {formatRemaining(expiresAt, now)}.
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/slot-lock-countdown.tsx
git commit -m "feat(booking): add SlotLockCountdown with auto-extend and aria-live"
```

---

## Task 29: Implement `step-indicator.tsx`

**Files:**
- Create: `client/components/booking/step-indicator.tsx`

- [ ] **Step 1: Create file with content**

```tsx
type StepIndicatorProps = {
  current: number;
  total: number;
};

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? "bg-foreground" : "bg-foreground/20"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        Step {current} of {total}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/step-indicator.tsx
git commit -m "feat(booking): add StepIndicator progress bar"
```

---

## Task 30: Implement `razorpay-checkout.tsx`

**Files:**
- Create: `client/components/booking/razorpay-checkout.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatMinorUnits } from "@/lib/format";
import type { CreatePaymentIntentResult, SafeUser } from "@/types";

type RazorpayCheckoutProps = {
  intent: CreatePaymentIntentResult;
  user: SafeUser;
  onVerified: (handle: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => void;
  onDismissed: () => void;
};

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: unknown) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function RazorpayCheckout({
  intent,
  user,
  onVerified,
  onDismissed,
}: RazorpayCheckoutProps) {
  const [scriptStatus, setScriptStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const openedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadRazorpayScript().then((ok) => {
      if (cancelled) return;
      setScriptStatus(ok ? "ready" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = () => {
    if (openedRef.current) return;
    if (typeof window === "undefined" || !window.Razorpay) return;
    openedRef.current = true;
    const rzp = new window.Razorpay({
      key: intent.keyId,
      amount: intent.amount,
      currency: intent.currency,
      order_id: intent.orderId,
      name: "appointly",
      prefill: { name: user.fullName, email: user.email },
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        onVerified({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          openedRef.current = false;
          onDismissed();
        },
      },
    });
    rzp.open();
  };

  if (scriptStatus === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Loading payment…
      </div>
    );
  }

  if (scriptStatus === "error") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        Couldn&apos;t load the payment provider. Try refreshing, or contact the
        organizer to complete this booking another way.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Pay <strong>{formatMinorUnits(intent.amount, intent.currency)}</strong> to
        confirm your booking.
      </p>
      <Button onClick={open}>Pay now</Button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/razorpay-checkout.tsx
git commit -m "feat(booking): add Razorpay lazy-loaded checkout widget"
```

---

## Task 31: Implement `booking-stepper.tsx`

This is the largest single component — the orchestrator. Showing complete code below.

**Files:**
- Create: `client/components/booking/booking-stepper.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { AvailabilityCalendar } from "@/components/booking/availability-calendar";
import { DurationPicker } from "@/components/booking/duration-picker";
import { EntityPicker } from "@/components/booking/entity-picker";
import { OpenRangePicker } from "@/components/booking/open-range-picker";
import { QuestionForm, validateAnswers } from "@/components/booking/question-form";
import { RazorpayCheckout } from "@/components/booking/razorpay-checkout";
import { SlotList } from "@/components/booking/slot-list";
import { SlotLockCountdown } from "@/components/booking/slot-lock-countdown";
import { StepIndicator } from "@/components/booking/step-indicator";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useAcquireSlotLock,
  useCancelAppointment,
  useCreateAppointment,
  useCreatePaymentIntent,
  useExtendSlotLock,
  useReleaseSlotLock,
  useVerifyPayment,
} from "@/hooks/useBooking";
import {
  useAvailability,
  useDurationOptions,
} from "@/hooks/usePublicAppointments";
import {
  bookingReducer,
  INITIAL_STATE,
  activeSteps,
  nextStep,
  prevStep,
  stepNumber,
  type BookingStep,
} from "@/lib/booking-stepper-machine";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
} from "@/lib/booking-draft";
import { releaseSlotLockBeacon } from "@/lib/api";
import {
  formatDateInZone,
  formatDuration,
  formatPrice,
  formatTimeInZone,
} from "@/lib/format";
import type {
  AppointmentTypeWithRelations,
  CreatePaymentIntentResult,
} from "@/types";

type BookingStepperProps = {
  type: AppointmentTypeWithRelations;
};

export function BookingStepper({ type }: BookingStepperProps) {
  const router = useRouter();
  const { data: user, isPending: userPending } = useCurrentUser();

  // Choose initial step based on which steps are active for this type.
  const steps = useMemo(() => activeSteps(type), [type]);
  const initialStep: BookingStep = steps[0];
  const [state, dispatch] = useReducer(bookingReducer, {
    ...INITIAL_STATE,
    step: initialStep,
  });

  // Hydrate draft from sessionStorage once, on mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = loadBookingDraft(type.id);
    if (draft && steps.includes(draft.step as BookingStep)) {
      dispatch({
        type: "HYDRATE",
        state: {
          step: draft.step as BookingStep,
          entityId: draft.entityId,
          date: draft.date,
          startTime: draft.startTime,
          endTime: draft.endTime,
          durationMinutes: draft.durationMinutes,
          capacityBooked: draft.capacityBooked,
          answers: draft.answers,
        },
      });
    }
  }, [type.id, steps]);

  // Persist draft on every state change (except after appointment created).
  useEffect(() => {
    if (state.appointmentPublicId) return;
    saveBookingDraft(type.id, {
      step: state.step,
      entityId: state.entityId,
      date: state.date,
      startTime: state.startTime,
      endTime: state.endTime,
      durationMinutes: state.durationMinutes,
      capacityBooked: state.capacityBooked,
      answers: state.answers,
    });
  }, [
    type.id,
    state.step,
    state.entityId,
    state.date,
    state.startTime,
    state.endTime,
    state.durationMinutes,
    state.capacityBooked,
    state.answers,
    state.appointmentPublicId,
  ]);

  // Best-effort lock release on tab close.
  useEffect(() => {
    const onUnload = () => {
      if (state.slotLockId) releaseSlotLockBeacon(state.slotLockId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [state.slotLockId]);

  // Server data for current step.
  const availabilityQuery = useAvailability(
    state.date ? type.id : undefined,
    {
      date: state.date,
      entityId: state.entityId,
      timezone: type.schedules[0]?.timezone,
    },
  );
  const durationsQuery = useDurationOptions(
    state.step === "duration" && state.startTime ? type.id : undefined,
    {
      date: state.date,
      startTime: state.startTime,
      entityId: state.entityId,
      timezone: type.schedules[0]?.timezone,
    },
  );

  // Mutations.
  const acquire = useAcquireSlotLock();
  const extend = useExtendSlotLock();
  const release = useReleaseSlotLock();
  const createAppt = useCreateAppointment();
  const cancelAppt = useCancelAppointment();
  const createIntent = useCreatePaymentIntent();
  const verify = useVerifyPayment();

  const stepNum = stepNumber(state.step, type);

  // Navigation helpers.
  const goNext = () => {
    const next = nextStep(state.step, type);
    if (next) dispatch({ type: "GO_TO_STEP", step: next });
  };
  const goPrev = () => {
    const prev = prevStep(state.step, type);
    if (prev) dispatch({ type: "GO_TO_STEP", step: prev });
  };

  // Auth gate before transitioning to Review.
  const onContinueFromQuestionsOrPrior = useCallback(() => {
    const next = nextStep(state.step, type);
    if (next === "review" && !user && !userPending) {
      // Persist draft (already happens on every change) and redirect.
      const dest = encodeURIComponent(`/book/${type.id}`);
      router.push(`/login?next=${dest}`);
      return;
    }
    if (next) dispatch({ type: "GO_TO_STEP", step: next });
  }, [router, state.step, type, user, userPending]);

  // Acquire slot lock when entering Review (if not already held).
  useEffect(() => {
    if (state.step !== "review") return;
    if (state.slotLockId) return;
    if (!state.startTime || !state.endTime) return;
    if (!user) return;

    acquire.mutate(
      {
        appointmentTypeId: type.id,
        entityId:
          type.assignmentMode === "MANUAL" ? state.entityId : undefined,
        startTime: state.startTime,
        endTime: state.endTime,
      },
      {
        onSuccess: (lock) => {
          dispatch({
            type: "SET_SLOT_LOCK",
            slotLockId: lock.id,
            slotLockExpiresAt: lock.expiresAt,
          });
        },
        onError: (err) => {
          if (err.status === 409) {
            toast.error("This time was just taken. Pick another.");
            dispatch({ type: "GO_TO_STEP", step: "time" });
          } else {
            toast.error(err.messages[0] ?? "Couldn't hold this slot.");
          }
        },
      },
    );
  }, [
    state.step,
    state.slotLockId,
    state.startTime,
    state.endTime,
    state.entityId,
    type.id,
    type.assignmentMode,
    user,
    acquire,
  ]);

  const handleExtend = useCallback(() => {
    if (!state.slotLockId) return;
    extend.mutate(state.slotLockId, {
      onSuccess: (lock) => {
        dispatch({
          type: "SET_SLOT_LOCK",
          slotLockId: lock.id,
          slotLockExpiresAt: lock.expiresAt,
        });
      },
      onError: () => {
        toast.warning("Couldn't extend your hold. Confirm soon.");
      },
    });
  }, [extend, state.slotLockId]);

  const handleExpired = useCallback(() => {
    toast.error("Your hold expired. Pick a new time.");
    dispatch({ type: "CLEAR_SLOT_LOCK" });
    dispatch({ type: "GO_TO_STEP", step: "time" });
  }, []);

  const releaseLockSync = useCallback(() => {
    if (state.slotLockId) {
      release.mutate(state.slotLockId);
      dispatch({ type: "CLEAR_SLOT_LOCK" });
    }
  }, [release, state.slotLockId]);

  const goBackFromReview = () => {
    releaseLockSync();
    goPrev();
  };

  // Confirm booking — create appointment.
  const [paymentIntent, setPaymentIntent] =
    useState<CreatePaymentIntentResult | null>(null);
  const [paymentDismissed, setPaymentDismissed] = useState(false);

  const handleConfirm = () => {
    if (!state.slotLockId) {
      toast.error("Slot hold not active. Re-select a time.");
      dispatch({ type: "GO_TO_STEP", step: "time" });
      return;
    }
    const answersArr = type.bookingQuestions.map((q) => ({
      questionId: q.id,
      answerText: state.answers[q.id]?.trim() ? state.answers[q.id] : null,
    }));
    createAppt.mutate(
      {
        slotLockId: state.slotLockId,
        capacityBooked: state.capacityBooked,
        answers: answersArr.length > 0 ? answersArr : undefined,
      },
      {
        onSuccess: (appt) => {
          dispatch({ type: "SET_APPOINTMENT", appointmentPublicId: appt.publicId });
          clearBookingDraft(type.id);
          if (type.advancePaymentEnabled) {
            // Move to payment step; intent fetched in payment effect below.
            dispatch({ type: "GO_TO_STEP", step: "payment" });
          } else {
            router.push(
              `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
                appt.publicId,
              )}`,
            );
          }
        },
        onError: (err) => {
          if (err.status === 404 || err.status === 409) {
            toast.error("Slot no longer available. Pick a new time.");
            dispatch({ type: "CLEAR_SLOT_LOCK" });
            dispatch({ type: "GO_TO_STEP", step: "time" });
          } else if (err.status === 400) {
            toast.error(err.messages[0] ?? "Some answers are invalid.");
            if (type.bookingQuestions.length > 0) {
              dispatch({ type: "GO_TO_STEP", step: "questions" });
            }
          } else {
            toast.error(err.messages[0] ?? "Couldn't confirm booking.");
          }
        },
      },
    );
  };

  // Once on the payment step, create intent.
  useEffect(() => {
    if (state.step !== "payment") return;
    if (!state.appointmentPublicId) return;
    if (paymentIntent) return;
    createIntent.mutate(
      { appointmentPublicId: state.appointmentPublicId },
      {
        onSuccess: (intent) => setPaymentIntent(intent),
        onError: (err) => {
          toast.error(err.messages[0] ?? "Couldn't start payment.");
        },
      },
    );
  }, [state.step, state.appointmentPublicId, paymentIntent, createIntent]);

  const handleVerified = (handle: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    if (!state.appointmentPublicId) return;
    verify.mutate(handle, {
      onSuccess: () => {
        router.push(
          `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
            state.appointmentPublicId!,
          )}`,
        );
      },
      onError: () => {
        // Verify can fail transiently; route to confirmed anyway —
        // the webhook is the source of truth and the page polls.
        toast.message(
          "Payment is being processed. We'll confirm shortly.",
        );
        router.push(
          `/book/${type.id}/confirmed?appointment=${encodeURIComponent(
            state.appointmentPublicId!,
          )}`,
        );
      },
    });
  };

  const handlePaymentDismissed = () => {
    setPaymentDismissed(true);
  };

  const handleCancelUnpaid = () => {
    if (!state.appointmentPublicId) return;
    cancelAppt.mutate(
      { publicId: state.appointmentPublicId, body: { reason: "Customer abandoned payment" } },
      {
        onSuccess: () => {
          toast.success("Booking cancelled.");
          router.push("/browse");
        },
        onError: (err) => {
          toast.error(err.messages[0] ?? "Couldn't cancel booking.");
        },
      },
    );
  };

  // Determine if Continue is enabled per step.
  const continueDisabled = (() => {
    switch (state.step) {
      case "entity":
        return !state.entityId;
      case "date":
        return !state.date;
      case "time":
        return !state.startTime || !state.endTime;
      case "duration":
        return !state.durationMinutes;
      case "questions": {
        const v = validateAnswers(type.bookingQuestions, state.answers);
        return !v.isValid;
      }
      default:
        return false;
    }
  })();

  // Render.
  const tz = type.schedules[0]?.timezone ?? type.organization.timezone;
  const confirmExit = state.step !== "entity" && state.step !== "date";

  return (
    <CheckoutShell
      confirmExit={confirmExit}
      stepIndicator={<StepIndicator current={stepNum.current} total={stepNum.total} />}
    >
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {type.name}
        </h1>
        <p className="text-sm text-muted-foreground">{type.organization.name}</p>

        <div className="mt-8 space-y-6">
          {state.step === "entity" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">
                Choose {type.entityType === "PERSON" ? "who" : "what"}
              </h2>
              <EntityPicker
                type={type}
                value={state.entityId}
                onChange={(id) => dispatch({ type: "SET_ENTITY", entityId: id })}
              />
            </section>
          ) : null}

          {state.step === "date" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Pick a date</h2>
              <AvailabilityCalendar
                schedules={type.schedules}
                selected={state.date}
                onSelect={(d) => dispatch({ type: "SET_DATE", date: d })}
              />
              <p className="text-xs text-muted-foreground">Times in {tz}.</p>
            </section>
          ) : null}

          {state.step === "time" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Pick a time</h2>
              {availabilityQuery.isPending ? (
                <Spinner className="size-4" />
              ) : availabilityQuery.isError || !availabilityQuery.data ? (
                <p className="text-sm text-destructive">
                  Couldn&apos;t load times. Try a different date.
                </p>
              ) : availabilityQuery.data.durationMode === "FIXED" ? (
                <SlotList
                  availability={availabilityQuery.data}
                  selectedStart={state.startTime}
                  onSelect={(s, e) =>
                    dispatch({ type: "SET_TIME", startTime: s, endTime: e })
                  }
                />
              ) : (
                <OpenRangePicker
                  availability={availabilityQuery.data}
                  selectedStart={state.startTime}
                  onSelect={(s) =>
                    dispatch({ type: "SET_TIME", startTime: s })
                  }
                />
              )}
            </section>
          ) : null}

          {state.step === "duration" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Pick a duration</h2>
              <DurationPicker
                durations={durationsQuery.data?.durations ?? []}
                selected={state.durationMinutes}
                isLoading={durationsQuery.isPending}
                onSelect={(mins) => {
                  if (!state.startTime) return;
                  const endIso = new Date(
                    new Date(state.startTime).getTime() + mins * 60_000,
                  ).toISOString();
                  dispatch({
                    type: "SET_DURATION",
                    durationMinutes: mins,
                    endTime: endIso,
                  });
                }}
              />
            </section>
          ) : null}

          {state.step === "questions" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">A few questions</h2>
              <QuestionForm
                questions={type.bookingQuestions}
                values={state.answers}
                onChange={(answers) =>
                  dispatch({ type: "SET_ANSWERS", answers })
                }
              />
            </section>
          ) : null}

          {state.step === "review" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Review</h2>

              {state.slotLockExpiresAt ? (
                <SlotLockCountdown
                  expiresAt={state.slotLockExpiresAt}
                  onExtend={handleExtend}
                  onExpired={handleExpired}
                />
              ) : acquire.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Holding your slot…
                </div>
              ) : null}

              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Service
                    </p>
                    <p>{type.name}</p>
                  </div>
                  {state.startTime && state.endTime ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        When
                      </p>
                      <p>
                        {formatDateInZone(state.startTime, tz)} ·{" "}
                        {formatTimeInZone(state.startTime, tz)}–
                        {formatTimeInZone(state.endTime, tz)} ({tz})
                      </p>
                    </div>
                  ) : null}
                  {type.maxBookingsPerSlot > 1 && type.manageCapacity ? (
                    <div className="space-y-1">
                      <Label htmlFor="capacity">Seats</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min={1}
                        max={type.maxBookingsPerSlot}
                        value={state.capacityBooked}
                        onChange={(e) => {
                          const n = Math.max(
                            1,
                            Math.min(
                              type.maxBookingsPerSlot,
                              Number(e.target.value) || 1,
                            ),
                          );
                          dispatch({ type: "SET_CAPACITY", capacityBooked: n });
                        }}
                      />
                    </div>
                  ) : null}
                  {type.advancePaymentEnabled ? (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Price</p>
                      <p>{formatPrice(type.advancePaymentAmount)}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Button
                onClick={handleConfirm}
                disabled={
                  !state.slotLockId || createAppt.isPending || acquire.isPending
                }
              >
                {createAppt.isPending ? <Spinner className="mr-2 size-4" /> : null}
                {type.advancePaymentEnabled
                  ? "Continue to payment"
                  : "Confirm booking"}
              </Button>
            </section>
          ) : null}

          {state.step === "payment" ? (
            <section className="space-y-4">
              <h2 className="font-heading text-base font-semibold">Payment</h2>
              {paymentDismissed ? (
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
                  <p>Payment cancelled — your booking is held but unpaid.</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setPaymentDismissed(false)}
                    >
                      Retry payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelUnpaid}
                      disabled={cancelAppt.isPending}
                    >
                      Cancel booking
                    </Button>
                  </div>
                </div>
              ) : !paymentIntent ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" /> Preparing payment…
                </div>
              ) : !user ? (
                <p className="text-sm text-destructive">Session lost. Sign in again.</p>
              ) : (
                <RazorpayCheckout
                  intent={paymentIntent}
                  user={user}
                  onVerified={handleVerified}
                  onDismissed={handlePaymentDismissed}
                />
              )}
            </section>
          ) : null}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            disabled={state.step === steps[0] || state.step === "payment"}
            onClick={state.step === "review" ? goBackFromReview : goPrev}
          >
            Back
          </Button>

          {state.step !== "review" && state.step !== "payment" ? (
            <Button
              disabled={continueDisabled}
              onClick={onContinueFromQuestionsOrPrior}
            >
              Continue
            </Button>
          ) : null}
        </div>
      </div>
    </CheckoutShell>
  );
}
```

- [ ] **Step 2: Verify required UI primitives exist**

```bash
ls client/components/ui/alert-dialog.tsx client/components/ui/dropdown-menu.tsx
```

These were referenced from `checkout-shell.tsx` and `public-shell.tsx`. If `alert-dialog.tsx` is missing, install via shadcn:

```bash
cd client && npx shadcn@latest add alert-dialog
```

- [ ] **Step 3: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS. Resolve any prop-shape mismatches with the existing shadcn primitives by reading the component files in `client/components/ui/` and adapting (the UI library is shadcn-ui based on Base UI react primitives, which has slightly different prop signatures than Radix-based shadcn).

- [ ] **Step 4: Commit**

```bash
git add client/components/booking/booking-stepper.tsx
git commit -m "feat(booking): add BookingStepper orchestrator component"
```

---

## Task 32: Implement `/book/[id]` page

**Files:**
- Create: `client/app/book/[id]/page.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import Link from "next/link";
import { use } from "react";

import { BookingStepper } from "@/components/booking/booking-stepper";
import { CheckoutShell } from "@/components/layout/checkout-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicAppointmentType } from "@/hooks/usePublicAppointments";

type Params = { id: string };

export default function BookPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const { data, isPending, isError } = usePublicAppointmentType(id);

  if (isPending) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </CheckoutShell>
    );
  }

  if (isError || !data) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Service not available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This service is no longer accepting bookings.
          </p>
          <Button className="mt-4" render={<Link href="/browse" />}>
            Back to browse
          </Button>
        </div>
      </CheckoutShell>
    );
  }

  return <BookingStepper type={data} />;
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Smoke test** — multi-step verification

```bash
cd client && npm run dev
```

Test sequentially with two browser sessions:
1. Open `/browse` while signed-out, click any service, click Book this. Confirm `/book/<id>` loads the stepper.
2. Walk through Date and Time. On Continue from the last pre-Review step (or from Time if no questions), confirm redirect to `/login?next=/book/<id>`.
3. Sign in (or sign up + verify email). Confirm return to `/book/<id>` with state preserved (date/time still selected, on Review step).
4. Confirm slot lock countdown banner appears. Wait > 60s. Confirm an extend call fires (Network tab).
5. Click Confirm booking. For a no-payment service, confirm redirect to `/book/<id>/confirmed?appointment=<publicId>` (404 expected — page not built yet, that's fine).

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add client/app/book/[id]/page.tsx
git commit -m "feat(book): add booking-flow page with stepper"
```

---

## Task 33: Implement `confirmation-summary.tsx`

**Files:**
- Create: `client/components/booking/confirmation-summary.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildGoogleCalendarUrl } from "@/lib/calendar-link";
import { formatDateTimeInZone, formatDuration } from "@/lib/format";
import type { AppointmentWithRelations } from "@/types";

type ConfirmationSummaryProps = {
  appointment: AppointmentWithRelations;
};

export function ConfirmationSummary({ appointment }: ConfirmationSummaryProps) {
  const tz =
    appointment.appointmentType.organizationId &&
    appointment.bookablePerson?.organizationId
      ? "UTC"
      : "UTC";
  // We don't ship the org's timezone on AppointmentType-without-relations
  // returned here; fall back to UTC for display. The confirmed page also
  // exposes the date/time which the customer just selected in their tz.

  const headline =
    appointment.status === "CONFIRMED"
      ? "You're booked!"
      : appointment.status === "PENDING"
        ? "Awaiting organizer confirmation"
        : `Booking ${appointment.status.toLowerCase()}`;

  const paymentLine = (() => {
    if (appointment.paymentStatus === "PAID") return "Paid";
    if (appointment.paymentStatus === "PENDING") return "Payment processing";
    if (appointment.paymentStatus === "FAILED") return "Payment failed";
    if (appointment.paymentStatus === "REFUNDED") return "Refunded";
    return appointment.paymentStatus;
  })();

  const calendarUrl = buildGoogleCalendarUrl({
    title: appointment.appointmentType.name,
    startIso: appointment.startTime,
    endIso: appointment.endTime,
    description: `Confirmation code: ${appointment.confirmationCode}`,
  });

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-6 py-12">
      <div className="text-center">
        <div
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-foreground/5"
        >
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
          {headline}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirmation code <code>{appointment.confirmationCode}</code>
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Service</p>
            <p>{appointment.appointmentType.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">When</p>
            <p>{formatDateTimeInZone(appointment.startTime, tz)}</p>
            <p className="text-xs text-muted-foreground">
              Duration {formatDuration(appointment.durationMins)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Payment</p>
            <p>{paymentLine}</p>
          </div>
        </CardContent>
      </Card>

      {appointment.paymentStatus === "PENDING" &&
      appointment.appointmentType.advancePaymentEnabled ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-xs dark:bg-amber-950/30">
          Payment is being processed. We&apos;ll update this page when it
          confirms.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button render={<a href={calendarUrl} target="_blank" rel="noreferrer" />}>
          Add to Google Calendar
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/bookings/${appointment.publicId}`} />}
        >
          Manage booking
        </Button>
        <Button variant="ghost" render={<Link href="/browse" />}>
          Book another
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd client && npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/components/booking/confirmation-summary.tsx
git commit -m "feat(booking): add ConfirmationSummary"
```

---

## Task 34: Implement `/book/[id]/confirmed` page with payment polling

**Files:**
- Create: `client/app/book/[id]/confirmed/page.tsx`

- [ ] **Step 1: Create file with content**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { ConfirmationSummary } from "@/components/booking/confirmation-summary";
import { PublicShell } from "@/components/layout/public-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppointment, appointmentKey } from "@/hooks/useBooking";

const POLL_INTERVAL_MS = 3_000;
const POLL_DURATION_MS = 30_000;

export default function ConfirmedPage() {
  const searchParams = useSearchParams();
  const publicId = searchParams?.get("appointment") ?? undefined;
  const { data, isPending, isError } = useAppointment(publicId);
  const qc = useQueryClient();

  // Poll for paymentStatus PAID for 30s if currently PENDING and the
  // type requires advance payment.
  const pollRef = useRef<{ started: number; interval?: ReturnType<typeof setInterval> }>({
    started: 0,
  });
  useEffect(() => {
    if (!data || !publicId) return;
    if (!data.appointmentType.advancePaymentEnabled) return;
    if (data.paymentStatus !== "PENDING") return;
    if (pollRef.current.interval) return;
    pollRef.current.started = Date.now();
    pollRef.current.interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: appointmentKey(publicId) });
      if (Date.now() - pollRef.current.started > POLL_DURATION_MS) {
        clearInterval(pollRef.current.interval!);
        pollRef.current.interval = undefined;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current.interval) {
        clearInterval(pollRef.current.interval);
        pollRef.current.interval = undefined;
      }
    };
  }, [data, publicId, qc]);

  return (
    <PublicShell showBrowseLink={false}>
      {isPending ? (
        <div className="mx-auto max-w-xl space-y-4 px-6 py-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load this confirmation.
          </p>
        </div>
      ) : (
        <ConfirmationSummary appointment={data} />
      )}
    </PublicShell>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Smoke test**

```bash
cd client && npm run dev
```

End-to-end test: complete a booking on a no-payment service. Confirm:
- `/book/<id>/confirmed?appointment=<publicId>` renders the success state.
- Confirmation code shown.
- "Add to Google Calendar" opens a Google Calendar template URL with correct dates.
- "Manage booking" link goes to `/bookings/<publicId>` (next task — stub).

- [ ] **Step 4: Commit**

```bash
git add client/app/book/[id]/confirmed/page.tsx
git commit -m "feat(book): add confirmation page with payment polling"
```

---

## Task 35: Add stub pages for `/bookings`, `/bookings/[publicId]`, `/account`

**Files:**
- Create: `client/app/bookings/page.tsx`
- Create: `client/app/bookings/[publicId]/page.tsx`
- Create: `client/app/account/page.tsx`

- [ ] **Step 1: Create `client/app/bookings/page.tsx`**

```tsx
"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function BookingsStubPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">My bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming soon. You&apos;ll see all your appointments here.
        </p>
        <Button className="mt-4" render={<Link href="/browse" />}>
          Browse services
        </Button>
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 2: Create `client/app/bookings/[publicId]/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { use } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

type Params = { publicId: string };

export default function BookingDetailStubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { publicId } = use(params);
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">Booking</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The full booking-management view is coming soon.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Confirmation reference <code>{publicId}</code>
        </p>
        <Button className="mt-6" render={<Link href="/browse" />}>
          Browse services
        </Button>
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 3: Create `client/app/account/page.tsx`**

```tsx
"use client";

import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function AccountStubPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-semibold">Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account settings are coming soon.
        </p>
        <Button className="mt-4" render={<Link href="/" />}>
          Home
        </Button>
      </div>
    </PublicShell>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
cd client && npm run typecheck && npm run lint
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add client/app/bookings/page.tsx client/app/bookings/[publicId]/page.tsx client/app/account/page.tsx
git commit -m "feat(stubs): add /bookings, /bookings/[publicId], /account placeholders"
```

---

## Task 36: Final end-to-end smoke test and cleanup

**Files:** none modified — verification only.

- [ ] **Step 1: Full clean install + build to surface any latent issues**

```bash
cd client && rm -rf .next && npm run build
```

Expected: build completes without errors.

- [ ] **Step 2: Manual end-to-end smoke**

```bash
cd client && npm run dev
```

Walk through, in order, without errors:

1. Visit `/`. Click "Browse services". `/browse` loads.
2. Search filters work. Click any service. `/services/<id>` loads.
3. Click "Book this". `/book/<id>` loads, stepper renders. Step indicator shows correct N of M.
4. Choose date/time/(duration)/(answers). Click Continue from the last step.
5. As a guest, you're redirected to `/login?next=/book/<id>`.
6. Sign in (use a CUSTOMER account, or sign up + verify email; verify-email also honors `next`).
7. Confirm you land back on `/book/<id>` at the Review step with prior selections preserved.
8. Confirm the slot-lock countdown appears. If you have time, leave it past 60s and confirm the extend call fires (Network tab).
9. Click Confirm. For a no-payment service: lands on `/book/<id>/confirmed?appointment=<publicId>` with the confirmation code shown.
10. Click "Add to Google Calendar" — link opens Google Calendar with the right dates and title.
11. Click "Manage booking" — `/bookings/<publicId>` stub page loads.

If any step fails, fix in a focused commit with message `fix(<area>): <description>` before proceeding.

- [ ] **Step 3: Final commit (only if any fixes were made above)**

```bash
git status
# If anything is staged, commit with a focused message; otherwise skip.
```

---

## Self-review

After writing this plan, run through it against the spec:

**Spec coverage check:**
- §3 Route map → Tasks 16, 20, 21, 32, 34, 35 ✓
- §4 State management (hooks, reducer, draft) → Tasks 7, 8, 9, 6 ✓
- §5 Page anatomy → Tasks 16, 19/20/21, 31/32, 33/34 ✓
- §6 Components & shells → Tasks 10–11, 15, 17, 18, 19, 22–30, 33 ✓
- §7 Edge cases (auth gate, lock failures, payment failures, validation, timezone, public access) → Task 31 (orchestrator handles all of these), Task 27 (validation), Task 13/14 (next param) ✓
- §8 Testing & a11y — no tests per stakeholder; a11y covered by `aria-live` on countdown (Task 28), focus rings via Tailwind defaults, keyboard nav via Radix/Base UI primitives ✓
- §9 Stubs → Task 35 ✓
- §10 Open assumption #1 (login `next` param) → Tasks 13, 14 ✓
- §10 Open assumption #3 (entities relation) → verified during Task 22 (uses `entities[].bookablePerson` / `entities[].bookableResource`) ✓

**Placeholder scan:** No "TBD" / "TODO" in any task. Every code step has full code. Validation rules in Task 27 mirror server rules from `booking-flow.md` exactly.

**Type consistency:** `BookingStep`, `BookingState`, `BookingAction`, `nextStep`, `prevStep`, `activeSteps`, `stepNumber` defined in Task 7 and used consistently in Task 31. Hook names (`useAcquireSlotLock`, `useExtendSlotLock`, etc.) defined in Task 9 and used in Task 31. Type names (`AppointmentTypeWithRelations`, `AppointmentWithRelations`, `CreatePaymentIntentResult`) defined in Task 1 and used downstream.
