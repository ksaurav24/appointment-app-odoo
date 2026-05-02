import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Client = Prisma.TransactionClient | PrismaService;

export interface WriteAuditLogInput {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Insert an AuditLog row. Pass a transaction client to atomically commit the
 * audit entry alongside the action being logged.
 */
export async function writeAuditLog(
  client: Client,
  input: WriteAuditLogInput,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? Prisma.DbNull,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
