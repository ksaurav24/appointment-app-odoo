import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookableResourcesService } from './bookable-resources.service';

interface ResourceRow {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string | null;
  description: string | null;
  capacity: number;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrisma {
  resources = new Map<string, ResourceRow>();
  appointmentCount = 0;
  entityLinkCount = 0;

  bookableResource = {
    create: ({ data }: { data: Partial<ResourceRow> }) => {
      const id = data.id ?? `r_${this.resources.size + 1}`;
      const row: ResourceRow = {
        id,
        organizationId: data.organizationId!,
        name: data.name!,
        resourceType: data.resourceType ?? null,
        description: data.description ?? null,
        capacity: data.capacity ?? 1,
        location: data.location ?? null,
        isActive: data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.resources.set(id, row);
      return Promise.resolve(row);
    },
    findFirst: ({
      where,
    }: {
      where: { id: string; organizationId: string };
    }) => {
      const r = this.resources.get(where.id);
      if (!r || r.organizationId !== where.organizationId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(r);
    },
    findMany: ({
      where,
    }: {
      where: { organizationId: string; isActive?: boolean };
    }) =>
      Promise.resolve(
        Array.from(this.resources.values()).filter(
          (r) =>
            r.organizationId === where.organizationId &&
            (where.isActive === undefined || r.isActive === where.isActive),
        ),
      ),
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<ResourceRow>;
    }) => {
      const existing = this.resources.get(where.id)!;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      this.resources.set(where.id, updated);
      return Promise.resolve(updated);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.resources.get(where.id)!;
      this.resources.delete(where.id);
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

describe('BookableResourcesService', () => {
  let prisma: FakePrisma;
  let service: BookableResourcesService;

  beforeEach(() => {
    prisma = new FakePrisma();
    const orgs = new FakeOrganizations({ u1: 'org_a', u2: 'org_b' });
    service = new BookableResourcesService(
      prisma as unknown as never,
      orgs as unknown as never,
    );
  });

  it('creates a resource scoped to the organiser organization with default capacity 1', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
    });
    expect(r.organizationId).toBe('org_a');
    expect(r.capacity).toBe(1);
  });

  it('honors explicit capacity', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
      capacity: 22,
    });
    expect(r.capacity).toBe(22);
  });

  it('refuses cross-tenant fetch (404)', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
    });
    await expect(service.findOneForOrganiser('u2', r.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('soft-deletes when references exist', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
    });
    prisma.entityLinkCount = 1;
    const result = await service.remove('u1', r.id);
    expect(result.deleted).toBe('soft');
    expect(prisma.resources.get(r.id)!.isActive).toBe(false);
  });

  it('hard-deletes when clean', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
    });
    const result = await service.remove('u1', r.id);
    expect(result.deleted).toBe('hard');
    expect(prisma.resources.get(r.id)).toBeUndefined();
  });

  it('refuses redundant soft-delete on inactive resource with references', async () => {
    const r = await service.create('u1', {
      name: 'Turf A',
      resourceType: 'VENUE',
    });
    await service.update('u1', r.id, { isActive: false });
    prisma.appointmentCount = 1;
    await expect(service.remove('u1', r.id)).rejects.toThrow(ConflictException);
  });
});
