# Appointment App API — Frontend Integration Docs

> **Audience:** AI coding agents and human developers building the frontend.
> **Source-of-truth backend:** `server/` (NestJS 11 + Prisma + PostgreSQL).
> **API version:** `0.2.0` (matches `server/src/swagger.ts`).
> **Live Swagger** (dev only): `GET /docs` on the running server.

This index is the entrypoint. Each row tells you exactly which file to load
to answer a given class of question — load only what you need.

---

## How to use this index

1. Identify the **task** you're trying to do (e.g., "build a login form",
   "list a customer's appointments", "submit a Razorpay payment").
2. Find the most relevant entry below — files are scoped tightly to keep
   token consumption low.
3. Always load **`00-overview.md`** + **`01-auth-and-cookies.md`** +
   **`02-conventions.md`** the first time. Everything else is on-demand.
4. When in doubt about an enum value, response shape, or field name,
   load **`03-enums.md`** or **`04-data-models.md`** — those are the
   verbatim contracts.

---

## Foundation files (load first)

| File | Purpose | Always load? |
|------|---------|--------------|
| [`00-overview.md`](./00-overview.md) | Architecture, base URL, environment, CORS, Swagger | Yes |
| [`01-auth-and-cookies.md`](./01-auth-and-cookies.md) | Cookie names, JWT, role model, guards, refresh flow | Yes for any authenticated call |
| [`02-conventions.md`](./02-conventions.md) | Error response shapes, throttling, pagination, date/UUID/BigInt formats | Yes |
| [`03-enums.md`](./03-enums.md) | Verbatim values for every enum (Role, AppointmentStatus, etc.) | When you need an enum value |
| [`04-data-models.md`](./04-data-models.md) | Full Prisma model field-by-field reference | When you need to know a response shape in detail |

---

## Per-module endpoint docs

Each file documents one logical feature area. They are self-contained
once you have the foundation files loaded.

| File | Routes covered | Roles | Load when… |
|------|----------------|-------|------------|
| [`modules/auth.md`](./modules/auth.md) | `/auth/*` | Public + authenticated | Building registration, login, 2FA, password reset, session management |
| [`modules/organizations.md`](./modules/organizations.md) | `/organizations/me` | ORGANIZER | Organizer dashboard, profile page |
| [`modules/admin.md`](./modules/admin.md) | `/admin/*` (orgs, users, appointments, audit logs) | ADMIN | Admin console |
| [`modules/analytics.md`](./modules/analytics.md) | `/admin/analytics/*`, `/organizations/me/analytics/*` | ADMIN, ORGANIZER | Charts, KPIs, dashboards |
| [`modules/bookable-inventory.md`](./modules/bookable-inventory.md) | `/bookable-persons/*`, `/bookable-resources/*` | ORGANIZER | Managing staff and rooms/equipment |
| [`modules/appointment-types.md`](./modules/appointment-types.md) | `/appointment-types/*` (organizer) and `/public/appointment-types/*` (customer-facing) | ORGANIZER + Public | Configuring services, public booking page |
| [`modules/booking-flow.md`](./modules/booking-flow.md) | `/public/appointment-types/:id/availability`, `/slot-locks/*`, `/appointments/*`, `/organizations/me/appointments/*` | Public, CUSTOMER, ORGANIZER | The full customer booking pipeline + organizer-side appointment management |
| [`modules/payments.md`](./modules/payments.md) | `/payments/intent`, `/payments/verify`, `/webhooks/razorpay` | CUSTOMER + signature-verified webhook | Razorpay integration |

---

## Task → file map (search-friendly)

| Task | Primary file(s) |
|------|----------------|
| Register a new customer / organizer | `modules/auth.md` |
| Verify email / resend OTP | `modules/auth.md` |
| Log in (with or without 2FA) | `modules/auth.md` + `01-auth-and-cookies.md` |
| Refresh tokens / logout | `modules/auth.md` + `01-auth-and-cookies.md` |
| Forgot / reset / change password | `modules/auth.md` |
| Enable / disable 2FA | `modules/auth.md` |
| Get current organizer's organization | `modules/organizations.md` |
| Approve / reject / activate / deactivate organizations (admin) | `modules/admin.md` |
| List / search / change role of users (admin) | `modules/admin.md` |
| Read audit logs (admin) | `modules/admin.md` |
| Admin dashboard / time-series / top organizations | `modules/analytics.md` |
| Organizer dashboard / busy-hours heatmap | `modules/analytics.md` |
| CRUD bookable persons / resources | `modules/bookable-inventory.md` |
| Create / update / publish appointment types | `modules/appointment-types.md` |
| Configure schedule rules / booking questions / entities | `modules/appointment-types.md` |
| Public booking page (find appointment type by share token or id) | `modules/appointment-types.md` |
| Show available slots for a date | `modules/booking-flow.md` (availability section) |
| Acquire / extend / release a slot lock | `modules/booking-flow.md` (slot-locks section) |
| Create an appointment (booking confirmation) | `modules/booking-flow.md` (appointments section) |
| Cancel / reschedule appointment (customer) | `modules/booking-flow.md` |
| Approve / reject / complete / no-show appointment (organizer) | `modules/booking-flow.md` |
| Razorpay payment intent + verify | `modules/payments.md` |
| Razorpay webhook receiver | `modules/payments.md` |

---

## Versioning and stability

* This documentation tracks the controllers under `server/src/`. When the
  backend changes, regenerate the relevant `modules/*.md` from the matching
  controller + DTO files. Field names and validators are quoted verbatim
  from those files; do not paraphrase them.
* The OpenAPI spec served at `/docs` is the runtime source of truth.
  These markdown docs are an LLM-friendly mirror.

---

## File metadata (for programmatic discovery)

```yaml
docs:
  - path: 00-overview.md
    purpose: architecture, base url, environment
    always_load: true
  - path: 01-auth-and-cookies.md
    purpose: authentication model, cookie attributes, refresh, guards
    always_load: true
    related_endpoints: ["/auth/*"]
  - path: 02-conventions.md
    purpose: errors, throttling, pagination, dates
    always_load: true
  - path: 03-enums.md
    purpose: enum values
    on_demand: true
  - path: 04-data-models.md
    purpose: prisma model field reference
    on_demand: true
  - path: modules/auth.md
    routes_prefix: /auth
    roles: [public, authenticated]
  - path: modules/organizations.md
    routes_prefix: /organizations/me
    roles: [ORGANIZER]
  - path: modules/admin.md
    routes_prefix: /admin
    roles: [ADMIN]
  - path: modules/analytics.md
    routes_prefix: ["/admin/analytics", "/organizations/me/analytics"]
    roles: [ADMIN, ORGANIZER]
  - path: modules/bookable-inventory.md
    routes_prefix: ["/bookable-persons", "/bookable-resources"]
    roles: [ORGANIZER]
  - path: modules/appointment-types.md
    routes_prefix: ["/appointment-types", "/public/appointment-types"]
    roles: [ORGANIZER, public]
  - path: modules/booking-flow.md
    routes_prefix:
      - /public/appointment-types/:id/availability
      - /slot-locks
      - /appointments
      - /organizations/me/appointments
    roles: [public, CUSTOMER, ORGANIZER]
  - path: modules/payments.md
    routes_prefix: ["/payments", "/webhooks/razorpay"]
    roles: [CUSTOMER, public-webhook]
```
