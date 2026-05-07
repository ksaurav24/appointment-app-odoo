/* eslint-disable no-console */
import {
  AppointmentStatus,
  AssignmentMode,
  DurationMode,
  EntityType,
  OrganizationApprovalStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  QuestionType,
  Role,
  ScheduleType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Hardcoded demo password used for every seeded account.
const DEMO_PASSWORD = 'Demo@12345';
// Lower bcrypt cost so seeding is fast — this is a test-only seed.
const BCRYPT_COST = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SeedUserInput = {
  email: string;
  fullName: string;
  role: Role;
};

async function upsertUser(
  input: SeedUserInput,
  passwordHash: string,
): Promise<string> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: input.fullName,
      role: input.role,
    },
    create: {
      email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      emailVerified: true,
    },
    select: { id: true },
  });
  return user.id;
}

type OrgSeed = {
  slug: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  timezone: string;
  organiser: SeedUserInput;
};

async function upsertOrganization(
  org: OrgSeed,
  passwordHash: string,
): Promise<string> {
  const organiserId = await upsertUser(org.organiser, passwordHash);

  const result = await prisma.organization.upsert({
    where: { slug: org.slug },
    update: {
      name: org.name,
      description: org.description,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      address: org.address,
      timezone: org.timezone,
      approvalStatus: OrganizationApprovalStatus.APPROVED,
      approvedAt: new Date(),
      isActive: true,
    },
    create: {
      slug: org.slug,
      name: org.name,
      description: org.description,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      address: org.address,
      timezone: org.timezone,
      organiserId,
      approvalStatus: OrganizationApprovalStatus.APPROVED,
      approvedAt: new Date(),
    },
    select: { id: true },
  });
  return result.id;
}

async function upsertBookablePerson(
  organizationId: string,
  data: {
    name: string;
    contactEmail?: string;
    phone?: string;
    designation?: string;
  },
): Promise<string> {
  const existing = await prisma.bookablePerson.findFirst({
    where: { organizationId, name: data.name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.bookablePerson.create({
    data: { organizationId, ...data },
    select: { id: true },
  });
  return created.id;
}

async function upsertBookableResource(
  organizationId: string,
  data: {
    name: string;
    resourceType?: string;
    description?: string;
    capacity?: number;
    location?: string;
  },
): Promise<string> {
  const existing = await prisma.bookableResource.findFirst({
    where: { organizationId, name: data.name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.bookableResource.create({
    data: { organizationId, ...data },
    select: { id: true },
  });
  return created.id;
}

type AppointmentTypeSeed = {
  slug: string;
  name: string;
  description: string;
  entityType: EntityType;
  scheduleType: ScheduleType;
  durationMode: DurationMode;
  durationMinutes?: number;
  minDurationMins?: number;
  maxDurationMins?: number;
  durationStepMins?: number;
  maxBookingsPerSlot?: number;
  manageCapacity?: boolean;
  manualConfirmation?: boolean;
  advancePaymentEnabled?: boolean;
  advancePaymentAmount?: number;
  assignmentMode?: AssignmentMode;
  cancellationAllowed?: boolean;
  cancellationWindowHours?: number;
  rescheduleAllowed?: boolean;
  rescheduleWindowHours?: number;
  maxReschedulesAllowed?: number;
  isPublished?: boolean;
  isOnline?: boolean;
  personIds?: string[];
  resourceIds?: string[];
  schedule: {
    timezone: string;
    rules: Array<{
      dayOfWeek?: number;
      specificDate?: Date;
      startTime: string;
      endTime: string;
      isAvailable?: boolean;
    }>;
  };
  questions?: Array<{
    questionText: string;
    questionType: QuestionType;
    isRequired?: boolean;
    options?: unknown;
    displayOrder?: number;
  }>;
};

async function upsertAppointmentType(
  organizationId: string,
  seed: AppointmentTypeSeed,
): Promise<string> {
  const data: Prisma.AppointmentTypeUncheckedCreateInput = {
    organizationId,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    entityType: seed.entityType,
    scheduleType: seed.scheduleType,
    durationMode: seed.durationMode,
    durationMinutes: seed.durationMinutes,
    minDurationMins: seed.minDurationMins,
    maxDurationMins: seed.maxDurationMins,
    durationStepMins: seed.durationStepMins,
    maxBookingsPerSlot: seed.maxBookingsPerSlot ?? 1,
    manageCapacity: seed.manageCapacity ?? false,
    manualConfirmation: seed.manualConfirmation ?? false,
    advancePaymentEnabled: seed.advancePaymentEnabled ?? false,
    advancePaymentAmount:
      seed.advancePaymentAmount !== undefined
        ? new Prisma.Decimal(seed.advancePaymentAmount)
        : null,
    assignmentMode: seed.assignmentMode ?? AssignmentMode.AUTO,
    cancellationAllowed: seed.cancellationAllowed ?? true,
    cancellationWindowHours: seed.cancellationWindowHours,
    rescheduleAllowed: seed.rescheduleAllowed ?? true,
    rescheduleWindowHours: seed.rescheduleWindowHours,
    maxReschedulesAllowed: seed.maxReschedulesAllowed,
    isPublished: seed.isPublished ?? true,
    isOnline: seed.isOnline ?? false,
    shareToken: crypto.randomBytes(16).toString('hex'),
  };

  const result = await prisma.appointmentType.upsert({
    where: {
      organizationId_slug: { organizationId, slug: seed.slug },
    },
    update: { ...data, shareToken: undefined },
    create: data,
    select: { id: true },
  });
  const appointmentTypeId = result.id;

  // Reset entity links each run so the seed is the source of truth.
  await prisma.appointmentTypeEntity.deleteMany({
    where: { appointmentTypeId },
  });
  for (const personId of seed.personIds ?? []) {
    await prisma.appointmentTypeEntity.create({
      data: { appointmentTypeId, bookablePersonId: personId },
    });
  }
  for (const resourceId of seed.resourceIds ?? []) {
    await prisma.appointmentTypeEntity.create({
      data: { appointmentTypeId, bookableResourceId: resourceId },
    });
  }

  await prisma.schedule.deleteMany({ where: { appointmentTypeId } });
  await prisma.schedule.create({
    data: {
      appointmentTypeId,
      scheduleType: seed.scheduleType,
      timezone: seed.schedule.timezone,
      rules: {
        create: seed.schedule.rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          specificDate: r.specificDate,
          startTime: r.startTime,
          endTime: r.endTime,
          isAvailable: r.isAvailable ?? true,
        })),
      },
    },
  });

  await prisma.bookingQuestion.deleteMany({ where: { appointmentTypeId } });
  if (seed.questions?.length) {
    await prisma.bookingQuestion.createMany({
      data: seed.questions.map((q, idx) => ({
        appointmentTypeId,
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired ?? false,
        options: (q.options as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        displayOrder: q.displayOrder ?? idx,
      })),
    });
  }

  return appointmentTypeId;
}

function makeConfirmationCode(): string {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

function atTime(daysFromNow: number, hours: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function createSampleAppointment(args: {
  organizationId: string;
  appointmentTypeId: string;
  customerId: string;
  bookablePersonId?: string;
  bookableResourceId?: string;
  start: Date;
  durationMins: number;
  status: AppointmentStatus;
  paymentStatus?: PaymentStatus;
  totalAmount?: number;
  capacityBooked?: number;
  cancellationReason?: string;
}): Promise<void> {
  const end = new Date(args.start.getTime() + args.durationMins * 60_000);

  const existing = await prisma.appointment.findFirst({
    where: {
      appointmentTypeId: args.appointmentTypeId,
      customerId: args.customerId,
      startTime: args.start,
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.appointment.create({
    data: {
      appointmentTypeId: args.appointmentTypeId,
      organizationId: args.organizationId,
      customerId: args.customerId,
      bookablePersonId: args.bookablePersonId,
      bookableResourceId: args.bookableResourceId,
      startTime: args.start,
      endTime: end,
      durationMins: args.durationMins,
      status: args.status,
      paymentStatus: args.paymentStatus ?? PaymentStatus.PENDING,
      totalAmount:
        args.totalAmount !== undefined
          ? new Prisma.Decimal(args.totalAmount)
          : null,
      capacityBooked: args.capacityBooked ?? 1,
      cancellationReason: args.cancellationReason,
      cancelledAt:
        args.status === AppointmentStatus.CANCELLED ? new Date() : null,
      confirmationCode: makeConfirmationCode(),
    },
  });
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

async function seedDemoData(): Promise<void> {
  console.log(`Seeding demo data (default password: ${DEMO_PASSWORD})`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

  // ----------------- Customers (shared across orgs) -----------------
  const customers = await Promise.all(
    [
      { email: 'aarav.sharma@example.com', fullName: 'Aarav Sharma' },
      { email: 'priya.iyer@example.com', fullName: 'Priya Iyer' },
      { email: 'rohit.malhotra@example.com', fullName: 'Rohit Malhotra' },
      { email: 'maya.thomas@example.com', fullName: 'Maya Thomas' },
      { email: 'ishaan.khan@example.com', fullName: 'Ishaan Khan' },
    ].map((c) => upsertUser({ ...c, role: Role.CUSTOMER }, passwordHash)),
  );
  const [aarav, priya, rohit, maya, ishaan] = customers;

  // ====================================================================
  // 1. Glow Aesthetic — clinical management for skin & hair
  // ====================================================================
  const glowOrgId = await upsertOrganization(
    {
      slug: 'glow-aesthetic',
      name: 'Glow Aesthetic Skin & Hair Clinic',
      description:
        'Full-service dermatology, trichology and aesthetic treatments.',
      contactEmail: 'hello@glowaesthetic.example.com',
      contactPhone: '+91-9000-100-100',
      address: '12 Wellness Avenue, Bengaluru, KA 560001',
      timezone: 'Asia/Kolkata',
      organiser: {
        email: 'organiser@glowaesthetic.example.com',
        fullName: 'Dr. Neha Kapoor',
        role: Role.ORGANIZER,
      },
    },
    passwordHash,
  );

  const glowDrNeha = await upsertBookablePerson(glowOrgId, {
    name: 'Dr. Neha Kapoor',
    contactEmail: 'neha@glowaesthetic.example.com',
    designation: 'Senior Dermatologist',
  });
  const glowDrArjun = await upsertBookablePerson(glowOrgId, {
    name: 'Dr. Arjun Reddy',
    contactEmail: 'arjun@glowaesthetic.example.com',
    designation: 'Trichologist',
  });
  const glowTherapist = await upsertBookablePerson(glowOrgId, {
    name: 'Sana Verma',
    contactEmail: 'sana@glowaesthetic.example.com',
    designation: 'Laser Therapist',
  });
  const glowRoom1 = await upsertBookableResource(glowOrgId, {
    name: 'Consult Room A',
    resourceType: 'room',
    capacity: 1,
    location: 'Ground Floor',
  });
  const glowLaserBay = await upsertBookableResource(glowOrgId, {
    name: 'Laser Treatment Bay',
    resourceType: 'room',
    capacity: 1,
    location: '1st Floor',
  });

  const weekdaysClinic = [1, 2, 3, 4, 5, 6].map((d) => ({
    dayOfWeek: d,
    startTime: '09:00',
    endTime: '18:00',
  }));

  // (a) PERSON / WEEKLY / FIXED / AUTO — basic dermatology consult
  const glowDermAppt = await upsertAppointmentType(glowOrgId, {
    slug: 'dermatology-consultation',
    name: 'Dermatology Consultation',
    description: '30-minute in-clinic consultation with a dermatologist.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 30,
    assignmentMode: AssignmentMode.AUTO,
    cancellationWindowHours: 12,
    rescheduleWindowHours: 12,
    personIds: [glowDrNeha, glowDrArjun],
    schedule: { timezone: 'Asia/Kolkata', rules: weekdaysClinic },
    questions: [
      {
        questionText: 'Briefly describe your skin concern',
        questionType: QuestionType.TEXT,
        isRequired: true,
      },
      {
        questionText: 'Are you currently using any prescription medication?',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['Yes', 'No'],
        isRequired: true,
      },
    ],
  });

  // (b) PERSON / WEEKLY / FIXED / MANUAL assignment + manual confirmation
  const glowHairConsultAppt = await upsertAppointmentType(glowOrgId, {
    slug: 'hair-transplant-consultation',
    name: 'Hair Transplant Consultation',
    description:
      'Detailed consult with the trichology lead. Requires manual approval.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 60,
    assignmentMode: AssignmentMode.MANUAL,
    manualConfirmation: true,
    cancellationWindowHours: 24,
    maxReschedulesAllowed: 2,
    personIds: [glowDrArjun],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [
        { dayOfWeek: 2, startTime: '11:00', endTime: '17:00' },
        { dayOfWeek: 4, startTime: '11:00', endTime: '17:00' },
      ],
    },
    questions: [
      {
        questionText: 'How long have you been experiencing hair loss?',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['< 6 months', '6-12 months', '1-3 years', '> 3 years'],
        isRequired: true,
      },
    ],
  });

  // (c) PERSON / WEEKLY / VARIABLE / AUTO + advance payment — laser hair removal
  const glowLaserAppt = await upsertAppointmentType(glowOrgId, {
    slug: 'laser-hair-removal',
    name: 'Laser Hair Removal',
    description:
      'Variable-duration laser session priced by area. Advance payment required.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.VARIABLE,
    minDurationMins: 30,
    maxDurationMins: 90,
    durationStepMins: 15,
    advancePaymentEnabled: true,
    advancePaymentAmount: 1500,
    assignmentMode: AssignmentMode.AUTO,
    cancellationWindowHours: 24,
    personIds: [glowTherapist],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        startTime: '10:00',
        endTime: '19:00',
      })),
    },
    questions: [
      {
        questionText: 'Treatment area',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['Face', 'Underarms', 'Arms', 'Legs', 'Back'],
        isRequired: true,
      },
    ],
  });

  // (d) PERSON / WEEKLY / FIXED / GROUP capacity — skincare workshop
  const glowWorkshopAppt = await upsertAppointmentType(glowOrgId, {
    slug: 'skincare-workshop',
    name: 'Skincare 101 Group Workshop',
    description: 'Monthly group workshop on at-home skincare basics.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 120,
    maxBookingsPerSlot: 12,
    manageCapacity: true,
    advancePaymentEnabled: true,
    advancePaymentAmount: 500,
    personIds: [glowDrNeha],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [{ dayOfWeek: 6, startTime: '14:00', endTime: '17:00' }],
    },
    questions: [
      {
        questionText: 'How many guests are you booking for?',
        questionType: QuestionType.NUMBER,
        isRequired: true,
      },
    ],
  });

  // (e) PERSON / WEEKLY / FIXED / ONLINE — telederm consult
  const glowOnlineAppt = await upsertAppointmentType(glowOrgId, {
    slug: 'online-skin-consultation',
    name: 'Online Skin Consultation',
    description: 'Video consultation with a dermatologist.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 20,
    isOnline: true,
    advancePaymentEnabled: true,
    advancePaymentAmount: 800,
    assignmentMode: AssignmentMode.AUTO,
    personIds: [glowDrNeha, glowDrArjun],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        startTime: '19:00',
        endTime: '22:00',
      })),
    },
    questions: [
      {
        questionText: 'Upload links to any reference photos (optional)',
        questionType: QuestionType.TEXT,
      },
    ],
  });

  // (f) RESOURCE-typed booking — direct laser bay hire
  await upsertAppointmentType(glowOrgId, {
    slug: 'private-laser-bay-hire',
    name: 'Private Laser Bay (resource hire)',
    description:
      'Hire the laser bay directly for a recurring client (resource booking).',
    entityType: EntityType.RESOURCE,
    scheduleType: ScheduleType.FLEXIBLE,
    durationMode: DurationMode.VARIABLE,
    minDurationMins: 60,
    maxDurationMins: 240,
    durationStepMins: 30,
    advancePaymentEnabled: true,
    advancePaymentAmount: 2000,
    isPublished: false,
    resourceIds: [glowLaserBay, glowRoom1],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: weekdaysClinic,
    },
  });

  // ====================================================================
  // 2. TurfPro — sports turf & cricket pitch management
  // ====================================================================
  const turfOrgId = await upsertOrganization(
    {
      slug: 'turfpro-sports',
      name: 'TurfPro Sports Turf Management',
      description:
        'Cricket, football and tennis bookings + coaching at TurfPro grounds.',
      contactEmail: 'bookings@turfpro.example.com',
      contactPhone: '+91-9000-200-200',
      address: '45 Stadium Road, Pune, MH 411001',
      timezone: 'Asia/Kolkata',
      organiser: {
        email: 'organiser@turfpro.example.com',
        fullName: 'Vikram Singh',
        role: Role.ORGANIZER,
      },
    },
    passwordHash,
  );

  const turfCoachKabir = await upsertBookablePerson(turfOrgId, {
    name: 'Coach Kabir Joshi',
    designation: 'Cricket Coach',
  });
  const turfCoachMeera = await upsertBookablePerson(turfOrgId, {
    name: 'Coach Meera Pillai',
    designation: 'Football Coach',
  });
  const turfCricketPitch = await upsertBookableResource(turfOrgId, {
    name: 'Cricket Pitch 1',
    resourceType: 'pitch',
    capacity: 22,
    location: 'North Ground',
  });
  const turfFootballField = await upsertBookableResource(turfOrgId, {
    name: 'Football 5v5 Turf',
    resourceType: 'turf',
    capacity: 14,
    location: 'East Ground',
  });
  const turfTennisCourt = await upsertBookableResource(turfOrgId, {
    name: 'Tennis Court A',
    resourceType: 'court',
    capacity: 4,
    location: 'Indoor Hall',
  });

  // (a) RESOURCE / WEEKLY / FIXED — cricket pitch hourly
  await upsertAppointmentType(turfOrgId, {
    slug: 'cricket-pitch-booking',
    name: 'Cricket Pitch Hourly Booking',
    description: 'Reserve the cricket pitch for one hour. Pay 50% advance.',
    entityType: EntityType.RESOURCE,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 60,
    advancePaymentEnabled: true,
    advancePaymentAmount: 750,
    cancellationWindowHours: 6,
    resourceIds: [turfCricketPitch],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        startTime: '06:00',
        endTime: '22:00',
      })),
    },
    questions: [
      {
        questionText: 'Number of players',
        questionType: QuestionType.NUMBER,
        isRequired: true,
      },
      {
        questionText: 'Need a bowling machine?',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['Yes', 'No'],
      },
    ],
  });

  // (b) RESOURCE / FLEXIBLE / VARIABLE — football turf any-length booking
  const turfFootballAppt = await upsertAppointmentType(turfOrgId, {
    slug: 'football-turf-flexible',
    name: 'Football Turf Flexible Booking',
    description:
      'Book the 5v5 turf for any duration between 1 and 3 hours, any day.',
    entityType: EntityType.RESOURCE,
    scheduleType: ScheduleType.FLEXIBLE,
    durationMode: DurationMode.VARIABLE,
    minDurationMins: 60,
    maxDurationMins: 180,
    durationStepMins: 30,
    advancePaymentEnabled: true,
    advancePaymentAmount: 1000,
    resourceIds: [turfFootballField],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        startTime: '06:00',
        endTime: '23:00',
      })),
    },
  });

  // (c) RESOURCE / WEEKLY / FIXED — tennis court hourly
  await upsertAppointmentType(turfOrgId, {
    slug: 'tennis-court-hourly',
    name: 'Tennis Court Hourly',
    description: 'Indoor tennis court hourly hire.',
    entityType: EntityType.RESOURCE,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 60,
    advancePaymentEnabled: true,
    advancePaymentAmount: 600,
    resourceIds: [turfTennisCourt],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        startTime: '07:00',
        endTime: '22:00',
      })),
    },
  });

  // (d) PERSON / WEEKLY / FIXED / GROUP — coaching clinic with capacity
  const turfCoachingAppt = await upsertAppointmentType(turfOrgId, {
    slug: 'group-coaching-clinic',
    name: 'Group Coaching Clinic',
    description: 'Saturday morning group coaching session (max 12 players).',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 90,
    maxBookingsPerSlot: 12,
    manageCapacity: true,
    advancePaymentEnabled: true,
    advancePaymentAmount: 400,
    personIds: [turfCoachKabir, turfCoachMeera],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [
        { dayOfWeek: 6, startTime: '07:00', endTime: '10:30' },
        { dayOfWeek: 0, startTime: '07:00', endTime: '10:30' },
      ],
    },
    questions: [
      {
        questionText: 'Sport',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['Cricket', 'Football'],
        isRequired: true,
      },
      {
        questionText: 'Player age',
        questionType: QuestionType.NUMBER,
        isRequired: true,
      },
    ],
  });

  // ====================================================================
  // 3. Lumiere Models — modeling agency
  // ====================================================================
  const modelOrgId = await upsertOrganization(
    {
      slug: 'lumiere-models',
      name: 'Lumiere Modeling Agency',
      description:
        'Castings, auditions, portfolio shoots and styling consultations.',
      contactEmail: 'bookings@lumieremodels.example.com',
      contactPhone: '+91-9000-300-300',
      address: '8 Studio Lane, Mumbai, MH 400001',
      timezone: 'Asia/Kolkata',
      organiser: {
        email: 'organiser@lumieremodels.example.com',
        fullName: 'Sahir Mehra',
        role: Role.ORGANIZER,
      },
    },
    passwordHash,
  );

  const modelCastingDir = await upsertBookablePerson(modelOrgId, {
    name: 'Sahir Mehra',
    designation: 'Casting Director',
  });
  const modelStylist = await upsertBookablePerson(modelOrgId, {
    name: 'Aditi Rao',
    designation: 'Senior Stylist',
  });
  const modelPhotographer = await upsertBookablePerson(modelOrgId, {
    name: 'Karan Bhatt',
    designation: 'Lead Photographer',
  });
  const modelStudioA = await upsertBookableResource(modelOrgId, {
    name: 'Studio A (Daylight)',
    resourceType: 'studio',
    capacity: 8,
    location: 'Floor 2',
  });
  const modelStudioB = await upsertBookableResource(modelOrgId, {
    name: 'Studio B (Cyclorama)',
    resourceType: 'studio',
    capacity: 12,
    location: 'Floor 3',
  });

  // (a) PERSON / WEEKLY / FIXED / MANUAL — portfolio casting (curated)
  const modelCastingAppt = await upsertAppointmentType(modelOrgId, {
    slug: 'portfolio-casting',
    name: 'Portfolio Casting Slot',
    description:
      'Submit your portfolio for review with the casting director. Approval required.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 30,
    assignmentMode: AssignmentMode.MANUAL,
    manualConfirmation: true,
    personIds: [modelCastingDir],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [
        { dayOfWeek: 1, startTime: '11:00', endTime: '16:00' },
        { dayOfWeek: 3, startTime: '11:00', endTime: '16:00' },
      ],
    },
    questions: [
      {
        questionText: 'Height (cm)',
        questionType: QuestionType.NUMBER,
        isRequired: true,
      },
      {
        questionText: 'Categories you model for',
        questionType: QuestionType.MULTIPLE_CHOICE,
        options: ['Editorial', 'Commercial', 'Runway', 'Fitness', 'Print'],
        isRequired: true,
      },
      {
        questionText: 'Portfolio link',
        questionType: QuestionType.TEXT,
        isRequired: true,
      },
    ],
  });

  // (b) PERSON / FLEXIBLE / FIXED / GROUP — runway audition
  await upsertAppointmentType(modelOrgId, {
    slug: 'runway-audition-open-call',
    name: 'Runway Audition Open Call',
    description:
      'Open call audition. Multiple candidates per 15-minute slot, scheduled flexibly.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.FLEXIBLE,
    durationMode: DurationMode.FIXED,
    durationMinutes: 15,
    maxBookingsPerSlot: 6,
    manageCapacity: true,
    personIds: [modelCastingDir, modelStylist],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [
        { specificDate: atTime(7, 0), startTime: '10:00', endTime: '17:00' },
        { specificDate: atTime(8, 0), startTime: '10:00', endTime: '17:00' },
      ],
    },
    questions: [
      {
        questionText: 'Have you walked a runway show before?',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['Yes', 'No'],
        isRequired: true,
      },
    ],
  });

  // (c) RESOURCE / WEEKLY / VARIABLE — studio hire
  const modelStudioAppt = await upsertAppointmentType(modelOrgId, {
    slug: 'studio-hire',
    name: 'Studio Hire (Photoshoot)',
    description:
      'Half-day to full-day studio rentals. Variable duration, paid in advance.',
    entityType: EntityType.RESOURCE,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.VARIABLE,
    minDurationMins: 60,
    maxDurationMins: 480,
    durationStepMins: 30,
    advancePaymentEnabled: true,
    advancePaymentAmount: 5000,
    cancellationWindowHours: 48,
    rescheduleWindowHours: 48,
    maxReschedulesAllowed: 1,
    resourceIds: [modelStudioA, modelStudioB],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        startTime: '08:00',
        endTime: '20:00',
      })),
    },
    questions: [
      {
        questionText: 'Type of shoot',
        questionType: QuestionType.SINGLE_CHOICE,
        options: ['Editorial', 'Lookbook', 'Commercial', 'Personal'],
        isRequired: true,
      },
      {
        questionText: 'Crew size',
        questionType: QuestionType.NUMBER,
        isRequired: true,
      },
    ],
  });

  // (d) PERSON / WEEKLY / FIXED / ONLINE — styling consultation (online)
  await upsertAppointmentType(modelOrgId, {
    slug: 'online-style-consultation',
    name: 'Online Style Consultation',
    description: 'Video styling consultation with a senior stylist.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 45,
    isOnline: true,
    advancePaymentEnabled: true,
    advancePaymentAmount: 1200,
    personIds: [modelStylist],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [2, 3, 4].map((d) => ({
        dayOfWeek: d,
        startTime: '18:00',
        endTime: '21:00',
      })),
    },
  });

  // (e) PERSON / WEEKLY / FIXED — full-day photographer booking
  await upsertAppointmentType(modelOrgId, {
    slug: 'photographer-full-day',
    name: 'Photographer Full-Day Booking',
    description: 'Book a lead photographer for a full-day shoot.',
    entityType: EntityType.PERSON,
    scheduleType: ScheduleType.WEEKLY,
    durationMode: DurationMode.FIXED,
    durationMinutes: 480,
    advancePaymentEnabled: true,
    advancePaymentAmount: 10000,
    cancellationWindowHours: 72,
    rescheduleAllowed: false,
    personIds: [modelPhotographer],
    schedule: {
      timezone: 'Asia/Kolkata',
      rules: [1, 2, 3, 4, 5].map((d) => ({
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '18:00',
      })),
    },
  });

  // ====================================================================
  // Sample appointments across statuses & payment states
  // ====================================================================
  console.log('Creating sample appointments...');

  await createSampleAppointment({
    organizationId: glowOrgId,
    appointmentTypeId: glowDermAppt,
    customerId: aarav,
    bookablePersonId: glowDrNeha,
    start: atTime(1, 10, 0),
    durationMins: 30,
    status: AppointmentStatus.CONFIRMED,
  });

  await createSampleAppointment({
    organizationId: glowOrgId,
    appointmentTypeId: glowHairConsultAppt,
    customerId: rohit,
    bookablePersonId: glowDrArjun,
    start: atTime(3, 11, 30),
    durationMins: 60,
    status: AppointmentStatus.PENDING,
  });

  await createSampleAppointment({
    organizationId: glowOrgId,
    appointmentTypeId: glowLaserAppt,
    customerId: priya,
    bookablePersonId: glowTherapist,
    start: atTime(-2, 14, 0),
    durationMins: 45,
    status: AppointmentStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    totalAmount: 1500,
  });

  await createSampleAppointment({
    organizationId: glowOrgId,
    appointmentTypeId: glowWorkshopAppt,
    customerId: maya,
    bookablePersonId: glowDrNeha,
    start: atTime(-7, 14, 0),
    durationMins: 120,
    status: AppointmentStatus.CANCELLED,
    cancellationReason: 'Customer travel plans',
    capacityBooked: 2,
  });

  await createSampleAppointment({
    organizationId: glowOrgId,
    appointmentTypeId: glowOnlineAppt,
    customerId: ishaan,
    bookablePersonId: glowDrArjun,
    start: atTime(2, 19, 30),
    durationMins: 20,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    totalAmount: 800,
  });

  await createSampleAppointment({
    organizationId: turfOrgId,
    appointmentTypeId: turfFootballAppt,
    customerId: rohit,
    bookableResourceId: turfFootballField,
    start: atTime(1, 19, 0),
    durationMins: 90,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    totalAmount: 1500,
  });

  await createSampleAppointment({
    organizationId: turfOrgId,
    appointmentTypeId: turfCoachingAppt,
    customerId: ishaan,
    bookablePersonId: turfCoachKabir,
    start: atTime(-5, 7, 30),
    durationMins: 90,
    status: AppointmentStatus.NO_SHOW,
    paymentStatus: PaymentStatus.PAID,
    totalAmount: 400,
  });

  await createSampleAppointment({
    organizationId: modelOrgId,
    appointmentTypeId: modelCastingAppt,
    customerId: maya,
    bookablePersonId: modelCastingDir,
    start: atTime(4, 12, 0),
    durationMins: 30,
    status: AppointmentStatus.PENDING,
  });

  await createSampleAppointment({
    organizationId: modelOrgId,
    appointmentTypeId: modelStudioAppt,
    customerId: priya,
    bookableResourceId: modelStudioA,
    start: atTime(5, 9, 0),
    durationMins: 240,
    status: AppointmentStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    totalAmount: 5000,
  });

  await createSampleAppointment({
    organizationId: modelOrgId,
    appointmentTypeId: modelStudioAppt,
    customerId: aarav,
    bookableResourceId: modelStudioB,
    start: atTime(-10, 10, 0),
    durationMins: 180,
    status: AppointmentStatus.CANCELLED,
    paymentStatus: PaymentStatus.REFUNDED,
    totalAmount: 5000,
    cancellationReason: 'Shoot moved to next month',
  });

  console.log('---------------------------------------------------------');
  console.log(
    `Demo seed complete. All accounts share password: ${DEMO_PASSWORD}`,
  );
  console.log('  Organisers:');
  console.log('    organiser@glowaesthetic.example.com   (Glow Aesthetic)');
  console.log('    organiser@turfpro.example.com         (TurfPro Sports)');
  console.log('    organiser@lumieremodels.example.com   (Lumiere Models)');
  console.log('  Customers:');
  console.log('    aarav.sharma@example.com');
  console.log('    priya.iyer@example.com');
  console.log('    rohit.malhotra@example.com');
  console.log('    maya.thomas@example.com');
  console.log('    ishaan.khan@example.com');
  console.log('---------------------------------------------------------');
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await seedDemoData();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
