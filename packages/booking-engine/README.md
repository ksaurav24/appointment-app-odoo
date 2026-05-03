# Booking Engine

Standalone booking intelligence package derived from `docs/schema.md` and `docs/implementation-plan.md`.

## Implemented

- Phase 1:
  - schema-driven domain contracts
  - adapter ports
  - fixture-backed package structure
- Phase 2:
  - schedule resolution
  - assignment expansion
  - overlap detection
  - fixed and flexible slot generation
- Phase 3:
  - capacity evaluation for exclusive and seat-based bookings
  - snapshot-driven availability composition
- Phase 4:
  - hold placement decision engine
  - booking confirmation guard that ignores the caller's own hold
  - stable slot mutex key strategy
  - reservation coordinator adapter contract
- Phase 5:
  - affected-date resolver
  - availability invalidation event builder
  - realtime tests for reschedules and schedule-range invalidation
- Phase 6:
  - no-show feature builder
  - heuristic scorer with optional model delegation
  - organizer recommendation outputs
  - ML tests for feature extraction and fallback scoring

## Current engine assumptions

- `specificDate` schedule rules are applied after weekly rules and therefore win on overlaps.
- `slot_locks` currently fall back to `1` requested seat when `requestedCapacity` is missing.
- ML feature extraction can consume payment signals from `payments` via `latestPayment` and falls back to appointment-level payment fields when not provided.
- flexible slots expose `allowedDurations`, while `slotEnd` reflects the requested duration when provided, otherwise the shortest currently valid duration.
- appointment blocking statuses are injected by integration code instead of being hardcoded here.
- the package `build` step is a dependency-free module-graph validation check because this repo does not yet include a TypeScript emit toolchain.

## Remaining integration work

- persistence adapters for holds and appointments
- transaction and mutex implementations
- SSE or WebSocket publishing over the event contract
- richer ML models when historical data becomes available
