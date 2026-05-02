import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken, Role, User } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { EnvVars } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface IssuedRefreshToken {
  token: string;
  record: RefreshToken;
}

interface IssueRefreshOptions {
  user: Pick<User, 'id'>;
  familyId?: string;
  deviceInfo?: string;
  ipAddress?: string;
}

const REFRESH_BYTES = 48;

// Refresh tokens are 48 random bytes (~384 bits of entropy). SHA-256 is appropriate
// here — bcrypt's slowdown only matters for low-entropy secrets like passwords.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  private readonly accessTtl: string;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.accessTtl = config.get('JWT_ACCESS_TTL', { infer: true });
    this.refreshTtlMs =
      config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  signAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.sign(payload, {
      expiresIn: this.accessTtl as unknown as number,
    });
  }

  async issueRefreshToken(
    options: IssueRefreshOptions,
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(REFRESH_BYTES).toString('base64url');
    const tokenHash = hashRefreshToken(token);
    const familyId = options.familyId ?? randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshTtlMs);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId: options.user.id,
        tokenHash,
        familyId,
        deviceInfo: options.deviceInfo,
        ipAddress: options.ipAddress,
        expiresAt,
      },
    });

    return { token, record };
  }

  async rotateRefreshToken(
    presentedToken: string,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<{ user: User; refresh: IssuedRefreshToken }> {
    const tokenHash = hashRefreshToken(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Theft response: a revoked token was replayed. Burn the whole family.
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const refresh = await this.issueRefreshToken({
      user: stored.user,
      familyId: stored.familyId,
      deviceInfo,
      ipAddress,
    });

    return { user: stored.user, refresh };
  }

  async revokeByPlainToken(presentedToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt) return;
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
