import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppService } from './app.service';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import { Public } from './auth/decorators/public.decorator';
import { Roles } from './auth/decorators/roles.decorator';
import type { JwtUserPayload } from './auth/token.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Roles(Role.ADMIN)
  @Get('admin/ping')
  adminPing(@CurrentUser() user: JwtUserPayload): { ok: true; sub: string } {
    return { ok: true, sub: user.sub };
  }
}
