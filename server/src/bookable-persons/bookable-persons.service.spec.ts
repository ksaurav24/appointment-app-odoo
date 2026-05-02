import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookablePersonsService } from './bookable-persons.service';

interface PersonRow {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrisma {
  persons = new Map<string, PersonRow>();
  appointmentCount = 0;
  entityLinkCount = 0;

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
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.persons.set(id, row);
      return Promise.resolve(row);
    },
    findFirst: ({
      where,
    }: {
      where: { id: string; organizationId: string };
    }) => {
      const p = this.persons.get(where.id);
      if (!p || p.organizationId !== where.organizationId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(p);
    },
    findMany: ({
      where,
    }: {
      where: { organizationId: string; isActive?: boolean };
    }) => {
      const list = Array.from(this.persons.values()).filter(
        (p) =>
          p.organizationId === where.organizationId &&
          (where.isActive === undefined || p.isActive === where.isActive),
      );
      return Promise.resolve(list);
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
  appointment = { count: () => Promise.resolve(this.appointmentCount) };
  appointmentTypeEntity = {
    count: () => Promise.resolve(this.entityLinkCount),
  };
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

  it('creates a person scoped to the organiser organization', async () => {
    const person = await service.create('u1', {
      name: 'Dr. Rao',
      contactEmail: 'Rao@CityCare.com',
    });
    expect(person.organizationId).toBe('org_a');
    expect(person.contactEmail).toBe('rao@citycare.com');
    expect(person.isActive).toBe(true);
  });

  it('refuses to return a person from another organization (cross-tenant 404)', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      contactEmail: 'rao@x.com',
    });
    await expect(service.findOneForOrganiser('u2', created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lists only active by default', async () => {
    await service.create('u1', { name: 'A', contactEmail: 'a@x.com' });
    const created = await service.create('u1', {
      name: 'B',
      contactEmail: 'b@x.com',
    });
    await service.update('u1', created.id, { isActive: false });

    const active = await service.list('u1');
    expect(active.map((p) => p.name)).toEqual(['A']);
    const all = await service.list('u1', true);
    expect(all).toHaveLength(2);
  });

  it('soft-deletes when appointments or entity links exist', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      contactEmail: 'rao@x.com',
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
      contactEmail: 'rao@x.com',
    });
    const result = await service.remove('u1', created.id);
    expect(result.deleted).toBe('hard');
    expect(prisma.persons.get(created.id)).toBeUndefined();
  });

  it('refuses to soft-delete an already inactive person with references', async () => {
    const created = await service.create('u1', {
      name: 'Dr. Rao',
      contactEmail: 'rao@x.com',
    });
    await service.update('u1', created.id, { isActive: false });
    prisma.appointmentCount = 1;
    await expect(service.remove('u1', created.id)).rejects.toThrow(
      ConflictException,
    );
  });
});
