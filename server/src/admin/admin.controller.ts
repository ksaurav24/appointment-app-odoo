import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUserPayload } from '../auth/token.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  @Roles(Role.ADMIN)
  @Get('ping')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Admin auth check' })
  ping(@CurrentUser() user: JwtUserPayload): { ok: true; sub: string } {
    return { ok: true, sub: user.sub };
  }
}
