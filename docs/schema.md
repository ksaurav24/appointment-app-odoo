users [icon: user, color: purple] {
  id string pk
  email string unique
  passwordHash string
  fullName string
  role enum
  isActive boolean
  emailVerified boolean
  createdAt timestamp
  updatedAt timestamp
}

otp_verifications [icon: shield, color: purple] {
  id string pk
  userId string fk
  code string
  purpose enum
  expiresAt timestamp
  consumedAt timestamp
  createdAt timestamp
}

password_resets [icon: key, color: purple] {
  id string pk
  userId string fk
  tokenHash string
  expiresAt timestamp
  consumedAt timestamp
  createdAt timestamp
}

refresh_tokens [icon: refresh-cw, color: purple] {
  id string pk
  userId string fk
  tokenHash string unique
  deviceInfo string
  ipAddress string
  expiresAt timestamp
  revokedAt timestamp
  createdAt timestamp
}

organizations [icon: briefcase, color: teal] {
  id string pk
  organiserId string fk unique
  name string
  slug string unique
  description text
  logoUrl string
  galleryImageUrls json
  contactEmail string
  contactPhone string
  city string
  state string
  address string
  latitude float
  longitude float
  googlePlaceId string
  instagramUrl string
  facebookUrl string
  twitterUrl string
  websiteUrl string
  timezone string
  isActive boolean
  createdAt timestamp
  updatedAt timestamp
}

bookable_persons [icon: user-check, color: gray] {
  id string pk
  organizationId string fk
  name string
  contactEmail string
  phone string
  designation string
  isActive boolean
  createdAt timestamp
  updatedAt timestamp
}

bookable_resources [icon: package, color: gray] {
  id string pk
  organizationId string fk
  name string
  resourceType string
  description text
  capacity integer
  location string
  isActive boolean
  createdAt timestamp
  updatedAt timestamp
}

appointment_types [icon: calendar, color: amber] {
  id string pk
  organizationId string fk
  name string
  slug string
  description text
  entityType enum
  scheduleType enum
  durationMode enum
  durationMinutes integer
  minDurationMins integer
  maxDurationMins integer
  durationStepMins integer
  maxBookingsPerSlot integer
  manageCapacity boolean
  manualConfirmation boolean
  advancePaymentEnabled boolean
  advancePaymentAmount decimal
  assignmentMode enum
  cancellationAllowed boolean
  cancellationWindowHours integer
  rescheduleAllowed boolean
  rescheduleWindowHours integer
  maxReschedulesAllowed integer
  isPublished boolean
  shareToken string unique
  createdAt timestamp
  updatedAt timestamp
}

appointment_type_entities [icon: link, color: amber] {
  id string pk
  appointmentTypeId string fk
  bookablePersonId string fk
  bookableResourceId string fk
  createdAt timestamp
}

schedules [icon: clock, color: amber] {
  id string pk
  appointmentTypeId string fk
  scheduleType enum
  timezone string
  createdAt timestamp
  updatedAt timestamp
}

schedule_rules [icon: calendar-days, color: amber] {
  id string pk
  scheduleId string fk
  dayOfWeek integer
  specificDate date
  startTime time
  endTime time
  isAvailable boolean
}

booking_questions [icon: help-circle, color: amber] {
  id string pk
  appointmentTypeId string fk
  questionText string
  questionType enum
  isRequired boolean
  options json
  displayOrder integer
}

appointments [icon: bookmark, color: coral] {
  id string pk
  appointmentTypeId string fk
  customerId string fk
  organizationId string fk
  bookablePersonId string fk
  bookableResourceId string fk
  startTime timestamp
  endTime timestamp
  durationMins integer
  status enum
  rescheduleCount integer
  capacityBooked integer
  totalAmount decimal
  paymentStatus enum
  cancellationReason string
  cancelledAt timestamp
  confirmationCode string unique
  createdAt timestamp
  updatedAt timestamp
}

appointment_reschedules [icon: repeat, color: coral] {
  id string pk
  appointmentId string fk
  rescheduledByUserId string fk
  previousStartTime timestamp
  previousEndTime timestamp
  newStartTime timestamp
  newEndTime timestamp
  previousPersonId string fk
  previousResourceId string fk
  reason string
  rescheduledAt timestamp
}

appointment_answers [icon: message-square, color: coral] {
  id string pk
  appointmentId string fk
  questionId string fk
  answerText text
  createdAt timestamp
}

payments [icon: credit-card, color: coral] {
  id string pk
  appointmentId string fk
  customerId string fk
  amount decimal
  currency string
  paymentGateway string
  gatewayTransactionId string
  status enum
  paidAt timestamp
  refundedAt timestamp
  createdAt timestamp
}

slot_locks [icon: lock, color: coral] {
  id string pk
  appointmentTypeId string fk
  bookablePersonId string fk
  bookableResourceId string fk
  slotStart timestamp
  slotEnd timestamp
  customerId string fk
  expiresAt timestamp
  createdAt timestamp
}

notifications [icon: bell, color: pink] {
  id string pk
  recipientType enum
  recipientId string
  recipientEmail string
  appointmentId string fk
  notificationType enum
  channel enum
  status enum
  sentAt timestamp
  createdAt timestamp
}

audit_logs [icon: file-text, color: pink] {
  id string pk
  actorId string fk
  actorRole enum
  action string
  entityType string
  entityId string
  metadata json
  ipAddress string
  userAgent string
  createdAt timestamp
}

otp_verifications.userId > users.id
password_resets.userId > users.id
refresh_tokens.userId > users.id

organizations.organiserId - users.id

bookable_persons.organizationId > organizations.id
bookable_resources.organizationId > organizations.id

appointment_types.organizationId > organizations.id

appointment_type_entities.appointmentTypeId > appointment_types.id
appointment_type_entities.bookablePersonId > bookable_persons.id
appointment_type_entities.bookableResourceId > bookable_resources.id

schedules.appointmentTypeId > appointment_types.id
schedule_rules.scheduleId > schedules.id

booking_questions.appointmentTypeId > appointment_types.id

appointments.appointmentTypeId > appointment_types.id
appointments.customerId > users.id
appointments.organizationId > organizations.id
appointments.bookablePersonId > bookable_persons.id
appointments.bookableResourceId > bookable_resources.id

appointment_reschedules.appointmentId > appointments.id
appointment_reschedules.rescheduledByUserId > users.id
appointment_reschedules.previousPersonId > bookable_persons.id
appointment_reschedules.previousResourceId > bookable_resources.id

appointment_answers.appointmentId > appointments.id
appointment_answers.questionId > booking_questions.id

payments.appointmentId > appointments.id
payments.customerId > users.id

slot_locks.appointmentTypeId > appointment_types.id
slot_locks.bookablePersonId > bookable_persons.id
slot_locks.bookableResourceId > bookable_resources.id
slot_locks.customerId > users.id

notifications.appointmentId > appointments.id

audit_logs.actorId > users.id
