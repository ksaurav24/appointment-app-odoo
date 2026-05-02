import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Organization, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { SkipOrganizationApproval } from './decorators/skip-organization-approval.decorator';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @SkipOrganizationApproval()
  @Get('me')
  @ApiCookieAuth('access')
  @ApiOperation({
    summary: "Get the current organizer's organization (incl. approval status)",
  })
  async me(@CurrentUser() user: JwtUserPayload): Promise<Organization> {
    if (user.role !== Role.ORGANIZER) {
      throw new ForbiddenException('Only organizers have an organization');
    }
    const org = await this.organizations.findByOrganiserId(user.sub);
    if (!org) {
      throw new NotFoundException('No organization found for this organizer');
    }
    return org;
  }
}
