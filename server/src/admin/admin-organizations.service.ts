import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Organization, Role } from '@prisma/client';
import { TokenService } from '../auth/token.service';
import { writeAuditLog } from '../common/audit/audit-log.helper';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ActorContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AdminOrganizationsService {
  private readonly appBaseUrl: string;

  constructor(
    private readonly organizations: OrganizationsService,
    private readonly mailer: MailerService,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.appBaseUrl = config.get('APP_BASE_URL', { infer: true });
  }

  async approve(
    organizationId: string,
    adminUserId: string,
  ): Promise<Organization> {
    const result = await this.organizations.approve(
      organizationId,
      adminUserId,
    );
    if (result.changed) {
      const loginUrl = `${this.appBaseUrl}/login`;
      await this.mailer.sendOrganizerApproved(
        result.organiser.email,
        result.organiser.fullName,
        loginUrl,
      );
    }
    return result.organization;
  }

  async reject(
    organizationId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<Organization> {
    const result = await this.organizations.reject(
      organizationId,
      adminUserId,
      reason,
    );
    if (result.changed) {
      await this.mailer.sendOrganizerRejected(
        result.organiser.email,
        result.organiser.fullName,
        reason,
      );
      await this.tokens.revokeAllForUser(result.organiser.id);
    }
    return result.organization;
  }

  async setActive(
    organizationId: string,
    active: boolean,
    adminUserId: string,
    actor: ActorContext,
  ): Promise<Organization> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!existing) throw new NotFoundException('Organization not found');
    if (existing.isActive === active) return existing;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: organizationId },
        data: { isActive: active },
      });

      await writeAuditLog(tx, {
        actorId: adminUserId,
        actorRole: Role.ADMIN,
        action: active ? 'organization.activated' : 'organization.deactivated',
        entityType: 'organization',
        entityId: organizationId,
        metadata: {
          previousIsActive: existing.isActive,
          newIsActive: active,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return updated;
    });
  }
}
