// Sets default env vars for e2e tests before any module loads them.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '0';
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/appointments_test?schema=public';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-secret-do-not-use-in-prod';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
process.env.JWT_REFRESH_TTL_DAYS = process.env.JWT_REFRESH_TTL_DAYS ?? '30';
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? 'localhost';
process.env.BCRYPT_COST = process.env.BCRYPT_COST ?? '4';
process.env.MAIL_TRANSPORT = process.env.MAIL_TRANSPORT ?? 'json';
process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'Test <test@example.com>';
process.env.ADMIN_BOOTSTRAP_EMAIL =
  process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@example.com';
process.env.ADMIN_BOOTSTRAP_PASSWORD =
  process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'AdminPass1';
process.env.ADMIN_BOOTSTRAP_NAME =
  process.env.ADMIN_BOOTSTRAP_NAME ?? 'Test Admin';
