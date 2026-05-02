import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_COOKIE_NAME } from './utils/cookies';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Appointment App API')
    .setDescription(
      'Multi-tenant appointment booking platform — auth, organizations, and (forthcoming) appointment endpoints.',
    )
    .setVersion('0.1.0')
    .addCookieAuth(
      ACCESS_COOKIE_NAME,
      { type: 'apiKey', in: 'cookie', name: ACCESS_COOKIE_NAME },
      'access',
    )
    .addTag('app', 'Health and root endpoints')
    .addTag('auth', 'Authentication, registration, and account management')
    .addTag('organizations', 'Organization (organizer-tenant) endpoints')
    .addTag('admin', 'Administrator-only endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
