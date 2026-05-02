import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Organization,
  OrganizationApprovalStatus,
  Prisma,
  Role,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';

// Any caller serving non-admin requests MUST filter by approvalStatus=APPROVED.
// Admin-only listings may include PENDING/REJECTED. The OrganizationApprovedGuard
// !enforces this at the request level for organizer-scoped writes; listings are the caller's responsibility.

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  contactEmail: string;
  description?: string;
  contactPhone?: string;
  address?: string;
  timezone?: string;
}

export interface OrganizationWithOrganiser extends Organization {
  organiser: SafeUser;
}

const ORGANISER_SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  emailVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a PENDING organization for an organiser. Accepts an optional
   * transaction client so the caller can atomically create the user + org.
   */
  async createForOrganiser(
    organiserId: string,
    input: CreateOrganizationInput,
    tx?: PrismaTx,
  ): Promise<Organization> {
    const client = tx ?? this.prisma;
    const slug = input.slug.toLowerCase();

    const slugTaken = await client.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException('Organization slug is already taken');
    }

    const existingForOrganiser = await client.organization.findUnique({
      where: { organiserId },
    });
    if (existingForOrganiser) {
      throw new ConflictException('Organiser already has an organization');
    }

    return client.organization.create({
      data: {
        organiserId,
        name: input.name,
        slug,
        contactEmail: input.contactEmail.toLowerCase(),
        description: input.description,
        contactPhone: input.contactPhone,
        address: input.address,
        timezone: input.timezone ?? 'UTC',
        approvalStatus: OrganizationApprovalStatus.PENDING,
      },
    });
  }

  findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findByOrganiserId(organiserId: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({ where: { organiserId } });
  }

  /**
   * Resolve the organization for an organiser or throw. Use in feature
   * services that need a guaranteed-present organization context.
   * The OrganizationApprovedGuard already enforces approval status.
   */
  async requireForOrganiser(organiserId: string): Promise<Organization> {
    const org = await this.findByOrganiserId(organiserId);
    if (!org) {
      throw new NotFoundException('Organization not found for current user');
    }
    return org;
  }

  /**
   * Admin listing. If status is undefined, returns ALL organizations.
   */
  list(
    status?: OrganizationApprovalStatus,
  ): Promise<OrganizationWithOrganiser[]> {
    return this.prisma.organization.findMany({
      where: status ? { approvalStatus: status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { organiser: { select: ORGANISER_SAFE_SELECT } },
    });
  }

  /**
   * Public-safe listing. Only returns APPROVED organizations.
   */
  listApproved(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { approvalStatus: OrganizationApprovalStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(
    organizationId: string,
    approverUserId: string,
  ): Promise<{
    organization: Organization;
    organiser: User;
    changed: boolean;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { organiser: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.approvalStatus === OrganizationApprovalStatus.APPROVED) {
      return { organization: org, organiser: org.organiser, changed: false };
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        approvalStatus: OrganizationApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: approverUserId,
        rejectedAt: null,
        rejectedReason: null,
      },
    });

    return { organization: updated, organiser: org.organiser, changed: true };
  }

  async reject(
    organizationId: string,
    rejectorUserId: string,
    reason?: string,
  ): Promise<{
    organization: Organization;
    organiser: User;
    changed: boolean;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { organiser: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.approvalStatus === OrganizationApprovalStatus.REJECTED) {
      return { organization: org, organiser: org.organiser, changed: false };
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        approvalStatus: OrganizationApprovalStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedReason: reason ?? null,
        approvedAt: null,
        approvedById: rejectorUserId,
      },
    });

    return { organization: updated, organiser: org.organiser, changed: true };
  }
}

// Re-export for convenience in callers that need the role enum guard.
export { Role };
