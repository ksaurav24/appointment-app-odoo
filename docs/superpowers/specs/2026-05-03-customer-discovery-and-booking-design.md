# Customer Discovery & Booking Flow — Design Spec

**Date:** 2026-05-03
**Sub-project:** A (of three: A discovery+booking, B my-bookings, C account-settings)
**Status:** Ready for implementation planning

---

## 1. Goals & non-goals

### Goal

Ship the customer-facing path that takes a logged-out visitor from "I don't know this app exists" to "I have a confirmed appointment". This covers public discovery, the full multi-step booking flow (including conditional steps for MANUAL assignment, VARIABLE duration, multi-seat capacity, and Razorpay advance payment), and a self-contained confirmation page.

### Non-goals (handled in follow-up sub-projects)

- **B — My bookings management:** list / detail / cancel / reschedule UI under `/bookings/*`. The confirmation page links to `/bookings/[publicId]`, but the destination is a friendly stub until B ships.
- **C — Account settings:** profile, change password, 2FA, sign out everywhere under `/account/*`.
- Organizer-side reschedule UI, in-app notifications visible to the customer.
- E2E tests with Playwright. Vitest unit tests are also out of scope for v1 per stakeholder decision — manual QA covers us.

---

## 2. Decisions log

These decisions were made during brainstorming and are the basis of every design choice that follows.

| # | Decision | Reason |
|---|---|---|
| 1 | **Service-first browse** (not org-first) | The public API is appointment-type-flat; no public org list endpoint. Building org-first would require client-side aggregation and feel forced. |
| 2 | **Login wall at "Book"** | Lowest discovery friction. Browse + service detail + step selection are public; auth is required only when acquiring a slot lock. |
| 3 | **Single-page stepper** at `/book/[id]` | Calendly-style focused checkout. URL stays put; back/forward managed by internal reducer state, not routes. |
| 4 | **Minimum-viable browse** | Cards show service-only info (no org name on cards). The list endpoint returns no relations and no pagination, so we client-side filter and accept the constraint rather than N+1 fetching or expanding scope to add a backend endpoint. |
| 5 | **`sessionStorage` draft persistence** during the login redirect | Simpler than inline auth modal; doesn't bloat URLs with PII; clears on tab close. |
| 6 | **Visible countdown banner** with auto-extend at < 60s | Honest UX; prevents zombie locks; surfaces failure clearly. |
| 7 | **Self-contained confirmation page** at `/book/[id]/confirmed` | Decouples sub-project A from B. Confirmation page links to `/bookings/[publicId]` as a stub. |
| 8 | **Full v1 conditional support** | MANUAL assignment, VARIABLE duration, and multi-seat are first-class — they're not optional in the schema. |
| 9 | **Two shells:** `public-shell` for discovery + confirmation, `checkout-shell` for `/book/[id]` | Discovery feels like a public site; booking feels like checkout. |
| 10 | **No Vitest in v1** | Stakeholder decision — manual QA only. Tests are a follow-up sub-project. |

---

## 3. Route map

### Public routes (no auth required for any of these)

| Route | Purpose | Data source |
|---|---|---|
| `/` (existing) | Home — adjust hero CTA to **"Browse services"** linking to `/browse`. | n/a |
| `/browse` | Grid of all published appointment-types. Client-side text search across name + description. | `GET /public/appointment-types` |
| `/services/[id]` | Service detail. Two-column on desktop, stacked on mobile. | `GET /public/appointment-types/:id` |
| `/services/share/[token]` | Share-token detail. Bypasses publish gate. Resolves token → id, then renders the same detail UI. | `GET /public/appointment-types/share/:token` |

### Booking flow (route is publicly reachable, but reaching the slot-lock step requires CUSTOMER auth)

| Route | Purpose |
|---|---|
| `/book/[id]` | Single-page stepper. Internal reducer handles `entity?` → `date` → `time` → `duration?` → `questions?` → `review` → `payment?`. |
| `/book/[id]/confirmed?appointment=<publicId>` | Confirmation. Pulls the appointment via `GET /appointments/:publicId`. |

### Stub routes created during this work (404-with-friendly-message)

`/bookings`, `/bookings/[publicId]`, `/account` — placeholder pages that say "Coming soon" so the confirmation-page links don't 404. Replaced by sub-projects B and C.

### Login redirect contract

Any time we need auth and don't have it, we redirect to `/login?next=<encodedReturnPath>`. Existing login form and verify-email/2FA flows must honor `next`. Implementation must verify and extend if needed.

---

## 4. State management

### Server state — React Query (existing pattern)

New hooks in `hooks/usePublicAppointments.ts`:

| Hook | Endpoint | Notes |
|---|---|---|
| `usePublicAppointmentTypes()` | `GET /public/appointment-types` | `staleTime: 60_000`. |
| `usePublicAppointmentType(id)` | `GET /public/appointment-types/:id` | `enabled: !!id`. |
| `usePublicAppointmentTypeByToken(token)` | `GET /public/appointment-types/share/:token` | Same shape as `:id`. |
| `useAvailability({ id, date, entityId?, timezone? })` | `GET /public/appointment-types/:id/availability` | `enabled: !!date`. Returns the discriminated union (FIXED vs VARIABLE). |
| `useDurationOptions({ id, startTime, entityId?, timezone? })` | `GET /public/appointment-types/:id/availability/duration-options` | `enabled: !!startTime` and only used when `durationMode === "VARIABLE"`. |

New hooks in `hooks/useBooking.ts`:

| Hook | Endpoint |
|---|---|
| `useAcquireSlotLock()` | `POST /slot-locks` |
| `useExtendSlotLock()` | `POST /slot-locks/:id/extend` |
| `useReleaseSlotLock()` | `DELETE /slot-locks/:id` |
| `useCreateAppointment()` | `POST /appointments` |
| `useAppointment(publicId)` | `GET /appointments/:publicId` |
| `useCreatePaymentIntent()` | `POST /payments/intent` |
| `useVerifyPayment()` | `POST /payments/verify` |

The corresponding `lib/api.ts` functions are added in the same shape as the existing ones (typed args/responses, `extractApiError` on catch).

### Client state — local reducer in `booking-stepper.tsx`

Booking is self-contained — no other component on the page needs to read it. Single reducer with explicit step transitions:

```ts
type BookingState = {
  step: 'entity' | 'date' | 'time' | 'duration' | 'questions' | 'review' | 'payment'
  entityId?: string                  // required if MANUAL
  date?: string                      // YYYY-MM-DD
  startTime?: string                 // ISO 8601
  endTime?: string                   // ISO 8601
  durationMinutes?: number           // VARIABLE only
  capacityBooked: number             // default 1
  answers: Record<string, string>    // questionId -> answerText
  slotLockId?: string                // BigInt-as-string
  slotLockExpiresAt?: string         // ISO 8601
  appointmentPublicId?: string       // set after POST /appointments
}
```

A pure helper `nextStep(state, type)` is the single source of truth for step transitions:

```
entity?   → only if assignmentMode = MANUAL
date      → always
time      → always
duration? → only if durationMode = VARIABLE
questions? → only if bookingQuestions.length > 0
review    → always (slot lock acquired here)
payment?  → only if advancePaymentEnabled
```

This helper is a pure function so it can be tested exhaustively in isolation (when tests are introduced in a follow-up).

### No new state library

Booking state is local to `booking-stepper.tsx`. React Query handles server state. zustand is not introduced — the draft is in sessionStorage, the appointment lives in React Query cache after creation, and there's no cross-page client state to share.

### Draft persistence

`sessionStorage` keyed `booking-draft:<appointmentTypeId>`. Written on every state change before the auth wall. On `/book/[id]` mount, rehydrated if a draft exists for this type and the user is now authenticated. Cleared on successful `POST /appointments` or explicit Exit. Helper module `lib/booking-draft.ts` owns get/set/clear with shape validation.

---

## 5. Page anatomy

### `/browse`

- Page title "Browse services".
- Single search input, debounced 200ms, filters cards client-side across `name` / `description` / `slug`.
- Card grid: 1 / 2 / 3 columns responsive. Each card shows:
  - Service name (heading).
  - Truncated description (2 lines).
  - Duration chip — `30 min` for FIXED, `15–90 min` for VARIABLE.
  - Price chip — `Free` if no advance payment, else `Pay ₹500 in advance` (formatted from minor units).
  - "Manual confirmation" badge if `manualConfirmation = true`.
- Empty state: "No services match" with a Clear-search action.
- Loading: skeleton cards.
- Error: friendly message + retry.
- Card click → `/services/[id]`.

### `/services/[id]` and `/services/share/[token]`

Two-column on desktop, stacked on mobile.

**Left column (main content):**
- Org block — name, address (if present), description (if present), small logo placeholder.
- Service title, full description.
- "What's included" panel: duration mode + value(s), schedule summary (`schedule-summary.tsx`), capacity ("Up to N bookings per slot" if > 1), entities count.
- Policies panel: rendered by `policies-summary.tsx` from `cancellationAllowed` / `cancellationWindowHours` / `rescheduleAllowed` / `rescheduleWindowHours` / `maxReschedulesAllowed` into plain English.

**Right column (sticky on desktop):**
- Price summary card.
- Big "Book this" CTA → `/book/[id]` (or `/book/[id]?token=<shareToken>` so the booking page resolves unpublished services via share token).

404 page if the service isn't found / unpublished / org not approved.

### `/book/[id]` — stepper

Top bar (provided by `checkout-shell.tsx`): logo, step indicator pill (`Step N of M` derived from the stepper machine), Exit button. Exit confirms abandonment if past Date.

Step body — only one section visible at a time. Subtle transitions (opacity/translate). Each step shows its UI, validation, and a footer with `Back` (disabled on first) + `Continue` (disabled until valid).

#### Step: Entity (MANUAL only)
Grid of `BookablePerson` / `BookableResource` cards from `appointmentType.entities`. Click selects.

#### Step: Date
- Calendar (uses existing `components/ui/calendar.tsx` — react-day-picker).
- Disabled dates: anything outside `scheduleRules` coverage, plus past dates.
- Below the calendar, a small "Times in {timezone}" hint.

#### Step: Time
- Calls `useAvailability({ id, date, entityId? })`.
- **FIXED:** list of slot pills. Disabled if `remainingCapacity === 0`. Selecting sets `startTime` + `endTime`.
- **VARIABLE:** list of open ranges as expandable items — pick a start time within the range. Sets `startTime`. (Duration step follows.)

#### Step: Duration (VARIABLE only)
- Calls `useDurationOptions({ id, startTime, entityId? })`.
- Pills: `30 min`, `45 min`, `60 min`. Selecting computes `endTime = startTime + duration`.

#### Step: Questions (only when `bookingQuestions.length > 0`)
- Form with one input per question, sorted by `displayOrder`. Renderer per `questionType`:
  - `TEXT` → `<textarea>`.
  - `SINGLE_CHOICE` → radio group.
  - `MULTIPLE_CHOICE` → checkbox group, joined `,` on submit.
  - `NUMBER` → `<input type="number">` with finite check.
  - `DATE` → date input (HTML5).
- Required questions show asterisk + block Continue until filled.

#### Step: Review
- **Auth gate kicks in here.** If `useCurrentUser()` is null, persist the draft to sessionStorage with `step: 'review'`, then `router.push('/login?next=' + encodeURIComponent('/book/' + id))`. Otherwise, mount fires `useAcquireSlotLock` once.
- Shows: service summary, selected entity (if any), date/time, duration, capacity selector if `maxBookingsPerSlot > 1 && manageCapacity` (number input, `1..maxBookingsPerSlot`, capped by `remainingCapacity`), answers preview.
- Slot-lock countdown banner pinned at top (4:32 → 0:00, color goes amber under 60s). Auto-`extend` once at < 60s.
- "Edit" links on each section jump back to that step (preserves selections downstream where compatible).
- CTA: "Confirm booking" → calls `POST /appointments`. On success, transitions to `payment` if advance-payment, else navigates to `/book/[id]/confirmed?appointment=<publicId>`.

#### Step: Payment (only when `advancePaymentEnabled`)
- After appointment is created, call `POST /payments/intent`.
- Load Razorpay SDK (`https://checkout.razorpay.com/v1/checkout.js`) lazily — script appended on entering this step. On load, open the Razorpay widget with `keyId`, `orderId`, `amount`. Razorpay handles UPI/cards/netbanking. On its success callback we `POST /payments/verify` and then navigate to confirmed.
- If the user closes the Razorpay modal without paying, surface a "Payment cancelled — your booking is held but unpaid" panel with "Retry payment" and "Cancel booking" buttons. Cancelling here calls `POST /appointments/:publicId/cancel`.

### `/book/[id]/confirmed`

- `GET /appointments/:publicId` to render details.
- Big checkmark, headline based on status: `CONFIRMED` ("You're booked!"), `PENDING` ("Awaiting organizer confirmation"). Confirmation code shown prominently.
- Summary card: service, org name, date/time, duration, payment status.
- Actions: "Add to Google Calendar" (client-side link from start/end + service name via `lib/calendar-link.ts`), "Manage booking" → `/bookings/[publicId]` (stub), "Book another" → `/browse`.

---

## 6. Components & shells

### Shells (`components/layout/`)

- **`public-shell.tsx`** — wraps `/`, `/browse`, `/services/[id]`, `/services/share/[token]`, `/book/[id]/confirmed`. Header (logo + auth-aware right side). Light footer.
- **`checkout-shell.tsx`** — wraps `/book/[id]`. Top bar: logo, step pill, Exit button. No footer. `beforeunload` handler attached only on this shell to release the slot lock.

The existing `components/auth/home-content.tsx` is refactored to consume `public-shell.tsx` so home and the new pages share one header.

### Booking feature components (`components/booking/`)

- `service-card.tsx` — used in `/browse`.
- `service-detail.tsx` — main two-column layout for `/services/[id]`.
- `policies-summary.tsx` — renders cancellation/reschedule rules into prose.
- `schedule-summary.tsx` — renders `scheduleRules[]` into a compact human-readable summary.
- `entity-picker.tsx` — for the MANUAL step.
- `availability-calendar.tsx` — calendar wrapper that knows which dates are bookable.
- `slot-list.tsx` — FIXED slot pills.
- `open-range-picker.tsx` — VARIABLE range + start-time picker.
- `duration-picker.tsx` — VARIABLE duration pills.
- `question-form.tsx` — dynamic form from `bookingQuestions`. One sub-renderer per `questionType`.
- `slot-lock-countdown.tsx` — banner with auto-extend.
- `booking-stepper.tsx` — owns the reducer, step navigation, sessionStorage persistence, slot-lock lifecycle.
- `step-indicator.tsx` — "Step N of M" pill in the checkout shell, reads from a context provided by `booking-stepper.tsx`.
- `razorpay-checkout.tsx` — encapsulates lazy SDK load + widget open + verify call.
- `confirmation-summary.tsx` — used on `/confirmed`.

### Shared utilities (`lib/`)

- `lib/calendar-link.ts` — Google Calendar URL from a confirmed appointment.
- `lib/booking-draft.ts` — typed `sessionStorage` get/set/clear keyed on appointment-type id.
- `lib/format.ts` — formatters: minor-units → display price, ISO → local time string in the appointment timezone, duration "30 min" / "1h 30m".

---

## 7. Edge cases & error handling

### Auth gate
- Pre-Review: each `Continue` checks `useCurrentUser()`. If null, persist draft, push to `/login?next=<encoded>`.
- Login flow already exists. Verify it honors `next` (and the verify-email/2FA forks too) — extend if missing.
- After login, `/book/[id]` mounts, sees authenticated user + draft, rehydrates to Review.
- New-account verify-email flow: draft survives across `/login` → `/verify-email?next=/book/[id]` → back to `/book/[id]`. If the slot is now full on return, drop them back to Time with a banner.

### Slot-lock failure modes
- `409` on acquire → "This time was just taken. Pick another." → return to Time, lock cleared.
- Network error on acquire → "We couldn't hold this slot. Try again." with retry on Review.
- Auto-extend fails → countdown keeps running, amber banner "Trouble holding your slot — confirm soon". If lock then expires, modal + back to Time.
- User leaves the page (route change, tab close, exit button) → best-effort `DELETE /slot-locks/:id`. On tab close, use `navigator.sendBeacon`. We do not block navigation on the network call.

### Appointment creation failure modes
- `400` (validation, missing required answer): jump back to Questions with offending fields highlighted (server `messages: string[]` mapped to fields by best-effort name match, fallback to generic toast).
- `404` (slot lock gone) / `409` (capacity exhausted, race): expired-modal + back to Time.

### Payment failure modes
- Razorpay modal dismissed: appointment is already in `PENDING/PENDING`. Surface "Payment cancelled — your booking is held but unpaid" with Retry / Cancel-booking actions. **Do not auto-cancel** — customer chooses.
- `POST /payments/verify` `400` (bad signature): show "Payment couldn't be verified. If money was deducted, it'll auto-confirm shortly." Poll `GET /appointments/:publicId` every 3s up to 30s for `paymentStatus === "PAID"`. After 30s, route to confirmed page anyway with a yellow "Payment processing" banner — webhook is the source of truth per `payments.md`.
- Razorpay SDK fails to load: fallback panel directing customer to contact the org, plus a "Cancel booking" action.

### Form validation (questions step)
Client-mirrored from server rules in `booking-flow.md`:
- `TEXT` — required check only.
- `SINGLE_CHOICE` — value ∈ `options`, required check.
- `MULTIPLE_CHOICE` — at least one selection if required; serialize as comma-joined.
- `NUMBER` — `Number(value)` finite; required check.
- `DATE` — must parse as ISO date; required check.

Server validation remains source of truth — any 400 with field-specific messages is mapped back to the form.

### Timezone
- `appointmentType.timezone` (or schedule timezone) is the authoritative timezone. Pass it explicitly on availability calls.
- Display times in the appointment's timezone with a small "in {timezone}" hint near the time selector.
- **Do not silently convert** to the user's local timezone — confuses booking semantics.

### Public-access edge cases
- Org becomes deactivated mid-flow → service detail / availability / lock acquire all `404`. Show "This service is no longer available" and route back to `/browse`.
- Share-token route bypasses publish gate at the detail level, but the booking page itself accepts an `id`. Resolve token → id once, then push to `/book/[id]`. Public availability still works — share token is a private link.

---

## 8. Testing & accessibility

### Testing
- **No Vitest in v1** (per stakeholder decision). Manual QA.
- Pure helpers (`booking-draft`, `calendar-link`, `format`, the reducer, `nextStep`) are written as pure functions so a follow-up sub-project can test them exhaustively without rewriting.

### Accessibility
- Stepper steps use `<form>` per step so Enter submits Continue.
- Slot lists / pills have keyboard nav (arrow keys via existing Radix-based primitives where applicable; otherwise `role="listbox"` + arrow handling).
- Calendar is a11y-compliant via react-day-picker.
- Slot-lock countdown uses `aria-live="polite"` so screen readers hear time-running-out announcements.
- All interactive elements have visible focus rings (Tailwind defaults).

### Performance
- Razorpay SDK loaded lazily only on entering Payment.
- React Query default `gcTime` (5min) keeps service-detail back-nav snappy.
- Browse does not prefetch service detail — relies on React Query stale data on click-back.

---

## 9. Out of scope / migration

- **Out of scope:** My bookings (B), Account settings (C), in-app notifications, organizer reschedule UI, E2E tests, Vitest unit tests.
- **Stub routes** (404-with-friendly-message): `/bookings`, `/bookings/[publicId]`, `/account` — replaced by B and C.
- **No breaking changes.** All new routes; `home-content.tsx` refactor to consume `public-shell` is small and self-contained.

---

## 10. Open assumptions to verify during implementation

1. The existing `/login`, `/verify-email`, `/forgot-password`, `/reset-password` flows accept and honor a `next` query param. If they don't, threading it through is part of this work.
2. The Razorpay SDK is acceptable to load from `https://checkout.razorpay.com/v1/checkout.js` (CSP-allowed). If a strict CSP is later introduced, the SDK URL must be allow-listed.
3. `appointmentType.entities` (relations) is populated on `GET /public/appointment-types/:id` such that we can render `BookablePerson`/`BookableResource` names without an additional fetch. This needs verification against `04-data-models.md` — if the relation does not include enough info, the spec must be amended (likely needs a backend tweak, which would push back the ship date).
