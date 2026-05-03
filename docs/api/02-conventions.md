# 02 — Conventions: errors, throttling, pagination, dates

## Error response shape

The backend uses NestJS's default exception filter (no custom global
filter). Two shapes you will encounter:

### Plain HTTP exceptions

```json
{
  "statusCode": 404,
  "message": "Appointment type not found",
  "error": "Not Found"
}
```

`message` is a string. `error` is the standard reason phrase.

### Validation errors (from `ValidationPipe`)

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "error": "Bad Request"
}
```

`message` is an **array of strings**, one per failed validator. Frontend
should detect `Array.isArray(message)` to display a list of field-level
errors.

### Status code reference

| Code | When it happens |
|------|-----------------|
| 200 | Successful GET, idempotent POST/PATCH, explicit `@HttpCode(HttpStatus.OK)` |
| 201 | Successful create (POST) — most resource-creating endpoints |
| 204 | Successful delete with no body (e.g. `DELETE /appointment-types/:id`) |
| 400 | Validation error, malformed input, business-rule violation that's caller's fault |
| 401 | Missing/invalid JWT |
| 403 | Authenticated but insufficient role / unapproved org / forbidden state |
| 404 | Resource not found, or scoped-out (e.g. another org's appointment) |
| 409 | Conflict — duplicate slug, stale slot lock, capacity exhausted, illegal status transition |
| 429 | Throttler limit exceeded |

## Throttling

Configured globally in `server/src/app.module.ts:33-46`. Rate limits are
per IP per route group.

| Throttler | Limit | Window | Routes that opt in |
|-----------|-------|--------|--------------------|
| `default` | 120 | 60 s | All routes (unless overridden) |
| `login` | 5 | 15 min | `POST /auth/login`, `POST /auth/login/2fa` |
| `register` | 3 | 1 hr | `POST /auth/register` |
| `otpSend` | 5 | 1 hr | `POST /auth/resend-otp` |
| `otpSubmit` | 10 | 10 min | `POST /auth/verify-email` |
| `passwordReset` | 3 | 1 hr | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| `refresh` | 30 | 60 s | `POST /auth/refresh` |
| `cancel` | 10 | 10 min | Customer cancellation |
| `reschedule` | 10 | 10 min | Customer reschedule |
| `paymentIntent` | 5 | 10 min | `POST /payments/intent` |
| `paymentVerify` | 10 | 10 min | `POST /payments/verify` |

When throttled the server returns **429** with the standard NestJS
`ThrottlerException` body. Show the user a "try again later" message —
back off, don't retry immediately.

## Pagination

The shared shape lives in `server/src/common/dto/pagination.query.ts`.
Endpoints that paginate accept these query params:

| Param | Type | Default | Min | Max |
|-------|------|---------|-----|-----|
| `skip` | integer | `0` | `0` | — |
| `take` | integer | `20` | `1` | `100` |

The response is:

```ts
type PaginatedResult<T> = {
  items: T[];
  total: number;   // total matching rows, not just this page
  skip: number;    // echoed
  take: number;    // echoed
};
```

Compute total pages with `Math.ceil(total / take)`.

## Dates and times

* All datetimes returned by the API are **ISO 8601 strings in UTC**
  (e.g. `"2026-05-15T09:00:00.000Z"`).
* Datetimes accepted in request bodies must also be ISO 8601. Validators
  use `@IsISO8601()` or `@IsDateString()`.
* For pure-date filters (e.g. availability lookup), use `YYYY-MM-DD`
  in the **schedule's timezone** — see `modules/booking-flow.md`.
* For schedule rules, `startTime` and `endTime` are **wall-clock**
  strings in `HH:MM` 24-hour format. Regex enforced:
  `/^([01]\d|2[0-3]):[0-5]\d$/`.

## IDs

| Entity | Type in JSON | Format |
|--------|-------------|--------|
| User | `string` | UUID v7 |
| Organization | `string` | UUID v7 |
| BookablePerson | `string` | UUID v7 |
| BookableResource | `string` | UUID v7 |
| AppointmentType | `string` | UUID v7 |
| AppointmentTypeEntity | `string` | numeric BigInt encoded as a string |
| Schedule, ScheduleRule, BookingQuestion | `string` | numeric BigInt encoded as a string |
| Appointment | `string` (`publicId`) | cuid (e.g. `"clx9k2..."`) — the API only ever exposes `publicId`, never the internal numeric `id` |
| Payment | `string` (`publicId`) | cuid |
| AuditLog, Notification | `string` | numeric BigInt encoded as a string |
| SlotLock | `string` | numeric BigInt encoded as a string |
| OTP, RefreshToken, PasswordReset | not exposed | — |

> **Why BigInt as string?** `server/src/main.ts:12` patches
> `BigInt.prototype.toJSON` so `JSON.stringify` emits the value as a
> decimal string instead of throwing. Treat these as opaque strings on
> the frontend; do not parse to `Number` (overflow risk past 2^53).

## Booleans in query params

Several controllers accept query params like `includeInactive`,
`upcomingOnly`, `published` as booleans. They're transformed via
`@Transform(toBool)` so both `?upcomingOnly=true` and `?upcomingOnly=1`
work; the safest is `=true` / `=false`. Omitting the param is **not**
the same as `=false` — for filters, omitted means "don't filter on this
field"; for flags like `includeInactive` the docs note the default.

## Slug rules

Where a slug is part of a URL or DTO (organizations, appointment types):

* Regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
* Lowercase letters, digits, single hyphens between segments.
* No leading or trailing hyphens, no consecutive hyphens.
* Validation message: `"... must be lowercase letters, numbers and hyphens (e.g. acme-clinic)"`.
* Uniqueness scope is documented per endpoint (organization slugs are
  globally unique; appointment type slugs are unique within an org).

## CORS and credentials reminder

Every authenticated request must opt into sending cookies:

```js
fetch('/auth/me', { credentials: 'include' });        // browser fetch
axios.get('/auth/me', { withCredentials: true });     // axios
```

Without that, the browser silently strips the `Cookie` header and you
get 401s with no useful client-side error.
