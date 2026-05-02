import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, Organization, Role, User } from '@prisma/client';
import { randomBytes } from 'crypto';
import { EnvVars } from '../config/env.validation';
import { MailerService } from '../mailer/mailer.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
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
    private readonly organizations: OrganizationsService,
    private readonly prisma: PrismaService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.appBaseUrl = config.get('APP_BASE_URL', { infer: true });
  }

  async registerOrganizer(input: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    organizationSlug: string;
    contactEmail: string;
    description?: string;
    contactPhone?: string;
    address?: string;
    timezone?: string;
  }): Promise<{ userId: string; organizationId: string }> {
    this.password.validatePolicy(input.password);

    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const slug = input.organizationSlug.toLowerCase();
    const slugTaken = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (slugTaken) {
      throw new ConflictException('Organization slug is already taken');
    }

    const passwordHash = await this.password.hash(input.password);

    const { user, organization } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash,
            fullName: input.fullName,
            role: Role.ORGANIZER,
            emailVerified: false,
          },
        });
        const organization = await this.organizations.createForOrganiser(
          user.id,
          {
            name: input.organizationName,
            slug,
            contactEmail: input.contactEmail,
            description: input.description,
            contactPhone: input.contactPhone,
            address: input.address,
            timezone: input.timezone,
          },
          tx,
        );
        return { user, organization };
      },
    );

    const { code } = await this.otp.issue(user.id, OtpPurpose.SIGNUP);
    await this.mailer.sendOtp(user.email, code, OtpPurpose.SIGNUP);

    return { userId: user.id, organizationId: organization.id };
  }

  async approveOrganizer(
    organizationId: string,
    adminUserId: string,
  ): Promise<Organization> {
    const result = await this.organizations.approve(
      organizationId,
      adminUserId,
    );
    if (result.changed) {
      const loginUrl = `${this.appBaseUrl}/login`;
      await this.mailer.sendOrganizerApproved(
        result.organiser.email,
        result.organiser.fullName,
        loginUrl,
      );
    }
    return result.organization;
  }

  async rejectOrganizer(
    organizationId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<Organization> {
    const result = await this.organizations.reject(
      organizationId,
      adminUserId,
      reason,
    );
    if (result.changed) {
      await this.mailer.sendOrganizerRejected(
        result.organiser.email,
        result.organiser.fullName,
        reason,
      );
      // Force re-login on rejection in case the organizer was already signed in.
      await this.tokens.revokeAllForUser(result.organiser.id);
    }
    return result.organization;
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

    const { code } = await this.otp.issue(user.id, OtpPurpose.SIGNUP);
    await this.mailer.sendOtp(user.email, code, OtpPurpose.SIGNUP);

    return { userId: user.id };
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid or expired code');
    }
    if (user.emailVerified) return;

    const ok = await this.otp.verify(user.id, OtpPurpose.SIGNUP, code);
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
    if (purpose === OtpPurpose.SIGNUP && user.emailVerified) return;
    if (purpose === OtpPurpose.LOGIN && !user.twoFactorEnabled) return;

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
      const { code } = await this.otp.issue(user.id, OtpPurpose.LOGIN);
      await this.mailer.sendOtp(user.email, code, OtpPurpose.LOGIN);
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
    const ok = await this.otp.verify(user.id, OtpPurpose.LOGIN, code);
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
    organizationName: string;
    organizationSlug: string;
    contactEmail?: string;
    description?: string;
    contactPhone?: string;
    address?: string;
    timezone?: string;
    adminUserId: string;
  }): Promise<SafeUser> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const slug = input.organizationSlug.toLowerCase();
    const slugTaken = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (slugTaken) {
      throw new ConflictException('Organization slug is already taken');
    }

    // Random placeholder hash. The organizer sets their real password via the
    // invite link; nothing should ever match this hash directly.
    const placeholder = await this.password.hash(
      randomBytes(32).toString('base64'),
    );

    const { user } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: placeholder,
          fullName: input.fullName,
          role: Role.ORGANIZER,
          emailVerified: true,
        },
      });
      await this.organizations.createApprovedForOrganiser(
        user.id,
        input.adminUserId,
        {
          name: input.organizationName,
          slug,
          contactEmail: input.contactEmail ?? user.email,
          description: input.description,
          contactPhone: input.contactPhone,
          address: input.address,
          timezone: input.timezone,
        },
        tx,
      );
      return { user };
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
