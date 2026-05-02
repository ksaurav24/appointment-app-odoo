export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const wrap = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <div style="max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="margin-top: 0;">${title}</h2>
      ${body}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b7280;">If you didn't expect this email, you can safely ignore it.</p>
    </div>
  </body>
</html>`;

export function emailVerificationOtp(code: string): RenderedEmail {
  const subject = 'Verify your email';
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  const html = wrap(
    'Verify your email',
    `<p>Use this code to verify your email address. It expires in 10 minutes.</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>`,
  );
  return { subject, text, html };
}

export function loginTwoFactorOtp(code: string): RenderedEmail {
  const subject = 'Your login verification code';
  const text = `Your login verification code is ${code}. It expires in 5 minutes.`;
  const html = wrap(
    'Login verification',
    `<p>Use this code to complete your sign-in. It expires in 5 minutes.</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>`,
  );
  return { subject, text, html };
}

export function passwordResetEmail(resetUrl: string): RenderedEmail {
  const subject = 'Reset your password';
  const text = `Reset your password using this link (valid for 1 hour): ${resetUrl}`;
  const html = wrap(
    'Reset your password',
    `<p>Click the button below to reset your password. The link expires in 1 hour.</p>
     <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">Reset password</a></p>
     <p style="font-size: 12px; color: #6b7280;">Or paste this URL: ${resetUrl}</p>`,
  );
  return { subject, text, html };
}

export function organizerInviteEmail(
  fullName: string,
  setupUrl: string,
): RenderedEmail {
  const subject = "You've been invited to set up your organizer account";
  const text = `Hi ${fullName}, set your password and activate your account here (valid for 7 days): ${setupUrl}`;
  const html = wrap(
    'Welcome — set up your account',
    `<p>Hi ${fullName},</p>
     <p>You've been invited to manage an organization on the platform. Click the button below to set your password and activate your account. This link is valid for 7 days.</p>
     <p><a href="${setupUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">Set up account</a></p>`,
  );
  return { subject, text, html };
}

export function welcomeEmail(fullName: string): RenderedEmail {
  const subject = 'Welcome aboard';
  const text = `Hi ${fullName}, your email has been verified.`;
  const html = wrap(
    'Welcome aboard',
    `<p>Hi ${fullName},</p>
     <p>Your email has been verified and your account is now active.</p>`,
  );
  return { subject, text, html };
}
