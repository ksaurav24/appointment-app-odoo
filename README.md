# Appointment App — The Perfect Booking System

> **Hackathon project built for Odoo.**
> A multi-tenant appointment booking platform that lets customers discover services and book appointments with providers in real time, while giving organisations full control over inventory, schedules, capacity, payments and policies.
<!-- Deployed link -->
> **Live Deployed Link** <https://appointly.sauravcodes.in>

---
  
>
> **UI in Figma for the Appointment booking webapp:** <https://www.figma.com/design/xvWjTLvygSwZwdYjRSjEms/BookEase?node-id=57-12016&p=f&t=YKN8TJneCVuTUiOe-0>
> By **Vandana Thawait** (UI/UX Designer).
 
 

## Table of Contents

1. [Overview](#1-overview)
2. [Demo & Design Links](#2-demo--design-links)
3. [Tech Stack](#3-tech-stack)
4. [Repository Layout](#4-repository-layout)
5. [Architecture](#5-architecture)
6. [Architectural Decisions](#6-architectural-decisions)
7. [Feature Catalogue](#7-feature-catalogue)
8. [User Flows](#8-user-flows)
9. [Business Logic Alignment](#9-business-logic-alignment)
10. [Local Setup](#10-local-setup)
11. [Environment Variables](#11-environment-variables)
12. [Scripts & Commands](#12-scripts--commands)
13. [Testing](#13-testing)
14. [Documentation](#14-documentation)
15. [Project Status](#15-project-status)
16. [Team & Credits](#16-team--credits)

---

## 1. Overview

The **Appointment App** (codename **BookEase**) is a unified scheduling platform that supports both **fixed-duration** appointments (doctor consultations, salon visits) and **variable-duration** appointments (turf rentals, meeting rooms) inside the same architecture.

It is built around three login-capable human roles and two non-login bookable entity types:

| Role / Entity | Type | Purpose |
|---|---|---|
| **Admin** | Login | Platform operator. Approves organisations, moderates users, reads platform-wide analytics & audit logs. |
| **Organiser** | Login | Tenant owner. One Organiser ↔ exactly one Organisation. Manages staff, resources, services, schedules, and bookings. |
| **Customer** | Login | Books appointments. Can browse public pages without login, then sign in to confirm. |
| **Bookable Person** | Non-login | A staff member (doctor, stylist, tutor) — booked but never logs in. Receives email notifications. |
| **Bookable Resource** | Non-login | A physical asset (room, turf, equipment) — booked but has no credentials. |

### 1.1 Goals

- Customers complete a booking in under **60 seconds**.
- The system **never** double-books the same person/resource for overlapping time ranges.
- **Real-time** availability with no page reload.
- One configuration flow for both fixed-slot and variable-duration appointment types.
- All cancellation/reschedule policies enforced **server-side** based on per-appointment-type rules.

---

## 2. Demo & Design Links

| Resource | Link |
|---|---|
| **Figma — UI/UX Designs (BookEase)** | <https://www.figma.com/design/xvWjTLvygSwZwdYjRSjEms/BookEase?node-id=57-12016&p=f&t=YKN8TJneCVuTUiOe-0> |
| **Designer** | Vandana Thawait (UI/UX) |
| **Live Demo (Frontend)** | _<replace with your deployed Next.js URL>_ |
| **Live API + Swagger** | _<replace with your deployed API URL>_ + `/docs` |
| **PRD** | [`docs/Appointment_App_PRD.docx`](./docs/Appointment_App_PRD.docx) / [`docs/_prd_extracted.txt`](./docs/_prd_extracted.txt) |
| **Database Schema (DBML)** | [`docs/schema.md`](./docs/schema.md) |
| **API Integration Docs (LLM-friendly)** | [`docs/api/INDEX.md`](./docs/api/INDEX.md) |
| **Booking Flow Deep-Dive** | [`docs/booking-flow.md`](./docs/booking-flow.md) |
| **Pending Modules / Gap Analysis** | [`docs/pending-modules.md`](./docs/pending-modules.md) |
| **Server README (NestJS specifics)** | [`server/README.md`](./server/README.md) |
| **Client README (Next.js specifics)** | [`client/README.md`](./client/README.md) |

---

## 3. Tech Stack

### 3.1 Backend (`server/`)

| Concern | Tech |
|---|---|
| Runtime | **Node.js 20+** (TypeScript) |
| Framework | **NestJS 11** (modular, decorator-driven) |
| ORM | **Prisma 6** |
| Database | **PostgreSQL 16/18** |
| Cache / Pub-Sub / Queue broker | **Redis 7** |
| Background jobs | **BullMQ** (`@nestjs/bullmq`) — used by the mailer |
| Auth | **JWT access tokens + opaque refresh tokens** (cookie-based), `@nestjs/passport`, `passport-jwt` |
| Password hashing | **bcrypt** |
| Validation | **class-validator** + **class-transformer** (global `ValidationPipe`, whitelist strict) |
| Rate limiting | **`@nestjs/throttler`** with per-action limits (login, OTP, register, reschedule, payments…) |
| Real-time | **Socket.IO** with **Redis adapter** for cross-instance fan-out (`slot:updated` events) |
| Email | **Nodemailer** (`gmail` / `console` / `json` transports) driven by a BullMQ `mail` queue |
| Payments | **Razorpay** (HMAC-verified webhooks; rawBody preserved in bootstrap) |
| API Docs | **OpenAPI / Swagger** at `/docs` (dev only) |
| Tests | **Jest** (unit + e2e) |

### 3.2 Frontend (`client/`)

| Concern | Tech |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript 5** |
| UI Runtime | **React 19** |
| Styling | **Tailwind CSS v4** + `tw-animate-css` + `prettier-plugin-tailwindcss` |
| Component primitives | **shadcn/ui** + **@base-ui/react** |
| Icons | **@hugeicons/react** |
| Theming | **next-themes** (light/dark) |
| Server-state | **@tanstack/react-query 5** (one hook per resource) |
| UI-state | **zustand** + local component state — kept strictly separate from server-state |
| HTTP | **axios** (single instance, `withCredentials: true`) |
| Real-time | **socket.io-client** (live availability) |
| Date/Time | **date-fns**, **moment**, **moment-timezone** |
| Forms / OTP | **input-otp**, **react-day-picker** |
| Charts | **recharts** |
| Notifications | **sonner** (toasts) |

### 3.3 Infra & Tooling

- **Docker** + **docker-compose** for Postgres + Redis local dev.
- **Dockerfile** in both `client/` and `server/` for container builds.
- **ESLint** (flat config) + **Prettier** in both apps.
- **Prisma Migrate** for schema evolution.
- **Prisma Studio** for inspecting data locally.

---

## 4. Repository Layout

```
appointment-app-odoo/
├── client/                    # Next.js 16 frontend (App Router)
│   ├── app/                   # routes: /, /login, /signup, /book/[id], /admin/*, /organization/*, /account, ...
│   ├── components/            # UI: booking, dashboard, landing, organization, admin, account, ui (shadcn)
│   ├── hooks/                 # one React Query hook per resource (useAppointmentTypes, useBooking, useAuth, ...)
│   ├── lib/                   # axios api client, query-client, booking state machine, realtime, utils
│   ├── types/                 # shared API typings (mirror of backend DTOs)
│   └── public/
│
├── server/                    # NestJS 11 backend
│   ├── src/
│   │   ├── auth/              # signup, login, OTP, 2FA, refresh tokens, password reset, guards
│   │   ├── users/
│   │   ├── organizations/     # tenant + admin approval workflow
│   │   ├── admin/             # admin moderation, audit logs
│   │   ├── analytics/         # admin + organiser dashboards
│   │   ├── bookable-persons/
│   │   ├── bookable-resources/
│   │   ├── appointment-types/ # services config: schedules, rules, questions, capacity, policies
│   │   ├── availability/      # real-time slot computation (FIXED + VARIABLE strategies)
│   │   ├── slot-locks/        # 5-min checkout holds with background expiry sweeper
│   │   ├── appointments/      # confirm-from-lock, customer + organiser lifecycle
│   │   ├── payments/          # Razorpay intent / verify / webhook
│   │   ├── notifications/     # multi-channel notification persistence
│   │   ├── mailer/            # BullMQ mail queue + templates
│   │   ├── realtime/          # socket.io gateway + Redis adapter (slot:updated fan-out)
│   │   ├── prisma/            # PrismaService + module
│   │   ├── common/, config/, utils/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── test/                  # e2e (Jest)
│
├── docs/
│   ├── Appointment_App_PRD.docx
│   ├── _prd_extracted.txt
│   ├── schema.md              # canonical DBML-ish schema (source of truth for the data model)
│   ├── booking-flow.md        # availability + slot-locks + appointments deep-dive
│   ├── pending-modules.md     # gap analysis vs. PRD
│   └── api/                   # LLM-friendly API integration docs (mirror of Swagger)
│
├── docker-compose.yaml        # postgres:18 + redis:7-alpine
├── CLAUDE.md                  # repo conventions (LLM agent guidance)
└── README.md                  # ← you are here
```

---

## 5. Architecture

### 5.1 High-level system diagram

```mermaid
flowchart TB
    subgraph Browser["Browser (Customer / Organiser / Admin)"]
        UI["Next.js 16 App Router<br/>React 19 + Tailwind v4 + shadcn/ui"]
        RQ["React Query<br/>(server state)"]
        ZS["Zustand<br/>(UI state)"]
        WS1["socket.io-client"]
    end

    subgraph Edge["Edge / Hosting"]
        NEXT["Next.js Server<br/>(SSR + Route Handlers)"]
    end

    subgraph API["NestJS 11 API (server/)"]
        GW["Global ValidationPipe<br/>+ JwtAuthGuard<br/>+ RolesGuard<br/>+ OrganizationApprovedGuard<br/>+ ThrottlerGuard"]
        AUTH["Auth Module<br/>(JWT + opaque refresh)"]
        ORG["Organizations / Admin"]
        INV["Bookable Persons & Resources"]
        AT["Appointment Types"]
        AV["Availability Engine<br/>(FIXED + VARIABLE strategies)"]
        SL["Slot Locks<br/>(5-min TTL + sweeper)"]
        APPT["Appointments<br/>(create-from-lock + lifecycle)"]
        PAY["Payments<br/>(Razorpay)"]
        AN["Analytics"]
        NOT["Notifications"]
        MAIL["Mailer<br/>(BullMQ + Nodemailer)"]
        RT["Realtime Gateway<br/>(Socket.IO)"]
    end

    subgraph Data["Data & Infra"]
        PG[("PostgreSQL<br/>via Prisma")]
        REDIS[("Redis<br/>BullMQ + Socket.IO adapter")]
        SMTP["SMTP<br/>(Gmail / console / json)"]
        RZP["Razorpay"]
    end

    UI --> RQ --> NEXT
    UI --> ZS
    UI <-->|"slot:updated"| WS1
    NEXT -->|"axios<br/>withCredentials: true"| GW

    GW --> AUTH
    GW --> ORG
    GW --> INV
    GW --> AT
    GW --> AV
    GW --> SL
    GW --> APPT
    GW --> PAY
    GW --> AN
    GW --> NOT

    AUTH --> PG
    ORG --> PG
    INV --> PG
    AT --> PG
    AV --> PG
    SL --> PG
    APPT --> PG
    PAY --> PG
    AN --> PG
    NOT --> PG

    SL <--> REDIS
    APPT --> RT
    SL --> RT
    RT <--> REDIS
    WS1 <-.-> RT

    NOT --> MAIL
    MAIL <--> REDIS
    MAIL --> SMTP

    PAY <--> RZP
    RZP -.->|"HMAC-signed webhook<br/>(rawBody)"| PAY
```

### 5.2 Booking pipeline (sequence)

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Next.js Client
    participant AV as /availability
    participant SL as /slot-locks
    participant APPT as /appointments
    participant PAY as /payments
    participant RT as Socket.IO
    participant DB as PostgreSQL

    C->>FE: Open public booking page
    FE->>AV: GET /public/appointment-types/:id/availability?date=YYYY-MM-DD
    AV->>DB: Load type + entities + schedules + busy ranges
    AV-->>FE: slots[] (FIXED) or openRanges[] (VARIABLE)
    FE-->>C: Render slot picker

    C->>FE: Pick slot (and duration if VARIABLE)
    FE->>SL: POST /slot-locks {appointmentTypeId, entityId?, startTime, endTime}
    SL->>DB: TX: re-check capacity → INSERT SlotLock(expiresAt = now+5m)
    SL->>RT: emit slot:updated
    RT-->>FE: slot:updated (other browsers refresh)
    SL-->>FE: 201 {lockId, expiresAt}

    FE-->>C: Show 5:00 countdown + question form

    alt advancePaymentEnabled
        C->>FE: Submit payment
        FE->>PAY: POST /payments/intent
        PAY-->>FE: Razorpay order
        C->>PAY: Razorpay Checkout
        PAY-->>FE: payment_id, signature
        FE->>PAY: POST /payments/verify (HMAC checked)
    end

    C->>FE: Confirm booking
    FE->>APPT: POST /appointments {slotLockId, capacityBooked?, answers?}
    APPT->>DB: TX: re-check capacity (excluding this lock) → INSERT Appointment + Answers → DELETE SlotLock
    APPT->>RT: emit slot:updated
    APPT-->>FE: 201 {confirmationCode, status}
    FE-->>C: Confirmation screen
```

### 5.3 Multi-tenant data model (conceptual)

```mermaid
erDiagram
    User ||--o| Organization : "organiser (1:1)"
    Organization ||--o{ BookablePerson : owns
    Organization ||--o{ BookableResource : owns
    Organization ||--o{ AppointmentType : configures
    AppointmentType ||--o{ AppointmentTypeEntity : "links to"
    BookablePerson ||--o{ AppointmentTypeEntity : "linked from"
    BookableResource ||--o{ AppointmentTypeEntity : "linked from"
    AppointmentType ||--o{ Schedule : has
    Schedule ||--o{ ScheduleRule : "weekly + date-overrides"
    AppointmentType ||--o{ BookingQuestion : asks
    AppointmentType ||--o{ Appointment : "instantiates"
    User ||--o{ Appointment : "books (customer)"
    Appointment ||--o{ AppointmentAnswer : answers
    Appointment ||--o| Payment : "paid by"
    Appointment ||--o{ AppointmentReschedule : audited-by
    AppointmentType ||--o{ SlotLock : "held against"
    User ||--o{ SlotLock : "held by (customer)"
    User ||--o{ AuditLog : "actor"
```

---

## 6. Architectural Decisions

These are the deliberate choices that shape the codebase. They are recorded so future contributors understand **why** the code looks the way it does.

### 6.1 Monorepo with two independent apps

`client/` and `server/` ship independently — separate Dockerfiles, separate `package.json`, separate test runners. The boundary between them is the **HTTP + Socket.IO contract**, mirrored verbatim into `docs/api/` so an LLM (or a human) can build a page without spelunking through controllers.

### 6.2 NestJS feature modules, not God-services

Every domain concept (`auth`, `organizations`, `availability`, `slot-locks`, `appointments`, `payments`, `analytics`, …) is its own NestJS module with its own controller, service, DTOs and tests. `AppModule` only wires them together and registers global guards.

### 6.3 Strict separation: server-state vs. UI-state on the frontend

- **All HTTP state** (lists, details, mutations) lives in **React Query**, with one hook per resource (`useAppointmentTypes`, `useBooking`, `useAdminUsers`, …).
- **All ephemeral UI state** (open dialogs, current step, draft inputs, toasts) lives in **zustand** or local component state.
- The two never overlap. Server data is never copied into a zustand store.

### 6.4 Cookie-based auth with JWT access + opaque refresh

- Access token: short-lived JWT (default `15m`), in an HTTP-only cookie.
- Refresh token: opaque random value, **hashed at rest** in `refresh_tokens` with `deviceInfo` + `ipAddress` for revocation.
- CORS is enabled with `credentials: true`; the frontend always sends `withCredentials: true`.
- Why cookies (not `localStorage`)? XSS-resistance, automatic inclusion on every request, native rotation flow.

### 6.5 Layered guards, applied globally

`server/src/app.module.ts` registers guards as `APP_GUARD` providers (run in order):

1. `JwtAuthGuard` — populates `req.user` or rejects.
2. `RolesGuard` — checks `@Roles(...)` decorators.
3. `OrganizationApprovedGuard` — blocks organiser routes until the org is `APPROVED`.
4. (`ThrottlerGuard` — currently disabled in code, can be re-enabled per the per-action limits already declared.)

Per-action throttler buckets (`login`, `register`, `otpSend`, `otpSubmit`, `passwordReset`, `refresh`, `cancel`, `reschedule`, `paymentIntent`, `paymentVerify`) are pre-declared so each sensitive route has its own quota.

### 6.6 Appointment type as the unit of configuration

The `AppointmentType` entity is the **single configuration surface** an organiser interacts with. It carries:

- `entityType` (PERSON | RESOURCE)
- `scheduleType` (WEEKLY | FLEXIBLE)
- `durationMode` (FIXED | VARIABLE) + `durationMinutes` *or* (`min/max/step`) duration parameters
- `assignmentMode` (AUTO | MANUAL)
- `maxBookingsPerSlot` + `manageCapacity`
- `manualConfirmation` flag
- `advancePaymentEnabled` flag
- `cancellationAllowed`, `cancellationWindowHours`
- `rescheduleAllowed`, `rescheduleWindowHours`
- public `shareToken` for unpublished private links

This means **the same flow** works for "book a doctor for 30 minutes" and "rent a turf for 1.5 hours" — the type's mode bits just dispatch to a different strategy.

### 6.7 Two strategy implementations behind one availability endpoint

`AvailabilityModule` resolves timezone, entity scope, schedule windows and busy ranges, then dispatches to either:

- `strategies/fixed.strategy.ts` — strides each window by `durationMinutes`, includes a slot if `maxBookingsPerSlot − consumed > 0`.
- `strategies/variable.strategy.ts` — subtracts busy ranges from each window and emits contiguous open sub-ranges ≥ `minDurationMins`. Customers then pick a `start` and a `duration` from the arithmetic progression `[min, min+step, …]`.

This keeps the public API a discriminated union on `durationMode` — clients render either a slot list or an open-range picker.

### 6.8 Slot locks: the anti-double-booking primitive

A `SlotLock` is a **5-minute exclusive hold** on a slot, owned by a customer:

1. `POST /slot-locks` runs the capacity check inside a transaction and inserts the row.
2. Active locks count as **busy** in availability and capacity calculations, so concurrent browsers no longer see the slot.
3. `POST /appointments` re-runs the capacity check (excluding the lock being consumed) inside a transaction, then deletes the lock and inserts the appointment atomically.
4. A background sweeper (`OnModuleInit` `setInterval`, 60 s, `unref`'d) deletes expired locks so abandoned checkouts don't permanently shadow a slot.

This layered defense is the **only reliable way** to keep an "instant booking" UX correct under concurrency without serialising every read.

### 6.9 Real-time over Socket.IO with Redis adapter

`server/src/realtime/` exposes an `availability.gateway` that emits `slot:updated` whenever a lock is acquired/released or an appointment is confirmed/cancelled. The Redis adapter (`@socket.io/redis-adapter`) fans events out across **all Node instances**, so a horizontally-scaled API still gives every browser instant updates.

### 6.10 Email via BullMQ, not inline `await sendMail()`

The mailer service enqueues jobs onto a `mail` BullMQ queue. A worker drains the queue using one of three pluggable transports:

- `console` — local dev, prints to stdout.
- `gmail` — production, App Password via `SMTP_USER` / `SMTP_PASS`.
- `json` — e2e tests, captures the last message in-memory.

This keeps the request path latency-stable even when SMTP is slow.

### 6.11 Razorpay webhook needs the raw body

`main.ts` passes `{ rawBody: true }` to `NestFactory.create` and the Razorpay webhook controller verifies the **byte-exact body** against the HMAC signature header. Any middleware that reformats JSON would break the signature — hence rawBody is preserved for **every** request and JSON parsing is left to NestJS.

### 6.12 BigInt-safe JSON

Some internal IDs (e.g. `SlotLock.id`) are `BigInt`. `JSON.stringify` rejects BigInt by default, so `main.ts` patches `BigInt.prototype.toJSON` to `String(this)` — every BigInt in any response renders as a string and the wire format round-trips cleanly.

### 6.13 Validation is strict, not best-effort

The global `ValidationPipe` runs with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Any field not declared on the DTO is **stripped** (or rejects with 400). This is the project's contract with the frontend: send only the fields documented per endpoint, with the exact casing.

### 6.14 Documentation as a first-class artefact

`docs/api/` is hand-curated to be **LLM-friendly** — every module of the API has a markdown file with verbatim field names, enums, response shapes and roles. This made it possible to build the frontend in parallel with the backend without flipping back and forth between Swagger and the IDE.

---

## 7. Feature Catalogue

### 7.1 Authentication & Account Lifecycle

- Email + password signup with **OTP email verification** (purposes: `SIGNUP` / `LOGIN` / `PASSWORD_RESET`).
- Login with optional **2FA** (TOTP/OTP).
- **Refresh token rotation** — opaque tokens hashed at rest, with `deviceInfo` + `ipAddress` for granular revocation.
- Forgot / reset / change password.
- `logout` (single device) + `logout-all` (all devices).

### 7.2 Multi-tenant Organisation Management

- Organiser self-registration and **one-time organisation onboarding** (1:1 organiser ↔ org).
- **Admin approval workflow**: organisations start in `PENDING`, admin moves them to `APPROVED` or `REJECTED`. Until approved, organiser routes are blocked by `OrganizationApprovedGuard`.
- Per-org timezone (`Intl`-aware), slug, contact details, logo, address.
- Admin can deactivate an org → all published types disappear from public discovery.

### 7.3 Bookable Inventory

- Full CRUD for **Bookable Persons** (name, contact email, phone, designation).
- Full CRUD for **Bookable Resources** (name, type, description, capacity, location).
- Soft delete + hard delete.
- Email notifications fire to a Bookable Person's contact email on every booking targeted at them.

### 7.4 Appointment Type Configuration

- Per-type: name, slug, description, share token (for private links), publish/unpublish toggle.
- Entity selection (`PERSON` | `RESOURCE`), entity link table, `assignmentMode` (`AUTO` | `MANUAL`).
- **Fixed-duration** (`durationMinutes`) or **variable-duration** (`min/max/step`) configuration.
- **WEEKLY** schedule rules (`dayOfWeek`) and **DATE_OVERRIDE** rules (`specificDate`).
- **Booking questions** with types `TEXT` / `SINGLE_CHOICE` / `MULTIPLE_CHOICE` / `NUMBER` / `DATE`, required/optional, with options.
- Capacity (`maxBookingsPerSlot`, `manageCapacity`).
- `manualConfirmation` toggle (PENDING → organiser approves).
- `advancePaymentEnabled` toggle.
- Per-type cancellation / reschedule rules (`*Allowed`, `*WindowHours`).

### 7.5 Real-time Availability Engine

- Public, unauthenticated.
- Computes open windows from schedule rules, subtracts overlapping non-cancelled appointments and active slot locks, dispatches to FIXED or VARIABLE strategy.
- Timezone-aware (caller override → schedule's tz → UTC fallback).
- DST-safe wall-time-to-UTC conversion (offset lookup runs twice to correct boundary mis-snaps).
- For VARIABLE: `/duration-options` follow-up endpoint enumerates valid durations from a chosen start.

### 7.6 Slot Locks (Anti-Double-Booking)

- 5-minute TTL exclusive holds, owned by a customer.
- `POST /slot-locks`, `GET /slot-locks/me`, `POST /slot-locks/:id/extend`, `DELETE /slot-locks/:id`.
- Capacity-aware acquisition (transactional re-check).
- Background expiry sweeper (60 s tick).
- Locks count as busy in availability calculations.

### 7.7 Appointments Lifecycle

- `POST /appointments` — confirm a booking by consuming a slot lock; validates booking-question answers; transactional capacity re-check; generates `confirmationCode` (`CC-XXXXXXX`, Crockford-ish base32).
- Customer-side: list / fetch / (planned) cancel / reschedule.
- Organiser-side: approve / reject / mark-completed / mark-no-show — each guarded by an expected source status.
- Status machine:
  ```
  PENDING ─approve→ CONFIRMED ─complete→ COMPLETED
                 ╲           ╲─no-show → NO_SHOW
                  ╲reject→ CANCELLED
  ```

### 7.8 Payments (Razorpay)

- `POST /payments/intent` to create a Razorpay order.
- `POST /payments/verify` to verify the client-side signature.
- `POST /webhooks/razorpay` — HMAC-verified using the rawBody.
- Per-appointment-type `advancePaymentEnabled` flag controls whether the booking starts as `PaymentStatus.PENDING` or `PAID`.

### 7.9 Notifications

- Multi-channel persistence (`EMAIL` / `SMS` / `PUSH` / `IN_APP`) with status (`PENDING` / `QUEUED` / `SENT` / `FAILED` / `BOUNCED`) and priority.
- Recipient types: `USER` / `GUEST` / `ORGANIZER` / `ADMIN`.
- Triggers: `APPOINTMENT_*`, `PAYMENT_*`, `ORGANIZER_APPROVED`/`REJECTED`, `CUSTOM`.
- BullMQ-backed mail dispatch with templated bodies (OTP, welcome, reset, organiser-approved/rejected).

### 7.10 Admin Console

- Approve / reject / activate / deactivate organisations.
- List / search users, change roles.
- Read **audit logs** (actor + action + entity + JSON metadata).
- Platform-wide analytics: time-series, top organisations, KPIs.

### 7.11 Organiser Dashboard & Analytics

- KPIs (total bookings, conversion, revenue, cancellation rate).
- Time-series charts (recharts).
- **Busy-hours heatmap** to inform schedule tuning.
- Per-appointment-type breakdown.

### 7.12 Customer Account

- "My bookings" (upcoming + past).
- View per-booking confirmation code, policies, and (planned) cancel / reschedule actions.
- Profile / password / 2FA management.

---

## 8. User Flows

### 8.1 Organiser onboarding

```mermaid
flowchart LR
    A[Sign up email+pwd] --> B[Email OTP verify]
    B --> C[Create Organisation<br/>one-time]
    C --> D[Org status = PENDING]
    D -->|Admin approves| E[Org status = APPROVED]
    E --> F[Add Bookable Persons /<br/>Resources]
    F --> G[Create Appointment Type]
    G --> H[Define Schedule Rules]
    H --> I[Add Booking Questions]
    I --> J[Set Capacity / Policies /<br/>Payment]
    J --> K[Publish<br/>or share private link]
```

### 8.2 Customer booking

```mermaid
flowchart LR
    A[Land on /book/:id<br/>or /book/share/:token] --> B[Pick date]
    B --> C[GET /availability]
    C --> D{durationMode}
    D -->|FIXED| E[Pick slot]
    D -->|VARIABLE| F[Pick start +<br/>pick duration]
    E --> G[POST /slot-locks<br/>5-min hold starts]
    F --> G
    G --> H[Answer booking questions]
    H --> I{advancePayment?}
    I -->|yes| J[Razorpay Checkout]
    I -->|no| K[POST /appointments]
    J --> L[POST /payments/verify]
    L --> K
    K --> M[Confirmation screen<br/>+ confirmationCode]
    M --> N{manualConfirmation?}
    N -->|true| O[Status = PENDING<br/>organiser approves]
    N -->|false| P[Status = CONFIRMED]
```

### 8.3 Organiser appointment moderation

```mermaid
stateDiagram-v2
    [*] --> PENDING: manualConfirmation=true
    [*] --> CONFIRMED: manualConfirmation=false
    PENDING --> CONFIRMED: approve
    PENDING --> CANCELLED: reject (with reason)
    CONFIRMED --> COMPLETED: mark-completed
    CONFIRMED --> NO_SHOW: mark-no-show
    CONFIRMED --> CANCELLED: customer/organiser cancel
    CANCELLED --> [*]
    COMPLETED --> [*]
    NO_SHOW --> [*]
```

---

## 9. Business Logic Alignment

The architecture is a direct consequence of the PRD's business rules. This section maps **rule → code**, so it's clear *why* each piece exists.

| Business rule | Implementation |
|---|---|
| **No double-booking, ever.** | Three-layer defense: (1) availability subtracts active locks; (2) lock acquisition runs the capacity check inside a transaction; (3) appointment creation re-checks capacity inside a transaction excluding the consumed lock. The 60 s sweeper ensures abandoned holds don't permanently shadow slots. |
| **One Organiser = one Organisation.** | Enforced at the schema level: `Organization.organiserId` is `@unique`. |
| **Organiser cannot operate until Admin approves.** | `OrganizationApprovedGuard` is a global guard; controllers under `/organizations/me`, `/appointment-types`, `/bookable-*` reject calls when `approvalStatus !== APPROVED`. |
| **Fixed and variable durations share one creation flow.** | `AppointmentType.durationMode` discriminator; one config UI; backend dispatches to `FixedStrategy` or `VariableStrategy`. |
| **Cancellation / reschedule policies enforced server-side.** | Per-type fields (`cancellationAllowed`, `cancellationWindowHours`, …) live on `AppointmentType` and are evaluated by the appointment service before mutating state — the client cannot bypass them. |
| **Real-time availability without page reload.** | `availability.gateway` emits `slot:updated` over Socket.IO; the client's `useAvailabilityRealtime` hook invalidates the React Query cache for the affected date. |
| **Customer can book across any Organisation with one account.** | Booking is keyed by `(customerId, appointmentTypeId)` — there is no per-org customer profile. |
| **Bookable Persons / Resources never log in.** | They are pure data rows. Notifications fan out to their stored `contactEmail` via the BullMQ mail queue. |
| **Manual confirmation when an organiser wants control.** | `manualConfirmation` flag → `Appointment.status` starts at `PENDING`; only the organiser's `/approve` (or `/reject`) endpoint can move it forward. |
| **Advance-payment appointment types must collect money first.** | `advancePaymentEnabled` flag → `Appointment.paymentStatus = PENDING` at creation. UI gates the confirmation step on a successful Razorpay verify. |
| **Booking under 60s.** | Stepper machine on the client (`booking-stepper-machine.ts`) keeps state local; React Query caches availability; the slot-lock gives a 5-min window so the customer never re-races. |
| **Auditable platform.** | Every admin/organiser-significant action writes an `AuditLog` row (actor + action + entity + JSON metadata). |
| **Multi-channel notifications.** | The `Notification` model carries `channel`, `status`, `priority`, recipient type — extensible to SMS / push without schema churn. |
| **Time-zone correctness.** | `helpers/time-zone.ts` uses `Intl.DateTimeFormat` for offset lookup and runs it twice to guard DST boundaries; per-org and per-schedule timezones are stored explicitly. |

---

## 10. Local Setup

### 10.1 Prerequisites

- **Node.js 20+** (works with 24)
- **npm 10+** (or **bun** for the client; `bun.lock` is committed)
- **Docker Desktop** (for Postgres + Redis)
- (optional) **Razorpay test account** if you want to exercise the payment flow

### 10.2 First-time bootstrap

```bash
# 1. Spin up Postgres + Redis
docker compose up -d

# 2. Backend
cd server
npm install
cp .env.example .env       # edit secrets — see "Environment Variables"
npx prisma migrate dev --name init
npm run db:seed            # creates the platform admin user
npm run start:dev          # http://localhost:8000  (Swagger at /docs)

# 3. Frontend (in a second terminal)
cd ../client
npm install                # or: bun install
cp .env.local.example .env.local   # if present; otherwise create it
npm run dev                # http://localhost:3000
```

### 10.3 Optional: e2e test database

```bash
docker exec -it appointment-app-odoo-postgres-1 createdb -U odoo appointments_test
DATABASE_URL=postgresql://odoo:odoo@localhost:5432/appointments_test?schema=public \
  npx prisma migrate deploy
DATABASE_URL=postgresql://odoo:odoo@localhost:5432/appointments_test?schema=public \
  npm run test:e2e
```

---

## 11. Environment Variables

### 11.1 Server (`server/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `8000`). |
| `NODE_ENV` | `development` / `production` (production flips cookies to `secure: true`). |
| `DATABASE_URL` | PostgreSQL connection string. |
| `REDIS_URL` | Redis connection string (BullMQ + Socket.IO adapter). |
| `JWT_ACCESS_SECRET` | Signing key for access tokens. |
| `JWT_REFRESH_SECRET` | Signing key for refresh tokens. |
| `JWT_ACCESS_TTL` | e.g. `15m`. |
| `JWT_REFRESH_TTL_DAYS` | e.g. `30`. |
| `COOKIE_DOMAIN` | Domain attribute for auth cookies (begin with `.` for subdomains). |
| `CORS_ORIGINS` | Comma-separated allow-list (the frontend's origin must appear verbatim). |
| `APP_BASE_URL` | Used in outbound emails (reset links, etc.). |
| `MAIL_TRANSPORT` | `console` / `gmail` / `json`. |
| `SMTP_USER`, `SMTP_PASS` | Required when `MAIL_TRANSPORT=gmail` (use a Google App Password). |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay credentials. |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC verification for `/webhooks/razorpay`. |

### 11.2 Client (`client/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the API (default `http://localhost:8000`). |

---

## 12. Scripts & Commands

### 12.1 Server (run from `server/`)

```bash
npm run start:dev        # watch mode (default port 8000)
npm run start            # one-shot dev start
npm run start:prod       # run compiled output from dist/
npm run build            # nest build → dist/
npm run lint             # eslint --fix
npm run format           # prettier --write
npm test                 # jest unit tests
npm run test:watch
npm run test:cov         # coverage to ../coverage
npm run test:e2e         # jest with test/jest-e2e.json
npm run prisma:generate
npm run prisma:migrate   # prisma migrate dev
npm run prisma:studio    # data inspector
npm run db:seed          # ts-node prisma/seed.ts
```

Run a single test file: `npx jest src/path/to/file.spec.ts`. Append `-t "test name"` to filter by name.

### 12.2 Client (run from `client/`)

```bash
npm run dev          # next dev --turbopack
npm run build        # next build
npm run start        # next start
npm run lint         # eslint
npm run format       # prettier --write **/*.{ts,tsx}
npm run typecheck    # tsc --noEmit
```

---

## 13. Testing

- **Unit tests** sit next to the source as `*.spec.ts` (`jest.rootDir = src`). Pure helpers (range math, time-zone, confirmation-code, validate-answers) are 100% covered. Strategies (FIXED, VARIABLE) and services (slot-locks, appointments) have behavioural tests.
- **e2e tests** live under `server/test/` as `*.e2e-spec.ts` and run against a separate `appointments_test` database with `MAIL_TRANSPORT=json` (messages captured in-memory via `MailerService.getLastMessage()`).
- **Frontend** is currently typechecked (`tsc --noEmit`) and lint-clean; component tests are not in scope for the hackathon submission.

---

## 14. Documentation

| Doc | What it covers |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Repo conventions for LLM agents (Prettier, ESLint, module organisation, schema as source of truth). |
| [`docs/Appointment_App_PRD.docx`](./docs/Appointment_App_PRD.docx) | Original Product Requirements Document. |
| [`docs/_prd_extracted.txt`](./docs/_prd_extracted.txt) | Plain-text PRD extract (search-friendly). |
| [`docs/schema.md`](./docs/schema.md) | Canonical DBML-style schema — source of truth ahead of `schema.prisma` for the data model. |
| [`docs/booking-flow.md`](./docs/booking-flow.md) | Deep-dive on `availability` + `slot-locks` + `appointments` and how they cooperate. |
| [`docs/pending-modules.md`](./docs/pending-modules.md) | PRD-vs-implementation gap analysis with P0/P1/P2 priorities. |
| [`docs/api/INDEX.md`](./docs/api/INDEX.md) | LLM-friendly entry point for the API. Per-module files under `docs/api/modules/`. |
| `GET /docs` (dev only) | Live Swagger UI (runtime source of truth). |
| [`server/README.md`](./server/README.md) | NestJS-specific setup, mailer transports, e2e DB bootstrap. |
| [`client/README.md`](./client/README.md) | Next.js + shadcn/ui pointers. |

---

## 15. Project Status

**Implemented (as of submission):**

- Auth (signup, OTP, login, 2FA, refresh rotation, reset, change, logout/logout-all).
- Organisations + admin approval workflow.
- Bookable persons & resources CRUD.
- Appointment types — full configuration (entities, schedules, questions, capacity, manual confirmation, advance payment, cancel/reschedule policies, publish, share token).
- Public discovery for published types.
- Real-time availability (FIXED + VARIABLE), AUTO/MANUAL assignment, timezone-aware.
- Slot locks (acquire / extend / release / sweeper).
- Appointment confirmation (create-from-lock with question validation).
- Organiser-side approve / reject / mark-completed / mark-no-show.
- BullMQ-backed mailer with templates.
- Socket.IO `slot:updated` fan-out via Redis adapter.
- Admin moderation, audit logs, analytics dashboards (admin + organiser).
- Razorpay payment intent + verify + webhook.
- Frontend: full booking stepper, organiser dashboard, admin console, account pages.

**Tracked gaps:** see [`docs/pending-modules.md`](./docs/pending-modules.md) — primarily customer-initiated cancellation, reschedule, refund automation, and selected post-confirmation notifications.

---

## 16. Team & Credits

Built for the **Odoo Hackathon** by the project team.

- **UI / UX Design:** Vandana Thawait — [Figma: BookEase](https://www.figma.com/design/xvWjTLvygSwZwdYjRSjEms/BookEase?node-id=57-12016&p=f&t=YKN8TJneCVuTUiOe-0).
- **PRD & system design:** v1.0 — Hackathon Spec, May 2026.
- **Backend:** NestJS 11 + Prisma + PostgreSQL.
- **Frontend:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui.
- **Real-time:** Socket.IO + Redis adapter.
- **Payments:** Razorpay.

---

> Questions, gaps, or ideas? Open an issue or start with [`docs/pending-modules.md`](./docs/pending-modules.md) to see what's on the next-up list.
