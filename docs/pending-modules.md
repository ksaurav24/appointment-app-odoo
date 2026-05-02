# Pending Modules & Functionality

_Gap analysis: PRD v1.0 (Hackathon Spec, May 2026) vs. current implementation on `saurav-dev`._

This document lists everything the PRD calls for that is **not yet implemented** in the codebase, ranked by priority. Cross-references in parentheses point to the PRD sections that describe the requirement.

Priority legend:

- **P0 — Blocker for V1**: the booking platform cannot ship without it; a customer using it today would either be unable to complete a core flow or would experience a correctness/safety bug.
- **P1 — Required for V1**: feature is on the PRD's V1 surface area and the platform feels broken without it, but a small private demo could limp without it for a day.
- **P2 — Nice-to-have / Post-MVP**: explicitly in the PRD but acceptable to defer past the hackathon demo.

---

## Snapshot of what _is_ implemented

So the rest of the doc is grounded:

- Auth: signup (customer + organiser) with email OTP, login (with optional 2FA), refresh-token rotation, forgot/reset password, change password, logout/logout-all. (PRD §3 — done.)
- Organisations: organiser onboarding, admin approval workflow (`PENDING/APPROVED/REJECTED`), `GET /organizations/me`.
- Bookable persons & resources: full CRUD with soft/hard delete.
- Appointment types: full configuration surface — entities, weekly + flexible schedules, booking questions, capacity, manual confirmation, advance-payment flag, cancellation/reschedule policy fields, publish/unpublish, share token. Public discovery endpoints exist for published types.
- Availability engine: both **FIXED** and **VARIABLE** duration modes, AUTO/MANUAL assignment, timezone resolution, capacity-aware slot computation.
- Slot locks: 5-minute TTL with extend/release, capacity-aware acquisition, background cleanup.
- Appointments: create-from-lock with answer validation, organiser-side approve / reject / mark-completed / mark-no-show. `confirmationCode` and `publicId` are generated.
- Mailer: BullMQ-backed `mail` queue, templates for OTP (signup/login/reset), welcome, password reset, organiser approved/rejected.
- Prisma models exist for **every** table the PRD describes (including `Notification`, `Payment`, `AppointmentReschedule`, `AuditLog`).

The major gaps are all on the **post-confirmation** side of the booking lifecycle and on the **frontend**.

---

## P0 — Blockers for V1

### 1. Customer-initiated cancellation flow (PRD §7.1)

Schema, policy fields (`cancellationAllowed`, `cancellationWindowHours`, `cancellationReason`, `cancelledAt`) and status transitions exist, but there is **no customer endpoint** to cancel a confirmed/pending booking.

What's missing:

- `POST /appointments/:publicId/cancel` (customer-scoped) that:
  - Validates `status ∈ {PENDING, CONFIRMED}` and ownership.
  - Enforces `appointmentType.cancellationAllowed` and the `cancellationWindowHours` rule (`hoursUntilAppointment >= window`).
  - Sets `status = CANCELLED`, `cancelledAt`, `cancellationReason`.
  - Frees the slot (no DB row to delete — appointment row carries the cancel state — but availability queries already exclude `CANCELLED`).
  - Queues notifications (see §3 below) and, if a paid `Payment` exists, queues a refund (see §5).
- Audit log entry (actor = customer).

### 2. Reschedule flow (PRD §8)

`AppointmentReschedule` model exists and `appointments.rescheduleCount` is on the schema, but no controller/service uses them.

What's missing:

- `POST /appointments/:publicId/reschedule` (customer-scoped) that:
  - Validates `rescheduleAllowed`, `rescheduleCount < maxReschedulesAllowed`, and the `rescheduleWindowHours` rule.
  - Accepts a fresh `slotLockId` for the new time (entity must be unchanged in V1 per PRD §8.3).
  - Atomically: insert `AppointmentReschedule` row (with previous start/end + new start/end + actor + reason), update `startTime`/`endTime`/`durationMins`, increment `rescheduleCount`, release the slot lock.
- Organiser-initiated reschedule path (same handler with `actorRole = ORGANISER`, no policy gate, mandatory audit log) — PRD §7.2 implies the same override exists for cancellation.

### 3. Notification dispatch (PRD §9)

The `Notification` model and `NotificationType` enum cover every PRD-required event, and the mailer queue is wired — but **nothing writes `notifications` rows or fans events out to Customer / Bookable Person / Organiser recipients**. Today only the auth-related emails (OTP, password reset, welcome, organiser approval) are dispatched. None of the booking-lifecycle emails actually fire.

What's missing — a notification service that, on each event, (a) inserts `Notification` row(s) per recipient, (b) enqueues the channel job, (c) records `status` (`QUEUED → SENT/FAILED/BOUNCED`):

| Event                        | Recipients                                        | Channels       | PRD ref |
| ---------------------------- | ------------------------------------------------- | -------------- | ------- |
| Booking confirmed            | Customer, Bookable Person (if PERSON), Organiser  | Email + in-app | §6, §9  |
| Booking pending approval     | Customer, Organiser                               | Email + in-app | §9      |
| Booking approved / rejected  | Customer, Bookable Person (if PERSON)             | Email + in-app | §9      |
| Cancellation                 | Customer, Bookable Person (if PERSON), Organiser  | Email + in-app | §7, §9  |
| Reschedule                   | Customer, Bookable Person (if PERSON), Organiser  | Email + in-app | §8, §9  |

**Bookable-person email channel** is a hard requirement — the PRD (§2.2.1, §9.2) makes the point that email is the _only_ way these non-login users learn about a booking. Without this wired, every PERSON-type appointment is invisible to the actual provider.

The corresponding email templates also need to exist; today only auth/org-approval templates are present.

### 4. Frontend client (PRD §6, §10)

`client/` is an empty `.gitkeep`. The PRD's whole UX argument — sub-60-second booking, deferred login at slot pick, real-time availability without reload — exists only on paper. There is no signup screen, no organiser dashboard, no customer booking page.

For a hackathon demo this is the single largest unit of pending work. At minimum V1 needs:

- Public surface: home / discovery list, appointment-type detail, date+slot picker (fixed) and start-time + duration picker (variable), entity picker for MANUAL mode, login/signup widget that preserves the slot lock across auth.
- Customer surface: my-appointments list, appointment detail with cancel/reschedule actions.
- Organiser surface: onboarding org-creation gate, dashboard, bookable person/resource CRUD, appointment-type creation wizard (PRD §4.1 has 9 steps), inbox for pending bookings, bookings list with approve/reject/complete/no-show.
- Admin surface: organisations list with approve/reject, global users list, audit-log viewer.

This is P0 in aggregate but clearly multiple engineering weeks; treat each surface above as its own work-stream.

### 5. Payments (PRD §4.1 step 6, §6.1 step 8, §7.1 refund)

`Payment` model and `paymentStatus` field exist on the appointment, and `advancePaymentEnabled`/`advancePaymentAmount` exist on the appointment type, but no gateway integration, no charge endpoint, no webhook handler, and no refund path. The booking flow currently confirms regardless of whether payment succeeded.

What's missing:

- Gateway selection + SDK wiring (Stripe/Razorpay — not specified in PRD).
- `POST /appointments/:publicId/payment-intent` (or pre-confirm equivalent) that creates a `Payment` row in `PENDING` and returns a client-side payment session.
- Gateway webhook (`POST /webhooks/payments/:provider`) that flips `Payment.status` to `PAID` / `FAILED` and either confirms the held appointment or releases the lock.
- Booking confirmation must block on `paymentStatus = PAID` when `advancePaymentEnabled = true` (PRD §6.1 step 8). Today nothing enforces this.
- Refund queue triggered from cancellation flow (§7.1).

---

## P1 — Required for V1

### 6. Appointment reminder (PRD §9.1 — "Reminder (24h before)")

A scheduled job that, every N minutes, finds `CONFIRMED` appointments starting in ~24h that haven't been reminded yet, and sends a reminder email to the customer (and writes the `Notification` row). Needs a `reminderSentAt` field on `Appointment` (not currently in the schema) or an idempotency check via the `notifications` table.

### 7. Slot-lock ownership transfer at login (PRD §6.1 step 5–6, §6.2)

The PRD describes acquiring a slot lock _before_ login, against an anonymous session token, and then transferring lock ownership to the user once they authenticate. The current `POST /slot-locks` requires an authenticated customer (`customerId` is non-null on `SlotLock`). This breaks the PRD's "deferred login" UX claim — customers must sign up _before_ they can even hold a slot.

Two options to close this:

- Allow anonymous lock acquisition keyed by a session-cookie token; add a `claimLock(lockToken)` step at the end of login/signup that fills in `customerId`.
- Or accept the regression and call out in the PRD that login is required at slot-pick time. (Worse UX, but smaller change.)

### 8. Admin surface beyond organisation approval (PRD §2.1.1)

Admin endpoints currently cover only org approve/reject. The PRD lists more:

- View all users (filter by role, active state).
- Activate / deactivate any user or organisation.
- Promote / demote roles.
- Global dashboard counts (total users, total organisers, total appointments).
- View all bookings across every organisation.
- View platform-wide audit logs.

`AuditLog` model exists; no read endpoint exposes it.

### 9. Organiser-initiated cancellation (PRD §7.2)

Same handler as #1 above but with `actorRole = ORGANISER`, no policy-window gate, mandatory audit log entry, and a higher-priority customer notification including the reason. Listed separately because it is an explicit override path with different rules.

### 10. Token blacklist / JTI revocation (PRD §3.1.1)

The PRD specifies a `token_blacklist` table with `jti` entries checked by auth middleware to revoke access tokens before natural expiry. There is no `TokenBlacklist` model in Prisma and no middleware doing the check; access-token revocation today happens only implicitly via the 15-minute TTL. Logout currently revokes the refresh token only, so a leaked access token is valid for up to 15 minutes regardless. Acceptable for many systems but the PRD calls this out specifically.

### 11. Customer profile management

PRD §2.1.3 mentions "update personal profile details." There is no user-update endpoint (`UsersService` exposes setters but no controller). Also no "view my profile" endpoint beyond `/auth/me`.

### 12. Appointment-type lock once bookings exist (PRD §4.1 step 2)

PRD: "This selection [entityType] is locked once any bookings exist against the appointment type." `appointment-types.service` doesn't appear to enforce this — `PATCH /appointment-types/:id` should reject `entityType` changes when an `appointment` row references it. (Worth verifying in code; flagging as a likely gap.)

---

## P2 — Nice-to-have / Post-MVP

### 13. Organiser reports & insights (PRD §2.1.2)

Reporting endpoints — bookings by period, reschedule rate, no-show rate, revenue. No tables to add; aggregations over `appointments` and `payments`.

### 14. SMS / push notification channels

`NotificationChannel` enum already has `SMS` and `PUSH` placeholders; no providers integrated. PRD §13.1 explicitly tags SMS as "future."

### 15. Audit-log emission across the platform

`AuditLog` is referenced by the cancellation/reschedule flows (mandatory entry on organiser override, PRD §7.2). Currently, only organisation approve/reject writes audit rows. A pass to wire `AuditLog` writes for all sensitive mutations (login, password change, role change, manual confirmation, manual cancellation) is needed before exposing the admin audit-log viewer (#8).

### 16. Logo upload to object storage (PRD §3.3)

Organisation-creation form lists "logo (optional, uploaded to object storage)." No upload endpoint or storage adapter exists.

### 17. Public discovery search & filter (PRD §6.1 step 1)

`GET /public/appointment-types` returns a flat list of published types from approved orgs. No search query, category filter, or pagination beyond defaults.

### 18. Soft-deactivation cascade (PRD §2.1.2 — "deactivating an Organiser also takes their Organization offline")

Today the platform has `users.isActive` and `organizations.isActive` independently. There's no logic that, when an organiser is deactivated, hides their published appointment types from public discovery or notifies customers with active bookings. PRD calls this out as expected behaviour.

### 19. Rate-limiting on public availability

The auth routes have throttle decorators; the public availability and slot-lock endpoints do not. With public traffic this is the obvious next-target for abuse.

---

## Quick reference — coverage matrix

| Area                              | PRD §     | Status |
| --------------------------------- | --------- | ------ |
| Auth (signup/login/OTP/reset)     | §3        | ✅ Done |
| Token blacklist (jti revocation)  | §3.1.1    | ❌ P1  |
| Organiser onboarding              | §3.3      | ✅ Done |
| Admin org approval                | §2.1.1    | ✅ Done |
| Admin user mgmt / audit viewer    | §2.1.1    | ❌ P1  |
| Bookable persons / resources      | §2.2      | ✅ Done |
| Appointment-type config           | §4        | ✅ Done |
| `entityType` lock after bookings  | §4.1.2    | ❌ P1  |
| Availability — fixed              | §5.1      | ✅ Done |
| Availability — variable           | §5.2      | ✅ Done |
| Slot locks                        | §5.3      | ✅ Done |
| Anonymous slot lock + claim       | §6.1      | ❌ P1  |
| Booking confirmation              | §6.1      | ✅ Done |
| Customer cancellation             | §7.1      | ❌ P0  |
| Organiser cancellation override   | §7.2      | ❌ P1  |
| Reschedule flow                   | §8        | ❌ P0  |
| Notification dispatch (bookings)  | §9        | ❌ P0  |
| Bookable-person email             | §9.2      | ❌ P0  |
| 24h reminder                      | §9.1      | ❌ P1  |
| Payments (charge + refund)        | §4, §6, §7| ❌ P0  |
| Frontend (customer/organiser/admin)| §6, §10  | ❌ P0  |
| Customer profile update           | §2.1.3    | ❌ P1  |
| SMS / push                        | §13.1     | ❌ P2  |
| Reports & insights                | §2.1.2    | ❌ P2  |
| Logo upload                       | §3.3      | ❌ P2  |
| Discovery search/filter           | §6.1      | ❌ P2  |
| Deactivation cascade              | §2.1.2    | ❌ P2  |
| Public-route rate limiting        | (impl.)   | ❌ P2  |

---

## Suggested sequencing

If the priority is "make the demo end-to-end work," tackle in this order:

1. **Cancellation + reschedule endpoints** (P0 #1, #2). Small, self-contained, unblock the customer surface.
2. **Notification dispatch** (P0 #3). Without this, every booking is a black hole.
3. **Anonymous slot lock + login claim** (P1 #7). Closes a UX gap that the demo will trip over the moment a non-logged-in user tries to book.
4. **Payments** (P0 #5). Larger, but blocks any appointment type that has `advancePaymentEnabled`. If demo skips paid types, this can move.
5. **Frontend** (P0 #4). The biggest unit of work; start in parallel with the above.
6. P1 admin/audit/reminder/profile cleanup, then P2.
