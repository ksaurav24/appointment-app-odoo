import type {
  ActiveHold,
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  AvailabilitySnapshot,
  BookableResource,
  ExistingAppointment,
  ScheduleDefinition,
} from '../../src/domain/models.ts';
import type { ISODate } from '../../src/domain/value-objects.ts';

export const mondayDate = '2026-05-04' as ISODate;

export const weeklyOverrideSchedule: ScheduleDefinition = {
  id: 'schedule_override',
  appointmentTypeId: 'apt_override',
  scheduleType: 'hybrid',
  timezone: 'UTC',
  rules: [
    {
      id: 'rule_weekly_open',
      scheduleId: 'schedule_override',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '12:00',
      isAvailable: true,
    },
    {
      id: 'rule_weekly_blackout',
      scheduleId: 'schedule_override',
      dayOfWeek: 1,
      startTime: '10:00',
      endTime: '10:30',
      isAvailable: false,
    },
    {
      id: 'rule_specific_open',
      scheduleId: 'schedule_override',
      specificDate: mondayDate,
      startTime: '11:00',
      endTime: '12:30',
      isAvailable: true,
    },
    {
      id: 'rule_specific_blackout',
      scheduleId: 'schedule_override',
      specificDate: mondayDate,
      startTime: '09:00',
      endTime: '09:30',
      isAvailable: false,
    },
  ],
};

export const mixedAssignmentLinks: AppointmentTypeEntityLink[] = [
  {
    id: 'link_person',
    appointmentTypeId: 'apt_assignments',
    bookablePersonId: 'person_a',
  },
  {
    id: 'link_resource',
    appointmentTypeId: 'apt_assignments',
    bookableResourceId: 'resource_a',
  },
  {
    id: 'link_pair',
    appointmentTypeId: 'apt_assignments',
    bookablePersonId: 'person_b',
    bookableResourceId: 'resource_b',
  },
  {
    id: 'link_pair_duplicate',
    appointmentTypeId: 'apt_assignments',
    bookablePersonId: 'person_b',
    bookableResourceId: 'resource_b',
  },
];

export const fixedDurationPolicy: AppointmentTypePolicy = {
  id: 'apt_fixed',
  organizationId: 'org_1',
  name: 'Consultation',
  slug: 'consultation',
  entityType: 'person',
  scheduleType: 'weekly',
  durationMode: 'fixed',
  durationMinutes: 30,
  durationStepMins: 15,
  maxBookingsPerSlot: 1,
  manageCapacity: false,
  manualConfirmation: false,
  cancellationAllowed: true,
  rescheduleAllowed: true,
  isPublished: true,
};

export const flexibleDurationPolicy: AppointmentTypePolicy = {
  id: 'apt_flexible',
  organizationId: 'org_1',
  name: 'Workshop',
  slug: 'workshop',
  entityType: 'resource',
  scheduleType: 'weekly',
  durationMode: 'range',
  minDurationMins: 30,
  maxDurationMins: 60,
  durationStepMins: 15,
  maxBookingsPerSlot: 3,
  manageCapacity: true,
  manualConfirmation: false,
  cancellationAllowed: true,
  rescheduleAllowed: true,
  isPublished: true,
};

export const oneHourUtcSchedule: ScheduleDefinition = {
  id: 'schedule_one_hour',
  appointmentTypeId: 'apt_fixed',
  scheduleType: 'weekly',
  timezone: 'UTC',
  rules: [
    {
      id: 'rule_one_hour',
      scheduleId: 'schedule_one_hour',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      isAvailable: true,
    },
  ],
};

export const capacityManagedResource: BookableResource = {
  id: 'resource_room_1',
  organizationId: 'org_1',
  name: 'Room 1',
  resourceType: 'room',
  capacity: 3,
  isActive: true,
};

export const capacityManagedAppointments: ExistingAppointment[] = [
  {
    id: 'appt_capacity_1',
    appointmentTypeId: 'apt_flexible',
    organizationId: 'org_1',
    customerId: 'customer_1',
    bookableResourceId: 'resource_room_1',
    startTime: '2026-05-04T09:00:00.000Z',
    endTime: '2026-05-04T09:30:00.000Z',
    durationMins: 30,
    status: 'confirmed',
    rescheduleCount: 0,
    capacityBooked: 2,
  },
];

export const capacityManagedHolds: ActiveHold[] = [
  {
    id: 'hold_capacity_1',
    appointmentTypeId: 'apt_flexible',
    customerId: 'customer_2',
    bookableResourceId: 'resource_room_1',
    slotStart: '2026-05-04T09:00:00.000Z',
    slotEnd: '2026-05-04T09:30:00.000Z',
    expiresAt: '2026-05-04T08:55:00.000Z',
  },
];

export const capacityManagedAvailabilitySnapshot: AvailabilitySnapshot = {
  appointmentType: flexibleDurationPolicy,
  schedule: {
    ...oneHourUtcSchedule,
    appointmentTypeId: 'apt_flexible',
  },
  entityLinks: [
    {
      id: 'resource_capacity_link',
      appointmentTypeId: 'apt_flexible',
      bookableResourceId: 'resource_room_1',
    },
  ],
  resources: [capacityManagedResource],
  appointments: capacityManagedAppointments,
  activeHolds: capacityManagedHolds,
};

export const exclusiveAvailabilitySnapshot: AvailabilitySnapshot = {
  appointmentType: fixedDurationPolicy,
  schedule: oneHourUtcSchedule,
  entityLinks: [
    {
      id: 'person_1_link',
      appointmentTypeId: 'apt_fixed',
      bookablePersonId: 'person_1',
    },
    {
      id: 'person_2_link',
      appointmentTypeId: 'apt_fixed',
      bookablePersonId: 'person_2',
    },
  ],
  resources: [],
  appointments: [
    {
      id: 'appt_person_1',
      appointmentTypeId: 'apt_fixed',
      organizationId: 'org_1',
      customerId: 'customer_3',
      bookablePersonId: 'person_1',
      startTime: '2026-05-04T09:00:00.000Z',
      endTime: '2026-05-04T09:30:00.000Z',
      durationMins: 30,
      status: 'confirmed',
      rescheduleCount: 0,
      capacityBooked: 1,
    },
  ],
  activeHolds: [],
};

export const singlePersonAvailabilitySnapshot: AvailabilitySnapshot = {
  appointmentType: fixedDurationPolicy,
  schedule: oneHourUtcSchedule,
  entityLinks: [
    {
      id: 'single_person_link',
      appointmentTypeId: 'apt_fixed',
      bookablePersonId: 'person_1',
    },
  ],
  resources: [],
  appointments: [],
  activeHolds: [],
};

export const competingHoldSnapshot: AvailabilitySnapshot = {
  ...singlePersonAvailabilitySnapshot,
  activeHolds: [
    {
      id: 'hold_competing',
      appointmentTypeId: 'apt_fixed',
      customerId: 'customer_other',
      bookablePersonId: 'person_1',
      slotStart: '2026-05-04T09:00:00.000Z',
      slotEnd: '2026-05-04T09:30:00.000Z',
      expiresAt: '2026-05-04T09:10:00.000Z',
    },
  ],
};

export const ownedHoldSnapshot: AvailabilitySnapshot = {
  ...singlePersonAvailabilitySnapshot,
  activeHolds: [
    {
      id: 'hold_owned',
      appointmentTypeId: 'apt_fixed',
      customerId: 'customer_1',
      bookablePersonId: 'person_1',
      slotStart: '2026-05-04T09:00:00.000Z',
      slotEnd: '2026-05-04T09:30:00.000Z',
      expiresAt: '2026-05-04T09:10:00.000Z',
    },
  ],
};

export const expiredHoldSnapshot: AvailabilitySnapshot = {
  ...singlePersonAvailabilitySnapshot,
  activeHolds: [
    {
      id: 'hold_expired',
      appointmentTypeId: 'apt_fixed',
      customerId: 'customer_1',
      bookablePersonId: 'person_1',
      slotStart: '2026-05-04T09:00:00.000Z',
      slotEnd: '2026-05-04T09:30:00.000Z',
      expiresAt: '2026-05-04T08:40:00.000Z',
    },
  ],
};
