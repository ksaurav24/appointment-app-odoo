import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
} from '../common/cookies';
import { EnvVars } from '../config/env.validation';
import { UsersService, SafeUser } from '../users/users.service';
import { AuthService, AuthTokens } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateOrganizerDto } from './dto/create-organizer.dto';
import { DisableTwoFactorDto } from './dto/disable-2fa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import type { JwtUserPayload } from './token.service';

interface CookieEnv {
  nodeEnv: string;
  cookieDomain: string;
  accessTtlMs: number;
  refreshTtlMs: number;
}

function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    const asNumber = Number(ttl);
    if (!Number.isFinite(asNumber)) {
      throw new Error(`Invalid TTL: ${ttl}`);
    }
    return asNumber * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : 86_400_000;
  return value * multiplier;
}

@Controller('auth')
export class AuthController {
  private readonly cookieEnv: CookieEnv;

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.cookieEnv = {
      nodeEnv: config.get('NODE_ENV', { infer: true }),
      cookieDomain: config.get('COOKIE_DOMAIN', { infer: true }),
      accessTtlMs: parseTtlToMs(config.get('JWT_ACCESS_TTL', { infer: true })),
      refreshTtlMs:
        config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * 86_400_000,
    };
  }

  @Public()
  @Throttle({ register: { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ userId: string; message: string }> {
    const result = await this.auth.register(dto);
    return {
      userId: result.userId,
      message: 'Account created — check your email for a verification code.',
    };
  }

  @Public()
  @Throttle({ otpSubmit: { limit: 10, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.auth.verifyEmail(dto.email, dto.code);
    return { message: 'Email verified.' };
  }

  @Public()
  @Throttle({ otpSend: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    await this.auth.resendOtp(dto.email, dto.purpose);
    return { message: 'If an account exists, a code has been sent.' };
  }

  @Public()
  @Throttle({ login: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ twoFactorRequired?: true; user?: SafeUser }> {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      requestMeta(req),
    );
    if (result.twoFactorRequired) {
      return { twoFactorRequired: true };
    }
    if (!result.tokens) throw new UnauthorizedException();
    return { user: await this.completeLogin(res, result.tokens) };
  }

  @Public()
  @Throttle({ login: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login/2fa')
  async loginTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const tokens = await this.auth.verifyLoginTwoFactor(
      dto.email,
      dto.code,
      requestMeta(req),
    );
    return { user: await this.completeLogin(res, tokens) };
  }

  @Public()
  @Throttle({ refresh: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const presented = readCookie(req, REFRESH_COOKIE_NAME);
    if (!presented) throw new UnauthorizedException('Missing refresh token');
    const tokens = await this.auth.refresh(presented, requestMeta(req));
    this.setAuthCookies(res, tokens);
    return { message: 'Refreshed.' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE_NAME));
    this.clearAuthCookies(res);
    return { message: 'Logged out.' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: JwtUserPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.logoutAll(user.sub);
    this.clearAuthCookies(res);
    return { message: 'Logged out everywhere.' };
  }

  @Get('me')
  async me(@CurrentUser() user: JwtUserPayload): Promise<SafeUser> {
    return this.users.getSafeById(user.sub);
  }

  @Public()
  @Throttle({ passwordReset: { limit: 3, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.auth.forgotPassword(dto.email);
    return {
      message:
        'If an account exists for this email, a reset link has been sent.',
    };
  }

  @Public()
  @Throttle({ passwordReset: { limit: 10, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset. Please log in.' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
    this.clearAuthCookies(res);
    return { message: 'Password changed. Please log in again.' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('2fa/enable')
  async enable2fa(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ message: string }> {
    await this.auth.enableTwoFactor(user.sub);
    return { message: 'Two-factor authentication enabled.' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  async disable2fa(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.auth.disableTwoFactor(user.sub, dto.currentPassword);
    return { message: 'Two-factor authentication disabled.' };
  }

  @Roles(Role.ADMIN)
  @Post('admin/organizers')
  async createOrganizer(@Body() dto: CreateOrganizerDto): Promise<SafeUser> {
    return this.auth.createOrganizer(dto);
  }

  private async completeLogin(
    res: Response,
    tokens: AuthTokens,
  ): Promise<SafeUser> {
    this.setAuthCookies(res, tokens);
    const userId = decodeJwtSub(tokens.accessToken);
    return this.users.getSafeById(userId);
  }

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    res.cookie(
      ACCESS_COOKIE_NAME,
      tokens.accessToken,
      accessCookieOptions(this.cookieEnv),
    );
    res.cookie(
      REFRESH_COOKIE_NAME,
      tokens.refresh.token,
      refreshCookieOptions(this.cookieEnv),
    );
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(
      ACCESS_COOKIE_NAME,
      clearCookieOptions(this.cookieEnv, 'access'),
    );
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      clearCookieOptions(this.cookieEnv, 'refresh'),
    );
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[name];
}

function requestMeta(req: Request): {
  deviceInfo?: string;
  ipAddress?: string;
} {
  return {
    deviceInfo: req.headers['user-agent']?.toString().slice(0, 200),
    ipAddress: req.ip,
  };
}

function decodeJwtSub(jwt: string): string {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf8'),
  ) as { sub: string };
  return payload.sub;
}
