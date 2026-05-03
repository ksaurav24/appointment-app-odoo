import type {
  EntityId,
  ISODate,
  ISODateTime,
  LocalTimeWindow,
  TimeOfDay,
} from './value-objects.ts';

export type AppointmentEntityType =
  | 'PERSON'
  | 'RESOURCE'
  | 'PERSON_RESOURCE_PAIR'
  | 'person'
  | 'resource'
  | 'person_resource_pair';

export type DurationMode =
  | 'FIXED'
  | 'VARIABLE'
  | 'RANGE'
  | 'fixed'
  | 'variable'
  | 'range';
export type ScheduleType =
  | 'WEEKLY'
  | 'FLEXIBLE'
  | 'DATE_OVERRIDE'
  | 'HYBRID'
  | 'weekly'
  | 'flexible'
  | 'date_override'
  | 'hybrid';
export type AssignmentShape = 'person-only' | 'resource-only' | 'paired';

export type AvailabilityBlockedReason =
  | 'capacity_exhausted'
  | 'overlapping_appointment'
  | 'overlapping_hold';

export interface BookablePerson {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  designation?: string | null;
  isActive: boolean;
  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;
}

export interface BookableResource {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  resourceType: string;
  description?: string | null;
  capacity?: number | null;
  location?: string | null;
  isActive: boolean;
  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;
}

export interface AppointmentTypePolicy {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  slug: string;
  description?: string | null;
  entityType: AppointmentEntityType;
  scheduleType: ScheduleType;
  durationMode: DurationMode;
  durationMinutes?: number | null;
  minDurationMins?: number | null;
  maxDurationMins?: number | null;
  durationStepMins?: number | null;
  maxBookingsPerSlot?: number | null;
  manageCapacity: boolean;
  manualConfirmation: boolean;
  advancePaymentEnabled?: boolean | null;
  advancePaymentAmount?: number | null;
  assignmentMode?: string | null;
  cancellationAllowed: boolean;
  cancellationWindowHours?: number | null;
  rescheduleAllowed: boolean;
  rescheduleWindowHours?: number | null;
  maxReschedulesAllowed?: number | null;
  isPublished: boolean;
  shareToken?: string | null;
  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;
}

export interface ScheduleRule {
  id: EntityId;
  scheduleId: EntityId;
  dayOfWeek?: number | null;
  specificDate?: ISODate | null;
  startTime: TimeOfDay;
  endTime: TimeOfDay;
  isAvailable: boolean;
}

export interface ScheduleDefinition {
  id: EntityId;
  appointmentTypeId: EntityId;
  scheduleType: ScheduleType;
  timezone: string;
  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;
  rules: ScheduleRule[];
}

export interface ResolvedScheduleDay {
  appointmentTypeId: EntityId;
  date: ISODate;
  timezone: string;
  windows: LocalTimeWindow[];
}

export interface AppointmentTypeEntityLink {
  id: EntityId;
  appointmentTypeId: EntityId;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  createdAt?: ISODateTime | null;
}

export interface EntityAssignment {
  key: string;
  appointmentTypeId: EntityId;
  shape: AssignmentShape;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export interface ExistingAppointment {
  id: EntityId;
  appointmentTypeId: EntityId;
  organizationId: EntityId;
  customerId: EntityId;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMins: number;
  status: string;
  rescheduleCount: number;
  capacityBooked: number;
  totalAmount?: number | null;
  paymentStatus?: string | null;
  paymentPaidAt?: ISODateTime | null;
  cancellationReason?: string | null;
  cancelledAt?: ISODateTime | null;
  confirmationCode?: string | null;
  createdAt?: ISODateTime | null;
  updatedAt?: ISODateTime | null;
}

export interface PaymentRecord {
  id: EntityId;
  appointmentId: EntityId;
  customerId: EntityId;
  amount: number;
  currency: string;
  paymentGateway: string;
  gatewayTransactionId?: string | null;
  status: string;
  paidAt?: ISODateTime | null;
  refundedAt?: ISODateTime | null;
  createdAt?: ISODateTime | null;
}

export interface ActiveHold {
  id: EntityId;
  appointmentTypeId: EntityId;
  customerId: EntityId;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  expiresAt: ISODateTime;
  requestedCapacity?: number | null;
  createdAt?: ISODateTime | null;
}

export interface SlotCandidate {
  appointmentTypeId: EntityId;
  date: ISODate;
  timezone: string;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  allowedDurations?: number[];
}

export interface AvailabilitySlot extends SlotCandidate {
  remainingCapacity: number;
  requestedCapacityFits: boolean;
  isAvailable: boolean;
  blockedReasons: AvailabilityBlockedReason[];
}

export interface AvailabilityDay {
  appointmentTypeId: EntityId;
  date: ISODate;
  timezone: string;
  slots: AvailabilitySlot[];
}

export interface GetAvailabilityInput {
  appointmentTypeId: EntityId;
  date: ISODate;
  timezoneOverride?: string;
  requestedDuration?: number;
  requestedCapacity?: number;
}

export interface HoldRequest {
  appointmentTypeId: EntityId;
  customerId: EntityId;
  slotStart: ISODateTime;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export interface HoldDecision {
  granted: boolean;
  holdExpiresAt?: ISODateTime;
  holdKey?: string;
  remainingCapacityAfterHold?: number;
  reason?: string;
}

export interface ConfirmBookingInput {
  appointmentTypeId: EntityId;
  customerId: EntityId;
  holdId?: EntityId | null;
  slotStart: ISODateTime;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
}

export interface BookingDecision {
  confirmed: boolean;
  reason?: string;
}

export type AvailabilityEventType =
  | 'availability.changed'
  | 'hold.created'
  | 'hold.expired'
  | 'booking.created'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'schedule.updated'
  | 'appointment-type.updated';

export interface AvailabilityEvent {
  type: AvailabilityEventType;
  organizationId: EntityId;
  appointmentTypeId: EntityId;
  affectedDate: ISODate;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  reason: string;
  occurredAt: ISODateTime;
}

export interface AvailabilityMutationInput {
  organizationId: EntityId;
  appointmentTypeId: EntityId;
  oldStartTime?: ISODateTime | null;
  newStartTime?: ISODateTime | null;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  timezone?: string;
  rangeStartDate?: ISODate | null;
  rangeEndDate?: ISODate | null;
  futureDays?: number | null;
  occurredAt: ISODateTime;
  reason: string;
}

export interface NoShowFeatureInput {
  appointmentType: AppointmentTypePolicy;
  appointment: ExistingAppointment;
  latestPayment?: PaymentRecord | null;
  organizationHistorySize: number;
  organizationNoShowRate?: number | null;
  appointmentTypeNoShowRate?: number | null;
  customerNoShowRate?: number | null;
  bookablePersonNoShowRate?: number | null;
  bookableResourceNoShowRate?: number | null;
  rescheduleCountLast30Days?: number | null;
  lastRescheduledAt?: ISODateTime | null;
}

export interface NoShowFeatureVector {
  appointmentTypeId: EntityId;
  appointmentId: EntityId;
  appointmentStatus: string;
  startsAtHour: number;
  appointmentWeekday: number;
  durationMins: number;
  rescheduleCount: number;
  rescheduleCountLast30Days?: number | null;
  lastRescheduleLeadHours?: number | null;
  durationMode: DurationMode;
  maxBookingsPerSlot?: number | null;
  paymentStatus?: string | null;
  advancePaymentEnabled: boolean;
  manualConfirmation: boolean;
  cancellationAllowed: boolean;
  cancellationWindowHours?: number | null;
  rescheduleAllowed: boolean;
  maxReschedulesAllowed?: number | null;
  manageCapacity: boolean;
  bookingLeadHours?: number | null;
  paymentLeadHours?: number | null;
  wasCancelled: boolean;
  cancelLeadHours?: number | null;
  cancelWithinWindow?: boolean | null;
  organizationHistorySize: number;
  organizationNoShowRate?: number | null;
  appointmentTypeNoShowRate?: number | null;
  customerNoShowRate?: number | null;
  bookablePersonNoShowRate?: number | null;
  bookableResourceNoShowRate?: number | null;
}

export interface NoShowScore {
  score: number;
  riskBand: 'low' | 'medium' | 'high';
}

export interface SlotRiskScore {
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  score: number;
}

export interface OrganizerRecommendation {
  type: 'best_slot' | 'high_risk_window' | 'overbooking_suggestion';
  severity: 'info' | 'warning';
  title: string;
  message: string;
  slotStart?: ISODateTime;
  slotEnd?: ISODateTime;
  bookablePersonId?: EntityId | null;
  bookableResourceId?: EntityId | null;
  score?: number;
}

export interface AvailabilitySnapshot {
  appointmentType: AppointmentTypePolicy;
  schedule: ScheduleDefinition;
  persons?: BookablePerson[];
  entityLinks: AppointmentTypeEntityLink[];
  resources: BookableResource[];
  appointments: ExistingAppointment[];
  activeHolds: ActiveHold[];
}

export interface CapacityEvaluation {
  capacityLimit: number;
  remainingCapacity: number;
  requestedCapacity: number;
  requestedCapacityFits: boolean;
  blockedReasons: AvailabilityBlockedReason[];
  blockingAppointments: ExistingAppointment[];
  blockingHolds: ActiveHold[];
}
