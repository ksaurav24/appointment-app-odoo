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
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Organization, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import { UsersService } from '../users/users.service';
import { SkipOrganizationApproval } from './decorators/skip-organization-approval.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  private readonly appBaseUrl: string;

  constructor(
    private readonly organizations: OrganizationsService,
    private readonly users: UsersService,
    private readonly mailer: MailerService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.appBaseUrl = config.get('APP_BASE_URL', { infer: true });
  }

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
    const org = await this.organizations.createForOrganiser(user.sub, {
      name: dto.name,
      slug: dto.slug,
      contactEmail: dto.contactEmail ?? account.email,
      description: dto.description,
      contactPhone: dto.contactPhone,
      city: dto.city,
      state: dto.state,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      googlePlaceId: dto.googlePlaceId,
      logoUrl: dto.logoUrl,
      galleryImageUrls: dto.galleryImageUrls,
      instagramUrl: dto.instagramUrl,
      facebookUrl: dto.facebookUrl,
      twitterUrl: dto.twitterUrl,
      websiteUrl: dto.websiteUrl,
      timezone: dto.timezone,
    });

    const admins = await this.users.listActiveAdmins();
    const reviewUrl = `${this.appBaseUrl}/admin/organizations?status=PENDING`;
    await Promise.all(
      admins.map((admin) =>
        this.mailer.sendAdminOrganizationPending(
          admin.email,
          admin.fullName,
          account.fullName,
          account.email,
          org.name,
          reviewUrl,
        ),
      ),
    );

    return org;
  }
}
