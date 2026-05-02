import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Organization } from '@prisma/client';
import { TokenService } from '../auth/token.service';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class AdminOrganizationsService {
  private readonly appBaseUrl: string;

  constructor(
    private readonly organizations: OrganizationsService,
    private readonly mailer: MailerService,
    private readonly tokens: TokenService,
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
}
