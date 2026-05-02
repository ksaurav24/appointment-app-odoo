import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';

interface JsonTransportInfo {
  message?: unknown;
  [key: string]: unknown;
}
import { OtpPurpose } from '@prisma/client';
import { EnvVars, MailTransport } from '../config/env.validation';
import {
  RenderedEmail,
  emailVerificationOtp,
  loginTwoFactorOtp,
  organizerInviteEmail,
  passwordResetEmail,
  welcomeEmail,
} from './templates';

export interface SentEmailRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter!: Transporter;
  private transport!: MailTransport;
  private from!: string;
  private lastMessage: SentEmailRecord | null = null;

  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  onModuleInit(): void {
    this.transport = this.config.get('MAIL_TRANSPORT', { infer: true });
    this.from = this.config.get('MAIL_FROM', { infer: true });
    this.transporter = this.buildTransporter();
    this.logger.log(`Mailer ready (transport=${this.transport})`);
  }

  private buildTransporter(): Transporter {
    switch (this.transport) {
      case MailTransport.Gmail:
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: this.config.get('SMTP_USER', { infer: true }),
            pass: this.config.get('SMTP_PASS', { infer: true }),
          },
        });
      case MailTransport.Json:
        return nodemailer.createTransport({ jsonTransport: true });
      case MailTransport.Console:
      default:
        // streamTransport with newline produces a buffer we ignore; we log instead.
        return nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
    }
  }

  async sendOtp(
    email: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const rendered =
      purpose === OtpPurpose.EMAIL_VERIFICATION
        ? emailVerificationOtp(code)
        : loginTwoFactorOtp(code);
    await this.send(email, rendered);
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.send(email, passwordResetEmail(resetUrl));
  }

  async sendOrganizerInvite(
    email: string,
    fullName: string,
    setupUrl: string,
  ): Promise<void> {
    await this.send(email, organizerInviteEmail(fullName, setupUrl));
  }

  async sendWelcome(email: string, fullName: string): Promise<void> {
    await this.send(email, welcomeEmail(fullName));
  }

  getLastMessage(): SentEmailRecord | null {
    return this.lastMessage;
  }

  resetLastMessage(): void {
    this.lastMessage = null;
  }

  private async send(to: string, rendered: RenderedEmail): Promise<void> {
    const message: SendMailOptions = {
      from: this.from,
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    };

    this.lastMessage = {
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    };

    if (this.transport === MailTransport.Console) {
      this.logger.log(
        `[email] to=${to} subject="${rendered.subject}"\n${rendered.text}`,
      );
      return;
    }

    const info: JsonTransportInfo = (await this.transporter.sendMail(
      message,
    )) as JsonTransportInfo;
    if (this.transport === MailTransport.Json) {
      this.logger.debug(`[email/json] ${JSON.stringify(info.message ?? info)}`);
    }
  }
}
