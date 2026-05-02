import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, Role, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import { UsersService, SafeUser } from '../users/users.service';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { PasswordResetService } from './password-reset.service';
import { TokenService, IssuedRefreshToken } from './token.service';

export interface AuthTokens {
  accessToken: string;
  refresh: IssuedRefreshToken;
}

export interface LoginResult {
  twoFactorRequired?: true;
  tokens?: AuthTokens;
}

interface RequestMeta {
  deviceInfo?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly appBaseUrl: string;

  constructor(
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly resets: PasswordResetService,
    private readonly mailer: MailerService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.appBaseUrl = config.get('APP_BASE_URL', { infer: true });
  }

  async register(input: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ userId: string }> {
    this.password.validatePolicy(input.password);

    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.password.hash(input.password);
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: Role.CUSTOMER,
    });

    const { code } = await this.otp.issue(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    await this.mailer.sendOtp(user.email, code, OtpPurpose.EMAIL_VERIFICATION);

    return { userId: user.id };
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (user.emailVerified) return;

    const ok = await this.otp.verify(
      user.id,
      OtpPurpose.EMAIL_VERIFICATION,
      code,
    );
    if (!ok) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.users.setEmailVerified(user.id);
    await this.mailer.sendWelcome(user.email, user.fullName);
  }

  /**
   * Resends an OTP, rate-limited at the controller. Always succeeds silently
   * for unknown emails or completed states to prevent enumeration.
   */
  async resendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    if (purpose === OtpPurpose.EMAIL_VERIFICATION && user.emailVerified) return;
    if (purpose === OtpPurpose.LOGIN_2FA && !user.twoFactorEnabled) return;

    const { code } = await this.otp.issue(user.id, purpose);
    await this.mailer.sendOtp(user.email, code, purpose);
  }

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.password.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    if (user.twoFactorEnabled) {
      const { code } = await this.otp.issue(user.id, OtpPurpose.LOGIN_2FA);
      await this.mailer.sendOtp(user.email, code, OtpPurpose.LOGIN_2FA);
      return { twoFactorRequired: true };
    }

    const tokens = await this.issueTokens(user, meta);
    return { tokens };
  }

  async verifyLoginTwoFactor(
    email: string,
    code: string,
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    const ok = await this.otp.verify(user.id, OtpPurpose.LOGIN_2FA, code);
    if (!ok) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    return this.issueTokens(user, meta);
  }

  async refresh(
    presentedToken: string,
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const { user, refresh } = await this.tokens.rotateRefreshToken(
      presentedToken,
      meta.deviceInfo,
      meta.ipAddress,
    );
    const accessToken = this.tokens.signAccessToken(user);
    return { accessToken, refresh };
  }

  async logout(presentedRefreshToken: string | undefined): Promise<void> {
    if (!presentedRefreshToken) return;
    await this.tokens.revokeByPlainToken(presentedRefreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokens.revokeAllForUser(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      // Always silent — never reveal whether the email exists.
      return;
    }
    const token = await this.resets.issue({ userId: user.id });
    const url = `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mailer.sendPasswordReset(user.email, url);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.password.validatePolicy(newPassword);
    const consumed = await this.resets.consume(token);
    if (!consumed) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await this.password.hash(newPassword);
    await this.users.setPasswordHash(consumed.userId, passwordHash);
    // Force re-login on all devices after password change
    await this.tokens.revokeAllForUser(consumed.userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    this.password.validatePolicy(newPassword);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const ok = await this.password.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await this.password.hash(newPassword);
    await this.users.setPasswordHash(user.id, passwordHash);
    await this.tokens.revokeAllForUser(user.id);
  }

  async enableTwoFactor(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email must be verified before enabling 2FA',
      );
    }
    if (user.twoFactorEnabled) return;
    await this.users.setTwoFactorEnabled(user.id, true);
  }

  async disableTwoFactor(
    userId: string,
    currentPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const ok = await this.password.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    await this.users.setTwoFactorEnabled(user.id, false);
  }

  async createOrganizer(input: {
    email: string;
    fullName: string;
  }): Promise<SafeUser> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // Random placeholder hash. The organizer sets their real password via the
    // invite link; nothing should ever match this hash directly.
    const placeholder = await this.password.hash(
      randomBytes(32).toString('base64'),
    );

    const user = await this.users.create({
      email: input.email,
      passwordHash: placeholder,
      fullName: input.fullName,
      role: Role.ORGANIZER,
      emailVerified: true,
    });

    const token = await this.resets.issue({
      userId: user.id,
      ttlHours: 24 * 7,
    });
    const url = `${this.appBaseUrl}/setup-account?token=${encodeURIComponent(token)}`;
    await this.mailer.sendOrganizerInvite(user.email, user.fullName, url);

    return this.users.getSafeById(user.id);
  }

  private async issueTokens(
    user: User,
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const accessToken = this.tokens.signAccessToken(user);
    const refresh = await this.tokens.issueRefreshToken({
      user,
      deviceInfo: meta.deviceInfo,
      ipAddress: meta.ipAddress,
    });
    return { accessToken, refresh };
  }
}
