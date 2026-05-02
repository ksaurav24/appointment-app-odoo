# Admin (`/admin/*`)

All endpoints require `@Roles(Role.ADMIN)` and the access cookie. Most
write operations also emit an `AuditLog` row (see `04-data-models.md`).

Source files:

* `server/src/admin/admin.controller.ts`
* `server/src/admin/admin-organizations.controller.ts`
* `server/src/admin/admin-users.controller.ts`
* `server/src/admin/admin-appointments.controller.ts`
* `server/src/admin/admin-audit-logs.controller.ts`
* `server/src/admin/dto/`

For admin **analytics**, see `modules/analytics.md`.

---

## Health

### GET `/admin/ping`

Cheap auth check.

**Response 200:** `{ "ok": true, "sub": "<admin user id>" }`

---

## Organization moderation (`/admin/organizations`)

### GET `/admin/organizations`

**Query:**

| Param | Values | Default |
|-------|--------|---------|
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` \| `ALL` (case-insensitive) | `APPROVED` |

**Response 200:** array of `Organization & { organiser: SafeUser }`.

**Errors:** 400 `"status must be one of PENDING, APPROVED, REJECTED, ALL"`.

### GET `/admin/organizations/pending`

Convenience endpoint — equivalent to `?status=PENDING` above.

**Response 200:** array of `Organization & { organiser: SafeUser }`.

### POST `/admin/organizations/:organizationId/approve`

No body. **Response 200:** updated `Organization`.

Sets `approvalStatus = APPROVED`, `approvedAt = now()`,
`approvedById = <admin>`. Audit action: `organization.approve`.

**Errors:** 404 `"Organization not found"`.

### POST `/admin/organizations/:organizationId/reject`

**Body** (`RejectOrganizationDto`, optional):

| Field | Type | Validators |
|-------|------|-----------|
| `reason` | string | `@MaxLength(1000)` |

Sets `approvalStatus = REJECTED`, `rejectedAt`, `rejectedReason`. Audit
action: `organization.reject`.

**Response 200:** updated `Organization`. **Errors:** 404 if not found.

### PATCH `/admin/organizations/:organizationId/activate`

No body. Sets `isActive = true`. Audit: `organization.activate`.

`organizationId` validated as UUID; 400 if malformed.

### PATCH `/admin/organizations/:organizationId/deactivate`

No body. Sets `isActive = false`. Existing appointments are **not**
auto-cancelled — handle that in UX. Audit: `organization.deactivate`.

---

## User moderation (`/admin/users`)

### GET `/admin/users`

**Query** (`ListUsersQuery`):

| Param | Type | Validators / behavior |
|-------|------|----------------------|
| `role` | `Role` enum | `@IsEnum(Role)` |
| `isActive` | boolean | `@Transform(toBool)` accepts `true`/`false` |
| `emailVerified` | boolean | same |
| `q` | string | `@MaxLength(120)` — case-insensitive search across `email` and `fullName` |
| `from` | ISO 8601 | `@IsISO8601()` — filter `createdAt >= from` |
| `to` | ISO 8601 | `@IsISO8601()` — filter `createdAt <= to` |
| `skip` | int ≥ 0 | default `0` |
| `take` | int 1..100 | default `20` |

**Response 200:**

```ts
{ items: SafeUser[], total: number, skip: number, take: number }
```

### GET `/admin/users/:userId`

`userId` validated as UUID.

**Response 200:** `AdminUserDetail` =

```ts
SafeUser & {
  organization: { id: string; name: string; slug: string; isActive: boolean } | null
}
```

**Errors:** 404 `"User not found"`.

### PATCH `/admin/users/:userId/activate`

No body. Sets `isActive = true`.

**Response 200:** `SafeUser`. Audit action: `user.activated`.

**Errors:**

* 403 `"Admins cannot deactivate themselves"` (also raised on activate when
  the target is self in inverted state — be safe and don't call this on
  your own ID).
* 404 `"User not found"`.

### PATCH `/admin/users/:userId/deactivate`

No body. Sets `isActive = false` **and revokes all refresh tokens** for
the user (kicks them out of any active session).

**Response 200:** `SafeUser`. Audit: `user.deactivated`.

**Errors:** 403 `"Admins cannot deactivate themselves"`, 404 `"User not found"`.

### PATCH `/admin/users/:userId/role`

**Body** (`ChangeRoleDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `role` | `Role` enum | `@IsEnum(Role)` (`ADMIN` \| `ORGANIZER` \| `CUSTOMER`) |
| `reason` | string | `@MaxLength(500)` (recorded in audit metadata) |

**Side effects:** revokes all refresh tokens (the JWT carries the role,
so the user must re-login to pick up the change).

**Response 200:** `SafeUser`. Audit: `user.role_changed`.

**Errors:**

* 403 `"Admins cannot change their own role"`.
* 403 `"Cannot change role: user owns an active organisation. Deactivate the organisation first."`
* 404 `"User not found"`.

---

## Appointment moderation (`/admin/appointments`)

### GET `/admin/appointments`

Cross-org appointment listing for support / moderation.

**Query** (`ListAdminAppointmentsQuery`):

| Param | Type | Notes |
|-------|------|-------|
| `organizationId` | UUID | filter to one org |
| `customerId` | UUID | filter to one customer |
| `appointmentTypeId` | string | numeric BigInt as string |
| `status` | `AppointmentStatus` | enum |
| `from` | ISO 8601 | `startTime >= from` |
| `to` | ISO 8601 | `startTime <= to` |
| `upcomingOnly` | boolean | `startTime >= now()` if `true` |
| `skip` | int | default `0`, min `0` |
| `take` | int | default `20`, max `100` |

**Response 200:**

```ts
{
  items: Array<Appointment & {
    appointmentType: { id; name; slug },
    customer: { id; email; fullName },
    organization: { id; name; slug },
    bookablePerson: { id; name } | null,
    bookableResource: { id; name } | null,
  }>;
  total: number;
  skip: number;
  take: number;
}
```

(Field types in `04-data-models.md`.)

---

## Audit logs (`/admin/audit-logs`)

### GET `/admin/audit-logs`

**Query** (`ListAuditLogsQuery`):

| Param | Type | Notes |
|-------|------|-------|
| `actorId` | UUID | who did it |
| `actorRole` | `Role` enum | |
| `action` | string | `@MaxLength(120)` — e.g. `"organization.approve"` |
| `entityType` | string | `@MaxLength(60)` — e.g. `"organization"` |
| `entityId` | string | `@MaxLength(120)` |
| `from` | ISO 8601 | `createdAt >= from` |
| `to` | ISO 8601 | `createdAt <= to` |
| `skip` | int | default `0` |
| `take` | int | default `20`, max `100` |

**Response 200:**

```ts
{
  items: AuditLog[];   // includes embedded actor SafeUser when known
  total: number;
  skip: number;
  take: number;
}
```

`AuditLog` shape and known `action` values are in `04-data-models.md`.
