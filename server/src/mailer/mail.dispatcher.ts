import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';
import { EnvVars, MailTransport } from '../config/env.validation';
import type { MailJobPayload } from './mail.types';

interface JsonTransportInfo {
  message?: unknown;
  [key: string]: unknown;
}

@Injectable()
export class MailDispatcher implements OnModuleInit {
  private readonly logger = new Logger(MailDispatcher.name);
  private transporter!: Transporter;
  private transport!: MailTransport;
  private from!: string;

  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  onModuleInit(): void {
    this.transport = this.config.get('MAIL_TRANSPORT', { infer: true });
    this.from = this.config.get('MAIL_FROM', { infer: true });
    this.transporter = this.buildTransporter();
    this.logger.log(`Mail dispatcher ready (transport=${this.transport})`);
  }

  async deliver(payload: MailJobPayload): Promise<void> {
    const message: SendMailOptions = {
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    if (this.transport === MailTransport.Console) {
      this.logger.log(
        `[email] to=${payload.to} subject="${payload.subject}"\n${payload.text}`,
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
        return nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true,
        });
    }
  }
}
