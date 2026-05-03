import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvVars } from '../config/env.validation';
import { MeetingTokenPayload } from './types';

/** Five minutes — long enough for a slow page-load and a click-through. */
export const MEETING_TOKEN_TTL_SECONDS = 5 * 60;

/** Audience claim — distinguishes meeting JWTs from auth-module access tokens. */
export const MEETING_JWT_AUDIENCE = 'meeting';

@Injectable()
export class MeetingTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  /**
   * Sign a `MeetingTokenPayload` with the meeting-only secret. Returns the
   * encoded token along with the absolute expiry as a `Date` so callers can
   * surface it directly in API responses.
   */
  sign(payload: MeetingTokenPayload): { token: string; expiresAt: Date } {
    const secret = this.config.get('MEETING_JWT_SECRET', { infer: true });
    const issuer = this.config.get('APP_BASE_URL', { infer: true });
    const token = this.jwt.sign(payload, {
      secret,
      expiresIn: MEETING_TOKEN_TTL_SECONDS,
      audience: MEETING_JWT_AUDIENCE,
      issuer,
    });
    const expiresAt = new Date(Date.now() + MEETING_TOKEN_TTL_SECONDS * 1000);
    return { token, expiresAt };
  }

  /**
   * Verify and decode a meeting JWT. Throws `UnauthorizedException` on any
   * verification failure (expired, wrong signature, malformed, wrong
   * audience/issuer) so the caller — usually the gateway middleware — can
   * reject the connection cleanly.
   */
  verify(token: string): MeetingTokenPayload {
    const secret = this.config.get('MEETING_JWT_SECRET', { infer: true });
    const issuer = this.config.get('APP_BASE_URL', { infer: true });
    try {
      return this.jwt.verify<MeetingTokenPayload>(token, {
        secret,
        audience: MEETING_JWT_AUDIENCE,
        issuer,
      });
    } catch {
      throw new UnauthorizedException('Invalid meeting token');
    }
  }
}
