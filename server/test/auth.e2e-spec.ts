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
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../src/utils/cookies';

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
    await prisma.organization.deleteMany();
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

    it('allows admins on /admin/ping', async () => {
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
    });
  });

  describe('organizer self-registration + admin approval', () => {
    async function createAdminAndLogin(): Promise<CookieMap> {
      const email = 'approval-admin@example.com';
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
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      return parseSetCookies(login.headers['set-cookie']);
    }

    async function selfRegisterOrganizer(slug: string): Promise<{
      email: string;
      organizationId: string;
    }> {
      const email = `${slug}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: PASSWORD,
          fullName: 'Org User',
          organization: {
            name: slug.toUpperCase(),
            slug,
            contactEmail: email,
          },
        })
        .expect(201);
      return {
        email,
        organizationId: res.body.organizationId as string,
      };
    }

    async function verifyOrganizerEmail(email: string): Promise<void> {
      const code = extractOtp(mailer.getLastMessage()!.text);
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email, code })
        .expect(200);
    }

    it('lets organizer log in pre-approval; /organizations/me shows PENDING; admin approves and email is sent', async () => {
      const { email, organizationId } = await selfRegisterOrganizer('acme');
      await verifyOrganizerEmail(email);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const orgCookies = parseSetCookies(login.headers['set-cookie']);

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookieHeader(orgCookies))
        .expect(200);
      expect(me.body.email).toBe(email);
      expect(me.body.organization).toBeUndefined();

      const orgMe = await request(app.getHttpServer())
        .get('/organizations/me')
        .set('Cookie', cookieHeader(orgCookies))
        .expect(200);
      expect(orgMe.body.id).toBe(organizationId);
      expect(orgMe.body.approvalStatus).toBe('PENDING');

      const adminCookies = await createAdminAndLogin();
      const pending = await request(app.getHttpServer())
        .get('/admin/organizations/pending')
        .set('Cookie', cookieHeader(adminCookies))
        .expect(200);
      expect(pending.body).toHaveLength(1);
      expect(pending.body[0].id).toBe(organizationId);

      const defaultList = await request(app.getHttpServer())
        .get('/admin/organizations')
        .set('Cookie', cookieHeader(adminCookies))
        .expect(200);
      expect(defaultList.body).toHaveLength(0);

      await request(app.getHttpServer())
        .post(`/admin/organizations/${organizationId}/approve`)
        .set('Cookie', cookieHeader(adminCookies))
        .expect(200);
      expect(mailer.getLastMessage()?.subject.toLowerCase()).toContain(
        'approved',
      );

      const orgMe2 = await request(app.getHttpServer())
        .get('/organizations/me')
        .set('Cookie', cookieHeader(orgCookies))
        .expect(200);
      expect(orgMe2.body.approvalStatus).toBe('APPROVED');
    });

    it('rejects with reason, emails the organizer, and revokes their sessions', async () => {
      const { email, organizationId } = await selfRegisterOrganizer('beta');
      await verifyOrganizerEmail(email);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      const orgCookies = parseSetCookies(login.headers['set-cookie']);

      const adminCookies = await createAdminAndLogin();
      await request(app.getHttpServer())
        .post(`/admin/organizations/${organizationId}/reject`)
        .set('Cookie', cookieHeader(adminCookies))
        .send({ reason: 'incomplete details' })
        .expect(200);
      const last = mailer.getLastMessage();
      expect(last?.subject.toLowerCase()).toContain('application');
      expect(last?.text).toContain('incomplete details');

      // Organizer's refresh token should be revoked.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookieHeader(orgCookies))
        .expect(401);
    });

    it('rejects duplicate slug at registration', async () => {
      await selfRegisterOrganizer('dup-slug');
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: PASSWORD,
          fullName: 'Other',
          organization: {
            name: 'Other',
            slug: 'dup-slug',
            contactEmail: 'other@example.com',
          },
        })
        .expect(409);
    });
  });

  describe('verify-email auto-login', () => {
    it('sets auth cookies and returns user on first-time verify', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'first@example.com',
          password: PASSWORD,
          fullName: 'First',
        })
        .expect(201);
      const code = extractOtp(mailer.getLastMessage()!.text);

      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'first@example.com', code })
        .expect(200);

      expect(res.body.message).toBe('Email verified.');
      expect(res.body.user?.email).toBe('first@example.com');
      const cookies = parseSetCookies(res.headers['set-cookie']);
      expect(cookies[ACCESS_COOKIE_NAME]).toBeTruthy();
      expect(cookies[REFRESH_COOKIE_NAME]).toBeTruthy();

      // The cookies are usable immediately.
      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookieHeader(cookies))
        .expect(200);
      expect(me.body.email).toBe('first@example.com');
    });

    it('does not set cookies on idempotent re-verify', async () => {
      await registerAndVerify('alice@example.com');
      mailer.resetLastMessage();

      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'alice@example.com', code: '000000' })
        .expect(200);
      expect(res.body.message).toBe('Email already verified.');
      expect(res.body.user).toBeUndefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('register role resolution', () => {
    it('CUSTOMER + organization payload is rejected with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'mismatch@example.com',
          password: PASSWORD,
          fullName: 'Mismatch',
          role: 'CUSTOMER',
          organization: {
            name: 'Should Fail',
            slug: 'should-fail',
            contactEmail: 'mismatch@example.com',
          },
        })
        .expect(400);
    });

    it('ORGANIZER without organization creates organizer with no org (sequential path)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'org-pending@example.com',
          password: PASSWORD,
          fullName: 'Pending Organizer',
          role: 'ORGANIZER',
        })
        .expect(201);
      expect(res.body.organizationId).toBeUndefined();

      const user = await prisma.user.findUnique({
        where: { email: 'org-pending@example.com' },
      });
      expect(user?.role).toBe(Role.ORGANIZER);
      const org = await prisma.organization.findUnique({
        where: { organiserId: user!.id },
      });
      expect(org).toBeNull();
    });

    it('explicit role=CUSTOMER without org creates a customer', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'explicit-cust@example.com',
          password: PASSWORD,
          fullName: 'Explicit Customer',
          role: 'CUSTOMER',
        })
        .expect(201);
      const user = await prisma.user.findUnique({
        where: { email: 'explicit-cust@example.com' },
      });
      expect(user?.role).toBe(Role.CUSTOMER);
    });
  });

  describe('POST /organizations (sequential org creation)', () => {
    async function registerVerifiedOrganizerNoOrg(
      email: string,
    ): Promise<CookieMap> {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: PASSWORD,
          fullName: 'Seq Organizer',
          role: 'ORGANIZER',
        })
        .expect(201);
      const code = extractOtp(mailer.getLastMessage()!.text);
      const verify = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email, code })
        .expect(200);
      return parseSetCookies(verify.headers['set-cookie']);
    }

    it('creates a PENDING organization for a verified organizer with no org', async () => {
      const cookies = await registerVerifiedOrganizerNoOrg('seq@example.com');

      const res = await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(cookies))
        .send({
          name: 'Sequential Inc',
          slug: 'sequential-inc',
          description: 'Created after email verification',
          contactPhone: '9000000000',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'Akurdi, Pune, Maharashtra 411035',
          latitude: 18.6505,
          longitude: 73.7656,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/logo.png',
          galleryImageUrls: [
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/gallery-1.png',
          ],
          timezone: 'Asia/Kolkata',
        })
        .expect(201);

      expect(res.body.approvalStatus).toBe('PENDING');
      expect(res.body.slug).toBe('sequential-inc');
      // contactEmail falls back to the organizer's email when omitted
      expect(res.body.contactEmail).toBe('seq@example.com');
    });

    it('rejects a second POST with 409 (organizer already has an org)', async () => {
      const cookies = await registerVerifiedOrganizerNoOrg('seq2@example.com');
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(cookies))
        .send({
          name: 'First Co',
          slug: 'first-co',
          description: 'First org',
          contactPhone: '9876543210',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'First address, Pune',
          latitude: 18.5204,
          longitude: 73.8567,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/first-logo.png',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(cookies))
        .send({
          name: 'Second Co',
          slug: 'second-co',
          description: 'Second org',
          contactPhone: '9123456789',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'Second address, Pune',
          latitude: 18.521,
          longitude: 73.857,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/second-logo.png',
        })
        .expect(409);
    });

    it('rejects a duplicate slug with 409', async () => {
      const a = await registerVerifiedOrganizerNoOrg('seqa@example.com');
      const b = await registerVerifiedOrganizerNoOrg('seqb@example.com');
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(a))
        .send({
          name: 'Aco',
          slug: 'shared-slug',
          description: 'A org',
          contactPhone: '9012345678',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'A address, Pune',
          latitude: 18.53,
          longitude: 73.84,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/a-logo.png',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(b))
        .send({
          name: 'Bco',
          slug: 'shared-slug',
          description: 'B org',
          contactPhone: '9012345679',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'B address, Pune',
          latitude: 18.54,
          longitude: 73.85,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/b-logo.png',
        })
        .expect(409);
    });

    it('blocks customers from creating organizations (403)', async () => {
      await registerAndVerify('cust@example.com');
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'cust@example.com', password: PASSWORD })
        .expect(200);
      const cookies = parseSetCookies(login.headers['set-cookie']);
      await request(app.getHttpServer())
        .post('/organizations')
        .set('Cookie', cookieHeader(cookies))
        .send({
          name: 'Nope',
          slug: 'nope-co',
          description: 'Nope org',
          contactPhone: '9988776655',
          city: 'Pune',
          state: 'Maharashtra',
          address: 'Nope address, Pune',
          latitude: 18.52,
          longitude: 73.85,
          logoUrl:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/organizations/nope-logo.png',
        })
        .expect(403);
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
