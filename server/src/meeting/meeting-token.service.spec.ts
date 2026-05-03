import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MeetingTokenService } from './meeting-token.service';
import { MeetingTokenPayload } from './types';

const SECRET = 'test-meeting-secret-1234567890ab';
const ISSUER = 'https://example.test';

function makeConfig(secret = SECRET, issuer = ISSUER): ConfigService {
  return {
    get: jest.fn((key: string) => {
      if (key === 'MEETING_JWT_SECRET') return secret;
      if (key === 'APP_BASE_URL') return issuer;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function makeService(secret = SECRET, issuer = ISSUER): MeetingTokenService {
  return new MeetingTokenService(
    new JwtService({}),
    makeConfig(secret, issuer),
  );
}

describe('MeetingTokenService', () => {
  const basePayload: MeetingTokenPayload = {
    appointmentId: '42',
    role: 'HOST',
    userId: 'user-1',
  };

  it('signs and verifies a payload round-trip', () => {
    const svc = makeService();
    const { token, expiresAt } = svc.sign(basePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const decoded = svc.verify(token);
    expect(decoded.appointmentId).toBe('42');
    expect(decoded.role).toBe('HOST');
    expect(decoded.userId).toBe('user-1');
    expect(decoded.exp).toBeDefined();
  });

  it('rejects a token signed with a different secret', () => {
    const signer = makeService('a-different-secret-32-chars-long');
    const { token } = signer.sign(basePayload);
    const verifier = makeService();
    expect(() => verifier.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects a malformed token', () => {
    const svc = makeService();
    expect(() => svc.verify('not-a-jwt')).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    // Sign a token that expired one hour ago by reaching past the
    // service abstraction directly into JwtService.
    const jwt = new JwtService({});
    const expiredToken = jwt.sign(basePayload, {
      secret: SECRET,
      expiresIn: -3600,
      audience: 'meeting',
      issuer: ISSUER,
    });
    const svc = makeService();
    expect(() => svc.verify(expiredToken)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with the wrong audience', () => {
    // Same secret + issuer but audience='other' — must not verify under the
    // meeting service which expects audience='meeting'.
    const jwt = new JwtService({});
    const wrongAudToken = jwt.sign(basePayload, {
      secret: SECRET,
      expiresIn: 60,
      audience: 'other',
      issuer: ISSUER,
    });
    const svc = makeService();
    expect(() => svc.verify(wrongAudToken)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed without audience/issuer claims', () => {
    // A bare token (no aud/iss) signed with the same secret must still be
    // rejected — defends against accidental cross-module token reuse.
    const jwt = new JwtService({});
    const bareToken = jwt.sign(basePayload, {
      secret: SECRET,
      expiresIn: 60,
    });
    const svc = makeService();
    expect(() => svc.verify(bareToken)).toThrow(UnauthorizedException);
  });
});
