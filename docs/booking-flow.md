# Booking Flow — Availability, Slot Locks, Appointments

This document explains the three new modules added to `server/src/` and how they fit together to implement the customer-facing booking flow described in the PRD.

## TL;DR

The booking flow is a three-step pipeline:

```
GET /public/appointment-types/:id/availability   →  AvailabilityModule
POST /slot-locks                                 →  SlotLocksModule  (5-min hold)
POST /appointments                               →  AppointmentsModule  (confirm)
```

`AvailabilityModule` answers "what slots are open?", `SlotLocksModule` puts a short-lived hold on a chosen slot so two customers can't grab it at the same time, and `AppointmentsModule` turns an active hold into a real appointment. Organisers manage the resulting appointments through a separate set of routes on the same module. A background timer evicts expired locks every minute.

The hold/confirm path now uses the standalone `packages/booking-engine` as a decision layer (snapshot -> engine decision -> transactional write) while keeping the existing API contracts and persistence model unchanged.

## Wiring

`server/src/app.module.ts` registers the three new modules alongside the existing ones:

```ts
AvailabilityModule,
SlotLocksModule,
AppointmentsModule,
```

The `docker-compose.yaml` change is cosmetic — a stale comment was removed; the connection string is unchanged.

---

## 1. AvailabilityModule (`server/src/availability/`)

**Purpose:** compute, in real time, the open slots for a given appointment type on a given calendar date. Public (unauthenticated), since customers browse availability before logging in.

### Routes (`availability.public.controller.ts`)

| Method | Path                                                                | Purpose                                                                  |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/public/appointment-types/:id/availability`                        | Slots (FIXED) or open ranges (VARIABLE) for `?date=YYYY-MM-DD`.          |
| GET    | `/public/appointment-types/:id/availability/duration-options`       | For VARIABLE types: which durations are valid from a chosen `?startTime`.|

Both routes accept optional `entityId` (required when the type's `assignmentMode` is `MANUAL`) and `timezone` (override; defaults to the schedule's stored zone).

### Service (`availability.service.ts`)

`getAvailability` orchestrates the computation:

1. **Load** the appointment type with its linked entities, schedules, and rules. Only types belonging to an APPROVED, active organization are returned.
2. **Resolve timezone** — caller override → schedule's stored zone → `UTC` fallback.
3. **Resolve entity scope.** `linked` is the set of persons or resources attached via `appointment_type_entities`.
   - If a specific `entityId` was supplied, validate it is linked and use just that one.
   - `MANUAL` without `entityId` → `400`.
   - `AUTO` without `entityId` → all linked entities (the union of their calendars).
4. **Resolve schedule windows** (`helpers/schedule-windows.ts`) — converts the appointment type's `WEEKLY` rules (matched by `dayOfWeek` in target zone) or `DATE_OVERRIDE` rules (matched by `specificDate`) into UTC `TimeRange`s for the requested date. Rules with `isAvailable=false` are filtered out.
5. **Fetch overlapping busy ranges** for the day window: non-cancelled `Appointment`s and unexpired `SlotLock`s. Done in parallel.
6. **Dispatch** to the strategy matching the type's `durationMode` (FIXED or VARIABLE).

`getDurationOptions` is the variable-mode follow-up: pick a start time, get the list of valid durations remaining in that open range. Re-uses `getAvailability` to find the containing open range, then calls `enumerateValidDurations`.

### Strategies

#### `strategies/fixed.strategy.ts`

PRD §5.1. Walks each window in `durationMinutes` strides; for each candidate slot it sums the `capacity` of every overlapping busy range. The slot is included if `maxBookingsPerSlot − consumed > 0`. For `maxBookingsPerSlot=1` this collapses to "no overlap."

#### `strategies/variable.strategy.ts`

PRD §5.2. For each window, subtracts busy ranges (treated as fully reserved — variable mode does not support multi-capacity in V1) and emits the contiguous open sub-ranges that are at least `minDurationMins` long. Customers later pick a `start ∈ openRange` and a `duration ∈ [min, min+step, …, ≤ rangeLengthFromStart]`.

`enumerateValidDurations(remainingMins, min, max, step)` produces that arithmetic progression, capped by both `max` and the actually remaining length.

### Helpers

- **`helpers/range.ts`** — generic `TimeRange` math: overlap, merge, subtract-busy-from-window, duration, addMinutes. Pure functions; well-tested in `range.spec.ts`.
- **`helpers/time-zone.ts`** — `wallTimeToUtc(date, "HH:MM", tz)` converts a wall-clock moment in a tz to a UTC `Date`. Implementation runs the offset lookup twice to correct rare DST-boundary mis-snaps. `dayOfWeekInZone` returns 0–6 (Sun–Sat) using `Intl.DateTimeFormat`.
- **`helpers/schedule-windows.ts`** — pulls the right `ScheduleRule`s for the date and converts their `startTime`/`endTime` HH:MM strings to UTC `TimeRange`s.

### Response shape

The response is a discriminated union on `durationMode`:

- **FIXED** → `slots: { startTime, endTime, remainingCapacity }[]`
- **VARIABLE** → `openRanges: { startTime, endTime, durationMinutes }[]` plus `min/max/step` so the client can build a duration picker.

---

## 2. SlotLocksModule (`server/src/slot-locks/`)

**Purpose:** put a 5-minute exclusive hold on a chosen slot so two customers in concurrent checkout flows cannot both confirm. Locks count as "busy" in availability and capacity calculations.

### Routes (`slot-locks.controller.ts`, role: `CUSTOMER`)

| Method | Path                  | Purpose                                                |
| ------ | --------------------- | ------------------------------------------------------ |
| POST   | `/slot-locks`         | Acquire a hold on a slot (5 min TTL).                  |
| GET    | `/slot-locks/me`      | List the caller's currently active locks.              |
| POST   | `/slot-locks/:id/extend` | Add 5 minutes to an unexpired lock.                  |
| DELETE | `/slot-locks/:id`     | Release a lock early (e.g. customer abandons checkout).|

### Service (`slot-locks.service.ts`)

`acquire(customerId, input)`:

1. Validate `startTime`/`endTime` are valid ISO instants with `end > start`.
2. Load the appointment type (gated on org being APPROVED + active).
3. **Pick an entity** (`pickEntity`):
   - `MANUAL` mode → caller must specify a linked `entityId`.
   - `AUTO` mode + no `entityId` → loop linked entities and pick the first one whose `consumedCapacity < maxBookingsPerSlot` for this slot.
4. Compute `expiresAt = now + 5 min`.
5. **In a transaction**, build a fresh engine snapshot for the requested slot and run `placeHold` to validate assignment + slot availability under current data.
6. Re-run `countConsumedCapacity` (defense in depth) and create the `SlotLock` row with the chosen entity attached either via `bookablePersonId` or `bookableResourceId`.

`countConsumedCapacity` is the same calculation availability uses: sum `capacityBooked` of overlapping non-cancelled appointments + count of overlapping unexpired locks. Locks contribute 1 each (matching the V1 simplification — multi-capacity reservations apply only to the appointment record, not to in-flight holds).

`release` and `extend` enforce ownership (`lock.customerId === caller`) and refuse to extend already-expired locks.

`findActiveForCustomer` is a lookup by `(customer, type, entity, start, end)` used during confirmation.

`cleanupExpired` deletes every row with `expiresAt < now`. It returns `{ deleted }` for telemetry.

### Cleanup (`slot-locks.cleanup.ts`)

A `OnModuleInit`/`OnModuleDestroy` provider sets a `setInterval` that calls `cleanupExpired` every 60 s. The timer is `unref`'d so it doesn't hold the process open during shutdown. Errors are caught and logged — the next tick retries.

### DTO (`dto/acquire-slot-lock.dto.ts`)

`{ appointmentTypeId, entityId?, startTime, endTime }` — start/end as ISO 8601 instants.

---

## 3. AppointmentsModule (`server/src/appointments/`)

**Purpose:** turn an active slot lock into an `Appointment` record (customer flow), and let organisers manage the resulting appointments (organiser flow).

### Customer routes (`appointments.controller.ts`, role: `CUSTOMER`)

| Method | Path                  | Purpose                                                 |
| ------ | --------------------- | ------------------------------------------------------- |
| POST   | `/appointments`       | Confirm a booking — consumes a slot lock.               |
| GET    | `/appointments/me`    | List the caller's appointments (filterable).            |
| GET    | `/appointments/:id`   | Fetch one of the caller's appointments.                 |

### Organiser routes (`appointments.organiser.controller.ts`, role: `ORGANIZER`)

Mounted under `/organizations/me/appointments` — the organiser's own org is resolved server-side via `OrganizationsService.requireForOrganiser`.

| Method | Path                   | Purpose                                                                |
| ------ | ---------------------- | ---------------------------------------------------------------------- |
| GET    | `/`                    | List org appointments (filterable).                                    |
| GET    | `/:id`                 | Fetch one.                                                             |
| POST   | `/:id/approve`         | `PENDING` → `CONFIRMED` (manual-confirmation types).                   |
| POST   | `/:id/reject`          | `PENDING` → `CANCELLED` with optional `reason`.                        |
| POST   | `/:id/complete`        | `CONFIRMED` → `COMPLETED`.                                             |
| POST   | `/:id/no-show`         | `CONFIRMED` → `NO_SHOW`.                                               |

Each transition refuses to run if the current status doesn't match the expected source.

### Service (`appointments.service.ts`)

#### `create(customerId, input)`

This is the heart of the booking-confirmation flow:

1. Look up the slot lock by `slotLockId`. Reject if it doesn't exist, isn't owned by this customer, or has expired.
2. Load the linked `AppointmentType` with its `bookingQuestions`.
3. Resolve `capacityBooked` (`resolveCapacity`):
   - Defaults to 1.
   - Must be ≥ 1 and ≤ `maxBookingsPerSlot`.
   - `manageCapacity=false` types reject anything other than 1.
4. Validate booking-question answers (`validateAnswers`) — see helpers below.
5. Derive `durationMins` from `slotEnd − slotStart`.
6. Pick the initial `status`: `PENDING` if `manualConfirmation` else `CONFIRMED`. Pick `paymentStatus`: `PENDING` if `advancePaymentEnabled` else `PAID`.
7. **In a transaction**:
   - Build a fresh engine snapshot and run `confirmBooking` (using the held slot + explicit assignment ids) as the first concurrency decision gate.
   - Recompute consumed capacity *excluding this lock* and reject if `consumed + capacityBooked > maxBookingsPerSlot` — final guard against any race that slipped past the lock.
   - `INSERT` the `Appointment` row.
   - `INSERT` the `AppointmentAnswer` rows.
   - `DELETE` the slot lock (it has served its purpose).
   - Return the appointment hydrated with all relations.

#### Listing

`buildListFilter` translates the query DTO into a `Prisma.AppointmentWhereInput`:
- `status`, `appointmentTypeId` — direct filter.
- `entityId` — matches either `bookablePersonId` or `bookableResourceId`.
- `from`/`to` — bounds on `startTime`.
- `upcomingOnly=true` — `startTime ≥ now` (overrides `from`).

Customer scope adds `customerId = caller`. Organiser scope adds `organizationId = caller's org`. Always sorted `startTime DESC`.

#### State transitions

`approve`, `reject`, `markCompleted`, `markNoShow` all do the same shape: load + ownership check via `findOneForOrganiser` (404 if not in caller's org), validate current status, update, return the refreshed entity. `reject` records `cancellationReason` (defaulting to "Rejected by organiser") and `cancelledAt`.

### DTOs

- `CreateAppointmentDto` — `{ slotLockId, capacityBooked?, answers? }`. `answers` is capped at 50 entries.
- `ListAppointmentsQuery` — status/from/to/entity/type/upcomingOnly. `upcomingOnly` is parsed from query string as `'true' | true → true`.
- `RejectAppointmentDto` — `{ reason? }` (max 500 chars).

### Helpers

#### `helpers/confirmation-code.ts`

`generateConfirmationCode()` returns `CC-XXXXXXX` from a 30-symbol Crockford-ish base32 alphabet (no `I/L/O/0/1` to avoid read-aloud confusion). 7 chars × 30 symbols ≈ 2.2×10¹⁰ combinations — collisions are negligible at our scale, and the column has a `UNIQUE` index as a final guard.

#### `helpers/validate-answers.ts`

Walks each `BookingQuestion` for the type:

- Required questions with empty/whitespace answers → `400`.
- Optional unanswered → `{ answerText: null }` is recorded.
- `NUMBER` → must parse as a finite number; stored normalized via `String(Number(text))`.
- `DATE` → must parse as a valid `Date`; stored as the original string.
- `SINGLE_CHOICE` → must be one of `q.options`.
- `MULTIPLE_CHOICE` → comma-split, every pick must be in `q.options`; stored as `picks.join(',')`.
- `TEXT` (default) → trimmed text.

Finally, any `questionId` in the customer's payload that doesn't belong to this type's questions → `400` (defensive).

---

## How the three modules cooperate

### Capacity bookkeeping is shared

All three modules compute "consumed capacity for entity X over slot \[start, end)" the same way: sum of `capacityBooked` from non-cancelled overlapping appointments **plus** count of unexpired overlapping slot locks. This makes the system race-resistant by treating an in-flight booking as if it were already a partial appointment.

### The race window

Between `POST /slot-locks` and `POST /appointments` lies a window where another customer could try the same slot. The defense is layered:

1. Lock acquisition itself runs the capacity check inside a transaction.
2. Availability subtracts active locks, so concurrent browsers no longer see the slot.
3. The expiry sweeper (60 s tick) removes orphaned locks so abandoned checkouts don't permanently shadow a slot.
4. Final confirmation re-checks capacity *excluding the lock being consumed* and only then deletes the lock + creates the appointment, all in one transaction.

### Status lifecycle

```
              ┌─ manualConfirmation=true ──►  PENDING ─approve→ CONFIRMED
   POST /appointments                             │
   (slot lock consumed)                           └─reject→ CANCELLED
              └─ manualConfirmation=false ─►  CONFIRMED
                                                  ├─complete→ COMPLETED
                                                  └─no-show → NO_SHOW
```

`PaymentStatus` is set independently at creation time: `PENDING` if `advancePaymentEnabled`, otherwise `PAID`. (Actual payment integration is not in this PR.)

---

## Tests

- `appointments.service.spec.ts`, `slot-locks.service.spec.ts` — service-level behaviour.
- `helpers/confirmation-code.spec.ts`, `helpers/validate-answers.spec.ts` — pure-helper unit tests.
- `availability/helpers/range.spec.ts`, `time-zone.spec.ts` — pure-helper unit tests for the time math.
- `availability/strategies/fixed.strategy.spec.ts`, `variable.strategy.spec.ts` — strategy unit tests.

Run from `server/`:

```bash
npm test                                      # all unit tests
npx jest src/appointments                     # just appointments
npx jest src/availability/strategies          # just slot strategies
```
