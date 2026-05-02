import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import type { Queue } from 'bullmq';
import { MailDispatcher } from './mail.dispatcher';
import { MAIL_QUEUE_NAME } from './mail.constants';
import { MAIL_JOB_SEND, MailJobPayload } from './mail.types';
import {
  RenderedEmail,
  loginOtp,
  organizerApprovedEmail,
  organizerRejectedEmail,
  passwordResetEmail,
  passwordResetOtp,
  signupOtp,
  welcomeEmail,
} from './templates';

export type SentEmailRecord = MailJobPayload;

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private lastMessage: SentEmailRecord | null = null;

  constructor(
    @InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue<MailJobPayload>,
    // Optional in tests / when no Redis is available; production wires this up.
    @Optional() private readonly dispatcher: MailDispatcher | null = null,
  ) {}

  async sendOtp(
    email: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const rendered = renderOtpFor(purpose, code);
    await this.enqueue(email, rendered);
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.enqueue(email, passwordResetEmail(resetUrl));
  }

  async sendWelcome(email: string, fullName: string): Promise<void> {
    await this.enqueue(email, welcomeEmail(fullName));
  }

  async sendOrganizerApproved(
    email: string,
    fullName: string,
    loginUrl: string,
  ): Promise<void> {
    await this.enqueue(email, organizerApprovedEmail(fullName, loginUrl));
  }

  async sendOrganizerRejected(
    email: string,
    fullName: string,
    reason?: string,
  ): Promise<void> {
    await this.enqueue(email, organizerRejectedEmail(fullName, reason));
  }

  /**
   * Generic enqueue. Used by the notifications service which has already
   * rendered the template and recorded the Notification row. Pass
   * `notificationId` so the worker can flip the row to SENT/FAILED.
   */
  enqueueRendered(
    to: string,
    rendered: RenderedEmail,
    notificationId?: bigint,
  ): Promise<void> {
    return this.enqueue(to, rendered, notificationId);
  }

  getLastMessage(): SentEmailRecord | null {
    return this.lastMessage;
  }

  resetLastMessage(): void {
    this.lastMessage = null;
  }

  private async enqueue(
    to: string,
    rendered: RenderedEmail,
    notificationId?: bigint,
  ): Promise<void> {
    const payload: MailJobPayload = {
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      ...(notificationId != null
        ? { notificationId: notificationId.toString() }
        : {}),
    };
    this.lastMessage = payload;

    await this.queue.add(MAIL_JOB_SEND, payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3_600, count: 1_000 },
      removeOnFail: { age: 24 * 3_600 },
    });
    this.logger.debug(`[mail] queued to=${to} subject="${rendered.subject}"`);
  }
}

function renderOtpFor(purpose: OtpPurpose, code: string): RenderedEmail {
  switch (purpose) {
    case OtpPurpose.SIGNUP:
      return signupOtp(code);
    case OtpPurpose.LOGIN:
      return loginOtp(code);
    case OtpPurpose.PASSWORD_RESET:
      return passwordResetOtp(code);
  }
}
