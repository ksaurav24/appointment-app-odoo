# 04 — Data models reference

Field-by-field reference for the entities the API returns. JSON shapes
match what `JSON.stringify`-ing a Prisma row would produce, with the
caveats below. Use this when a per-endpoint doc says "returns
`Organization`" or "returns `AppointmentWithRelations`" and you need to
know every field.

## Conventions

* `string (UUID)` — UUID v7 string.
* `string (BigInt)` — server stores as BigInt, JSON-serializes as a
  decimal string (see `02-conventions.md`).
* `string (cuid)` — auto-generated cuid (Appointment.publicId, Payment.publicId).
* `string (ISO 8601)` — datetime, always UTC.
* `string (HH:MM)` — wall-clock time string.
* `string (Decimal)` — Prisma `Decimal(12,2)` serialized as a string to
  preserve precision; parse on the client only at the last moment.
* `?` after a type means nullable.

## User (sensitive fields stripped)

When the API returns a User, it always returns the `SafeUser` projection
(no `passwordHash`).

```ts
type SafeUser = {
  id: string (UUID);
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ORGANIZER' | 'CUSTOMER';
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

## Organization

```ts
type Organization = {
  id: string (UUID);
  organiserId: string (UUID);   // 1:1 to a User with role ORGANIZER
  name: string;
  slug: string;                 // globally unique, slug regex
  description: string?;
  logoUrl: string?;
  contactEmail: string;
  contactPhone: string?;
  address: string?;
  timezone: string;             // IANA, default "UTC"
  isActive: boolean;            // soft-delete flag
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt: string (ISO 8601)?;
  approvedById: string (UUID)?;
  rejectedAt: string (ISO 8601)?;
  rejectedReason: string?;
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

The admin list endpoints often return `Organization & { organiser: SafeUser }`.

## BookablePerson

```ts
type BookablePerson = {
  id: string (UUID);
  organizationId: string (UUID);
  name: string;
  contactEmail: string?;        // used to email the staff member when bookings happen
  phone: string?;
  designation: string?;
  isActive: boolean;
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

## BookableResource

```ts
type BookableResource = {
  id: string (UUID);
  organizationId: string (UUID);
  name: string;
  resourceType: string?;        // free-form label
  description: string?;
  capacity: number;             // simultaneous bookings, default 1
  location: string?;
  isActive: boolean;
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

## AppointmentType

```ts
type AppointmentType = {
  id: string (UUID);
  organizationId: string (UUID);
  name: string;
  slug: string;                 // unique per organization
  description: string?;
  entityType: 'PERSON' | 'RESOURCE';
  scheduleType: 'WEEKLY' | 'FLEXIBLE';
  durationMode: 'FIXED' | 'VARIABLE';
  durationMinutes: number?;     // set if durationMode = FIXED
  minDurationMins: number?;     // set if durationMode = VARIABLE
  maxDurationMins: number?;
  durationStepMins: number?;
  maxBookingsPerSlot: number;   // default 1
  manageCapacity: boolean;
  manualConfirmation: boolean;  // if true, bookings start as PENDING
  advancePaymentEnabled: boolean;
  advancePaymentAmount: string (Decimal)?;  // required if advancePaymentEnabled
  assignmentMode: 'AUTO' | 'MANUAL';
  cancellationAllowed: boolean;
  cancellationWindowHours: number?;
  rescheduleAllowed: boolean;
  rescheduleWindowHours: number?;
  maxReschedulesAllowed: number?;
  isPublished: boolean;
  shareToken: string?;          // unique; populated on first publish
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

### `AppointmentTypeWithRelations`

The shape returned by `GET /appointment-types/:id`,
`POST /appointment-types`, all `PUT /appointment-types/:id/...`, and
`POST /appointment-types/:id/(un)?publish`. Same as `AppointmentType` plus:

```ts
{
  entities: Array<{
    id: string (BigInt);
    appointmentTypeId: string (UUID);
    bookablePersonId: string (UUID)?;
    bookablePerson: BookablePerson?;
    bookableResourceId: string (UUID)?;
    bookableResource: BookableResource?;
    createdAt: string (ISO 8601);
  }>;
  schedules: Array<{
    id: string (BigInt);
    appointmentTypeId: string (UUID);
    scheduleType: 'WEEKLY' | 'FLEXIBLE';
    timezone: string;        // IANA
    createdAt: string (ISO 8601);
    updatedAt: string (ISO 8601);
    rules: Array<{
      id: string (BigInt);
      scheduleId: string (BigInt);
      dayOfWeek: number?;             // 0=Sun..6=Sat, set when scheduleType=WEEKLY
      specificDate: string ("YYYY-MM-DD")?;  // set when one-off
      startTime: string ("HH:MM");
      endTime: string ("HH:MM");
      isAvailable: boolean;
    }>;
  }>;
  bookingQuestions: Array<{
    id: string (BigInt);
    appointmentTypeId: string (UUID);
    questionText: string;
    questionType: 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NUMBER' | 'DATE';
    isRequired: boolean;
    options: string[]?;       // required for SINGLE_CHOICE / MULTIPLE_CHOICE
    displayOrder: number;
  }>;
}
```

## Appointment

The frontend never sees the internal numeric `id`. Use `publicId`.

```ts
type Appointment = {
  publicId: string (cuid);
  appointmentTypeId: string (UUID);
  customerId: string (UUID);
  organizationId: string (UUID);
  bookablePersonId: string (UUID)?;
  bookableResourceId: string (UUID)?;
  startTime: string (ISO 8601);
  endTime: string (ISO 8601);
  durationMins: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  rescheduleCount: number;
  capacityBooked: number;
  totalAmount: string (Decimal)?;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  cancellationReason: string?;
  cancelledAt: string (ISO 8601)?;
  confirmationCode: string;     // user-friendly code, unique
  createdAt: string (ISO 8601);
  updatedAt: string (ISO 8601);
};
```

### `AppointmentWithRelations`

Returned by all customer/organizer appointment endpoints. Same as
`Appointment` plus:

```ts
{
  appointmentType: AppointmentType;       // (without relations)
  bookablePerson: BookablePerson?;
  bookableResource: BookableResource?;
  // For admin list endpoints, these compact projections also appear:
  customer?: { id: string; email: string; fullName: string };
  organization?: { id: string; name: string; slug: string };
  answers?: Array<{
    question: BookingQuestion;
    answerText: string?;
    createdAt: string (ISO 8601);
  }>;
}
```

## Payment

```ts
type Payment = {
  publicId: string (cuid);
  appointmentId: string (BigInt);   // internal — not always exposed
  customerId: string (UUID);
  amount: string (Decimal);
  currency: string;                 // e.g. "INR"
  paymentGateway: string?;          // e.g. "razorpay"
  gatewayTransactionId: string?;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paidAt: string (ISO 8601)?;
  refundedAt: string (ISO 8601)?;
  createdAt: string (ISO 8601);
};
```

The payment-create endpoint (`POST /payments/intent`) returns a smaller
`CreateIntentResult` — see `modules/payments.md`.

## SlotLock

```ts
type SlotLock = {
  id: string (BigInt);
  appointmentTypeId: string (UUID);
  bookablePersonId: string (UUID)?;
  bookableResourceId: string (UUID)?;
  slotStart: string (ISO 8601);
  slotEnd: string (ISO 8601);
  customerId: string (UUID);
  expiresAt: string (ISO 8601);     // now + 5 minutes on acquire/extend
  createdAt: string (ISO 8601);
};
```

## AuditLog (admin-only listing)

```ts
type AuditLog = {
  id: string (BigInt);
  actorId: string (UUID)?;
  actor: { id: string; email: string; fullName: string; role: Role }?;
  actorRole: Role?;
  action: string;                   // e.g. "organization.approve"
  entityType: string;               // e.g. "organization"
  entityId: string;
  metadata: object?;                // free-form JSON
  ipAddress: string?;
  userAgent: string?;
  createdAt: string (ISO 8601);
};
```

Common `action` values currently emitted:

* `organization.approve`
* `organization.reject`
* `organization.activate`
* `organization.deactivate`
* `user.activated`
* `user.deactivated`
* `user.role_changed`
* `appointment.cancel.organiser` (and similar customer/organiser variants
  for cancel/reschedule/approve/reject)

## Notification (rarely exposed)

The notifications table is mostly internal. If/when surfaced to the
frontend (e.g. in-app inbox), the row shape is:

```ts
type Notification = {
  id: string (BigInt);
  recipientType: 'USER' | 'GUEST' | 'ORGANIZER' | 'ADMIN';
  recipientId: string?;             // User UUID or BookablePerson UUID
  recipientEmail: string?;          // for guests
  appointmentId: string (BigInt)?;
  notificationType: NotificationType;  // see 03-enums.md
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED';
  sentAt: string (ISO 8601)?;
  createdAt: string (ISO 8601);
};
```
