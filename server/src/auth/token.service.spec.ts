import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import type { PrismaService } from '../prisma/prisma.service';

interface FakeRefresh {
  id: bigint;
  userId: string;
  tokenHash: string;
  familyId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface FakeUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

function makePrismaMock() {
  const refreshTokens: FakeRefresh[] = [];
  const users: FakeUser[] = [
    { id: 'u1', email: 'u1@x.com', role: Role.CUSTOMER, isActive: true },
  ];

  interface CreateData {
    userId: string;
    tokenHash: string;
    familyId: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
  }

  return {
    refreshTokens,
    users,
    asPrisma: {
      refreshToken: {
        create: ({ data }: { data: CreateData }) => {
          const record: FakeRefresh = {
            id: BigInt(refreshTokens.length + 1),
            userId: data.userId,
            tokenHash: data.tokenHash,
            familyId: data.familyId,
            deviceInfo: data.deviceInfo ?? null,
            ipAddress: data.ipAddress ?? null,
            expiresAt: data.expiresAt,
            revokedAt: null,
            createdAt: new Date(),
          };
          refreshTokens.push(record);
          return Promise.resolve(record);
        },
        findUnique: ({
          where,
          include,
        }: {
          where: { tokenHash: string };
          include?: { user: boolean };
        }) => {
          const found = refreshTokens.find(
            (t) => t.tokenHash === where.tokenHash,
          );
          if (!found) return Promise.resolve(null);
          if (include?.user) {
            const user = users.find((u) => u.id === found.userId);
            return Promise.resolve({ ...found, user });
          }
          return Promise.resolve(found);
        },
        update: ({
          where,
          data,
        }: {
          where: { id: bigint };
          data: Partial<FakeRefresh>;
        }) => {
          const idx = refreshTokens.findIndex((t) => t.id === where.id);
          refreshTokens[idx] = { ...refreshTokens[idx], ...data };
          return Promise.resolve(refreshTokens[idx]);
        },
        updateMany: ({
          where,
          data,
        }: {
          where: { familyId?: string; userId?: string; revokedAt: null };
          data: Partial<FakeRefresh>;
        }) => {
          let count = 0;
          for (const t of refreshTokens) {
            if (where.familyId && t.familyId !== where.familyId) continue;
            if (where.userId && t.userId !== where.userId) continue;
            if (t.revokedAt !== null) continue;
            Object.assign(t, data);
            count++;
          }
          return Promise.resolve({ count });
        },
      },
    } as unknown as PrismaService,
  };
}

const cfg = (): ConfigService<any, true> =>
  ({
    get: (key: string) => {
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL_DAYS') return 30;
      return undefined;
    },
  }) as unknown as ConfigService<any, true>;

const fakeJwt = (): JwtService =>
  ({
    sign: (payload: unknown) => `signed.${JSON.stringify(payload)}`,
  }) as unknown as JwtService;

describe('TokenService', () => {
  it('signs an access token with sub/email/role', () => {
    const { asPrisma } = makePrismaMock();
    const svc = new TokenService(asPrisma, fakeJwt(), cfg());
    const t = svc.signAccessToken({
      id: 'u1',
      email: 'u1@x.com',
      role: Role.ADMIN,
    });
    expect(t).toContain('"sub":"u1"');
    expect(t).toContain('"role":"ADMIN"');
  });

  it('issues a refresh token, rotates it, and rejects reuse with family revoke', async () => {
    const mock = makePrismaMock();
    const svc = new TokenService(mock.asPrisma, fakeJwt(), cfg());

    const issued = await svc.issueRefreshToken({ user: { id: 'u1' } });
    expect(mock.refreshTokens).toHaveLength(1);

    const rotated = await svc.rotateRefreshToken(issued.token);
    expect(mock.refreshTokens).toHaveLength(2);
    expect(mock.refreshTokens[0].revokedAt).not.toBeNull();
    expect(mock.refreshTokens[1].familyId).toBe(mock.refreshTokens[0].familyId);

    // Replay the original (now revoked) token: should revoke the entire family
    await expect(svc.rotateRefreshToken(issued.token)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mock.refreshTokens.every((t) => t.revokedAt !== null)).toBe(true);

    // The rotated (latest) token can no longer be used either
    await expect(
      svc.rotateRefreshToken(rotated.refresh.token),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown refresh tokens', async () => {
    const mock = makePrismaMock();
    const svc = new TokenService(mock.asPrisma, fakeJwt(), cfg());
    await expect(
      svc.rotateRefreshToken('not-a-real-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokeAllForUser revokes only the matching user', async () => {
    const mock = makePrismaMock();
    mock.users.push({
      id: 'u2',
      email: 'u2@x.com',
      role: Role.CUSTOMER,
      isActive: true,
    });
    const svc = new TokenService(mock.asPrisma, fakeJwt(), cfg());
    await svc.issueRefreshToken({ user: { id: 'u1' } });
    await svc.issueRefreshToken({ user: { id: 'u2' } });
    await svc.revokeAllForUser('u1');
    const u1 = mock.refreshTokens.find((t) => t.userId === 'u1')!;
    const u2 = mock.refreshTokens.find((t) => t.userId === 'u2')!;
    expect(u1.revokedAt).not.toBeNull();
    expect(u2.revokedAt).toBeNull();
  });
});
