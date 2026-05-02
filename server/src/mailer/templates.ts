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

// ---------------------------------------------------------------------------
// Booking-lifecycle templates (PRD §9)
// ---------------------------------------------------------------------------

export interface BookingEmailContext {
  recipientName: string;
  appointmentTypeName: string;
  organizationName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  confirmationCode: string;
  /** Optional, e.g. "Dr. Rao" for PERSON-type appointments. */
  providerName?: string;
}

function formatRange(ctx: BookingEmailContext): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ctx.timezone,
    timeZoneName: 'short',
  };
  const fmt = new Intl.DateTimeFormat('en-US', opts);
  return `${fmt.format(ctx.startTime)} – ${fmt.format(ctx.endTime)}`;
}

function bookingDetailsBlock(ctx: BookingEmailContext): string {
  const provider = ctx.providerName
    ? `<li>Provider: ${ctx.providerName}</li>`
    : '';
  return `<ul>
    <li>Service: ${ctx.appointmentTypeName}</li>
    <li>With: ${ctx.organizationName}</li>
    <li>When: ${formatRange(ctx)}</li>
    ${provider}
    <li>Confirmation code: <strong>${ctx.confirmationCode}</strong></li>
  </ul>`;
}

export function bookingConfirmedCustomerEmail(
  ctx: BookingEmailContext,
): RenderedEmail {
  const subject = `Your booking is confirmed — ${ctx.appointmentTypeName}`;
  const text = `Hi ${ctx.recipientName}, your booking for ${ctx.appointmentTypeName} with ${ctx.organizationName} on ${formatRange(ctx)} is confirmed. Confirmation code: ${ctx.confirmationCode}.`;
  const html = wrap(
    'Your booking is confirmed',
    `<p>Hi ${ctx.recipientName},</p>
     <p>Your booking is confirmed.</p>
     ${bookingDetailsBlock(ctx)}`,
  );
  return { subject, text, html };
}

export function bookingPendingApprovalCustomerEmail(
  ctx: BookingEmailContext,
): RenderedEmail {
  const subject = `Booking received — awaiting confirmation`;
  const text = `Hi ${ctx.recipientName}, your booking for ${ctx.appointmentTypeName} on ${formatRange(ctx)} has been received and is awaiting confirmation from the organiser.`;
  const html = wrap(
    'Booking received',
    `<p>Hi ${ctx.recipientName},</p>
     <p>Your booking has been received and is awaiting confirmation from ${ctx.organizationName}. We'll email you again as soon as it is approved or declined.</p>
     ${bookingDetailsBlock(ctx)}`,
  );
  return { subject, text, html };
}

export function bookingPendingApprovalOrganiserEmail(
  ctx: BookingEmailContext & { customerName: string },
): RenderedEmail {
  const subject = `New booking awaiting your approval`;
  const text = `A new booking from ${ctx.customerName} for ${ctx.appointmentTypeName} on ${formatRange(ctx)} requires your approval.`;
  const html = wrap(
    'New booking awaiting approval',
    `<p>Hi ${ctx.recipientName},</p>
     <p>${ctx.customerName} has requested a booking that requires your manual approval.</p>
     ${bookingDetailsBlock(ctx)}
     <p>Please review and approve or reject from your dashboard.</p>`,
  );
  return { subject, text, html };
}

export function bookingApprovedCustomerEmail(
  ctx: BookingEmailContext,
): RenderedEmail {
  const subject = `Your booking has been approved`;
  const text = `Hi ${ctx.recipientName}, your booking for ${ctx.appointmentTypeName} on ${formatRange(ctx)} has been approved.`;
  const html = wrap(
    'Booking approved',
    `<p>Hi ${ctx.recipientName},</p>
     <p>Good news — your booking has been approved.</p>
     ${bookingDetailsBlock(ctx)}`,
  );
  return { subject, text, html };
}

export function bookingRejectedCustomerEmail(
  ctx: BookingEmailContext & { reason?: string },
): RenderedEmail {
  const subject = `Your booking was not approved`;
  const reasonLine = ctx.reason
    ? `Reason provided by the organiser: ${ctx.reason}`
    : 'No additional reason was provided.';
  const text = `Hi ${ctx.recipientName}, your booking for ${ctx.appointmentTypeName} on ${formatRange(ctx)} was not approved. ${reasonLine}`;
  const reasonHtml = ctx.reason
    ? `<p><strong>Reason:</strong> ${ctx.reason}</p>`
    : '';
  const html = wrap(
    'Booking not approved',
    `<p>Hi ${ctx.recipientName},</p>
     <p>Unfortunately your booking was not approved by ${ctx.organizationName}.</p>
     ${bookingDetailsBlock(ctx)}
     ${reasonHtml}`,
  );
  return { subject, text, html };
}

export function bookingCancelledEmail(
  ctx: BookingEmailContext & {
    actor: 'customer' | 'organiser';
    reason?: string;
    /** When HIGH (e.g. organiser-initiated cancellation), the email is marked
     *  important in the subject and gets a top-of-body callout. */
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
  },
): RenderedEmail {
  const isHighPriority = ctx.priority === 'HIGH';
  const subjectPrefix = isHighPriority ? 'Important: ' : '';
  const subject = `${subjectPrefix}Booking cancelled — ${ctx.appointmentTypeName}`;
  const actorLine =
    ctx.actor === 'organiser'
      ? `This booking has been cancelled by ${ctx.organizationName}.`
      : `This booking has been cancelled.`;
  const reasonHtml = ctx.reason
    ? `<p><strong>Reason:</strong> ${ctx.reason}</p>`
    : '';
  const calloutHtml = isHighPriority
    ? `<p style="padding: 10px 12px; background: #fef3c7; border-left: 4px solid #d97706; margin-bottom: 16px;"><strong>Important:</strong> Your upcoming appointment has been cancelled by the organiser. Please review the details below.</p>`
    : '';
  const text = `Hi ${ctx.recipientName}, ${actorLine} ${ctx.reason ? `Reason: ${ctx.reason}.` : ''}`;
  const html = wrap(
    'Booking cancelled',
    `<p>Hi ${ctx.recipientName},</p>
     ${calloutHtml}
     <p>${actorLine}</p>
     ${bookingDetailsBlock(ctx)}
     ${reasonHtml}`,
  );
  return { subject, text, html };
}

export function bookingRescheduledEmail(
  ctx: BookingEmailContext & {
    previousStart: Date;
    previousEnd: Date;
  },
): RenderedEmail {
  const previousFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: ctx.timezone,
    timeZoneName: 'short',
  });
  const previousRange = `${previousFmt.format(ctx.previousStart)} – ${previousFmt.format(ctx.previousEnd)}`;
  const subject = `Booking rescheduled — ${ctx.appointmentTypeName}`;
  const text = `Hi ${ctx.recipientName}, your booking for ${ctx.appointmentTypeName} has been rescheduled. Previous time: ${previousRange}. New time: ${formatRange(ctx)}.`;
  const html = wrap(
    'Booking rescheduled',
    `<p>Hi ${ctx.recipientName},</p>
     <p>Your booking has been rescheduled.</p>
     <ul>
       <li><s>Previous: ${previousRange}</s></li>
       <li><strong>New: ${formatRange(ctx)}</strong></li>
       <li>Service: ${ctx.appointmentTypeName}</li>
       <li>With: ${ctx.organizationName}</li>
       <li>Confirmation code: <strong>${ctx.confirmationCode}</strong></li>
     </ul>`,
  );
  return { subject, text, html };
}

export function bookingNoticeForBookablePersonEmail(
  ctx: BookingEmailContext & {
    customerName: string;
    eventLabel: 'confirmed' | 'approved' | 'rescheduled' | 'cancelled';
  },
): RenderedEmail {
  const subject = `Booking ${ctx.eventLabel} — ${ctx.appointmentTypeName}`;
  const text = `Hi ${ctx.recipientName}, a booking has been ${ctx.eventLabel}. Customer: ${ctx.customerName}. When: ${formatRange(ctx)}. Service: ${ctx.appointmentTypeName} (${ctx.organizationName}).`;
  const html = wrap(
    `Booking ${ctx.eventLabel}`,
    `<p>Hi ${ctx.recipientName},</p>
     <p>A booking with ${ctx.organizationName} has been ${ctx.eventLabel}.</p>
     <ul>
       <li>Customer: ${ctx.customerName}</li>
       <li>Service: ${ctx.appointmentTypeName}</li>
       <li>When: ${formatRange(ctx)}</li>
       <li>Confirmation code: ${ctx.confirmationCode}</li>
     </ul>`,
  );
  return { subject, text, html };
}

export function paymentReceiptEmail(ctx: {
  recipientName: string;
  amount: string;
  currency: string;
  appointmentTypeName: string;
  organizationName: string;
  confirmationCode: string;
}): RenderedEmail {
  const subject = `Payment received — ${ctx.appointmentTypeName}`;
  const text = `Hi ${ctx.recipientName}, we received your payment of ${ctx.amount} ${ctx.currency} for ${ctx.appointmentTypeName} (${ctx.organizationName}). Confirmation code: ${ctx.confirmationCode}.`;
  const html = wrap(
    'Payment received',
    `<p>Hi ${ctx.recipientName},</p>
     <p>We've received your payment.</p>
     <ul>
       <li>Amount: <strong>${ctx.amount} ${ctx.currency}</strong></li>
       <li>For: ${ctx.appointmentTypeName} (${ctx.organizationName})</li>
       <li>Confirmation code: ${ctx.confirmationCode}</li>
     </ul>`,
  );
  return { subject, text, html };
}

export function refundIssuedEmail(ctx: {
  recipientName: string;
  amount: string;
  currency: string;
  appointmentTypeName: string;
  organizationName: string;
  confirmationCode: string;
}): RenderedEmail {
  const subject = `Refund issued — ${ctx.appointmentTypeName}`;
  const text = `Hi ${ctx.recipientName}, a refund of ${ctx.amount} ${ctx.currency} has been issued for ${ctx.appointmentTypeName} (${ctx.organizationName}). It may take a few business days to appear in your account.`;
  const html = wrap(
    'Refund issued',
    `<p>Hi ${ctx.recipientName},</p>
     <p>We've issued a refund.</p>
     <ul>
       <li>Amount: <strong>${ctx.amount} ${ctx.currency}</strong></li>
       <li>For: ${ctx.appointmentTypeName} (${ctx.organizationName})</li>
       <li>Confirmation code: ${ctx.confirmationCode}</li>
     </ul>
     <p>It may take a few business days to appear in your account, depending on your bank.</p>`,
  );
  return { subject, text, html };
}
