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

export function signupOtp(code: string): RenderedEmail {
  const subject = 'Verify your email';
  const text = `Your verification code is ${code}. It expires in 10 minutes.`;
  const html = wrap(
    'Verify your email',
    `<p>Use this code to verify your email address. It expires in 10 minutes.</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>`,
  );
  return { subject, text, html };
}

export function loginOtp(code: string): RenderedEmail {
  const subject = 'Your login verification code';
  const text = `Your login verification code is ${code}. It expires in 2 minutes.`;
  const html = wrap(
    'Login verification',
    `<p>Use this code to complete your sign-in. It expires in 2 minutes.</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>`,
  );
  return { subject, text, html };
}

export function passwordResetOtp(code: string): RenderedEmail {
  const subject = 'Your password reset code';
  const text = `Your password reset code is ${code}. It expires in 5 minutes.`;
  const html = wrap(
    'Password reset code',
    `<p>Use this code to reset your password. It expires in 5 minutes.</p>
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

export function organizerApprovedEmail(
  fullName: string,
  loginUrl: string,
): RenderedEmail {
  const subject = 'Your organizer account has been approved';
  const text = `Hi ${fullName}, your organizer account has been approved. Sign in here: ${loginUrl}`;
  const html = wrap(
    'Your account is approved',
    `<p>Hi ${fullName},</p>
     <p>Your organizer account has been approved. You can now sign in and start setting up your organization.</p>
     <p><a href="${loginUrl}" style="display: inline-block; padding: 10px 16px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 6px;">Sign in</a></p>
     <p style="font-size: 12px; color: #6b7280;">Or paste this URL: ${loginUrl}</p>`,
  );
  return { subject, text, html };
}

export function organizerRejectedEmail(
  fullName: string,
  reason?: string,
): RenderedEmail {
  const subject = 'Update on your organizer application';
  const reasonLine = reason
    ? `Reason provided by the reviewer: ${reason}`
    : 'No additional reason was provided.';
  const text = `Hi ${fullName}, after review your organizer application was not approved. ${reasonLine}`;
  const reasonHtml = reason
    ? `<p><strong>Reason:</strong> ${reason}</p>`
    : '<p>No additional reason was provided.</p>';
  const html = wrap(
    'Application update',
    `<p>Hi ${fullName},</p>
     <p>Thanks for your interest. After review, your organizer application was not approved at this time.</p>
     ${reasonHtml}
     <p>If you believe this was a mistake or would like to provide more information, please reply to this email.</p>`,
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
