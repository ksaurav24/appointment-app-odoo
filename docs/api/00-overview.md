# 00 — Overview

## Product

Multi-tenant appointment booking platform. Three actor types:

* **CUSTOMER** — books appointments. Public-facing pages allow discovery
  before login.
* **ORGANIZER** — runs an organization (a "tenant"). Manages bookable
  persons/resources, appointment types (services), and incoming bookings.
  Must be approved by an admin before they can manage their org.
* **ADMIN** — platform operator. Approves/rejects organizations, moderates
  users, reads audit logs and platform-wide analytics.

## Backend stack

* NestJS 11 (TypeScript). Controllers under `server/src/<feature>/`.
* Prisma ORM against PostgreSQL. Schema: `server/prisma/schema.prisma`.
* Redis for the BullMQ job queue (email).
* Razorpay for advance-payment appointment types.
* Cookie-based session auth with JWT access + opaque refresh tokens.

## Base URL & environment

* **Default port:** `8000` (override with `PORT` env var).
* **Local default:** `http://localhost:8000`.
* **Swagger UI** (dev only): `http://<host>:<port>/docs`.

### Required env on the backend that affects frontend

| Var | Purpose | Frontend implication |
|-----|---------|----------------------|
| `CORS_ORIGINS` | Comma-separated list of allowed origins | The frontend's origin **must** appear here verbatim or browsers will block the request |
| `COOKIE_DOMAIN` | Cookie `domain` attribute | Frontend must be served from a host that matches this domain (or a subdomain if it begins with `.`) for cookies to be sent |
| `NODE_ENV` | `production` flips cookie `secure: true` | In production, the frontend **must** be on HTTPS or cookies are dropped |
| `JWT_ACCESS_TTL` | Access token TTL (e.g. `15m`) | Refresh proactively before this expires |
| `JWT_REFRESH_TTL_DAYS` | Refresh token TTL in days (default `30`) | Defines max idle session length |
| `APP_BASE_URL` | Used in outbound emails (reset links, etc.) | The frontend should host the `/reset-password?token=...` route |

## Global request handling

The server applies a global `ValidationPipe` (`server/src/main.ts:31`) with:

* `whitelist: true` — properties not declared on the DTO are stripped.
* `forbidNonWhitelisted: true` — sending an unknown field returns **400**.
* `transform: true` + `enableImplicitConversion: true` — primitive
  coercion happens automatically (e.g. `"20"` → `20` for `take`).

**Implication:** send only the fields documented per endpoint, with the
exact casing shown.

The server reads the **raw request body** for every request so that the
Razorpay webhook controller can verify HMAC signatures
(`server/src/main.ts:21`). This does not affect normal JSON requests.

CORS is enabled with `credentials: true`. The frontend must use
`fetch(..., { credentials: 'include' })` (or `axios` with
`withCredentials: true`) on every request, otherwise the browser will not
send the auth cookies.

## Top-level route inventory

| Prefix | Purpose | Doc |
|--------|---------|-----|
| `/auth` | Auth + account lifecycle | `modules/auth.md` |
| `/organizations/me` | Organizer's own org + analytics + appointments | `modules/organizations.md`, `modules/analytics.md`, `modules/booking-flow.md` |
| `/admin/*` | Admin moderation + analytics + audit | `modules/admin.md`, `modules/analytics.md` |
| `/bookable-persons`, `/bookable-resources` | Organizer-managed inventory | `modules/bookable-inventory.md` |
| `/appointment-types` | Organizer-managed services | `modules/appointment-types.md` |
| `/public/appointment-types` | Customer-facing discovery + availability | `modules/appointment-types.md`, `modules/booking-flow.md` |
| `/slot-locks` | Customer-side checkout holds | `modules/booking-flow.md` |
| `/appointments` | Customer-facing appointment lifecycle | `modules/booking-flow.md` |
| `/payments`, `/webhooks/razorpay` | Razorpay flow | `modules/payments.md` |

## Where the contract lives in code

When in doubt, open the file. The agent docs are derived from these files
and may lag if the backend changes:

* Controllers: `server/src/<feature>/*.controller.ts`
* DTOs (request bodies + queries): `server/src/<feature>/dto/*.ts`
* Prisma schema: `server/prisma/schema.prisma`
* Cookie + JWT setup: `server/src/utils/cookies.ts`,
  `server/src/auth/strategies/jwt.strategy.ts`
* Global guards / throttle config: `server/src/app.module.ts`
* Swagger setup: `server/src/swagger.ts`
