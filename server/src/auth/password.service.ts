import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { EnvVars } from '../config/env.validation';

const MIN_LENGTH = 8;
const BCRYPT_MAX_BYTES = 72;

@Injectable()
export class PasswordService {
  private readonly cost: number;

  constructor(config: ConfigService<EnvVars, true>) {
    this.cost = config.get('BCRYPT_COST', { infer: true });
  }

  validatePolicy(password: string): void {
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${MIN_LENGTH} characters long`,
      );
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one letter and one number',
      );
    }
    if (Buffer.byteLength(password, 'utf8') > BCRYPT_MAX_BYTES) {
      throw new BadRequestException(
        `Password is too long; maximum ${BCRYPT_MAX_BYTES} bytes allowed`,
      );
    }
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
