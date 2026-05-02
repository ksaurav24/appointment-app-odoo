export type Role = "ADMIN" | "ORGANIZER" | "CUSTOMER";

export type OtpPurpose = "SIGNUP" | "LOGIN" | "PASSWORD_RESET";

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};

export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

export type RegisterOrganizationInput = {
  name: string;
  slug: string;
  contactEmail: string;
  description?: string;
  contactPhone?: string;
  address?: string;
  timezone?: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  role?: "CUSTOMER" | "ORGANIZER";
  organization?: RegisterOrganizationInput;
};

export type OrganizationApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Organization = {
  id: string;
  organiserId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  timezone: string;
  isActive: boolean;
  approvalStatus: OrganizationApprovalStatus;
  approvedAt: string | null;
  approvedById: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  contactEmail?: string;
  description?: string;
  contactPhone?: string;
  address?: string;
  timezone?: string;
};

export type RegisterResponse = {
  userId: string;
  organizationId?: string;
  message: string;
};

export type VerifyEmailInput = { email: string; code: string };

export type ResendOtpInput = { email: string; purpose: OtpPurpose };

export type LoginInput = { email: string; password: string };

export type LoginResponse =
  | { user: SafeUser; twoFactorRequired?: undefined }
  | { user?: undefined; twoFactorRequired: true };

export type VerifyTwoFactorInput = { email: string; code: string };

export type ForgotPasswordInput = { email: string };

export type ResetPasswordInput = { token: string; newPassword: string };

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type DisableTwoFactorInput = { currentPassword: string };

export type GenericMessage = { message: string };

export type AdminDashboard = {
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
    currency: string;
    thisMonth: string;
    allTime: string;
  };
  generatedAt: string;
};

export type TimeBucket = { bucket: string; value: number };

export type AdminTimeseriesMetric = "appointments" | "revenue" | "signups";
export type OrgTimeseriesMetric = "bookings" | "revenue" | "cancellations";
export type TimeseriesGranularity = "day" | "week" | "month";

export type AdminTimeseriesQuery = {
  metric: AdminTimeseriesMetric;
  granularity?: TimeseriesGranularity;
  from?: string;
  to?: string;
};

export type OrgTimeseriesQuery = {
  metric: OrgTimeseriesMetric;
  granularity?: TimeseriesGranularity;
  from?: string;
  to?: string;
};

export type TopOrganization = {
  organizationId: string;
  name: string;
  slug: string;
  value: number;
};

export type TopOrganizationsQuery = {
  metric?: "bookings" | "revenue";
  limit?: number;
};

export type OrgDashboard = {
  organizationId: string;
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    pending: number;
  };
  cancellationRatePct: number;
  revenue: {
    currency: string;
    thisMonth: string;
    allTime: string;
  };
  averagePerDayLast30: number;
  generatedAt: string;
};

export type OrgByAppointmentType = {
  appointmentTypeId: string;
  name: string;
  bookings: number;
  revenue: number;
};

export type OrgBusyHours = {
  since: string;
  matrix: number[][];
};

// ─── Admin: users ────────────────────────────────────────────────

export type AdminUserDetail = SafeUser & {
  organization: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
};

export type ListUsersQuery = {
  role?: Role;
  isActive?: boolean;
  emailVerified?: boolean;
  q?: string;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
};

export type ChangeRoleInput = {
  role: Role;
  reason: string;
};

// ─── Admin: organizations ────────────────────────────────────────

export type AdminOrganizationStatusFilter =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ALL";

export type OrganizationWithOrganiser = Organization & {
  organiser: SafeUser;
};

export type RejectOrganizationInput = {
  reason?: string;
};

// ─── Admin: appointments ─────────────────────────────────────────

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type AdminAppointmentItem = {
  publicId: string;
  appointmentTypeId: string;
  customerId: string;
  organizationId: string;
  bookablePersonId: string | null;
  bookableResourceId: string | null;
  startTime: string;
  endTime: string;
  durationMins: number;
  status: AppointmentStatus;
  rescheduleCount: number;
  capacityBooked: number;
  totalAmount: string | null;
  paymentStatus: PaymentStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmationCode: string;
  createdAt: string;
  updatedAt: string;
  appointmentType: { id: string; name: string; slug: string };
  customer: { id: string; email: string; fullName: string };
  organization: { id: string; name: string; slug: string };
  bookablePerson: { id: string; name: string } | null;
  bookableResource: { id: string; name: string } | null;
};

export type ListAdminAppointmentsQuery = {
  organizationId?: string;
  customerId?: string;
  appointmentTypeId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  upcomingOnly?: boolean;
  skip?: number;
  take?: number;
};

// ─── Admin: audit logs ───────────────────────────────────────────

export type AuditLog = {
  id: string;
  actorId: string | null;
  actor: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  } | null;
  actorRole: Role | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ListAuditLogsQuery = {
  actorId?: string;
  actorRole?: Role;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
};

// ─── Booking: appointment types (public + organizer-shared) ──────

export type EntityType = "PERSON" | "RESOURCE";
export type AssignmentMode = "AUTO" | "MANUAL";
export type ScheduleType = "WEEKLY" | "FLEXIBLE";
export type DurationMode = "FIXED" | "VARIABLE";
export type QuestionType =
  | "TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "NUMBER"
  | "DATE";

export type BookablePerson = {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookableResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string | null;
  description: string | null;
  capacity: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentType = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  entityType: EntityType;
  scheduleType: ScheduleType;
  durationMode: DurationMode;
  durationMinutes: number | null;
  minDurationMins: number | null;
  maxDurationMins: number | null;
  durationStepMins: number | null;
  maxBookingsPerSlot: number;
  manageCapacity: boolean;
  manualConfirmation: boolean;
  advancePaymentEnabled: boolean;
  advancePaymentAmount: string | null;
  assignmentMode: AssignmentMode;
  cancellationAllowed: boolean;
  cancellationWindowHours: number | null;
  rescheduleAllowed: boolean;
  rescheduleWindowHours: number | null;
  maxReschedulesAllowed: number | null;
  isPublished: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentTypeEntity = {
  id: string;
  appointmentTypeId: string;
  bookablePersonId: string | null;
  bookablePerson: BookablePerson | null;
  bookableResourceId: string | null;
  bookableResource: BookableResource | null;
  createdAt: string;
};

export type ScheduleRule = {
  id: string;
  scheduleId: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

export type Schedule = {
  id: string;
  appointmentTypeId: string;
  scheduleType: ScheduleType;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  rules: ScheduleRule[];
};

export type BookingQuestion = {
  id: string;
  appointmentTypeId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: string[] | null;
  displayOrder: number;
};

export type AppointmentTypeWithRelations = AppointmentType & {
  entities: AppointmentTypeEntity[];
  schedules: Schedule[];
  bookingQuestions: BookingQuestion[];
  organization: Organization;
};

// ─── Booking: availability (discriminated union) ─────────────────

export type FixedAvailability = {
  appointmentTypeId: string;
  date: string;
  durationMode: "FIXED";
  durationMinutes: number;
  timezone: string;
  entityId: string | null;
  slots: Array<{
    startTime: string;
    endTime: string;
    remainingCapacity: number;
  }>;
};

export type VariableAvailability = {
  appointmentTypeId: string;
  date: string;
  durationMode: "VARIABLE";
  minDurationMins: number;
  maxDurationMins: number;
  durationStepMins: number;
  timezone: string;
  entityId: string | null;
  openRanges: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
};

export type AvailabilityResponse = FixedAvailability | VariableAvailability;

export type AvailabilityQuery = {
  date: string;
  entityId?: string;
  timezone?: string;
};

export type DurationOptionsResponse = {
  startTime: string;
  durations: number[];
};

export type DurationOptionsQuery = {
  date: string;
  startTime: string;
  entityId?: string;
  timezone?: string;
};

// ─── Booking: slot locks ─────────────────────────────────────────

export type SlotLock = {
  id: string;
  appointmentTypeId: string;
  bookablePersonId: string | null;
  bookableResourceId: string | null;
  slotStart: string;
  slotEnd: string;
  customerId: string;
  expiresAt: string;
  createdAt: string;
};

export type AcquireSlotLockInput = {
  appointmentTypeId: string;
  entityId?: string;
  startTime: string;
  endTime: string;
};

// ─── Booking: appointments ───────────────────────────────────────

export type AppointmentAnswerInput = {
  questionId: string;
  answerText: string | null;
};

export type CreateAppointmentInput = {
  slotLockId: string;
  capacityBooked?: number;
  answers?: AppointmentAnswerInput[];
};

export type AppointmentAnswer = {
  question: BookingQuestion;
  answerText: string | null;
  createdAt: string;
};

export type Appointment = {
  publicId: string;
  appointmentTypeId: string;
  customerId: string;
  organizationId: string;
  bookablePersonId: string | null;
  bookableResourceId: string | null;
  startTime: string;
  endTime: string;
  durationMins: number;
  status: AppointmentStatus;
  rescheduleCount: number;
  capacityBooked: number;
  totalAmount: string | null;
  paymentStatus: PaymentStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  confirmationCode: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentWithRelations = Appointment & {
  appointmentType: AppointmentType;
  bookablePerson: BookablePerson | null;
  bookableResource: BookableResource | null;
  answers?: AppointmentAnswer[];
};

export type CancelAppointmentInput = {
  reason?: string;
};

// ─── Booking: payments ───────────────────────────────────────────

export type CreatePaymentIntentInput = {
  appointmentPublicId: string;
};

export type CreatePaymentIntentResult = {
  paymentPublicId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export type VerifyPaymentInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type VerifyPaymentResult = {
  paymentPublicId: string;
};
