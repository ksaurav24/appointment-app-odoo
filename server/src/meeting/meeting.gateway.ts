import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { MeetingTokenService } from './meeting-token.service';
import { MeetingRole } from './types';

/**
 * Read the configured CORS allow-list at class-definition time. Socket.IO
 * gateway CORS is captured statically by the `@WebSocketGateway` decorator,
 * so we resolve from `process.env` directly rather than `ConfigService` (which
 * isn't constructed yet). Empty / unset → empty array (deny by default).
 */
function meetingCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface MeetingSocketData {
  appointmentId: string;
  role: MeetingRole;
  userId?: string;
  confirmationCode?: string;
}

interface RelayPayload {
  to: string;
  sdp?: unknown;
  candidate?: unknown;
}

interface AdmitPayload {
  guestSocketId: string;
}

interface PeerStatePayload {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

const roomFor = (appointmentId: string): string => `appt:${appointmentId}`;

/**
 * Signaling relay for 1:1 WebRTC meetings. The gateway is intentionally
 * dumb — it does not inspect SDP or ICE payloads; it forwards them to the
 * peer named by the `to` socket id. Authorisation happens at the handshake
 * via a short-lived JWT minted by `MeetingTokenService`.
 *
 * Lifecycle:
 *   1. Client opens the namespace with `auth: { token }` from a prior REST
 *      call to `/appointments/:id/meeting-token` (host or guest).
 *   2. Middleware verifies the token and stores principal data on the socket.
 *   3. We enforce one socket per (appointmentId, role) by dropping any prior
 *      socket of the same role — useful for refresh / reconnect scenarios.
 *   4. We announce the new arrival to the room (`host:present` /
 *      `guest:waiting`) so the peer can initiate signaling.
 */
@WebSocketGateway({
  namespace: '/meeting',
  cors: { origin: meetingCorsOrigins(), credentials: true },
})
export class MeetingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MeetingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly tokenService: MeetingTokenService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      try {
        const auth = socket.handshake.auth as { token?: unknown } | undefined;
        const token = auth?.token;
        if (typeof token !== 'string' || token.length === 0) {
          throw new Error('missing token');
        }
        const payload = this.tokenService.verify(token);
        const data: MeetingSocketData = {
          appointmentId: payload.appointmentId,
          role: payload.role,
          userId: payload.userId,
          confirmationCode: payload.confirmationCode,
        };
        socket.data = data;
        next();
      } catch (err) {
        this.logger.debug(
          `meeting WS handshake rejected: ${(err as Error).message}`,
        );
        next(new Error('unauthorized'));
      }
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    const data = socket.data as MeetingSocketData | undefined;
    if (!data) {
      socket.disconnect(true);
      return;
    }
    const room = roomFor(data.appointmentId);

    // Enforce one socket per (appointmentId, role): kick the previous one so
    // a reconnecting host or refreshed guest doesn't end up double-joined.
    try {
      const existing = await this.server.in(room).fetchSockets();
      for (const other of existing) {
        if (other.id === socket.id) continue;
        const otherData = other.data as MeetingSocketData | undefined;
        if (otherData?.role === data.role) {
          other.disconnect(true);
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to enumerate sockets in ${room}: ${(err as Error).message}`,
      );
    }

    await socket.join(room);
    this.logger.debug(
      `meeting WS connect ${socket.id} role=${data.role} appt=${data.appointmentId}`,
    );

    if (data.role === 'HOST') {
      this.server.to(room).emit('host:present');
    } else {
      this.server.to(room).emit('guest:waiting', { socketId: socket.id });
    }
  }

  handleDisconnect(socket: Socket): void {
    const data = socket.data as MeetingSocketData | undefined;
    if (!data?.appointmentId) return;
    this.server
      .to(roomFor(data.appointmentId))
      .emit('peer:left', { socketId: socket.id, role: data.role });
  }

  // ---------------------------------------------------------------------------
  // Signaling relay — server is a dumb forwarder. Validate only that `to` is a
  // string; SDP / ICE candidate shapes are the peer's problem.
  // ---------------------------------------------------------------------------

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RelayPayload,
  ): void {
    if (typeof data?.to !== 'string') return;
    this.server
      .to(data.to)
      .emit('webrtc:offer', { from: socket.id, sdp: data.sdp });
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RelayPayload,
  ): void {
    if (typeof data?.to !== 'string') return;
    this.server
      .to(data.to)
      .emit('webrtc:answer', { from: socket.id, sdp: data.sdp });
  }

  @SubscribeMessage('webrtc:ice')
  handleIce(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: RelayPayload,
  ): void {
    if (typeof data?.to !== 'string') return;
    this.server
      .to(data.to)
      .emit('webrtc:ice', { from: socket.id, candidate: data.candidate });
  }

  @SubscribeMessage('host:admit')
  handleAdmit(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AdmitPayload,
  ): void {
    const sdata = socket.data as MeetingSocketData | undefined;
    if (sdata?.role !== 'HOST') return;
    if (typeof data?.guestSocketId !== 'string') return;
    this.server
      .to(data.guestSocketId)
      .emit('admitted', { hostSocketId: socket.id });
  }

  @SubscribeMessage('host:reject')
  async handleReject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: AdmitPayload,
  ): Promise<void> {
    const sdata = socket.data as MeetingSocketData | undefined;
    if (sdata?.role !== 'HOST') return;
    if (typeof data?.guestSocketId !== 'string') return;
    this.server.to(data.guestSocketId).emit('rejected');
    try {
      const sockets = await this.server
        .in(roomFor(sdata.appointmentId))
        .fetchSockets();
      const target = sockets.find((s) => s.id === data.guestSocketId);
      if (target) target.disconnect(true);
    } catch (err) {
      this.logger.warn(
        `Failed to disconnect rejected guest ${data.guestSocketId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Force-close all live sockets for an appointment. Called from the
   * appointments / payments services when status transitions to a
   * non-joinable state (CANCELLED / COMPLETED / NO_SHOW) so an active call
   * does not outlive the appointment until the 5-min token TTL expires.
   */
  async disconnectRoom(publicId: string): Promise<void> {
    const room = roomFor(publicId);
    try {
      const sockets = await this.server.in(room).fetchSockets();
      for (const s of sockets) {
        s.emit('room:closed', { reason: 'appointment_cancelled' });
        s.disconnect(true);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to disconnect room ${room}: ${(err as Error).message}`,
      );
    }
  }

  @SubscribeMessage('peer:state')
  handlePeerState(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: PeerStatePayload,
  ): void {
    const sdata = socket.data as MeetingSocketData | undefined;
    if (!sdata?.appointmentId) return;
    if (
      typeof data?.audio !== 'boolean' ||
      typeof data?.video !== 'boolean' ||
      typeof data?.screen !== 'boolean'
    ) {
      return;
    }
    socket.to(roomFor(sdata.appointmentId)).emit('peer:state', {
      from: socket.id,
      audio: data.audio,
      video: data.video,
      screen: data.screen,
    });
  }
}
