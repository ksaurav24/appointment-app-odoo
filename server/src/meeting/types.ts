/**
 * Public-facing types for the WebRTC meeting feature. The frontend imports a
 * mirrored copy of this contract — keep these in sync with `client/`.
 */

export type MeetingRole = 'HOST' | 'GUEST';

/**
 * Local mirror of the DOM `RTCIceServer` shape — the `lib.dom.d.ts` global isn't
 * available in the Node-only server compile target.
 */
export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface MeetingTokenPayload {
  /** Stringified `Appointment.id` (BigInt). */
  appointmentId: string;
  role: MeetingRole;
  /** Present when role === 'HOST' — the organiser user id. */
  userId?: string;
  /** Present when role === 'GUEST' — the customer-facing confirmation code. */
  confirmationCode?: string;
  /** Standard JWT timestamps populated by the signer. */
  iat?: number;
  exp?: number;
}

export interface MeetingTokenResponse {
  token: string;
  iceServers: RTCIceServer[];
  role: MeetingRole;
  /** Stringified `Appointment.id` (BigInt). */
  appointmentId: string;
  /** ISO-8601 expiry timestamp matching the token's `exp` claim. */
  expiresAt: string;
}

/** Discriminated union the meeting service uses to identify the caller. */
export type MeetingPrincipal =
  | { role: 'HOST'; userId: string }
  | { role: 'GUEST'; confirmationCode: string };
