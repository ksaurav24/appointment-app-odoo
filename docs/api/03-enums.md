# 03 — Enums (verbatim)

All values from `server/prisma/schema.prisma`. Quote them exactly when
sending in request bodies or matching against responses.

## Identity & access

### `Role`
```
ADMIN
ORGANIZER
CUSTOMER
```

### `OtpPurpose`
```
SIGNUP
LOGIN
PASSWORD_RESET
```

### `OrganizationApprovalStatus`
```
PENDING
APPROVED
REJECTED
```

## Bookable inventory & appointment types

### `EntityType`
```
PERSON
RESOURCE
```

### `ScheduleType`
```
WEEKLY
FLEXIBLE
```

### `DurationMode`
```
FIXED
VARIABLE
```

### `AssignmentMode`
```
AUTO
MANUAL
```

### `QuestionType`
```
TEXT
SINGLE_CHOICE
MULTIPLE_CHOICE
NUMBER
DATE
```

## Appointments & payments

### `AppointmentStatus`
```
PENDING
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

### `PaymentStatus`
```
PENDING
PAID
FAILED
REFUNDED
```

## Notifications (rarely exposed to the frontend)

### `NotificationRecipientType`
```
USER
GUEST
ORGANIZER
ADMIN
```

### `NotificationType`
```
APPOINTMENT_CREATED
APPOINTMENT_CONFIRMED
APPOINTMENT_PENDING_APPROVAL
APPOINTMENT_APPROVED
APPOINTMENT_REJECTED
APPOINTMENT_REMINDER
APPOINTMENT_RESCHEDULED
APPOINTMENT_CANCELLED
PAYMENT_RECEIVED
PAYMENT_REFUNDED
ORGANIZER_APPROVED
ORGANIZER_REJECTED
CUSTOM
```

### `NotificationChannel`
```
EMAIL
SMS
PUSH
IN_APP
```

### `NotificationStatus`
```
PENDING
QUEUED
SENT
FAILED
BOUNCED
```

### `NotificationPriority`
```
LOW
NORMAL
HIGH
```

## Custom string enums (used in analytics queries, not Prisma)

### Admin time-series metric
```
appointments
revenue
signups
```

### Organizer time-series metric
```
bookings
revenue
cancellations
```

### Time-series granularity
```
day
week
month
```

### Top-organizations metric
```
bookings
revenue
```
