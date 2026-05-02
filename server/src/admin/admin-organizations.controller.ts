import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Organization, OrganizationApprovalStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import {
  OrganizationsService,
  OrganizationWithOrganiser,
} from '../organizations/organizations.service';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { AdminOrganizationsService } from './admin-organizations.service';

@ApiTags('admin')
@Controller('admin/organizations')
export class AdminOrganizationsController {
  constructor(
    private readonly admin: AdminOrganizationsService,
    private readonly organizations: OrganizationsService,
  ) {}

  @Roles(Role.ADMIN)
  @Get()
  @ApiCookieAuth('access')
  @ApiOperation({
    summary:
      'Admin: list organizations (defaults to APPROVED; pass status=PENDING|APPROVED|REJECTED|ALL)',
  })
  async list(
    @Query('status') status?: string,
  ): Promise<OrganizationWithOrganiser[]> {
    if (status === undefined || status === '') {
      return this.organizations.list(OrganizationApprovalStatus.APPROVED);
    }
    if (status.toUpperCase() === 'ALL') {
      return this.organizations.list();
    }
    const upper = status.toUpperCase();
    if (
      upper !== OrganizationApprovalStatus.PENDING &&
      upper !== OrganizationApprovalStatus.APPROVED &&
      upper !== OrganizationApprovalStatus.REJECTED
    ) {
      throw new BadRequestException(
        'status must be one of PENDING, APPROVED, REJECTED, ALL',
      );
    }
    return this.organizations.list(upper);
  }

  @Roles(Role.ADMIN)
  @Get('pending')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Admin: list organizations awaiting approval' })
  async listPending(): Promise<OrganizationWithOrganiser[]> {
    return this.organizations.list(OrganizationApprovalStatus.PENDING);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':organizationId/approve')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Admin: approve a pending organization' })
  async approve(
    @CurrentUser() admin: JwtUserPayload,
    @Param('organizationId') organizationId: string,
  ): Promise<Organization> {
    return this.admin.approve(organizationId, admin.sub);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':organizationId/reject')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Admin: reject a pending organization' })
  async reject(
    @CurrentUser() admin: JwtUserPayload,
    @Param('organizationId') organizationId: string,
    @Body() dto: RejectOrganizationDto,
  ): Promise<Organization> {
    return this.admin.reject(organizationId, admin.sub, dto.reason);
  }
}
