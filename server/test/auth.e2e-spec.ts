/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MailerService } from '../src/mailer/mailer.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../src/common/cookies';

const PASSWORD = 'CorrectHorse1';

interface CookieMap {
  [name: string]: string;
}

function parseSetCookies(headers: string[] | string | undefined): CookieMap {
  if (!headers) return {};
  const arr = Array.isArray(headers) ? headers : [headers];
  const out: CookieMap = {};
  for (const raw of arr) {
    const [pair] = raw.split(';');
    const [name, ...rest] = pair.split('=');
    out[name.trim()] = rest.join('=');
  }
  return out;
}

function cookieHeader(map: CookieMap): string {
  return Object.entries(map)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function extractOtp(text: string): string {
  const m = /(\d{6})/.exec(text);
  if (!m) throw new Error(`No OTP found in: ${text}`);
  return m[1];
}

function extractResetToken(text: string): string {
  const m = /token=([A-Za-z0-9_-]+)/.exec(text);
  if (!m) throw new Error(`No reset token found in: ${text}`);
  return decodeURIComponent(m[1]);
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mailer: MailerService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    mailer = app.get(MailerService);
  });

  beforeEach(async () => {
    // Order matters due to FKs
    await prisma.refreshToken.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.otpVerification.deleteMany();
    await prisma.user.deleteMany();
    mailer.resetLastMessage();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndVerify(email: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD, fullName: 'Test User' })
      .expect(201);

    const code = extractOtp(mailer.getLastMessage()!.text);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ email, code })
      .expect(200);
  }

  describe('register + verify', () => {
    it('rejects weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'lettersonly', fullName: 'A' })
        .expect(400);
    });

    it('registers a customer and emails an OTP', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'alice@example.com',
          password: PASSWORD,
          fullName: 'Alice',
        })
        .expect(201);
      expect(res.body.userId).toBeDefined();
      const last = mailer.getLastMessage();
      expect(last?.to).toBe('alice@example.com');
      expect(/\d{6}/.test(last?.text ?? '')).toBe(true);
    });

    it('verifies the OTP and marks the user verified', async () => {
      await registerAndVerify('alice@example.com');
      const user = await prisma.user.findUnique({
        where: { email: 'alice@example.com' },
      });
      expect(user?.emailVerified).toBe(true);
    });

    it('rejects duplicate email registration', async () => {
      await registerAndVerify('alice@example.com');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'alice@example.com', password: PASSWORD, fullName: 'A' })
        .expect(409);
    });
  });

  describe('login', () => {
    it('blocks login until email is verified', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'bob@example.com', password: PASSWORD, fullName: 'Bob' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bob@example.com', password: PASSWORD })
        .expect(403);
    });

    it('rejects bad credentials with 401', async () => {
      await registerAndVerify('alice@example.com');
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'WrongPass1' })
        .expect(401);
    });

    it('logs in successfully and sets both cookies', async () => {
      await registerAndVerify('alice@example.com');
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(res.headers['set-cookie']);
      expect(cookies[ACCESS_COOKIE_NAME]).toBeTruthy();
      expect(cookies[REFRESH_COOKIE_NAME]).toBeTruthy();
      expect(res.body.user.email).toBe('alice@example.com');
    });
  });

  describe('protected endpoints', () => {
    it('rejects /auth/me without a cookie', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns the current user when authenticated', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookieHeader(cookies))
        .expect(200);
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('refresh + logout', () => {
    it('rotates the refresh token and revokes the previous one', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const oldCookies = parseSetCookies(login.headers['set-cookie']);

      const refresh = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(oldCookies))
        .expect(200);
      const newCookies = parseSetCookies(refresh.headers['set-cookie']);
      expect(newCookies[REFRESH_COOKIE_NAME]).not.toBe(
        oldCookies[REFRESH_COOKIE_NAME],
      );

      // Reusing the old refresh token should fail and revoke the family
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(oldCookies))
        .expect(401);

      // The new refresh token should now also be revoked (family revoke)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(newCookies))
        .expect(401);
    });

    it('logout revokes the current refresh token', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookieHeader(cookies))
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(cookies))
        .expect(401);
    });
  });

  describe('2FA login', () => {
    it('enables 2FA, then login requires a second factor', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);

      await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Cookie', cookieHeader(cookies))
        .expect(200);

      const login2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      expect(login2.body.twoFactorRequired).toBe(true);
      expect(login2.headers['set-cookie']).toBeUndefined();

      const code = extractOtp(mailer.getLastMessage()!.text);
      const res = await request(app.getHttpServer())
        .post('/auth/login/2fa')
        .send({ email: 'alice@example.com', code })
        .expect(200);
      const newCookies = parseSetCookies(res.headers['set-cookie']);
      expect(newCookies[ACCESS_COOKIE_NAME]).toBeTruthy();
    });
  });

  describe('password reset', () => {
    it('issues a reset token, accepts a new password, and revokes existing sessions', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'alice@example.com' })
        .expect(200);
      const token = extractResetToken(mailer.getLastMessage()!.text);

      const newPw = 'NewPassword2';
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword: newPw })
        .expect(200);

      // Existing refresh tokens should be invalid after reset
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(cookies))
        .expect(401);

      // New password works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: newPw })
        .expect(200);
    });

    it('responds 200 even for an unknown email (no enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(200);
    });
  });

  describe('RBAC', () => {
    async function createAdmin(): Promise<{ email: string; password: string }> {
      const email = 'rbac-admin@example.com';
      const passwordHash = await bcrypt.hash(PASSWORD, 4);
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: 'Admin',
          role: Role.ADMIN,
          emailVerified: true,
        },
      });
      return { email, password: PASSWORD };
    }

    it('blocks customers from /admin/ping with 403', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);
      await request(app.getHttpServer())
        .get('/admin/ping')
        .set('Cookie', cookieHeader(cookies))
        .expect(403);
    });

    it('allows admins on /admin/ping and creates organizers', async () => {
      const admin = await createAdmin();
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: admin.password })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);
      await request(app.getHttpServer())
        .get('/admin/ping')
        .set('Cookie', cookieHeader(cookies))
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/admin/organizers')
        .set('Cookie', cookieHeader(cookies))
        .send({ email: 'org@example.com', fullName: 'Org Owner' })
        .expect(201);
      expect(res.body.role).toBe('ORGANIZER');
      expect(mailer.getLastMessage()?.subject.toLowerCase()).toContain(
        'invited',
      );
    });
  });

  describe('change password', () => {
    it('rejects wrong current password and accepts correct one', async () => {
      await registerAndVerify('alice@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Cookie', cookieHeader(cookies))
        .send({ currentPassword: 'WrongOne1', newPassword: 'NewPassword2' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Cookie', cookieHeader(cookies))
        .send({ currentPassword: PASSWORD, newPassword: 'NewPassword2' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'alice@example.com', password: 'NewPassword2' })
        .expect(200);
    });
  });
});
