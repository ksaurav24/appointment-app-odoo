import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQuery } from './dto/list-audit-logs.query';

const ACTOR_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
} as const;

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.actorRole) where.actorRole = query.actorRole;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lte = new Date(query.to);
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { actor: { select: ACTOR_SELECT } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        ...log,
        id: log.id.toString(),
      })),
      total,
      skip: query.skip,
      take: query.take,
    };
  }
}
