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
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { EnvVars } from '../config/env.validation';
import { SkipOrganizationApproval } from '../organizations/decorators/skip-organization-approval.decorator';
import { UsersService, SafeUser } from '../users/users.service';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
  type CookieEnv,
} from '../utils/cookies';
import { decodeJwtSub } from '../utils/jwt';
import { readCookie, requestMeta } from '../utils/request';
import { parseTtlToMs } from '../utils/ttl';
import { AuthService, AuthTokens } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DisableTwoFactorDto } from './dto/disable-2fa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import type { JwtUserPayload } from './token.service';

@ApiTags('auth')
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
  @ApiOperation({
    summary:
      'Register a customer or organizer account (include `organization` to register as organizer)',
  })
  async register(@Body() dto: RegisterDto): Promise<{
    userId: string;
    organizationId?: string;
    message: string;
  }> {
    const result = await this.auth.register(dto);
    const message = result.organizationId
      ? 'Account created — verify your email, then wait for admin approval before managing your organization.'
      : 'Account created — check your email for a verification code.';
    return result.organizationId
      ? {
          userId: result.userId,
          organizationId: result.organizationId,
          message,
        }
      : { userId: result.userId, message };
  }

  @Public()
  @Throttle({ otpSubmit: { limit: 10, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with the OTP sent at signup' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.auth.verifyEmail(dto.email, dto.code);
    return { message: 'Email verified.' };
  }

  @Public()
  @Throttle({ otpSend: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend an OTP for the given purpose' })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    await this.auth.resendOtp(dto.email, dto.purpose);
    return { message: 'If an account exists, a code has been sent.' };
  }

  @Public()
  @Throttle({ login: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary:
      'Log in with email/password — returns 2FA challenge or sets auth cookies',
  })
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
  @ApiOperation({ summary: 'Complete login by submitting the 2FA code' })
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
  @ApiOperation({ summary: 'Rotate refresh token and reissue auth cookies' })
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

  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Log out the current session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE_NAME));
    this.clearAuthCookies(res);
    return { message: 'Logged out.' };
  }

  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Log out all sessions for the current user' })
  async logoutAll(
    @CurrentUser() user: JwtUserPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.auth.logoutAll(user.sub);
    this.clearAuthCookies(res);
    return { message: 'Logged out everywhere.' };
  }

  @SkipOrganizationApproval()
  @Get('me')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  async me(@CurrentUser() user: JwtUserPayload): Promise<SafeUser> {
    return this.users.getSafeById(user.sub);
  }

  @Public()
  @Throttle({ passwordReset: { limit: 3, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
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
  @ApiOperation({
    summary: 'Reset password using a token from the reset email',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset. Please log in.' };
  }

  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiCookieAuth('access')
  @ApiOperation({
    summary: 'Change password for the current user (revokes all sessions)',
  })
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

  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.OK)
  @Post('2fa/enable')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  async enable2fa(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<{ message: string }> {
    await this.auth.enableTwoFactor(user.sub);
    return { message: 'Two-factor authentication enabled.' };
  }

  @SkipOrganizationApproval()
  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  @ApiCookieAuth('access')
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  async disable2fa(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ message: string }> {
    await this.auth.disableTwoFactor(user.sub, dto.currentPassword);
    return { message: 'Two-factor authentication disabled.' };
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
