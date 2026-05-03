import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export interface SubscribePayload {
  appointmentTypeId: string;
  /** YYYY-MM-DD in the appointment type's schedule timezone. */
  date: string;
  /** Optional bookable person/resource id for entity-specific subscriptions. */
  entityId?: string;
}

const WILDCARD_ENTITY = '*';

/**
 * Build the socket.io room name for a (appointmentTypeId, date, entityId)
 * tuple. `entityId == null` selects the wildcard room that covers every
 * entity for this type+date — used when the customer hasn't picked one yet
 * (AUTO assignment) and so subscribes to all changes.
 */
export function availabilityRoom(
  appointmentTypeId: string,
  date: string,
  entityId: string | null | undefined,
): string {
  return `at:${appointmentTypeId}:${date}:${entityId ?? WILDCARD_ENTITY}`;
}

/**
 * Public-facing gateway scoped to the booking page (`/book/*`). No auth on
 * connect — slot availability is already public. Clients subscribe per
 * `(appointmentTypeId, date, entityId?)`; the server publishes
 * `slot:updated` from `AvailabilityEmitter` whenever a mutation changes a
 * slot's confirmedCount / pendingCount / state.
 */
@WebSocketGateway({
  namespace: '/availability',
  cors: { origin: true, credentials: true },
})
export class AvailabilityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AvailabilityGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(socket: Socket): void {
    this.logger.debug(`availability WS connect ${socket.id}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`availability WS disconnect ${socket.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SubscribePayload,
  ): { ok: true; rooms: string[] } {
    const rooms = this.roomsFor(payload);
    // socket.join can return a Promise (Redis adapter) or void (in-memory).
    // The handler doesn't need to wait — the next emit on this connection
    // queues behind it inside socket.io anyway.
    if (rooms.length > 0) void socket.join(rooms);
    return { ok: true, rooms };
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SubscribePayload,
  ): Promise<{ ok: true; rooms: string[] }> {
    const rooms = this.roomsFor(payload);
    // socket.leave only accepts a single room; iterate and await each one to
    // satisfy adapters that return promises (Redis adapter does).
    for (const room of rooms) {
      await socket.leave(room);
    }
    return { ok: true, rooms };
  }

  private roomsFor(p: SubscribePayload): string[] {
    if (!p?.appointmentTypeId || !p.date) return [];
    // Always join the wildcard room so AUTO-mode users (no entityId yet)
    // still get every slot update for this type+date.
    const rooms = [availabilityRoom(p.appointmentTypeId, p.date, null)];
    if (p.entityId) {
      rooms.push(availabilityRoom(p.appointmentTypeId, p.date, p.entityId));
    }
    return rooms;
  }
}
