import { performance } from 'node:perf_hooks';
import {
  getAvailabilityFromSnapshot,
} from '../src/availability/availability-engine.ts';
import type {
  ActiveHold,
  AppointmentTypeEntityLink,
  AppointmentTypePolicy,
  AvailabilitySnapshot,
  BookableResource,
  ExistingAppointment,
  ScheduleDefinition,
} from '../src/domain/models.ts';
import { addMinutesToIso } from '../src/shared/time.ts';
import type { ISODate } from '../src/domain/value-objects.ts';

type AssignmentShape = 'resource' | 'person' | 'paired' | 'mixed';

type ScenarioConfig = {
  name: string;
  assignmentCount: number;
  appointmentCount: number;
  holdCount: number;
  runs: number;
  assignmentShape: AssignmentShape;
};

const date = '2026-05-04' as ISODate;
const timezone = 'UTC';
const dayOfWeek = 1; // Monday
const startMinutes = 9 * 60;
const endMinutes = 17 * 60;
const durationMinutes = 30;
const stepMinutes = 15;

const scale = readNumberEnv('STRESS_SCALE', 1);
const runsOverride = readNumberEnv('STRESS_RUNS', 0);

const scenarios: ScenarioConfig[] = [
  {
    name: 'sanity',
    assignmentCount: Math.max(5, Math.floor(10 * scale)),
    appointmentCount: Math.max(10, Math.floor(20 * scale)),
    holdCount: Math.max(5, Math.floor(10 * scale)),
    runs: runsOverride || 3,
    assignmentShape: 'resource',
  },
  {
    name: 'medium',
    assignmentCount: Math.max(25, Math.floor(100 * scale)),
    appointmentCount: Math.max(200, Math.floor(1000 * scale)),
    holdCount: Math.max(100, Math.floor(500 * scale)),
    runs: runsOverride || 3,
    assignmentShape: 'resource',
  },
  {
    name: 'large',
    assignmentCount: Math.max(75, Math.floor(500 * scale)),
    appointmentCount: Math.max(1000, Math.floor(5000 * scale)),
    holdCount: Math.max(400, Math.floor(2000 * scale)),
    runs: runsOverride || 2,
    assignmentShape: 'resource',
  },
  {
    name: 'paired',
    assignmentCount: Math.max(50, Math.floor(250 * scale)),
    appointmentCount: Math.max(500, Math.floor(2500 * scale)),
    holdCount: Math.max(250, Math.floor(1250 * scale)),
    runs: runsOverride || 2,
    assignmentShape: 'paired',
  },
  {
    name: 'mixed',
    assignmentCount: Math.max(60, Math.floor(300 * scale)),
    appointmentCount: Math.max(800, Math.floor(4000 * scale)),
    holdCount: Math.max(300, Math.floor(1500 * scale)),
    runs: runsOverride || 2,
    assignmentShape: 'mixed',
  },
];

for (const scenario of scenarios) {
  const rng = createRng(hashString(scenario.name));
  const snapshot = buildSnapshot({
    assignmentCount: scenario.assignmentCount,
    appointmentCount: scenario.appointmentCount,
    holdCount: scenario.holdCount,
    assignmentShape: scenario.assignmentShape,
    rng,
  });

  const expectedSlotsPerAssignment = Math.floor(
    (endMinutes - startMinutes - durationMinutes) / stepMinutes,
  ) + 1;
  const expectedSlotCount = expectedSlotsPerAssignment * scenario.assignmentCount;

  let totalDurationMs = 0;
  let lastSlotCount = 0;
  let lastAvailableCount = 0;

  for (let run = 0; run < scenario.runs; run += 1) {
    const start = performance.now();
    const availability = getAvailabilityFromSnapshot({
      appointmentTypeId: snapshot.appointmentType.id,
      date,
      requestedDuration: durationMinutes,
      requestedCapacity: 1,
      snapshot,
      blockingStatuses: ['confirmed'],
      now: '2026-05-04T08:00:00.000Z',
    });
    const end = performance.now();

    totalDurationMs += end - start;
    lastSlotCount = availability.slots.length;
    lastAvailableCount = availability.slots.filter((slot) => slot.isAvailable)
      .length;

    if (availability.slots.length !== expectedSlotCount) {
      throw new Error(
        `Slot count mismatch for ${scenario.name}: expected ${expectedSlotCount}, got ${availability.slots.length}`,
      );
    }

    if (availability.slots.some((slot) => Number.isNaN(slot.remainingCapacity))) {
      throw new Error(`NaN capacity detected for ${scenario.name}`);
    }
  }

  const avgMs = totalDurationMs / scenario.runs;
  const throughput = expectedSlotCount / (avgMs / 1000);

  console.log(`\nScenario: ${scenario.name}`);
  console.log(`Assignments: ${scenario.assignmentCount}`);
  console.log(`Appointments: ${scenario.appointmentCount}`);
  console.log(`Holds: ${scenario.holdCount}`);
  console.log(`Slots per assignment: ${expectedSlotsPerAssignment}`);
  console.log(`Total slots: ${lastSlotCount}`);
  console.log(`Available slots: ${lastAvailableCount}`);
  console.log(`Avg duration: ${avgMs.toFixed(2)}ms`);
  console.log(`Throughput: ${throughput.toFixed(0)} slots/sec`);
}

function buildSnapshot(input: {
  assignmentCount: number;
  appointmentCount: number;
  holdCount: number;
  assignmentShape: AssignmentShape;
  rng: () => number;
}): AvailabilitySnapshot {
  const appointmentType = buildAppointmentType();
  const schedule = buildSchedule(appointmentType.id);
  const { resources, entityLinks, persons } = buildAssignments({
    appointmentTypeId: appointmentType.id,
    assignmentCount: input.assignmentCount,
    assignmentShape: input.assignmentShape,
  });
  const appointments = buildAppointments({
    appointmentTypeId: appointmentType.id,
    appointmentCount: input.appointmentCount,
    resources,
    persons,
    rng: input.rng,
  });
  const activeHolds = buildActiveHolds({
    appointmentTypeId: appointmentType.id,
    holdCount: input.holdCount,
    resources,
    persons,
    rng: input.rng,
  });

  return {
    appointmentType,
    schedule,
    entityLinks,
    resources,
    appointments,
    activeHolds,
  };
}

function buildAppointmentType(): AppointmentTypePolicy {
  return {
    id: 'apt_stress',
    organizationId: 'org_1',
    name: 'Stress Test',
    slug: 'stress-test',
    entityType: 'resource',
    scheduleType: 'weekly',
    durationMode: 'fixed',
    durationMinutes,
    durationStepMins: stepMinutes,
    maxBookingsPerSlot: 5,
    manageCapacity: true,
    manualConfirmation: false,
    cancellationAllowed: true,
    rescheduleAllowed: true,
    isPublished: true,
  };
}

function buildSchedule(appointmentTypeId: string): ScheduleDefinition {
  return {
    id: 'schedule_stress',
    appointmentTypeId,
    scheduleType: 'weekly',
    timezone,
    rules: [
      {
        id: 'rule_stress',
        scheduleId: 'schedule_stress',
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      },
    ],
  };
}

function buildAssignments(input: {
  appointmentTypeId: string;
  assignmentCount: number;
  assignmentShape: AssignmentShape;
}): {
  resources: BookableResource[];
  entityLinks: AppointmentTypeEntityLink[];
  persons: string[];
} {
  const resources: BookableResource[] = [];
  const entityLinks: AppointmentTypeEntityLink[] = [];
  const persons: string[] = [];

  for (let index = 0; index < input.assignmentCount; index += 1) {
    const resourceId = `resource_${index + 1}`;
    const personId = `person_${index + 1}`;

    if (input.assignmentShape !== 'person') {
      resources.push({
        id: resourceId,
        organizationId: 'org_1',
        name: `Resource ${index + 1}`,
        resourceType: 'room',
        capacity: 5,
        isActive: true,
      });
    }

    if (input.assignmentShape !== 'resource') {
      persons.push(personId);
    }

    entityLinks.push(
      buildEntityLink({
        appointmentTypeId: input.appointmentTypeId,
        index,
        resourceId,
        personId,
        assignmentShape: input.assignmentShape,
      }),
    );
  }

  return { resources, entityLinks, persons };
}

function buildEntityLink(input: {
  appointmentTypeId: string;
  index: number;
  resourceId: string;
  personId: string;
  assignmentShape: AssignmentShape;
}): AppointmentTypeEntityLink {
  if (input.assignmentShape === 'resource') {
    return {
      id: `link_${input.index + 1}`,
      appointmentTypeId: input.appointmentTypeId,
      bookableResourceId: input.resourceId,
    };
  }

  if (input.assignmentShape === 'person') {
    return {
      id: `link_${input.index + 1}`,
      appointmentTypeId: input.appointmentTypeId,
      bookablePersonId: input.personId,
    };
  }

  if (input.assignmentShape === 'paired') {
    return {
      id: `link_${input.index + 1}`,
      appointmentTypeId: input.appointmentTypeId,
      bookablePersonId: input.personId,
      bookableResourceId: input.resourceId,
    };
  }

  const usePair = input.index % 3 === 0;
  const usePersonOnly = input.index % 3 === 1;
  let bookablePersonId: string | null = null;
  let bookableResourceId: string | null = null;

  if (usePair) {
    bookablePersonId = input.personId;
    bookableResourceId = input.resourceId;
  } else if (usePersonOnly) {
    bookablePersonId = input.personId;
  } else {
    bookableResourceId = input.resourceId;
  }

  return {
    id: `link_${input.index + 1}`,
    appointmentTypeId: input.appointmentTypeId,
    bookablePersonId,
    bookableResourceId,
  };
}

function buildAppointments(input: {
  appointmentTypeId: string;
  appointmentCount: number;
  resources: BookableResource[];
  persons: string[];
  rng: () => number;
}): ExistingAppointment[] {
  const appointments: ExistingAppointment[] = [];
  const maxAppointments = input.appointmentCount;

  for (let index = 0; index < maxAppointments; index += 1) {
    const resourceId = input.resources[index % input.resources.length]?.id ?? null;
    const personId = input.persons[index % input.persons.length] ?? null;
    if (!resourceId && !personId) {
      break;
    }
    const slotStart = randomSlotStart(input.rng);
    appointments.push({
      id: `appt_${index + 1}`,
      appointmentTypeId: input.appointmentTypeId,
      organizationId: 'org_1',
      customerId: `customer_${index + 1}`,
      bookablePersonId: personId,
      bookableResourceId: resourceId,
      startTime: slotStart,
      endTime: addMinutesToIso(slotStart, durationMinutes),
      durationMins: durationMinutes,
      status: 'confirmed',
      rescheduleCount: 0,
      capacityBooked: (index % 2) + 1,
    });
  }

  return appointments;
}

function buildActiveHolds(input: {
  appointmentTypeId: string;
  holdCount: number;
  resources: BookableResource[];
  persons: string[];
  rng: () => number;
}): ActiveHold[] {
  const activeHolds: ActiveHold[] = [];
  const maxHolds = input.holdCount;

  for (let index = 0; index < maxHolds; index += 1) {
    const resourceId = input.resources[index % input.resources.length]?.id ?? null;
    const personId = input.persons[index % input.persons.length] ?? null;
    if (!resourceId && !personId) {
      break;
    }
    const slotStart = randomSlotStart(input.rng);
    const holdBase = {
      id: `hold_${index + 1}`,
      appointmentTypeId: input.appointmentTypeId,
      customerId: `customer_${index + 1}`,
      bookablePersonId: personId,
      bookableResourceId: resourceId,
      slotStart,
      slotEnd: addMinutesToIso(slotStart, durationMinutes),
      expiresAt: '2026-05-04T09:45:00.000Z',
    } satisfies Omit<ActiveHold, 'requestedCapacity'>;
    const requestedCapacity = index % 3 === 0 ? null : 1;

    activeHolds.push({
      ...holdBase,
      ...(requestedCapacity === null
        ? {}
        : { requestedCapacity }),
    });
  }

  return activeHolds;
}

function randomSlotStart(rng: () => number): string {
  const slotCount = Math.floor(
    (endMinutes - startMinutes - durationMinutes) / stepMinutes,
  ) + 1;
  const slotIndex = Math.floor(rng() * slotCount);
  const minutesFromStart = startMinutes + slotIndex * stepMinutes;

  return toIsoFromMinutes(minutesFromStart);
}

function toIsoFromMinutes(minutesFromStart: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  const offset = minutesFromStart * 60_000;
  return new Date(base.getTime() + offset).toISOString();
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createRng(seed = 1): () => number {
  let state = seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.codePointAt(index) ?? 0;
    hash = (hash << 5) - hash + code;
    hash = Math.trunc(hash);
  }
  return Math.abs(hash) + 1;
}
