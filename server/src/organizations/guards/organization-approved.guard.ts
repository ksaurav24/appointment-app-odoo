import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationApprovalStatus, Role } from '@prisma/client';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import type { JwtUserPayload } from '../../auth/token.service';
import { SKIP_ORG_APPROVAL_KEY } from '../decorators/skip-organization-approval.decorator';
import { OrganizationsService } from '../organizations.service';

@Injectable()
export class OrganizationApprovedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizations: OrganizationsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_ORG_APPROVAL_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as JwtUserPayload | undefined;

    if (!user || user.role !== Role.ORGANIZER) return true;

    const org = await this.organizations.findByOrganiserId(user.sub);
    if (!org) {
      throw new ForbiddenException('No organization found for this organizer');
    }
    if (org.approvalStatus !== OrganizationApprovalStatus.APPROVED) {
      throw new ForbiddenException('Organization is not approved');
    }
    return true;
  }
}
