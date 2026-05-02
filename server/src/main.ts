import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { EnvVars } from './config/env.validation';
import { NodeEnv } from './config/env.validation';
import { setupSwagger } from './swagger';

// Internal Tier C ids (SlotLock, etc.) are BigInt; JSON.stringify rejects
// BigInt by default. Render them as strings so JSON responses round-trip.
(BigInt.prototype as { toJSON?: () => string }).toJSON = function (
  this: bigint,
): string {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  // rawBody is captured on every request so the Razorpay webhook controller
  // can verify HMAC signatures against the byte-exact request body.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const config = app.get(ConfigService<EnvVars, true>);
  const corsOrigins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  if (config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    setupSwagger(app);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap app', err);
  process.exit(1);
});
