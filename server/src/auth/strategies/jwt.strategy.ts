import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_COOKIE_NAME } from '../../utils/cookies';
import { EnvVars } from '../../config/env.validation';
import type { JwtUserPayload } from '../token.service';

const cookieExtractor = (req: Request): string | null => {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  return cookies[ACCESS_COOKIE_NAME] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<EnvVars, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtUserPayload): JwtUserPayload {
    return payload;
  }
}
