import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { BookablePersonsService } from './bookable-persons.service';

interface PersonRow {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  designation: string | null;
  availabilityOverrides: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AppointmentTypeRow {
  id: string;
  organizationId: string;
  name: string;
  entityType: EntityType;
}

class FakePrisma {
  persons = new Map<string, PersonRow>();
  appointmentTypes = new Map<string, AppointmentTypeRow>();
  personTypeLinks: Array<{ appointmentTypeId: string; bookablePersonId: string }> =
    [];
  appointmentCount = 0;
  entityLinkCount = 0;

  constructor() {
    this.appointmentTypes.set('at_1', {
      id: 'at_1',
      organizationId: 'org_a',
      name: 'Consultation',
      entityType: EntityType.PERSON,
    });
    this.appointmentTypes.set('at_2', {
      id: 'at_2',
      organizationId: 'org_a',
      name: 'Follow-up',
      entityType: EntityType.PERSON,
    });
  }

  bookablePerson = {
    create: ({ data }: { data: Partial<PersonRow> }) => {
      const id = data.id ?? `p_${this.persons.size + 1}`;
      const row: PersonRow = {
        id,
        organizationId: data.organizationId!,
        name: data.name!,
        contactEmail: data.contactEmail ?? null,
        phone: data.phone ?? null,
        designation: data.designation ?? null,
        availabilityOverrides: data.availabilityOverrides ?? [],
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.persons.set(id, row);
      return Promise.resolve(row);
    },
    findFirst: ({
      where,
      include,
    }: {
      where: { id: string; organizationId: string };
      include?: unknown;
    }) => {
      const p = this.persons.get(where.id);
      if (!p || p.organizationId !== where.organizationId) {
        return Promise.resolve(null);
      }
      if (!include) return Promise.resolve(p);
      return Promise.resolve({
        ...p,
        appointmentTypeEntities: this.personTypeLinks
          .filter((l) => l.bookablePersonId === p.id)
          .map((l) => ({
            appointmentType: this.appointmentTypes.get(l.appointmentTypeId),
          })),
      });
    },
    findMany: ({ where }: { where: Record<string, unknown> }) => {
      const list = Array.from(this.persons.values()).filter((p) => {
        if (p.organizationId !== where.organizationId) return false;
        if (where.isActive !== undefined && p.isActive !== where.isActive)
          return false;
        return true;
      });
      return Promise.resolve(
        list.map((p) => ({
          ...p,
          appointmentTypeEntities: this.personTypeLinks
            .filter((l) => l.bookablePersonId === p.id)
            .map((l) => ({
              appointmentType: this.appointmentTypes.get(l.appointmentTypeId),
            })),
        })),
      );
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<PersonRow>;
    }) => {
      const existing = this.persons.get(where.id)!;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.persons.set(where.id, updated);
      return Promise.resolve(updated);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.persons.get(where.id)!;
      this.persons.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  appointmentType = {
    findMany: ({ where }: { where: { id: { in: string[] } } }) => {
      const ids = where.id.in;
      const rows = Array.from(this.appointmentTypes.values()).filter((row) =>
        ids.includes(row.id),
      );
      return Promise.resolve(rows.map((r) => ({ id: r.id })));
    },
  };

  appointmentTypeEntity = {
    createMany: ({
      data,
    }: {
      data: Array<{ appointmentTypeId: string; bookablePersonId: string }>;
    }) => {
      this.personTypeLinks.push(...data);
      return Promise.resolve({ count: data.length });
    },
    deleteMany: ({ where }: { where: { bookablePersonId: string } }) => {
      const before = this.personTypeLinks.length;
      this.personTypeLinks = this.personTypeLinks.filter(
        (l) => l.bookablePersonId !== where.bookablePersonId,
      );
      return Promise.resolve({ count: before - this.personTypeLinks.length });
    },
    count: () => Promise.resolve(this.entityLinkCount),
  };

  appointment = { count: () => Promise.resolve(this.appointmentCount) };

  $transaction = async <T>(fn: (tx: FakePrisma) => Promise<T>): Promise<T> =>
    fn(this);
}

class FakeOrganizations {
  constructor(private readonly orgs: Record<string, string>) {}
  requireForOrganiser(organiserId: string) {
    const id = this.orgs[organiserId];
    if (!id) throw new NotFoundException('Organization not found');
    return Promise.resolve({ id });
  }
}

describe('BookablePersonsService', () => {
  let prisma: FakePrisma;
  let service: BookablePersonsService;

  beforeEach(() => {
    prisma = new FakePrisma();
    const orgs = new FakeOrganizations({ u1: 'org_a', u2: 'org_b' });
    service = new BookablePersonsService(
      prisma as unknown as never,
      orgs as unknown as never,
    );
  });

  it('creates a person with appointment type assignments', async () => {
    const person = await service.create('u1', {
      name: 'Dr. Rao',
      designation: 'Physician',
      contactEmail: 'Rao@CityCare.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    expect(person.organizationId).toBe('org_a');
    expect(person.contactEmail).toBe('rao@citycare.com');
    expect(person.assignedAppointmentTypes).toHaveLength(1);
  });

  it('refuses to return a person from another organization (cross-tenant 404)', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      designation: 'Physician',
      contactEmail: 'rao@x.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    await expect(service.findOneForOrganiser('u2', created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists only active by default', async () => {
    await service.create('u1', {
      name: 'A',
      designation: 'A',
      contactEmail: 'a@x.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    const created = await service.create('u1', {
      name: 'B',
      designation: 'B',
      contactEmail: 'b@x.com',
      phone: '9876501235',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    await service.update('u1', created.id, { isActive: false });

    const active = await service.list('u1', {});
    expect(active.map((p) => p.name)).toEqual(['A']);
    const all = await service.list('u1', { includeInactive: true });
    expect(all).toHaveLength(2);
  });

  it('soft-deletes when appointments or entity links exist', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      designation: 'Physician',
      contactEmail: 'rao@x.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    prisma.appointmentCount = 3;
    const result = await service.remove('u1', created.id);
    expect(result.deleted).toBe('soft');
    const stored = prisma.persons.get(created.id)!;
    expect(stored.isActive).toBe(false);
  });

  it('hard-deletes when no references exist', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      designation: 'Physician',
      contactEmail: 'rao@x.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    prisma.personTypeLinks = [];
    const result = await service.remove('u1', created.id);
    expect(result.deleted).toBe('hard');
    expect(prisma.persons.get(created.id)).toBeUndefined();
  });

  it('refuses to soft-delete an already inactive person with references', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      designation: 'Physician',
      contactEmail: 'rao@x.com',
      phone: '9876501234',
      appointmentTypeIds: ['at_1'],
      availabilityOverrides: [],
    });
    await service.update('u1', created.id, { isActive: false });
    prisma.appointmentCount = 1;
    await expect(service.remove('u1', created.id)).rejects.toThrow(
      ConflictException,
    );
  });
});
