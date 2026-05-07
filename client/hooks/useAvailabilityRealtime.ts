"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  acquireAvailabilitySocket,
  releaseAvailabilitySocket,
  type AvailabilitySubscription,
  type SlotUpdatedPayload,
} from "@/lib/realtime/availability-socket";

export type SlotUpdatedHandler = (payload: SlotUpdatedPayload) => void;

/**
 * Subscribes to `slot:updated` events for the given (appointmentTypeId,
 * date, entityId?) tuple. On each event, invalidates the matching
 * react-query availability cache so the slot-list re-renders with the new
 * state/counts.
 *
 * Optionally invokes `onUpdate` so the caller (BookingStepper) can react —
 * e.g. show a "this slot just filled" banner if the user's selected slot
 * flipped to `booked` mid-flow.
 *
 * `appointmentTypeId == null` and `date == null` no-op so the hook can be
 * mounted unconditionally during the initial booking-stepper render before
 * the user has picked a date.
 */
export function useAvailabilityRealtime(
  sub: Partial<AvailabilitySubscription>,
  onUpdate?: SlotUpdatedHandler,
): void {
  const qc = useQueryClient();
  const { appointmentTypeId, date, entityId } = sub;

  useEffect(() => {
    if (!appointmentTypeId || !date) return;

    const socket = acquireAvailabilitySocket();
    const subscribePayload: AvailabilitySubscription = entityId
      ? { appointmentTypeId, date, entityId }
      : { appointmentTypeId, date };

    const sendSubscribe = () => {
      socket.emit("subscribe", subscribePayload);
    };
    // Subscribe immediately if already connected; otherwise queue it for the
    // (re)connect event so reconnects rejoin the right rooms automatically.
    if (socket.connected) sendSubscribe();
    socket.on("connect", sendSubscribe);

    const onSlotUpdated = (payload: SlotUpdatedPayload) => {
      if (payload.appointmentTypeId !== appointmentTypeId) return;
      if (payload.date !== date) return;
      if (entityId && payload.entityId !== entityId) return;

      // Invalidate the exact availability query the booking page uses. The
      // query key shape mirrors `useAvailability` in usePublicAppointments.ts.
      qc.invalidateQueries({
        queryKey: [
          "public",
          "appointment-types",
          appointmentTypeId,
          "availability",
        ],
      });

      onUpdate?.(payload);
    };
    socket.on("slot:updated", onSlotUpdated);

    return () => {
      socket.emit("unsubscribe", subscribePayload);
      socket.off("connect", sendSubscribe);
      socket.off("slot:updated", onSlotUpdated);
      releaseAvailabilitySocket();
    };
    // `onUpdate` is intentionally not in the deps list — re-running this
    // effect on every render to swap the callback would close+reopen the
    // socket subscription on every `setState`. Using a ref would also work
    // but adds complexity for no real benefit here; the closure captures
    // whatever `onUpdate` was on the most recent subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentTypeId, date, entityId, qc]);
}
