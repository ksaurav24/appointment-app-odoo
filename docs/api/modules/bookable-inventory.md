# Bookable inventory

Two parallel resources that organizers manage:

* **BookablePerson** (`/bookable-persons/*`) — staff. Has `contactEmail`
  used for email notifications when their slot gets booked. Does not log in.
* **BookableResource** (`/bookable-resources/*`) — rooms / equipment.
  Has a `capacity` field (default 1). Receives no notifications.

Both controllers require `@Roles(Role.ORGANIZER)` and the access cookie,
and are subject to the org-approved guard.

Source: `server/src/bookable-persons/`, `server/src/bookable-resources/`.

---

## Bookable persons (`/bookable-persons`)

### POST `/bookable-persons` (201)

**Body** (`CreateBookablePersonDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `name` | string | `@MinLength(1)`, `@MaxLength(120)` | yes |
| `contactEmail` | string | `@IsEmail()`, `@MaxLength(254)` | yes |
| `phone` | string | `@MaxLength(40)` | no |
| `designation` | string | `@MaxLength(120)` | no |
| `isActive` | boolean | | no, default `true` |

**Response:** `BookablePerson` (see `04-data-models.md`).

### GET `/bookable-persons` (200)

**Query:**

| Param | Type | Default |
|-------|------|---------|
| `includeInactive` | boolean | `false` |

**Response:** `BookablePerson[]`, ordered by `createdAt DESC`.

### GET `/bookable-persons/:id` (200)

Path: `id` UUID. **Response:** `BookablePerson` or 404.

### PATCH `/bookable-persons/:id` (200)

**Body** (`UpdateBookablePersonDto`): same fields as create, all optional.

**Response:** updated `BookablePerson`.

### DELETE `/bookable-persons/:id` (200)

No body.

**Response:** `{ "deleted": "soft" | "hard" }`

* `"hard"` — no appointments referenced this person; row is gone.
* `"soft"` — appointments exist; row was set `isActive = false` instead.

---

## Bookable resources (`/bookable-resources`)

### POST `/bookable-resources` (201)

**Body** (`CreateBookableResourceDto`):

| Field | Type | Validators | Required |
|-------|------|-----------|----------|
| `name` | string | `@MinLength(1)`, `@MaxLength(120)` | yes |
| `resourceType` | string | `@MaxLength(80)` | no — free-form (e.g. `"treatment-room"`) |
| `description` | string | `@MaxLength(2000)` | no |
| `capacity` | integer | `@Min(1)` | no, default `1` |
| `location` | string | `@MaxLength(200)` | no |
| `isActive` | boolean | | no, default `true` |

**Response:** `BookableResource`.

### GET `/bookable-resources` (200)

Same `?includeInactive=true|false` query param.

**Response:** `BookableResource[]`.

### GET `/bookable-resources/:id` (200)

Path: UUID. **Response:** `BookableResource` or 404.

### PATCH `/bookable-resources/:id` (200)

**Body** (`UpdateBookableResourceDto`): all fields optional, same as create.

### DELETE `/bookable-resources/:id` (200)

**Response:** `{ "deleted": "soft" | "hard" }` (same logic as persons).

---

## Wiring inventory to appointment types

Bookable persons and resources are linked to one or more **appointment
types** (services). The link is many-to-many via the
`AppointmentTypeEntity` join table.

* An appointment type's `entityType` (`PERSON` or `RESOURCE`) decides
  which inventory category may be linked. Don't try to mix.
* The link is set / replaced via `PUT /appointment-types/:id/entities`
  — see `modules/appointment-types.md`.
