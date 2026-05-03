# 01 — Authentication, cookies, and guards

## TL;DR for the frontend

1. Use cookie-based auth. After login, the server sets two cookies; the
   browser sends them automatically on subsequent requests.
2. Always pass `credentials: 'include'` (`fetch`) or
   `withCredentials: true` (`axios`). Without this, the browser drops the
   cookies and every authenticated request returns **401**.
3. Access token expires fast (default 15 minutes). When you get a 401 on
   a previously-working endpoint, call `POST /auth/refresh` and retry.
4. To log out, call `POST /auth/logout` (clears cookies on this device)
   or `POST /auth/logout-all` (revokes every refresh token for the user).

## Cookies

Defined in `server/src/utils/cookies.ts` and set by `auth.controller.ts`
on login, 2FA verification, and refresh. Cleared on logout / change-password.

| Cookie | Name | `httpOnly` | `secure` | `sameSite` | `path` | TTL |
|--------|------|-----------|----------|-----------|--------|-----|
| Access token | `access_token` | yes | `true` in prod, `false` in dev | `lax` | `/` | `JWT_ACCESS_TTL` (default `15m`) |
| Refresh token | `refresh_token` | yes | `true` in prod, `false` in dev | `strict` | `/auth` | `JWT_REFRESH_TTL_DAYS` × 24h (default 30 days) |

Both cookies use `domain = COOKIE_DOMAIN`. Cookies are not readable from
JavaScript (`httpOnly`); never try to parse them client-side.

The refresh cookie is **only sent to `/auth/*`** because of its `path`
attribute. That's deliberate: refresh requests are rare and carrying the
refresh token on every API call is unnecessary attack surface.

### Bearer fallback

`JwtStrategy` (`server/src/auth/strategies/jwt.strategy.ts:19`) accepts the
JWT from either the cookie **or** the `Authorization: Bearer <jwt>` header.
The cookie is preferred — the bearer fallback is mostly for tooling and
mobile clients that can't use the same cookie jar.

## JWT payload

After authentication, `req.user` is populated with this shape (also what
`@CurrentUser()` returns):

```ts
type JwtUserPayload = {
  sub: string;      // user UUID
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
};
```

Do not rely on additional claims — the server only signs these three.

## Roles

Defined in `Role` enum (Prisma):

* `ADMIN` — platform staff. Has full visibility.
* `ORGANIZER` — owns exactly one organization. Most organizer endpoints
  require the organization to be `APPROVED`.
* `CUSTOMER` — books appointments.

A user's role is set at registration: `ORGANIZER` if the registration
payload includes an `organization` block, otherwise `CUSTOMER`.

Role changes are admin-only and revoke all of the user's refresh tokens
(see `modules/admin.md`).

## Global guards (in order)

Registered in `server/src/app.module.ts` and applied to every route:

1. **`ThrottlerGuard`** — per-route rate limits (see `02-conventions.md`).
2. **`JwtAuthGuard`** — validates JWT from cookie or `Authorization`
   header. Skipped on routes annotated with `@Public()`.
3. **`RolesGuard`** — enforces `@Roles(...)` if present on the route or
   controller. Skipped on `@Public()` routes.
4. **`OrganizationApprovedGuard`** — for ORGANIZER users only, blocks the
   request if their organization is not `APPROVED`. Skipped on
   `@Public()` routes and routes annotated with `@SkipOrganizationApproval()`.

If you see `403 Forbidden` with message `"Organization is not approved"`
or `"No organization found for this organizer"`, the request hit guard
4 — your org is still `PENDING` or has been `REJECTED`.

## Failure responses

| Cause | Status | Body |
|-------|--------|------|
| No JWT / invalid JWT on a non-public route | 401 | `{ "statusCode": 401, "message": "Unauthorized" }` |
| Authenticated but role mismatch | 403 | `{ "statusCode": 403, "message": "Insufficient role" }` |
| Organizer's org not APPROVED | 403 | `{ "statusCode": 403, "message": "Organization is not approved" }` |
| Throttled | 429 | `{ "statusCode": 429, "message": "ThrottlerException: Too Many Requests" }` |

The exact message strings come from NestJS / our throws and are stable —
fine to switch on if needed.

## Refresh flow

```
GET /api/...                        → 401 Unauthorized   (access expired)
POST /auth/refresh   (no body)      → 200, sets new access + refresh cookies
GET /api/...                        → 200
```

`/auth/refresh` is throttled at **30 / minute** per IP, so only call it on
demand, not on a fixed timer.

The server **rotates** the refresh token on every refresh: the old one is
marked revoked and a new one with the same `familyId` is issued. If the
server later sees a request with an already-revoked refresh token from a
family, it interprets it as theft and revokes the entire family
(message: `"Refresh token reuse detected"`). Don't try to be clever about
caching old refresh cookies.

## Account state and gates

* `emailVerified: false` blocks login (`403 "Email not verified"`).
  Customer flow: register → verify email via `/auth/verify-email` → log in.
* `isActive: false` blocks login (`403 "Account is disabled"`) and
  invalidates active refresh tokens.
* For organizers, the org-approval gate is separate from the email/active
  gates and only applies to organizer-only endpoints.

## What returning a `SafeUser` means

Several endpoints return a "safe" user — the User row with the
`passwordHash` field stripped. Shape:

```ts
type SafeUser = {
  id: string;            // UUID
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
};
```

Use this whenever the docs say "returns `SafeUser`".
