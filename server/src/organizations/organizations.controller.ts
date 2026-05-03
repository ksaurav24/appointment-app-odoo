import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Organization, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { UsersService } from '../users/users.service';
import { SkipOrganizationApproval } from './decorators/skip-organization-approval.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly users: UsersService,
  ) {}

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

  @Roles(Role.ORGANIZER)
  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiCookieAuth('access')
  @ApiOperation({
    summary:
      "Create the current organizer's organization (sequential post-signup path). Returns 409 if one already exists.",
  })
  async create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateOrganizationDto,
  ): Promise<Organization> {
    // contactEmail falls back to the organizer's account email when omitted —
    // step 2 of onboarding doesn't ask for it explicitly.
    const account = await this.users.getSafeById(user.sub);
    return this.organizations.createForOrganiser(user.sub, {
      name: dto.name,
      slug: dto.slug,
      contactEmail: dto.contactEmail ?? account.email,
      description: dto.description,
      contactPhone: dto.contactPhone,
      address: dto.address,
      timezone: dto.timezone,
    });
  }
}
