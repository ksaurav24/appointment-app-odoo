"use client";

import { io, type Socket } from "socket.io-client";

/**
 * Server pushes this whenever a slot's confirmed/pending capacity changes.
 * Mirror of `SlotUpdatedPayload` in
 * `server/src/realtime/availability.emitter.ts` — keep in sync.
 */
export type SlotUpdatedPayload = {
  appointmentTypeId: string;
  entityId: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  confirmedCount: number;
  pendingCount: number;
  remainingCapacity: number;
  state: "available" | "pending" | "booked";
};

export type AvailabilitySubscription = {
  appointmentTypeId: string;
  date: string;
  entityId?: string;
};

/**
 * Lazy singleton — the booking page is the only place that needs the socket,
 * so we only open the connection when the first hook subscribes. Reusing the
 * same socket across booking-stepper renders avoids piling up connections
 * on each `setState`.
 */
let socket: Socket | null = null;
let refCount = 0;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function acquireAvailabilitySocket(): Socket {
  if (!socket) {
    socket = io(`${baseUrl()}/availability`, {
      transports: ["websocket"],
      withCredentials: true,
      // Reconnection defaults are fine; rely on the server-side state being
      // authoritative — react-query refetch-on-focus closes any drift.
    });
  }
  refCount += 1;
  return socket;
}

/**
 * Decrements the ref-count and tears down the socket when the last
 * subscriber leaves the page. Called from the cleanup of
 * `useAvailabilityRealtime`.
 */
export function releaseAvailabilitySocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
