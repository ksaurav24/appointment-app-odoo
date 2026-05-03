import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { EnvVars } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingTokenService } from './meeting-token.service';
import {
  MeetingPrincipal,
  MeetingRole,
  MeetingTokenResponse,
  RTCIceServer,
} from './types';

const APPOINTMENT_INCLUDE = {
  appointmentType: true,
  organization: true,
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

const JOINABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class MeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: MeetingTokenService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  /**
   * Verify the appointment exists, is online, has a joinable status, and that
   * the caller is allowed in. Throws an HTTP exception (404 / 403) on failure
   * and returns the loaded appointment on success so callers can reuse it.
   */
  async assertJoinable(
    appointmentId: string,
    principal: MeetingPrincipal,
  ): Promise<AppointmentWithRelations> {
    let parsedId: bigint;
    try {
      parsedId = BigInt(appointmentId);
    } catch {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: parsedId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (!appointment.appointmentType.isOnline) {
      throw new ForbiddenException(
        'This appointment is not configured as an online meeting',
      );
    }
    if (!JOINABLE_STATUSES.includes(appointment.status)) {
      throw new ForbiddenException(
        `Cannot join meeting for appointment in status ${appointment.status}`,
      );
    }

    const beforeMins = this.config.get('MEETING_JOIN_BEFORE_MINS', {
      infer: true,
    });
    const afterMins = this.config.get('MEETING_JOIN_AFTER_MINS', {
      infer: true,
    });
    const now = Date.now();
    const earliest = appointment.startTime.getTime() - beforeMins * 60_000;
    const latest = appointment.endTime.getTime() + afterMins * 60_000;
    if (now < earliest) {
      throw new ForbiddenException('Meeting room is not open yet');
    }
    if (now > latest) {
      throw new ForbiddenException('Meeting room has closed');
    }

    if (principal.role === 'HOST') {
      if (principal.userId !== appointment.organization.organiserId) {
        throw new ForbiddenException(
          'Only the organiser may host this meeting',
        );
      }
    } else {
      if (principal.confirmationCode !== appointment.confirmationCode) {
        throw new ForbiddenException('Invalid confirmation code');
      }
    }

    return appointment;
  }

  /**
   * Run `assertJoinable` and, on success, mint a 5-minute meeting JWT plus the
   * ICE configuration for the client.
   */
  async issueToken(
    appointmentId: string,
    principal: MeetingPrincipal,
  ): Promise<MeetingTokenResponse> {
    const appointment = await this.assertJoinable(appointmentId, principal);
    const role: MeetingRole = principal.role;
    const idStr = appointment.id.toString();

    const { token, expiresAt } = this.tokenService.sign({
      appointmentId: idStr,
      role,
      ...(principal.role === 'HOST'
        ? { userId: principal.userId }
        : { confirmationCode: principal.confirmationCode }),
    });

    return {
      token,
      iceServers: this.getIceServers(),
      role,
      appointmentId: idStr,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Build the ICE configuration the client should hand to `RTCPeerConnection`.
   * Always includes a public STUN server; appends a TURN entry only when
   * `TURN_URL` is configured (TURN_USERNAME / TURN_CREDENTIAL are optional even
   * then — some TURN servers accept anonymous credentials).
   */
  getIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnUrl = this.config.get('TURN_URL', { infer: true });
    if (turnUrl) {
      const username = this.config.get('TURN_USERNAME', { infer: true });
      const credential = this.config.get('TURN_CREDENTIAL', { infer: true });
      const entry: RTCIceServer = { urls: turnUrl };
      if (username) entry.username = username;
      if (credential) entry.credential = credential;
      servers.push(entry);
    }
    return servers;
  }
}
