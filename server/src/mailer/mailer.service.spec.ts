import { OtpPurpose } from '@prisma/client';
import type { Queue } from 'bullmq';
import { MAIL_JOB_SEND, MailJobPayload } from './mail.types';
import { MailerService } from './mailer.service';

interface QueuedJob {
  name: string;
  data: MailJobPayload;
}

function makeQueue(jobs: QueuedJob[]): Queue<MailJobPayload> {
  return {
    add: (name: string, data: MailJobPayload): Promise<void> => {
      jobs.push({ name, data });
      return Promise.resolve();
    },
  } as unknown as Queue<MailJobPayload>;
}

describe('MailerService (queue)', () => {
  it('enqueues a signup OTP and records last message', async () => {
    const jobs: QueuedJob[] = [];
    const svc = new MailerService(makeQueue(jobs));
    await svc.sendOtp('user@example.com', '123456', OtpPurpose.SIGNUP);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].name).toBe(MAIL_JOB_SEND);
    expect(jobs[0].data.to).toBe('user@example.com');
    expect(jobs[0].data.text).toContain('123456');
    expect(jobs[0].data.subject.toLowerCase()).toContain('verify');

    const last = svc.getLastMessage();
    expect(last?.subject.toLowerCase()).toContain('verify');
  });

  it('renders login OTP differently from signup', async () => {
    const jobs: QueuedJob[] = [];
    const svc = new MailerService(makeQueue(jobs));
    await svc.sendOtp('a@b.c', '999000', OtpPurpose.LOGIN);
    expect(jobs[0].data.subject.toLowerCase()).toContain('login');
  });

  it('renders password-reset OTP', async () => {
    const jobs: QueuedJob[] = [];
    const svc = new MailerService(makeQueue(jobs));
    await svc.sendOtp('a@b.c', '424242', OtpPurpose.PASSWORD_RESET);
    expect(jobs[0].data.subject.toLowerCase()).toContain('password');
    expect(jobs[0].data.text).toContain('424242');
  });

  it('enqueues a password-reset link email', async () => {
    const jobs: QueuedJob[] = [];
    const svc = new MailerService(makeQueue(jobs));
    await svc.sendPasswordReset(
      'user@example.com',
      'https://app/reset?token=abc',
    );
    expect(jobs[0].data.text).toContain('https://app/reset?token=abc');
  });

  it('enqueues organizer invite and welcome emails', async () => {
    const jobs: QueuedJob[] = [];
    const svc = new MailerService(makeQueue(jobs));
    await svc.sendWelcome('u@x.com', 'Alice');
    expect(jobs[jobs.length - 1].data.text).toContain('Alice');

    await svc.sendOrganizerInvite('o@x.com', 'Bob', 'https://app/setup?t=z');
    expect(jobs[jobs.length - 1].data.text).toContain('Bob');
    expect(jobs[jobs.length - 1].data.text).toContain('https://app/setup?t=z');
  });
});
