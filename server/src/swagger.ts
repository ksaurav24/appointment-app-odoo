import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_COOKIE_NAME } from './utils/cookies';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Appointment App API')
    .setDescription(
      'Multi-tenant appointment booking platform — auth, organizations, bookable inventory, and appointment-type configuration.',
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
    .addTag(
      'bookable-persons',
      'Organizer-managed human service providers (no login, receive email notifications)',
    )
    .addTag(
      'bookable-resources',
      'Organizer-managed physical assets (no login, no notifications)',
    )
    .addTag(
      'appointment-types',
      'Organizer configuration: entities, schedule, booking rules, cancellation/reschedule policy, publish state',
    )
    .addTag(
      'public-appointment-types',
      'Customer-facing discovery of published appointment types',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
