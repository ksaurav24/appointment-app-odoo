# Booking flow: availability → slot lock → appointment

This file covers the entire customer booking pipeline plus the
organizer-side endpoints that act on the resulting appointments.

Pipeline at a glance:

```
GET  /public/appointment-types/:id                 (read full config + entities)
GET  /public/appointment-types/:id/availability    (slots for a date)
[VARIABLE only] GET /public/.../duration-options   (which durations fit at startTime)
POST /slot-locks                                   (5-min hold on a slot)
POST /appointments                                 (consume the lock, create booking)
[advance-payment] POST /payments/intent → /payments/verify   (see payments.md)
```

For customer-facing **discovery** (lists / share token), see
`modules/appointment-types.md`. For payment specifics, see
`modules/payments.md`.

Source files:

* `server/src/availability/availability.public.controller.ts`
* `server/src/slot-locks/slot-locks.controller.ts`
* `server/src/appointments/appointments.controller.ts`
* `server/src/appointments/appointments.organiser.controller.ts`
* DTOs in `server/src/appointments/dto/`, `server/src/slot-locks/dto/`

---

## Availability (public)

`@Public()`. No auth required. Backed by capacity bookkeeping that
subtracts both existing non-cancelled appointments and active slot locks
— so concurrent shoppers see honest numbers.

### GET `/public/appointment-types/:id/availability`

**Path:** `id` is the appointment type UUID.

**Query:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | `YYYY-MM-DD` | yes | The wall-clock date in the schedule's (or override) timezone. Validated by `@IsISO8601({ strict: true })` and the regex `^\d{4}-\d{2}-\d{2}$` |
| `entityId` | string (UUID) | only when `assignmentMode = MANUAL` | Required for MANUAL types so the server knows which entity to compute against |
| `timezone` | string (IANA) | no | Overrides the schedule's stored timezone |

**Response 200 — discriminated union on `durationMode`:**

For `durationMode = FIXED`:

```jsonc
{
  "appointmentTypeId": "<UUID>",
  "date": "2026-05-15",
  "durationMode": "FIXED",
  "durationMinutes": 30,
  "timezone": "Asia/Kolkata",
  "entityId": "<UUID> | null",
  "slots": [
    { "startTime": "2026-05-15T09:00:00.000Z", "endTime": "2026-05-15T09:30:00.000Z", "remainingCapacity": 1 }
  ]
}
```

For `durationMode = VARIABLE`:

```jsonc
{
  "appointmentTypeId": "<UUID>",
  "date": "2026-05-15",
  "durationMode": "VARIABLE",
  "minDurationMins": 15,
  "maxDurationMins": 90,
  "durationStepMins": 15,
  "timezone": "Asia/Kolkata",
  "entityId": "<UUID> | null",
  "openRanges": [
    { "startTime": "2026-05-15T09:00:00.000Z", "endTime": "2026-05-15T11:00:00.000Z", "durationMinutes": 120 }
  ]
}
```

`durationMinutes` inside an `openRanges` element is the length of that
contiguous open sub-range after busy intervals are subtracted — the
customer must pick a duration ≤ that, and ≥ `minDurationMins`, in steps
of `durationStepMins`.

`remainingCapacity` = `maxBookingsPerSlot − consumedCapacity`. A slot is
bookable while this is > 0.

### GET `/public/appointment-types/:id/availability/duration-options`

Only useful for VARIABLE-duration types. Returns the discrete duration
choices that fit at a chosen `startTime`.

**Query:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | `YYYY-MM-DD` | yes | |
| `startTime` | ISO 8601 | yes | Must be inside one of the `openRanges` from the prior call |
| `entityId` | string (UUID) | only when `MANUAL` | |
| `timezone` | string (IANA) | no | |

**Response 200:**

```jsonc
{ "startTime": "2026-05-15T09:00:00.000Z", "durations": [30, 45, 60] }
```

`durations` is the AP `[min, min+step, …, ≤ max]` capped by the actual
remaining length of the open range.

---

## Slot locks (`/slot-locks`)

`@Roles(Role.CUSTOMER)`, JWT cookie required. TTL **5 minutes** from
acquire/extend.

### POST `/slot-locks` (201)

Acquires a 5-minute hold. Counts as 1 unit of capacity for that slot.

**Body** (`AcquireSlotLockDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `appointmentTypeId` | string | `@IsString()` | yes — UUID-as-string |
| `entityId` | string | `@IsString()` | only when type is `MANUAL` |
| `startTime` | ISO 8601 | `@IsISO8601()` | yes |
| `endTime` | ISO 8601 | `@IsISO8601()` | yes (`> startTime`) |

**Response:** `SlotLock` (see `04-data-models.md`).

**Errors:**

* 400 — invalid times, `endTime <= startTime`
* 404 — appointment type not found / org not approved
* 409 — `entityId` required for MANUAL mode; or `entityId` not linked to
  this type; or capacity exhausted at this exact moment

### GET `/slot-locks/me` (200)

**Response:** `SlotLock[]` for the current customer. Only **active**
(unexpired) locks. Sorted newest first.

### POST `/slot-locks/:id/extend` (200)

`id` is BigInt-as-string. Extends `expiresAt` to `now + 5 min`.

**Response:** updated `SlotLock`.

**Errors:** 403 (not your lock), 404 (no such lock), 409 (already
expired).

### DELETE `/slot-locks/:id` (204)

Releases (deletes) the lock — use this when the customer abandons checkout.

**Errors:** 403, 404.

---

## Customer appointment endpoints (`/appointments`)

`@Roles(Role.CUSTOMER)`, JWT cookie required.

### POST `/appointments` (201)

Consumes a slot lock and creates the appointment. The lock is deleted on
success.

**Body** (`CreateAppointmentDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `slotLockId` | string | `@IsNumberString({ no_symbols: true })` | yes |
| `capacityBooked` | integer | `@Min(1)` | no, default `1`. Must be ≤ type's `maxBookingsPerSlot` |
| `answers` | `AppointmentAnswerDto[]` | `@ArrayMaxSize(50)`, `@ValidateNested()` | no |

**`AppointmentAnswerDto`:**

| Field | Type | Validators |
|-------|------|-----------|
| `questionId` | string | `@IsNumberString({ no_symbols: true })` (BigInt-as-string) |
| `answerText` | string \| null | `@IsString()` (optional → null for unanswered optional questions) |

**Server-side validation rules per `questionType`:**

* `TEXT` — trimmed, no length check beyond the decorator.
* `SINGLE_CHOICE` — must equal one of `question.options`.
* `MULTIPLE_CHOICE` — comma-separated; **every** part must be in `options`.
* `NUMBER` — must parse as a finite number; stored as `String(Number(text))`.
* `DATE` — must parse as a valid ISO date.
* Required questions whose `answerText` is empty/whitespace → 400.

**Response 201:** `AppointmentWithRelations` (see `04-data-models.md`).
Initial states:

* `status` = `PENDING` if `manualConfirmation = true`, else `CONFIRMED`.
* `paymentStatus` = `PENDING` if `advancePaymentEnabled = true`, else `PAID`.

**Errors:**

* 400 — invalid lock id, missing required answer, answer fails type validation, `capacityBooked` out of range
* 404 — slot lock not found, appointment type not found
* 409 — slot lock expired, capacity now exhausted, race condition

### GET `/appointments/me` (200)

**Query** (`ListAppointmentsQuery`):

| Param | Type | Notes |
|-------|------|-------|
| `status` | `AppointmentStatus` | enum |
| `from` | ISO 8601 | `startTime >= from` |
| `to` | ISO 8601 | `startTime <= to` |
| `entityId` | string | matches `bookablePersonId` OR `bookableResourceId` |
| `appointmentTypeId` | string | UUID |
| `upcomingOnly` | boolean | overrides `from` to `now()` |

**Response:** `AppointmentWithRelations[]` for the current customer,
sorted by `startTime DESC`.

### GET `/appointments/:publicId` (200)

`publicId` is the cuid-formatted public ID.

**Response:** `AppointmentWithRelations` or 404.

### POST `/appointments/:publicId/cancel` (200)

Throttler `cancel`.

**Body** (`CancelAppointmentDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `reason` | string | `@MaxLength(500)`, optional |

Subject to the appointment type's `cancellationAllowed` and
`cancellationWindowHours` policy. May trigger refund handling if a
payment exists.

**Response:** updated `AppointmentWithRelations` with `status = CANCELLED`,
`cancelledAt` set, `cancellationReason` set.

**Errors:** 400 (outside cancellation window), 404, 409 (already
cancelled).

### POST `/appointments/:publicId/reschedule` (200)

Throttler `reschedule`.

The customer must first acquire a fresh slot lock for the new time, then
pass its id here.

**Body** (`RescheduleAppointmentDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `slotLockId` | string | `@IsNumberString({ no_symbols: true })` |
| `reason` | string | `@MaxLength(500)`, optional |

**Response:** updated `AppointmentWithRelations` with new `startTime`,
`endTime`, `durationMins`, and `rescheduleCount` incremented.

**Errors:** 400 (policy), 404 (appointment or new lock missing), 409
(slot now unavailable, lock expired).

---

## Organizer appointment endpoints (`/organizations/me/appointments`)

`@Roles(Role.ORGANIZER)` plus org-approved guard. The organization is
resolved from the JWT, so there's no `organizationId` in the path.

### GET `/organizations/me/appointments`

Same `ListAppointmentsQuery` as the customer endpoint, but scoped to the
organizer's org.

**Response:** `AppointmentWithRelations[]`, sorted by `startTime DESC`.

### GET `/organizations/me/appointments/:publicId`

**Response:** `AppointmentWithRelations` or 404.

### POST `/organizations/me/appointments/:publicId/approve` (200)

For appointments with `manualConfirmation = true` that are still
`PENDING`. Transitions `PENDING → CONFIRMED`. Triggers customer
notification.

**Errors:** 404, 409 (not in `PENDING`).

### POST `/organizations/me/appointments/:publicId/reject` (200)

**Body** (`RejectAppointmentDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `reason` | string | `@MaxLength(500)`, optional. Defaults to `"Rejected by organiser"` |

Transitions `PENDING → CANCELLED` with `cancellationReason`. Notifies
the customer.

### POST `/organizations/me/appointments/:publicId/complete` (200)

Transitions `CONFIRMED → COMPLETED`. No body.

### POST `/organizations/me/appointments/:publicId/no-show` (200)

Transitions `CONFIRMED → NO_SHOW`. No body.

### POST `/organizations/me/appointments/:publicId/cancel` (200)

**Body** (`CancelAppointmentDto`): same as customer.

**Difference from customer cancel:** the organizer override **bypasses**
the cancellation window — they can cancel any non-cancelled appointment.
Audited with request metadata.

### POST `/organizations/me/appointments/:publicId/reschedule` (200)

**Body** (`RescheduleAppointmentDto`): same as customer (a fresh
`slotLockId` is required).

**Difference from customer reschedule:** the organizer override bypasses
reschedule-window and `maxReschedulesAllowed`.

---

## Status machine summary

```
                      manualConfirmation=true
register a booking ─────────────────────────────► PENDING
                                                   │   organiser approves       organiser rejects
                                                   ├──────────────────► CONFIRMED
                                                   └──────────────────► CANCELLED   (cancellationReason set)

                      manualConfirmation=false
register a booking ─────────────────────────────► CONFIRMED

CONFIRMED ── customer cancel (within window) ──► CANCELLED
CONFIRMED ── organiser cancel (any time)    ──► CANCELLED
CONFIRMED ── customer/organiser reschedule  ──► CONFIRMED (or back to PENDING when policy says so)
CONFIRMED ── organiser complete            ──► COMPLETED
CONFIRMED ── organiser no-show             ──► NO_SHOW
```

Independently, `paymentStatus` moves `PENDING → PAID` when the Razorpay
flow completes (see `modules/payments.md`), or `PAID → REFUNDED` on
refund.
