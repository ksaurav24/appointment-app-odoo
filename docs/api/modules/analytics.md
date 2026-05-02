# Analytics

Two controllers, one for admins (platform-wide) and one for organizers
(scoped to their own org).

* `server/src/analytics/analytics-admin.controller.ts` — `/admin/analytics/*`
* `server/src/analytics/analytics-organiser.controller.ts` — `/organizations/me/analytics/*`

Responses are server-side cached (5 minutes for admin, 1 minute for
organizer) so polling at sub-minute intervals is wasted effort.

Time-series and metric enum values are listed in `03-enums.md`.

---

## Admin (`/admin/analytics/*`)

`@Roles(Role.ADMIN)`.

### GET `/admin/analytics/dashboard`

Single-shot KPI block.

**Response 200** (`AdminDashboard`):

```ts
{
  users: {
    total: number;
    byRole: { ADMIN: number; ORGANIZER: number; CUSTOMER: number };
    activeTotal: number;
  };
  organizations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    active: number;
  };
  appointments: {
    allTime: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  revenue: {
    currency: string;     // e.g. "INR"
    thisMonth: string;    // Decimal as string
    allTime: string;
  };
  generatedAt: string;    // ISO 8601
}
```

### GET `/admin/analytics/timeseries`

**Query** (`AdminTimeseriesQuery`):

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `metric` | `appointments` \| `revenue` \| `signups` | yes | |
| `granularity` | `day` \| `week` \| `month` | no, default `day` | |
| `from` | ISO 8601 | no | default: 30 days ago |
| `to` | ISO 8601 | no | default: now |

**Response 200:** `TimeBucket[]` =

```ts
Array<{ bucket: string /* ISO 8601 start of bucket */; value: number }>
```

* `appointments`: count of appointments created in the bucket.
* `revenue`: sum of `amount` for `Payment.status === PAID` created in
  the bucket; serialized as a number.
* `signups`: count of users created in the bucket.

### GET `/admin/analytics/top-organizations`

**Query:**

| Param | Values | Default |
|-------|--------|---------|
| `metric` | `bookings` \| `revenue` | `bookings` |
| `limit` | integer 1..100 | `10` |

**Response 200:**

```ts
Array<{
  organizationId: string;  // UUID
  name: string;
  slug: string;
  value: number;           // booking count or sum-of-amounts
}>
```

**Errors:** 400 `"metric must be bookings or revenue"`,
`"limit must be between 1 and 100"`.

---

## Organizer (`/organizations/me/analytics/*`)

`@Roles(Role.ORGANIZER)` plus the org-approved guard. Caller's
organization is auto-resolved server-side from their JWT.

### GET `/organizations/me/analytics/dashboard`

**Response 200** (`OrgDashboard`):

```ts
{
  organizationId: string;  // UUID
  bookings: {
    total: number;
    upcoming: number;     // CONFIRMED or PENDING with startTime >= now
    completed: number;
    cancelled: number;
    pending: number;
  };
  cancellationRatePct: number;   // (cancelled / total) * 100, 1 decimal
  revenue: {
    currency: string;
    thisMonth: string;    // Decimal as string
    allTime: string;
  };
  averagePerDayLast30: number;   // 2 decimals
  generatedAt: string;
}
```

**Errors:** 403 (org not approved), 404 (no org found).

### GET `/organizations/me/analytics/timeseries`

**Query** (`OrgTimeseriesQuery`):

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `metric` | `bookings` \| `revenue` \| `cancellations` | yes | |
| `granularity` | `day` \| `week` \| `month` | no, default `day` | |
| `from` | ISO 8601 | no | default: 30 days ago |
| `to` | ISO 8601 | no | default: now |

**Response 200:** `TimeBucket[]` (same shape as admin time-series).

* `bookings`: count of appointments created in the bucket for this org.
* `revenue`: sum of `Payment.amount` (PAID) created in the bucket for this org.
* `cancellations`: count of appointments where `status = CANCELLED`
  and `cancelledAt` is in the bucket for this org.

### GET `/organizations/me/analytics/by-appointment-type`

No query params.

**Response 200:**

```ts
Array<{
  appointmentTypeId: string;  // UUID
  name: string;
  bookings: number;
  revenue: number;            // sum of PAID payments
}>
```

### GET `/organizations/me/analytics/busy-hours`

No query params. Last 90 days of non-cancelled appointments.

**Response 200:**

```ts
{
  since: string;        // ISO 8601 — 90 days ago
  matrix: number[][];   // [dayOfWeek][hour] → count, 7×24
                        // dayOfWeek: 0=Sun..6=Sat
                        // hour: 0..23 (24-hour)
}
```

Use directly to render a heatmap (rows = days, columns = hours).
