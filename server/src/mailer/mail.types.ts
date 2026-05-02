export const MAIL_JOB_SEND = 'send';

export interface MailJobPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}
