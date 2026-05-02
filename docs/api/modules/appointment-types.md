# Appointment types

An **appointment type** is a configurable "what can be booked" — duration
mode, schedule, capacity, payment requirements, cancellation/reschedule
policy, and a public share token. There are two controllers:

* Organizer-facing (CRUD + lifecycle): `/appointment-types/*` — requires
  ORGANIZER, approved org.
* Customer-facing (read only): `/public/appointment-types/*` — `@Public()`.

Source: `server/src/appointment-types/`.

Response shape `AppointmentTypeWithRelations` is documented in
`04-data-models.md`. Enums (`EntityType`, `ScheduleType`, `DurationMode`,
`AssignmentMode`, `QuestionType`) are in `03-enums.md`.

---

## Organizer endpoints (`/appointment-types`)

`@Roles(Role.ORGANIZER)`, plus the org-approved guard.

### POST `/appointment-types` (201)

Creates a fully configured appointment type in one shot.

**Body** (`CreateAppointmentTypeDto`):

#### Identity

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `name` | string | `@MinLength(2)`, `@MaxLength(120)` | yes |
| `slug` | string | `@MinLength(3)`, `@MaxLength(80)`, slug regex (see `02-conventions.md`) | no — auto-generated from name |
| `description` | string | `@MaxLength(4000)` | no |

#### Inventory category & assignment

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `entityType` | `PERSON` \| `RESOURCE` | `@IsEnum(EntityType)` | yes |
| `assignmentMode` | `AUTO` \| `MANUAL` | `@IsEnum(AssignmentMode)` | yes |
| `entityIds` | string[] | `@ArrayMinSize(1)`, `@ArrayUnique()`, each is the BigInt-as-string id of an `AppointmentTypeEntity` candidate (see note below) | yes |

`assignmentMode = MANUAL` means the customer chooses the entity at
checkout (and must pass `entityId` to availability and to slot lock).
`AUTO` means the server picks one for them.

`entityIds` here are the IDs of `BookablePerson` (or `BookableResource`)
**rows**, but the server stores them in the join table — see how to
update them later via `PUT .../entities`.

#### Duration

| Field | Type | Validators | When required |
|-------|------|-----------|---------------|
| `durationMode` | `FIXED` \| `VARIABLE` | `@IsEnum(DurationMode)` | always |
| `durationMinutes` | integer | `@Min(1)` | when `FIXED` |
| `minDurationMins` | integer | `@Min(1)` | when `VARIABLE` |
| `maxDurationMins` | integer | `@Min(1)` | when `VARIABLE` |
| `durationStepMins` | integer | `@Min(1)` | when `VARIABLE` (controls customer-pickable durations) |

#### Schedule

| Field | Type | Validators |
|-------|------|-----------|
| `scheduleType` | `WEEKLY` \| `FLEXIBLE` | `@IsEnum(ScheduleType)` |
| `timezone` | string (IANA) | `@MaxLength(64)`, optional, defaults to org timezone |
| `scheduleRules` | `ScheduleRuleDto[]` | `@ArrayMinSize(1)`, `@ValidateNested()` (see below) |

#### Booking rules

| Field | Type | Validators | Default |
|-------|------|-----------|---------|
| `maxBookingsPerSlot` | integer | `@Min(1)` | `1` |
| `manageCapacity` | boolean | | `false` |
| `manualConfirmation` | boolean | | `false` — when `true`, every booking starts as `PENDING` until the organizer approves it |
| `advancePaymentEnabled` | boolean | | `false` |
| `advancePaymentAmount` | number | `@IsNumber({ maxDecimalPlaces: 2 })`, `@Min(0)`, required when `advancePaymentEnabled = true` | — |

#### Cancellation / reschedule policy

| Field | Type | Validators | Default |
|-------|------|-----------|---------|
| `cancellationAllowed` | boolean | | `true` |
| `cancellationWindowHours` | integer | `@Min(0)` | — |
| `rescheduleAllowed` | boolean | | `true` |
| `rescheduleWindowHours` | integer | `@Min(0)` | — |
| `maxReschedulesAllowed` | integer | `@Min(0)` | — |

#### Booking questions

| Field | Type | Validators |
|-------|------|-----------|
| `bookingQuestions` | `BookingQuestionDto[]` | optional, `@ValidateNested({ each: true })` |

(See `BookingQuestionDto` below.)

**Response 201:** `AppointmentTypeWithRelations`.

---

### `ScheduleRuleDto`

Used in both `CreateAppointmentTypeDto.scheduleRules` and
`SetScheduleDto.rules`.

| Field | Type | Validators | Required when |
|-------|------|-----------|---------------|
| `dayOfWeek` | integer 0..6 | `@Min(0)`, `@Max(6)`. `0` = Sunday, `6` = Saturday | for `WEEKLY` recurrence |
| `specificDate` | `YYYY-MM-DD` | `@IsDateString()` | for one-off / override |
| `startTime` | `HH:MM` | `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` | always |
| `endTime` | `HH:MM` | same regex | always |
| `isAvailable` | boolean | | optional, default `true` (set `false` to express a block-out) |

Mutually exclusive: provide **one of** `dayOfWeek` or `specificDate`.

---

### `BookingQuestionDto`

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `questionText` | string | `@MinLength(1)`, `@MaxLength(500)` | yes |
| `questionType` | `TEXT` \| `SINGLE_CHOICE` \| `MULTIPLE_CHOICE` \| `NUMBER` \| `DATE` | `@IsEnum(QuestionType)` | yes |
| `isRequired` | boolean | | optional, default `false` |
| `options` | string[] | `@ArrayMinSize(1)`, each `@MaxLength(200)` | required for `SINGLE_CHOICE` and `MULTIPLE_CHOICE` |
| `displayOrder` | integer | `@Min(0)` | optional, default `0` (lower first) |

---

### GET `/appointment-types`

**Query** (`ListAppointmentTypesQuery`):

| Param | Type | Behavior |
|-------|------|----------|
| `published` | boolean | omit → all; `true` → published only; `false` → unpublished only |

**Response 200:** `AppointmentType[]` (no relations expanded), ordered by
`createdAt DESC`.

### GET `/appointment-types/:id`

UUID. **Response 200:** `AppointmentTypeWithRelations`. 404 if not in
the caller's org.

### PATCH `/appointment-types/:id`

Updates *basics + policy*. Use the `PUT` endpoints below for entities,
schedule, and questions.

**Body** (`UpdateAppointmentTypeDto`): all fields optional, same shape
as the create-DTO subset above (excluding `entityIds`, `scheduleRules`,
`bookingQuestions`).

**Errors:** 409 if you try to change `entityType` or `durationMode`
after appointments have been booked.

### DELETE `/appointment-types/:id` (204)

**Errors:** 409 `"Appointment type has bookings; unpublish it instead of deleting"`.

### PUT `/appointment-types/:id/entities`

Replaces the inventory linked to this appointment type.

**Body** (`SetEntitiesDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `entityIds` | string[] | `@ArrayUnique()`, `@IsString({ each: true })`, `@MinLength(1, { each: true })` |

`entityIds` are UUIDs of `BookablePerson` or `BookableResource` rows that
match this appointment type's `entityType`.

**Response:** `AppointmentTypeWithRelations`.

### PUT `/appointment-types/:id/schedule`

Replaces the schedule + rules.

**Body** (`SetScheduleDto`):

| Field | Type | Validators |
|-------|------|-----------|
| `scheduleType` | `WEEKLY` \| `FLEXIBLE` | `@IsEnum(ScheduleType)` |
| `timezone` | string | optional, IANA |
| `rules` | `ScheduleRuleDto[]` | `@ArrayMinSize(1)`, `@ValidateNested()` |

**Response:** `AppointmentTypeWithRelations`.

### PUT `/appointment-types/:id/questions`

Replaces booking questions.

**Body** (`SetBookingQuestionsDto`):

| Field | Type |
|-------|------|
| `questions` | `BookingQuestionDto[]` |

**Response:** `AppointmentTypeWithRelations`.

### POST `/appointment-types/:id/publish` (200)

Sets `isPublished = true` and generates `shareToken` if missing.

**Pre-conditions:** at least one entity AND at least one schedule rule.
Otherwise:

* 400 `"Cannot publish: at least one entity must be assigned"`
* 400 `"Cannot publish: at least one schedule rule is required"`

### POST `/appointment-types/:id/unpublish` (200)

Sets `isPublished = false`. Configuration (entities, rules, questions,
shareToken) is preserved — re-publish is cheap.

### POST `/appointment-types/:id/share-token` (200)

Regenerates the share token.

**Response:** `{ "shareToken": "<new opaque string>" }`.

---

## Public endpoints (`/public/appointment-types`)

All annotated with `@Public()` — no auth, no role check.

Filtering applied by all public endpoints:
`isPublished = true AND organization.approvalStatus = APPROVED AND organization.isActive = true`
(except the share-token endpoint, which does not require `isPublished` —
share links bypass the publish gate).

### GET `/public/appointment-types`

No params.

**Response 200:** `AppointmentType[]` (no relations), ordered by
`createdAt DESC`.

### GET `/public/appointment-types/:id`

`id` UUID. **Response 200:** `AppointmentTypeWithRelations`. 404 if
not published, org not approved, or not found.

### GET `/public/appointment-types/share/:token`

`token` is the `shareToken`. **Response 200:**
`AppointmentTypeWithRelations`. Bypasses the `isPublished` requirement,
so this is the canonical "private booking link" pattern.

---

## Lifecycle TL;DR

```
POST /appointment-types               (basics + entities + schedule + questions)
PATCH /appointment-types/:id          (tweak basics / policy)
PUT /appointment-types/:id/entities   (swap inventory wholesale)
PUT /appointment-types/:id/schedule   (swap schedule wholesale)
PUT /appointment-types/:id/questions  (swap questions wholesale)
POST /appointment-types/:id/publish   → isPublished=true, shareToken populated
                                      → public endpoints start serving it
POST /appointment-types/:id/unpublish → hide from /public/appointment-types
                                      (share-token endpoint still works)
POST /appointment-types/:id/share-token → rotate the share token
DELETE /appointment-types/:id         → only if no bookings exist
```
