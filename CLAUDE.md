# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with three top-level directories:

- `server/` — NestJS 11 (TypeScript) backend. All server commands run from inside this directory.
- `client/` — placeholder (empty except for `.gitkeep`); the frontend has not been scaffolded yet.
- `docs/schema.md` — planned database schema (DBML-style). This is the source of truth for the data model and predates any ORM/migration code in `server/`.

The `server/` directory has its own `.git` directory in addition to the repo root's — treat the repo-root `.git` as authoritative; commands should be run against the root unless explicitly working inside `server/`.

## Server commands (run from `server/`)

```bash
npm install              # install deps
npm run start:dev        # dev server with watch (default port 8000, override via PORT env)
npm run start            # one-shot dev start
npm run start:prod       # run compiled output from dist/
npm run build            # nest build → dist/
npm run lint             # eslint --fix over src, apps, libs, test
npm run format           # prettier --write src/ test/
npm test                 # jest unit tests (config inline in package.json, rootDir=src, *.spec.ts)
npm run test:watch
npm run test:cov         # coverage to ../coverage
npm run test:e2e         # jest with test/jest-e2e.json (rootDir=test, *.e2e-spec.ts)
```

Run a single unit test file: `npx jest src/path/to/file.spec.ts` (from `server/`). For a single test name: append `-t "test name"`.

## Architecture

### Backend (NestJS)

The server is currently a default Nest scaffold (`AppModule` → `AppController` + `AppService`). When adding domain features, organize by feature module under `src/` (e.g. `src/auth/`, `src/appointments/`) and import them into `AppModule`. Bootstrap lives in `src/main.ts` and reads `PORT` from env (default 8000).

### Domain model (see `docs/schema.md`)

The planned system is a **multi-tenant appointment booking platform**. Key concepts and their relationships:

- **Identity & auth**: `users` (with role enum), `otp_verifications`, `password_resets`, `refresh_tokens` (hashed token storage with device/IP metadata).
- **Tenancy**: each `organization` has exactly one organiser user (1:1 via `organizations.organiserId`). All bookable inventory and appointment configuration is scoped to an organization.
- **Bookable inventory**: `bookable_persons` (e.g. staff) and `bookable_resources` (e.g. rooms/equipment) belong to an organization.
- **Appointment types**: an `appointment_type` is the configurable "what can be booked" — duration mode (fixed/variable/range), schedule type, capacity, payment requirements, cancellation/reschedule policy, public share token. It is linked to one or more persons/resources via the `appointment_type_entities` join table.
- **Scheduling**: `schedules` + `schedule_rules` express weekly recurrence (`dayOfWeek`) and date overrides (`specificDate`) per appointment type.
- **Booking flow**: `booking_questions` (per appointment type) → `appointments` (with `confirmationCode`, status, capacity tracking) → `appointment_answers` (responses) → optional `payments`. `slot_locks` provide short-lived holds during checkout to prevent double-booking. Reschedules are audited via `appointment_reschedules` (preserving previous time + assignee).
- **Cross-cutting**: `notifications` (multi-channel, multi-recipient-type) and `audit_logs` (actor + action + entity + JSON metadata).

When implementing features, cross-reference `docs/schema.md` for the canonical field names, enums, and FK relationships before introducing new tables or columns.

## Conventions

- Prettier config (`server/.prettierrc`): single quotes, trailing commas. Run `npm run format` before committing TS changes.
- ESLint flat config in `server/eslint.config.mjs` enables `typescript-eslint` recommended-type-checked rules with `no-floating-promises` and `no-unsafe-argument` relaxed to warnings — don't add `any` casts to silence errors; fix the type.
- Jest unit tests live next to source as `*.spec.ts`; e2e tests live under `server/test/` as `*.e2e-spec.ts`.
