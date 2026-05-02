import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, OtpVerification } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { EnvVars } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

const OTP_LENGTH = 6;

const TTL_MINUTES_BY_PURPOSE: Record<OtpPurpose, number> = {
  SIGNUP: 10,
  LOGIN: 2,
  PASSWORD_RESET: 5,
};

export interface OtpIssueResult {
  code: string;
  record: OtpVerification;
}

@Injectable()
export class OtpService {
  private readonly cost: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.cost = config.get('BCRYPT_COST', { infer: true });
  }

  generateNumericCode(length: number = OTP_LENGTH): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += randomInt(0, 10).toString();
    }
    return out;
  }

  async issue(userId: string, purpose: OtpPurpose): Promise<OtpIssueResult> {
    const code = this.generateNumericCode();
    const codeHash = await bcrypt.hash(code, this.cost);
    const expiresAt = new Date(
      Date.now() + TTL_MINUTES_BY_PURPOSE[purpose] * 60_000,
    );

    return this.prisma.$transaction(async (tx) => {
      // Invalidate any prior unconsumed OTPs of the same purpose for this user
      await tx.otpVerification.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      const record = await tx.otpVerification.create({
        data: { userId, purpose, code: codeHash, expiresAt },
      });
      return { code, record };
    });
  }

  /**
   * Verifies a submitted OTP. Returns true and marks the record consumed when valid.
   * Returns false (without throwing) for invalid/expired codes so callers can respond
   * with a generic "invalid or expired" message.
   */
  async verify(
    userId: string,
    purpose: OtpPurpose,
    submittedCode: string,
  ): Promise<boolean> {
    const candidates = await this.prisma.otpVerification.findMany({
      where: {
        userId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    for (const candidate of candidates) {
      const ok = await bcrypt.compare(submittedCode, candidate.code);
      if (ok) {
        await this.prisma.otpVerification.update({
          where: { id: candidate.id },
          data: { consumedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }
}
