# Engine Implementation Plan

## Scope

This plan is only for the booking intelligence layer owned on this branch.

In scope:

- real-time availability calculation
- preventing double bookings
- flexible slot generation
- capacity rules
- hold logic
- engine-side real-time event contracts
- ML and decision-support groundwork

Out of scope on this branch:

- auth
- CRUD modules
- full NestJS app setup
- Prisma migrations
- payment processing
- notification delivery
- frontend screens

Goal:

Build a tested, framework-agnostic engine that backend and frontend teammates can integrate later into the main webapp.

## Start Here

Start with the pure engine core, not Nest controllers and not Prisma queries.

Recommended first build order:

1. domain contracts and test fixtures
2. schedule resolution and slot generation
3. capacity and overlap rules
4. hold and double-booking logic
5. real-time invalidation event builder
6. ML advisory layer

## Schema-Driven Decisions

The architecture must follow `docs/schema.md`, especially these tables:

- `appointment_types`: booking policy, duration rules, capacity rules, assignment mode
- `appointment_type_entities`: allowed people/resources or valid pairings
- `schedules` and `schedule_rules`: working windows and date overrides
- `appointments`: confirmed usage of time, entity assignments, and booked capacity
- `slot_locks`: temporary holds that also consume availability
- `appointment_reschedules`: historical signal for future ML features

### What the schema tells us

- Availability is not just time math. It depends on policy, entity graph, schedule rules, existing appointments, and active holds.
- `appointments.capacityBooked` means capacity is seat-based, not only appointment-count based.
- `slot_locks` means temporary holds are part of the intended design and must be included in availability.
- `appointment_type_entities` means the engine must handle multiple assignment shapes:
  - person only
  - resource only
  - person plus resource pair
- `durationMode`, `durationMinutes`, `minDurationMins`, `maxDurationMins`, and `durationStepMins` mean slot generation must support both fixed and flexible duration flows.

### Important schema gaps to resolve or guard against

- `slot_locks` has no `capacityRequested` field.
  - Recommendation: add it later.
  - Until then, each hold can only safely represent `1` capacity unit.
- `appointments.bookablePersonId` and `bookableResourceId` are shown as required in the schema.
  - Recommendation: backend team should confirm whether one or both can be nullable depending on `entityType`.
- `schedule_rules` has no explicit priority field.
  - Recommendation: the engine should apply `specificDate` rules after weekly rules and let date-specific rules win.
- `appointments.status` enum values are not defined here.
  - Recommendation: backend must supply which statuses block availability.

## Architecture Redesign

### Decision

Do not build this as generic Nest services inside an unfinished backend branch.

Build it as a standalone engine package with adapter boundaries so it can be tested independently and integrated later.

### Recommended layout

```text
appointment-app-odoo/
  docs/
    schema.md
    implementation-plan.md
  packages/
    booking-engine/
      src/
        domain/
          models.ts
          policies.ts
          value-objects.ts
        ports/
          repository.port.ts
          transaction.port.ts
          mutex.port.ts
          clock.port.ts
          event-bus.port.ts
          ml-model.port.ts
        availability/
          schedule-resolver.ts
          slot-generator.ts
          overlap-checker.ts
          capacity-calculator.ts
          assignment-expander.ts
          availability-engine.ts
        concurrency/
          hold-engine.ts
          booking-guard.ts
          reservation-coordinator.ts
        realtime/
          event-builder.ts
          affected-date-resolver.ts
        ml/
          feature-builder.ts
          no-show-scorer.ts
          recommendation-engine.ts
        index.ts
      test/
        fixtures/
        availability/
        concurrency/
        realtime/
        ml/
```

### Why this layout

- keeps your work independent from backend branch churn
- lets you test the hard logic before integration
- reduces merge conflicts with backend and frontend teams
- makes transport and database choices adapter concerns, not core-engine concerns

### Integration boundary

The engine package should not import:

- NestJS
- Prisma
- Redis client
- WebSocket libraries
- SSE controllers

Those belong in integration adapters later.

## Engine Layers

### 1. Domain layer

Owns the schema-derived language of the system.

Core models:

- `AppointmentTypePolicy`
- `ScheduleDefinition`
- `ScheduleRule`
- `EntityAssignment`
- `ExistingAppointment`
- `ActiveHold`
- `SlotCandidate`
- `AvailabilitySlot`
- `HoldRequest`
- `HoldDecision`
- `BookingDecision`
- `AvailabilityEvent`
- `NoShowFeatureVector`

### 2. Availability layer

Owns all read-side slot math:

- resolving weekly rules and date overrides
- expanding entity assignments
- generating candidate slots
- overlap detection
- remaining-capacity calculation

### 3. Concurrency layer

Owns the decision rules for:

- whether a hold can be placed
- whether a booking can be confirmed
- how to re-check capacity inside a fresh snapshot

This layer should stay deterministic. It should not directly talk to Redis or the database.

### 4. Realtime layer

Owns event payload construction only:

- what changed
- which appointment type changed
- which date is affected
- which entity assignments are affected

Transport is not part of this layer.

### 5. ML layer

Owns:

- feature extraction
- score calculation interface
- organizer-facing recommendations

It must not become the source of truth for booking acceptance.

## Adapter Ports

These ports let the backend team integrate the engine later without changing engine code.

### Repository port

Supplies engine snapshots:

- appointment type policy
- schedule and rules
- appointment type entity links
- active appointments for a time range
- active holds for a time range

### Transaction port

Wraps fresh reads plus writes for hold and booking flows.

### Mutex port

Allows Redis, database advisory locks, or another implementation later.

### Clock port

Makes time-based tests deterministic.

### Event bus port

Lets backend publish SSE or WebSocket invalidation events later.

### ML model port

Allows a local model, Python service, or external scorer later.

## Core Engine Contracts

These are the main entry points the package should expose.

```ts
getAvailability(input: GetAvailabilityInput): Promise<AvailabilityDay>
placeHold(input: PlaceHoldInput): Promise<HoldDecision>
confirmBooking(input: ConfirmBookingInput): Promise<BookingDecision>
buildAvailabilityEvents(input: AvailabilityMutationInput): AvailabilityEvent[]
buildNoShowFeatures(input: NoShowFeatureInput): NoShowFeatureVector
scoreNoShow(input: NoShowFeatureInput): Promise<NoShowScore>
```

### GetAvailabilityInput

- `appointmentTypeId`
- `date`
- `timezoneOverride?`
- `requestedDuration?`
- `requestedCapacity?`

### AvailabilityDay output

- `appointmentTypeId`
- `date`
- `timezone`
- `slots: AvailabilitySlot[]`

### AvailabilitySlot output

- `slotStart`
- `slotEnd`
- `remainingCapacity`
- `requestedCapacityFits`
- `bookablePersonId?`
- `bookableResourceId?`
- `allowedDurations?`
- `isAvailable`
- `blockedReasons[]`

### PlaceHoldInput

- `appointmentTypeId`
- `customerId`
- `slotStart`
- `requestedDuration`
- `requestedCapacity`
- `bookablePersonId?`
- `bookableResourceId?`

### HoldDecision output

- `granted`
- `holdExpiresAt?`
- `holdKey?`
- `remainingCapacityAfterHold?`
- `reason?`

## Availability Rules

### 1. Schedule resolution

Recommended resolution order:

1. load the schedule timezone from `schedules.timezone`
2. derive the target day in that timezone
3. apply matching weekly rules for `dayOfWeek`
4. apply matching `specificDate` rules after weekly rules
5. treat `isAvailable = true` as adding windows
6. treat `isAvailable = false` as subtracting windows
7. merge remaining available windows before slot generation

This precedence is an engine rule inferred from the schema and should be documented for the backend team.

### 2. Slot generation

### Fixed duration

Use `durationMinutes` as slot length and generate starts inside each available window.

### Flexible duration

If `durationMode` is variable or range-based:

- use `durationStepMins` as the slot increment
- compute valid durations between `minDurationMins` and `maxDurationMins`
- only return a start time if at least one valid duration fits fully inside the window

Recommended output shape:

- one start time
- array of `allowedDurations`

This is better than flattening every duration into a separate slot row.

### 3. Assignment expansion

The engine should normalize `appointment_type_entities` into assignment candidates:

- person-only assignment
- resource-only assignment
- paired assignment

Recommended interpretation:

- if only `bookablePersonId` exists, it is a person-only slot
- if only `bookableResourceId` exists, it is a resource-only slot
- if both exist, that row represents an allowed person-resource pairing

### 4. Overlap detection

Two intervals overlap when:

```text
candidateStart < existingEnd
AND
candidateEnd > existingStart
```

This rule must be used consistently for both appointments and holds.

### 5. Capacity calculation

### When `manageCapacity = true`

Consume capacity by quantity, not by row count.

Recommended formula:

```text
remainingCapacity =
slotCapacityLimit
- sum(blockingAppointments.capacityBooked)
- sum(activeHolds.capacityRequested)
```

Because `slot_locks` currently lacks `capacityRequested`, the temporary fallback is:

```text
sum(activeHolds.capacityRequested) = activeHoldCount
```

### When `manageCapacity = false`

Treat each assignment as exclusive capacity `1`.

That means:

- a conflicting appointment blocks the assignment
- a conflicting active hold also blocks the assignment

### Capacity limit source

Use the lowest applicable limit:

1. `appointment_types.maxBookingsPerSlot`
2. `bookable_resources.capacity` when a resource is involved and capacity-managed

This is the safest schema-driven interpretation.

### 6. Blocking appointment statuses

The engine should not hardcode status enums.

Instead, backend integration must pass a blocking-status policy such as:

- confirmed
- pending_confirmation
- checked_in

Cancelled, expired, and failed states should not block.

## Concurrency And Double-Booking Prevention

### Design principle

Use a two-layer design:

1. engine decides from a snapshot
2. integration adapter guarantees the snapshot is fresh and write-safe

### Engine responsibilities

- decide whether a hold fits
- decide whether a booking still fits
- detect capacity exhaustion
- return a reason when denied

### Integration responsibilities later

- acquire slot mutex
- begin transaction
- read fresh appointments and holds
- call engine
- write hold or appointment
- publish event

### Hold flow

Recommended orchestration:

1. build slot key from appointment type, slot interval, and assignment
2. acquire mutex on that slot key
3. read fresh snapshot inside a transaction
4. run `placeHold`
5. if granted, persist hold
6. release mutex in `finally`

### Confirm booking flow

Recommended orchestration:

1. acquire mutex for the same slot key
2. read fresh snapshot including the caller's hold
3. ignore the caller's own hold when re-evaluating remaining capacity
4. create appointment if still valid
5. remove or consume the hold
6. release mutex

### Important rule

Availability shown to the user is advisory.

Final truth must always come from a fresh snapshot during hold placement and again during booking confirmation.

## Realtime Event Contract

### Decision

This branch should define event payloads and invalidation rules, not transport controllers.

Backend team can later expose them over:

- SSE
- WebSocket
- internal event bus

### Event types

- `availability.changed`
- `hold.created`
- `hold.expired`
- `booking.created`
- `booking.cancelled`
- `booking.rescheduled`
- `schedule.updated`
- `appointment-type.updated`

### Event payload

```json
{
  "type": "availability.changed",
  "organizationId": "org_xxx",
  "appointmentTypeId": "apt_xxx",
  "affectedDate": "2026-05-02",
  "bookablePersonId": "person_xxx",
  "bookableResourceId": "resource_xxx",
  "reason": "booking.created",
  "occurredAt": "2026-05-02T10:30:00.000Z"
}
```

### Event rules

- any new hold can invalidate the affected date
- any confirmed booking must invalidate the affected date
- cancellation and reschedule must invalidate old date and new date
- schedule changes must invalidate every date touched by the changed rule window
- assignment changes must invalidate future dates for that appointment type

## ML Architecture

### Goal

Keep ML as advisory until deterministic booking logic is proven stable.

### First useful ML outputs

- no-show risk score
- best slot recommendation
- overbooking suggestion for organizer review
- high-risk time window flags

### Feature sources from the schema

- `appointments.status`
- `appointments.rescheduleCount`
- `appointments.durationMins`
- `appointments.startTime`
- `appointments.paymentStatus`
- `appointments.cancelledAt`
- `appointment_types.durationMode`
- `appointment_types.maxBookingsPerSlot`
- organization-level and appointment-type-level historical behavior

### Rule

The engine must still work correctly if the ML scorer is disabled or unavailable.

## Testing Strategy

### 1. Pure unit tests

Write fast tests for:

- weekly rule resolution
- specific-date override precedence
- interval subtraction
- fixed slot generation
- flexible duration generation
- overlap detection
- capacity calculation
- assignment expansion
- event payload building
- ML feature extraction

### 2. Scenario tests

Create fixtures for:

- single person appointment type
- single resource appointment type
- person-resource paired appointment type
- `manageCapacity = false`
- `manageCapacity = true`
- `maxBookingsPerSlot > 1`
- `resource.capacity` lower than appointment-type capacity
- weekly availability plus same-day blackout
- rescheduled appointment affecting old and new dates

### 3. Race-condition simulation tests

Simulate:

- two users chasing the last seat
- one hold expiring while another user retries
- booking confirmation after stale availability view
- paired assignment conflict versus independent assignment availability

## Handoff Contracts For Other Teams

### Backend team needs to integrate

- repository adapter for engine snapshots
- transaction wrapper for hold and booking flows
- mutex adapter using Redis or DB locks
- persistence for holds and appointments
- event publisher over SSE or WebSockets

### Frontend team needs to consume

- structured `AvailabilitySlot[]`
- `allowedDurations` for flexible bookings
- `remainingCapacity`
- invalidation events keyed by appointment type and date

### What this branch should hand over

- engine package
- test suite
- example fixtures
- event contract document
- integration checklist

## Build Phases

### Phase 1: Domain Contracts And Fixtures

Deliver:

- engine models
- policy objects
- fixture data for core scheduling scenarios

Exit criteria:

- every later engine function can run against fixtures without a database

### Phase 2: Availability Kernel

Deliver:

- schedule resolver
- slot generator
- overlap checker
- assignment expander

Exit criteria:

- engine returns correct candidate slots for fixed and flexible duration cases

### Phase 3: Capacity Kernel

Deliver:

- remaining-capacity calculator
- status-based blockers
- exclusive versus managed-capacity rules

Exit criteria:

- seat math is correct for appointments and holds

### Phase 4: Concurrency Kernel

Deliver:

- hold decision engine
- booking guard
- mutex key strategy
- transaction orchestration contract

Exit criteria:

- last-seat and overlapping-slot scenarios are rejected correctly from fresh snapshots

### Phase 5: Realtime Contract

Deliver:

- availability event types
- affected-date resolver
- event payload builder

Exit criteria:

- backend team can wire SSE or WebSockets without redefining engine events

### Phase 6: ML Advisory Layer

Deliver:

- feature builder
- score interface
- recommendation outputs

Exit criteria:

- ML outputs are optional and never bypass deterministic booking rules

## Final Recommendation

Do not wait for the backend branch to be fully merged before starting.

The safest path on this branch is:

1. define the engine package and contracts
2. implement and test pure scheduling and capacity logic
3. define the integration ports
4. hand the tested package to backend and frontend teammates for wiring

That gives you a clean ownership boundary and keeps your hardest logic moving now instead of waiting on branch sync.
