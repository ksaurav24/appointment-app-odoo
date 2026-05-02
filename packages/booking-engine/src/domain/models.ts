import type {
  ISODate,
  ISODateTime,
  LocalTimeWindow,
  TimeOfDay,
} from './value-objects.ts';

export type AppointmentEntityType =
  | 'person'
  | 'resource'
  | 'person_resource_pair';

export type DurationMode = 'fixed' | 'variable' | 'range';
export type ScheduleType = 'weekly' | 'date_override' | 'hybrid';
export type AssignmentShape = 'person-only' | 'resource-only' | 'paired';

export type AvailabilityBlockedReason =
  | 'capacity_exhausted'
  | 'overlapping_appointment'
  | 'overlapping_hold';

export interface BookablePerson {
  id: string;
  organizationId: string;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  designation?: string | null;
  isActive: boolean;
}

export interface BookableResource {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  description?: string | null;
  capacity?: number | null;
  location?: string | null;
  isActive: boolean;
}

export interface AppointmentTypePolicy {
  id: string;
  organizationId: string;
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
}

export interface ScheduleRule {
  id: string;
  scheduleId: string;
  dayOfWeek?: number | null;
  specificDate?: ISODate | null;
  startTime: TimeOfDay;
  endTime: TimeOfDay;
  isAvailable: boolean;
}

export interface ScheduleDefinition {
  id: string;
  appointmentTypeId: string;
  scheduleType: ScheduleType;
  timezone: string;
  rules: ScheduleRule[];
}

export interface ResolvedScheduleDay {
  appointmentTypeId: string;
  date: ISODate;
  timezone: string;
  windows: LocalTimeWindow[];
}

export interface AppointmentTypeEntityLink {
  id: string;
  appointmentTypeId: string;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  createdAt?: ISODateTime | null;
}

export interface EntityAssignment {
  key: string;
  appointmentTypeId: string;
  shape: AssignmentShape;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
}

export interface ExistingAppointment {
  id: string;
  appointmentTypeId: string;
  organizationId: string;
  customerId: string;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMins: number;
  status: string;
  rescheduleCount: number;
  capacityBooked: number;
  paymentStatus?: string | null;
  paymentPaidAt?: ISODateTime | null;
  cancellationReason?: string | null;
  cancelledAt?: ISODateTime | null;
  createdAt?: ISODateTime | null;
}

export interface ActiveHold {
  id: string;
  appointmentTypeId: string;
  customerId: string;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  expiresAt: ISODateTime;
  requestedCapacity?: number | null;
  createdAt?: ISODateTime | null;
}

export interface SlotCandidate {
  appointmentTypeId: string;
  date: ISODate;
  timezone: string;
  slotStart: ISODateTime;
  slotEnd: ISODateTime;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  allowedDurations?: number[];
}

export interface AvailabilitySlot extends SlotCandidate {
  remainingCapacity: number;
  requestedCapacityFits: boolean;
  isAvailable: boolean;
  blockedReasons: AvailabilityBlockedReason[];
}

export interface AvailabilityDay {
  appointmentTypeId: string;
  date: ISODate;
  timezone: string;
  slots: AvailabilitySlot[];
}

export interface GetAvailabilityInput {
  appointmentTypeId: string;
  date: ISODate;
  timezoneOverride?: string;
  requestedDuration?: number;
  requestedCapacity?: number;
}

export interface HoldRequest {
  appointmentTypeId: string;
  customerId: string;
  slotStart: ISODateTime;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
}

export interface HoldDecision {
  granted: boolean;
  holdExpiresAt?: ISODateTime;
  holdKey?: string;
  remainingCapacityAfterHold?: number;
  reason?: string;
}

export interface ConfirmBookingInput {
  appointmentTypeId: string;
  customerId: string;
  holdId?: string | null;
  slotStart: ISODateTime;
  requestedDuration: number;
  requestedCapacity: number;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
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
  organizationId: string;
  appointmentTypeId: string;
  affectedDate: ISODate;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  reason: string;
  occurredAt: ISODateTime;
}

export interface AvailabilityMutationInput {
  organizationId: string;
  appointmentTypeId: string;
  oldStartTime?: ISODateTime | null;
  newStartTime?: ISODateTime | null;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
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
  appointmentTypeId: string;
  appointmentId: string;
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
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  score: number;
}

export interface OrganizerRecommendation {
  type: 'best_slot' | 'high_risk_window' | 'overbooking_suggestion';
  severity: 'info' | 'warning';
  title: string;
  message: string;
  slotStart?: ISODateTime;
  slotEnd?: ISODateTime;
  bookablePersonId?: string | null;
  bookableResourceId?: string | null;
  score?: number;
}

export interface AvailabilitySnapshot {
  appointmentType: AppointmentTypePolicy;
  schedule: ScheduleDefinition;
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
