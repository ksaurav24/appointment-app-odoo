import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { MailTransport } from '../config/env.validation';
import { MailerService } from './mailer.service';

function makeConfig(transport: MailTransport): ConfigService<any, true> {
  const values: Record<string, unknown> = {
    MAIL_TRANSPORT: transport,
    MAIL_FROM: 'Test <test@example.com>',
    SMTP_USER: 'user@example.com',
    SMTP_PASS: 'pw',
  };
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService<any, true>;
}

describe('MailerService', () => {
  it('records last message under console transport without throwing', async () => {
    const svc = new MailerService(makeConfig(MailTransport.Console));
    svc.onModuleInit();
    await svc.sendOtp(
      'user@example.com',
      '123456',
      OtpPurpose.EMAIL_VERIFICATION,
    );
    const last = svc.getLastMessage();
    expect(last).not.toBeNull();
    expect(last?.to).toBe('user@example.com');
    expect(last?.text).toContain('123456');
    expect(last?.subject.toLowerCase()).toContain('verify');
  });

  it('renders 2FA template differently from email-verification', async () => {
    const svc = new MailerService(makeConfig(MailTransport.Console));
    svc.onModuleInit();
    await svc.sendOtp('a@b.c', '999000', OtpPurpose.LOGIN_2FA);
    expect(svc.getLastMessage()?.subject.toLowerCase()).toContain('login');
  });

  it('sends through json transport for tests', async () => {
    const svc = new MailerService(makeConfig(MailTransport.Json));
    svc.onModuleInit();
    await svc.sendPasswordReset(
      'user@example.com',
      'https://app/reset?token=abc',
    );
    const last = svc.getLastMessage();
    expect(last?.text).toContain('https://app/reset?token=abc');
  });

  it('renders welcome and organizer invite emails', async () => {
    const svc = new MailerService(makeConfig(MailTransport.Console));
    svc.onModuleInit();
    await svc.sendWelcome('u@x.com', 'Alice');
    expect(svc.getLastMessage()?.text).toContain('Alice');
    await svc.sendOrganizerInvite('o@x.com', 'Bob', 'https://app/setup?t=z');
    const last = svc.getLastMessage();
    expect(last?.text).toContain('Bob');
    expect(last?.text).toContain('https://app/setup?t=z');
  });
});
