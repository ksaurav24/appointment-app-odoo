import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_BYTES = 48;
const DEFAULT_TTL_HOURS = 1;

interface IssueOptions {
  userId: string;
  ttlHours?: number;
}

interface VerifyResult {
  userId: string;
  resetId: bigint;
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class PasswordResetService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(options: IssueOptions): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const tokenHash = hashResetToken(token);
    const ttl = (options.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttl);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordReset.updateMany({
        where: { userId: options.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.passwordReset.create({
        data: { userId: options.userId, tokenHash, expiresAt },
      });
    });

    return token;
  }

  async consume(presentedToken: string): Promise<VerifyResult | null> {
    const tokenHash = hashResetToken(presentedToken);
    const record = await this.prisma.passwordReset.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) return null;
    await this.prisma.passwordReset.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { userId: record.userId, resetId: record.id };
  }
}
