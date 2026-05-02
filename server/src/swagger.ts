import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_COOKIE_NAME } from './utils/cookies';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Appointment App API')
    .setDescription(
      'Multi-tenant appointment booking platform — auth, organizations, bookable inventory, appointment-type configuration, customer booking flow, payments, admin moderation, and analytics.',
    )
    .setVersion('0.2.0')
    .addCookieAuth(
      ACCESS_COOKIE_NAME,
      { type: 'apiKey', in: 'cookie', name: ACCESS_COOKIE_NAME },
      'access',
    )
    .addTag('app', 'Health and root endpoints')
    .addTag('auth', 'Authentication, registration, and account management')
    .addTag('organizations', 'Organization (organizer-tenant) endpoints')
    .addTag(
      'admin',
      'Administrator-only endpoints (organisations, users, appointments, audit logs)',
    )
    .addTag(
      'admin-analytics',
      'Administrator-only platform-wide analytics (dashboard, time-series, top organisations)',
    )
    .addTag(
      'organiser-analytics',
      'Organizer analytics scoped to the caller’s organisation (dashboard, time-series, busy hours)',
    )
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
    .addTag(
      'public-availability',
      'Customer-facing slot availability lookup for a published appointment type',
    )
    .addTag(
      'slot-locks',
      'Short-lived holds on a slot during the customer checkout flow',
    )
    .addTag(
      'appointments',
      'Customer-facing appointment lifecycle (book, view, cancel, reschedule)',
    )
    .addTag(
      'organiser-appointments',
      'Organizer-side appointment management (list, confirm, reject, cancel)',
    )
    .addTag(
      'payments',
      'Razorpay-backed payment intents and verification for advance-payment appointment types',
    )
    .addTag('webhooks', 'External provider webhook receivers (Razorpay, etc.)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
