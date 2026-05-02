import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { writeAuditLog } from '../common/audit/audit-log.helper';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/users.service';
import { ListUsersQuery } from './dto/list-users.query';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  emailVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface ActorContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface ListUsersResult {
  items: SafeUser[];
  total: number;
  skip: number;
  take: number;
}

export interface AdminUserDetail extends SafeUser {
  organization: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery): Promise<ListUsersResult> {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.emailVerified !== undefined)
      where.emailVerified = query.emailVerified;
    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { fullName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async getById(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...SAFE_USER_SELECT,
        organization: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setActive(
    targetUserId: string,
    active: boolean,
    adminId: string,
    actor: ActorContext,
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { organization: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.id === adminId && !active) {
      throw new ForbiddenException('Admins cannot deactivate themselves');
    }
    if (existing.isActive === active) {
      return this.findSafe(targetUserId);
    }

    const ownsActiveOrg =
      !active &&
      existing.organization !== null &&
      existing.organization.isActive;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { isActive: active },
        select: SAFE_USER_SELECT,
      });

      if (!active) {
        await tx.refreshToken.updateMany({
          where: { userId: targetUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      await writeAuditLog(tx, {
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: active ? 'user.activated' : 'user.deactivated',
        entityType: 'user',
        entityId: targetUserId,
        metadata: {
          previousIsActive: existing.isActive,
          newIsActive: active,
          ownsActiveOrganizationAtTimeOfChange: ownsActiveOrg,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return updated;
    });
  }

  async changeRole(
    targetUserId: string,
    newRole: Role,
    reason: string | undefined,
    adminId: string,
    actor: ActorContext,
  ): Promise<SafeUser> {
    if (targetUserId === adminId) {
      throw new ForbiddenException('Admins cannot change their own role');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { organization: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.role === newRole) {
      return this.findSafe(targetUserId);
    }

    if (
      existing.role === Role.ORGANIZER &&
      newRole !== Role.ORGANIZER &&
      existing.organization &&
      existing.organization.isActive
    ) {
      throw new ConflictException(
        'Cannot change role: user owns an active organisation. Deactivate the organisation first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
        select: SAFE_USER_SELECT,
      });

      // Role changes invalidate the JWT claim — force a fresh login.
      await tx.refreshToken.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await writeAuditLog(tx, {
        actorId: adminId,
        actorRole: Role.ADMIN,
        action: 'user.role_changed',
        entityType: 'user',
        entityId: targetUserId,
        metadata: {
          from: existing.role,
          to: newRole,
          reason: reason ?? null,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });

      return updated;
    });
  }

  private async findSafe(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
