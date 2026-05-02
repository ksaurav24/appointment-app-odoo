# Auth (`/auth/*`)

Source: `server/src/auth/auth.controller.ts` and `server/src/auth/dto/`.

Read `01-auth-and-cookies.md` first if you haven't — it explains what the
two cookies are and the JWT payload.

> **Throttling:** every endpoint is rate-limited (see `02-conventions.md`).
> Don't retry on 429.

## Endpoints

| Method | Path | Auth | Throttler |
|--------|------|------|-----------|
| POST | `/auth/register` | public | `register` |
| POST | `/auth/verify-email` | public | `otpSubmit` |
| POST | `/auth/resend-otp` | public | `otpSend` |
| POST | `/auth/login` | public | `login` |
| POST | `/auth/login/2fa` | public | `login` |
| POST | `/auth/refresh` | reads `refresh_token` cookie | `refresh` |
| POST | `/auth/logout` | requires JWT | `default` |
| POST | `/auth/logout-all` | requires JWT | `default` |
| GET | `/auth/me` | requires JWT | `default` |
| POST | `/auth/forgot-password` | public | `passwordReset` |
| POST | `/auth/reset-password` | public | `passwordReset` |
| POST | `/auth/change-password` | requires JWT | `default` |
| POST | `/auth/2fa/enable` | requires JWT | `default` |
| POST | `/auth/2fa/disable` | requires JWT | `default` |

---

## POST `/auth/register`

Creates a user; if `organization` is supplied, the user becomes the
organizer for that org and the org is created in `PENDING` state.

**Body** (`RegisterDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `email` | string | `@IsEmail()` | yes |
| `password` | string | `@IsString()`, `@MinLength(8)`, `@MaxLength(72)` | yes |
| `fullName` | string | `@IsString()`, `@MinLength(1)`, `@MaxLength(120)` | yes |
| `organization` | object | `@ValidateNested()` | no |

**`organization`** (`RegisterOrganizationDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `name` | string | `@MinLength(2)`, `@MaxLength(120)` | yes |
| `slug` | string | `@MinLength(3)`, `@MaxLength(60)`, slug regex (see `02-conventions.md`) | yes |
| `contactEmail` | string | `@IsEmail()` | yes |
| `description` | string | `@MaxLength(2000)` | no |
| `contactPhone` | string | `@MaxLength(40)` | no |
| `address` | string | `@MaxLength(500)` | no |
| `timezone` | string (IANA) | `@MaxLength(64)` | no |

**Response 201:**

```jsonc
// without organization
{ "userId": "<uuid>", "message": "Account created — check your email for a verification code." }

// with organization
{ "userId": "<uuid>", "organizationId": "<uuid>",
  "message": "Account created — verify your email, then wait for admin approval before managing your organization." }
```

**Side effects:** issues a `SIGNUP` OTP (10 min TTL) and emails it.
Cookies are **not** set yet — the caller must verify email and then log in.

**Errors:**

* 409 Conflict — `"Email is already registered"`
* 409 Conflict — `"Organization slug is already taken"`

---

## POST `/auth/verify-email`

**Body** (`VerifyEmailDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `email` | string | `@IsEmail()` |
| `code` | string | `@Length(6, 6)` (six digits) |

**Response 200:** `{ "message": "Email verified." }` (idempotent — also
returns success if already verified).

**Errors:** 400 `"Invalid or expired code"`.

---

## POST `/auth/resend-otp`

**Body** (`ResendOtpDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `email` | string | `@IsEmail()` |
| `purpose` | enum | `@IsEnum(OtpPurpose)` — `SIGNUP` \| `LOGIN` \| `PASSWORD_RESET` |

**Response 200:** `{ "message": "If an account exists, a code has been sent." }`

Always returns 200 to prevent enumeration. OTP TTLs by purpose:

* `SIGNUP` — 10 min
* `LOGIN` — 2 min
* `PASSWORD_RESET` — 5 min

---

## POST `/auth/login`

**Body** (`LoginDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `email` | string | `@IsEmail()` |
| `password` | string | `@MinLength(8)` |

**Response 200 — when 2FA NOT enabled:**

```jsonc
{ "user": SafeUser }   // see 01-auth-and-cookies.md
```

Sets cookies `access_token` and `refresh_token`.

**Response 200 — when 2FA enabled:**

```jsonc
{ "twoFactorRequired": true }
```

A `LOGIN`-purpose OTP is emailed. **No cookies are set.** Caller must
follow up with `POST /auth/login/2fa`.

**Errors:**

* 401 `"Invalid credentials"`
* 403 `"Email not verified"`
* 403 `"Account is disabled"`

---

## POST `/auth/login/2fa`

**Body** (`VerifyTwoFactorDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `email` | string | `@IsEmail()` |
| `code` | string | `@Length(6, 6)` |

**Response 200:** `{ "user": SafeUser }`. Sets both auth cookies.

**Errors:** 401 `"Invalid or expired code"`.

---

## POST `/auth/refresh`

No body. Reads the `refresh_token` cookie (only sent automatically on
`/auth/*` because of cookie path).

**Response 200:** `{ "message": "Refreshed." }`. Sets new
`access_token` and `refresh_token` cookies. The old refresh token is
revoked.

**Errors:**

* 401 `"Missing refresh token"`
* 401 `"Invalid refresh token"`
* 401 `"Refresh token reuse detected"` — the entire token family is
  revoked. Force a full re-login.
* 401 `"Refresh token expired"`
* 401 `"Account disabled"`

---

## POST `/auth/logout`

Requires JWT. Annotated with `@SkipOrganizationApproval()` so unapproved
organizers can still log out.

**Response 200:** `{ "message": "Logged out." }`. Clears both cookies.
Revokes the presented refresh token.

---

## POST `/auth/logout-all`

Requires JWT.

**Response 200:** `{ "message": "Logged out everywhere." }`. Revokes
**all** refresh tokens for the user. Clears cookies on this device.

---

## GET `/auth/me`

Requires JWT.

**Response 200:** `SafeUser` (see `01-auth-and-cookies.md`).

**Errors:** 404 `"User not found"` (e.g. user was deleted but JWT not yet expired).

---

## POST `/auth/forgot-password`

**Body** (`ForgotPasswordDto`): `{ "email": string }` (`@IsEmail()`).

**Response 200:** `{ "message": "If an account exists for this email, a reset link has been sent." }`

The reset email contains a link of the form
`${APP_BASE_URL}/reset-password?token=<token>`. The frontend must host
that route and forward `token` to the next endpoint.

---

## POST `/auth/reset-password`

**Body** (`ResetPasswordDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `token` | string | `@MinLength(20)`, `@MaxLength(200)` |
| `newPassword` | string | `@MinLength(8)`, `@MaxLength(72)` |

**Response 200:** `{ "message": "Password reset. Please log in." }`

**Side effects:** revokes **all** refresh tokens for the user.

**Errors:** 400 `"Invalid or expired reset token"`.

---

## POST `/auth/change-password`

Requires JWT.

**Body** (`ChangePasswordDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `currentPassword` | string | `@IsString()` |
| `newPassword` | string | `@MinLength(8)`, `@MaxLength(72)` |

**Response 200:** `{ "message": "Password changed. Please log in again." }`

**Side effects:** revokes all refresh tokens, clears cookies on this
device.

**Errors:** 401 `"Current password is incorrect"`.

---

## POST `/auth/2fa/enable`

Requires JWT, no body.

**Response 200:** `{ "message": "Two-factor authentication enabled." }`

**Errors:** 403 `"Email must be verified before enabling 2FA"`.

Does **not** revoke the current session.

---

## POST `/auth/2fa/disable`

Requires JWT.

**Body** (`DisableTwoFactorDto`): `{ "currentPassword": string }`.

**Response 200:** `{ "message": "Two-factor authentication disabled." }`

**Errors:** 401 `"Current password is incorrect"`.

---

## Common flows

### Customer signup → first booking

```
POST /auth/register                  → 201 { userId, message }
POST /auth/verify-email              → 200 { message }
POST /auth/login                     → 200 { user } + cookies
… now any CUSTOMER endpoint works …
```

### Organizer signup → first booking

```
POST /auth/register (with organization)  → 201 { userId, organizationId, message: "...wait for admin approval..." }
POST /auth/verify-email                  → 200
POST /auth/login                         → 200 + cookies
GET /organizations/me                    → 200, but approvalStatus: "PENDING"
… organizer endpoints (create bookable persons, etc.) return 403 until admin approves …
```

`@SkipOrganizationApproval()` is on `GET /organizations/me`,
`POST /auth/logout`, etc., so those still work.

### Login with 2FA

```
POST /auth/login                  → 200 { twoFactorRequired: true }   (no cookies)
POST /auth/login/2fa              → 200 { user } + cookies
```

### Forgot-password

```
POST /auth/forgot-password        → 200 message
… user clicks email link to /reset-password?token=… on the frontend …
POST /auth/reset-password         → 200 message
POST /auth/login                  → 200 + cookies
```
