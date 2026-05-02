import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';
import { SafeUser } from '../users/users.service';
import { auditRequestMeta } from '../utils/request';
import {
  AdminUserDetail,
  AdminUsersService,
  ListUsersResult,
} from './admin-users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ListUsersQuery } from './dto/list-users.query';

@ApiTags('admin')
@ApiCookieAuth('access')
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list users with filters and pagination' })
  list(@Query() query: ListUsersQuery): Promise<ListUsersResult> {
    return this.users.list(query);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Admin: fetch a single user with org membership' })
  get(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<AdminUserDetail> {
    return this.users.getById(userId);
  }

  @Patch(':userId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: activate a user account' })
  activate(
    @CurrentUser() admin: JwtUserPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req: Request,
  ): Promise<SafeUser> {
    return this.users.setActive(userId, true, admin.sub, auditRequestMeta(req));
  }

  @Patch(':userId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: deactivate a user (revokes refresh tokens)',
  })
  deactivate(
    @CurrentUser() admin: JwtUserPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Req() req: Request,
  ): Promise<SafeUser> {
    return this.users.setActive(
      userId,
      false,
      admin.sub,
      auditRequestMeta(req),
    );
  }

  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Admin: change a user's role (revokes existing sessions; blocked if user owns an active organisation)",
  })
  changeRole(
    @CurrentUser() admin: JwtUserPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() body: ChangeRoleDto,
    @Req() req: Request,
  ): Promise<SafeUser> {
    return this.users.changeRole(
      userId,
      body.role,
      body.reason,
      admin.sub,
      auditRequestMeta(req),
    );
  }
}
