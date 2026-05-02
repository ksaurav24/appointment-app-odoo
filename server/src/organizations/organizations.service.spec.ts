import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationApprovalStatus } from '@prisma/client';
import { OrganizationsService } from './organizations.service';

interface OrgRow {
  id: string;
  organiserId: string;
  slug: string;
  approvalStatus: OrganizationApprovalStatus;
  approvedAt: Date | null;
  approvedById: string | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
}

interface UserRow {
  id: string;
  email: string;
  fullName: string;
}

interface FindUniqueArgs {
  where: { id?: string; slug?: string; organiserId?: string };
  include?: { organiser?: boolean };
}

class FakePrisma {
  orgs = new Map<string, OrgRow>();
  users = new Map<string, UserRow>();

  organization = {
    findUnique: (args: FindUniqueArgs) => {
      const list = Array.from(this.orgs.values());
      const match =
        list.find((o) => {
          if (args.where.id !== undefined) return o.id === args.where.id;
          if (args.where.slug !== undefined) return o.slug === args.where.slug;
          if (args.where.organiserId !== undefined)
            return o.organiserId === args.where.organiserId;
          return false;
        }) ?? null;
      if (!match) return Promise.resolve(null);
      if (args.include?.organiser) {
        const u = this.users.get(match.organiserId);
        return Promise.resolve({ ...match, organiser: u });
      }
      return Promise.resolve(match);
    },
    create: ({
      data,
    }: {
      data: Partial<OrgRow> & { organiserId: string; slug: string };
    }) => {
      const id = data.id ?? `org_${this.orgs.size + 1}`;
      const row: OrgRow = {
        id,
        organiserId: data.organiserId,
        slug: data.slug,
        approvalStatus:
          data.approvalStatus ?? OrganizationApprovalStatus.PENDING,
        approvedAt: data.approvedAt ?? null,
        approvedById: data.approvedById ?? null,
        rejectedAt: data.rejectedAt ?? null,
        rejectedReason: data.rejectedReason ?? null,
      };
      this.orgs.set(id, row);
      return Promise.resolve(row);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<OrgRow>;
    }) => {
      const existing = this.orgs.get(where.id);
      if (!existing) throw new Error('not found');
      const updated = { ...existing, ...data };
      this.orgs.set(where.id, updated);
      return Promise.resolve(updated);
    },
    findMany: () => Promise.resolve(Array.from(this.orgs.values())),
  };
}

describe('OrganizationsService', () => {
  let prisma: FakePrisma;
  let service: OrganizationsService;

  beforeEach(() => {
    prisma = new FakePrisma();
    prisma.users.set('u1', { id: 'u1', email: 'a@b.c', fullName: 'Alice' });
    prisma.users.set('admin1', {
      id: 'admin1',
      email: 'admin@x',
      fullName: 'Admin',
    });
    service = new OrganizationsService(prisma as unknown as never);
  });

  describe('createForOrganiser', () => {
    it('creates a PENDING organization', async () => {
      const org = await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      expect(org.approvalStatus).toBe(OrganizationApprovalStatus.PENDING);
      expect(org.organiserId).toBe('u1');
    });

    it('rejects duplicate slug', async () => {
      await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      prisma.users.set('u2', { id: 'u2', email: 'x@y.z', fullName: 'Bob' });
      await expect(
        service.createForOrganiser('u2', {
          name: 'Acme 2',
          slug: 'acme',
          contactEmail: 'x@y.z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects organiser already owning an org', async () => {
      await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      await expect(
        service.createForOrganiser('u1', {
          name: 'Acme 2',
          slug: 'acme-2',
          contactEmail: 'a@b.c',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    it('marks PENDING -> APPROVED and reports changed=true', async () => {
      const org = await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      const result = await service.approve(org.id, 'admin1');
      expect(result.changed).toBe(true);
      expect(result.organization.approvalStatus).toBe(
        OrganizationApprovalStatus.APPROVED,
      );
      expect(result.organization.approvedById).toBe('admin1');
      expect(result.organization.approvedAt).toBeInstanceOf(Date);
    });

    it('is idempotent (changed=false on re-approve)', async () => {
      const org = await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      await service.approve(org.id, 'admin1');
      const result2 = await service.approve(org.id, 'admin1');
      expect(result2.changed).toBe(false);
    });

    it('throws NotFoundException for unknown org', async () => {
      await expect(service.approve('nonexistent', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('marks PENDING -> REJECTED with reason', async () => {
      const org = await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      const result = await service.reject(org.id, 'admin1', 'spam');
      expect(result.changed).toBe(true);
      expect(result.organization.approvalStatus).toBe(
        OrganizationApprovalStatus.REJECTED,
      );
      expect(result.organization.rejectedReason).toBe('spam');
      expect(result.organization.rejectedAt).toBeInstanceOf(Date);
    });

    it('is idempotent on re-reject', async () => {
      const org = await service.createForOrganiser('u1', {
        name: 'Acme',
        slug: 'acme',
        contactEmail: 'a@b.c',
      });
      await service.reject(org.id, 'admin1');
      const result2 = await service.reject(org.id, 'admin1');
      expect(result2.changed).toBe(false);
    });
  });
});
