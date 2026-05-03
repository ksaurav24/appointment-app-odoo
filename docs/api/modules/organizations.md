# Organizations (`/organizations/me`)

The organizer-tenant is the unit of multi-tenancy. Every organizer owns
exactly one organization (1:1 via `Organization.organiserId`). Admin-side
moderation is in `modules/admin.md`. Analytics are in
`modules/analytics.md`. Appointment management for the org is in
`modules/booking-flow.md` (organizer endpoints section).

## GET `/organizations/me`

Returns the organization owned by the authenticated organizer.

* **Auth:** JWT cookie, `@Roles(Role.ORGANIZER)`.
* **Annotated** `@SkipOrganizationApproval()` — works even when the org
  is `PENDING` or `REJECTED` so that the organizer can read their status.

**Response 200:** `Organization` (see `04-data-models.md`).

The fields you'll most often act on for the frontend:

* `approvalStatus` — `PENDING` / `APPROVED` / `REJECTED`. Drive a
  banner: pending message, success path, or rejection page that shows
  `rejectedReason`.
* `isActive` — admins can deactivate an org without deleting it.
  Treat `isActive: false` like a hard stop on the organizer dashboard.
* `timezone` — IANA string. Use this to format times in the organizer UI.

**Errors:**

* 403 `"Only organizers have an organization"` — caller is ADMIN or CUSTOMER.
* 404 `"No organization found for this organizer"` — extremely rare,
  data inconsistency.

## What's *not* here

There is **no** `PATCH /organizations/me` to edit the org profile yet.
The only way to mutate organization rows currently is via admin endpoints
(`/admin/organizations/:id/(approve|reject|activate|deactivate)`). If
the frontend needs an "edit org" form, that endpoint must be built
backend-side first.

Organization registration happens implicitly via
`POST /auth/register` with an `organization` block — see `modules/auth.md`.
