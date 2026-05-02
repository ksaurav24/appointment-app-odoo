# Booking Engine Report

Date: 2026-05-02
Scope: packages/booking-engine

## Final Error Check
- VS Code problems check on this package reports no errors.
- Last test run: `npm test` in packages/booking-engine completed successfully (26/26).

## What We Did
- Implemented and refined booking-engine core modules (availability, concurrency, realtime, ML, shared time utils).
- Added missing tests to cover overlaps, affected date resolution, request evaluation, and DST edge cases.
- Added stress testing script with multiple load shapes and deterministic RNG.
- Expanded ML feature vectors and heuristic scoring to align with schema needs.
- Fixed DST slot duplication and optional property handling under exactOptionalPropertyTypes.
- Added Node typings and TypeScript config updates for NodeNext ESM.

## Engine Overview
The booking-engine is a pure TypeScript, snapshot-driven scheduling core. It does not depend on a server or database directly. Instead, it expects callers to supply a pre-assembled `AvailabilitySnapshot` containing appointment type policy, schedule rules, entity links, resources, appointments, and active holds. The engine then computes availability, holds, booking confirmation, realtime events, and ML-based recommendations.

### Expected Flow (High Level)
1. Fetch policies, schedules, links, resources, appointments, and holds from your data store.
2. Build an `AvailabilitySnapshot`.
3. Use `getAvailability` to compute slots and capacity.
4. Use `placeHold` to reserve a slot and generate a slot mutex key.
5. Use `confirmBooking` to validate a hold before committing a booking.
6. Use `buildAvailabilityEvents` to notify subscribers of date changes.
7. Use `scoreNoShow` / `buildOrganizerRecommendations` to influence scheduling decisions.

## Architecture
- **Domain Models**: Types for policies, schedules, entities, appointments, holds, slots, and ML features.
- **Availability Layer**: Expands assignment candidates, resolves schedule windows, generates slots, and computes capacity.
- **Concurrency Layer**: Validates holds and confirms bookings, resolving requested slots from a snapshot.
- **Realtime Layer**: Calculates affected dates and builds availability events.
- **ML Layer**: Builds no-show feature vectors and generates heuristic scores and recommendations.
- **Ports**: Interfaces for clock, repository, transactions, mutex, event bus, and ML model.

## Key Features
- Snapshot-based availability engine with entity-type filtering (person/resource/pair).
- Capacity-aware scheduling with configurable max bookings and resource capacity.
- Hold validation and booking confirmation logic.
- Deterministic, standalone ML scoring fallback with risk bands.
- Realtime event generation for availability invalidation.
- DST-safe slot generation with unique slot start enforcement.
- Stress-test script for performance characterization.

## How the Engine Works (Details)

### Availability
- `resolveScheduleDay` merges weekly and specific-date rules into a set of available windows.
- `expandAssignmentCandidates` normalizes entity links into assignment shapes.
- `filterAssignmentsByEntityType` enforces appointment type entity constraints.
- `generateSlotCandidates` computes slot start/end times per window and duration mode.
- `calculateRemainingCapacity` removes capacity from overlapping appointments and holds.
- `getAvailabilityFromSnapshot` ties it all together into a sorted `AvailabilityDay`.

### Holds and Booking
- `placeHoldFromSnapshot` validates a request and returns hold expiry and slot mutex key.
- `confirmBookingFromSnapshot` revalidates capacity and hold ownership/expiry before confirmation.
- `resolveRequestedSlot` maps a client request to an exact slot and assignment.

### Realtime Events
- `resolveAffectedDates` finds dates affected by bookings, schedule changes, or type updates.
- `buildAvailabilityEvents` emits availability.changed events for each affected date.

### ML and Recommendations
- `buildNoShowFeatures` extracts schema-aligned signals (lead times, cancellations, history rates).
- `scoreNoShow` uses optional external model or deterministic fallback.
- `buildOrganizerRecommendations` surfaces best-slot, high-risk, and overbooking guidance.

## Integration Guide

### 1) Provide Data via Snapshot
You must assemble this structure before calling the engine:
- Appointment type policy
- Schedule definition (timezone + rules)
- Entity links (person/resource/pair)
- Resources
- Existing appointments
- Active holds

### 2) Use the Public Exports
Key exports are re-exposed from `src/index.ts`:
- Availability: `getAvailability`
- Holds: `placeHold`
- Booking: `confirmBooking`
- Realtime: `buildAvailabilityEvents`
- ML: `buildNoShowFeatures`, `scoreNoShow`, `buildOrganizerRecommendations`

### 3) Implement Ports (Production)
The repo includes port definitions only. You must provide implementations for:
- `BookingEngineRepositoryPort` (fetch policies, schedules, appointments, holds)
- `TransactionPort` (wrap writes in a transaction)
- `MutexPort` (distributed lock for slot keys)
- `ClockPort` (consistent time source)
- `EventBusPort` (publish availability events)
- `MlModelPort` (optional external scoring)

### 4) Orchestration Layer
`reservation-coordinator.ts` defines a contract but does not implement orchestration. Your service should:
- Acquire slot mutex based on `holdKey`.
- Use repository to re-fetch snapshot ranges.
- Store holds and bookings in a transaction.
- Publish events after commit.

### 5) Example Pseudocode
```ts
const snapshot = await buildSnapshotFromRepo(appointmentTypeId, range);
const availability = getAvailability({
  appointmentTypeId,
  date,
  requestedDuration,
  requestedCapacity,
  snapshot,
  blockingStatuses,
  now,
});

const hold = placeHold({
  appointmentTypeId,
  customerId,
  slotStart,
  requestedDuration,
  requestedCapacity,
  snapshot,
  blockingStatuses,
  holdTtlMinutes,
  now,
});

if (hold.granted) {
  const decision = confirmBooking({
    appointmentTypeId,
    customerId,
    holdId,
    slotStart,
    requestedDuration,
    requestedCapacity,
    snapshot,
    blockingStatuses,
    now,
  });
}
```

## What You Should Know
- This engine is snapshot-based. It does not store or fetch data itself.
- Concurrency control (mutex, transactions) is external and required for production safety.
- The slot generator is DST-safe by de-duplicating slot starts.
- Optional properties are strict; avoid passing undefined into optional fields under exactOptionalPropertyTypes.

## Risks / Gaps
- No concrete reservation coordinator implementation.
- No persistence adapters or server/client wiring in this package.
- Load/stress tests are synthetic; production benchmarks depend on adapters and DB latency.

## How to Run
- Tests: `npm test`
- Stress tests: `npm run stress`
- Build check: `npm run build`

## Files of Interest
- Availability core: src/availability/*
- Concurrency core: src/concurrency/*
- ML scoring: src/ml/*
- Realtime events: src/realtime/*
- Shared time utils: src/shared/time.ts
- Domain contracts: src/domain/*
- Tests: test/*

## Conclusion
The booking-engine package is a complete, test-backed scheduling core with availability, holds, booking confirmation, realtime events, and ML-derived recommendations. It is production-ready as a library once you provide the external adapters and orchestration layer. The included tests and stress scenarios validate correctness and performance characteristics of the snapshot-based engine.
