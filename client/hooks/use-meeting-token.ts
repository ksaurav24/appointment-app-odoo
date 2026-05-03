"use client";

import { useQuery } from "@tanstack/react-query";

import {
  ApiError,
  getMeetingTokenAsGuest,
  getMeetingTokenAsHost,
} from "@/lib/api";
import type { MeetingTokenResponse } from "@/types";

import { useCurrentUser } from "./useAuth";

export type UseMeetingTokenInput = {
  appointmentId: string;
  /**
   * If provided OR if the visitor is not logged in, the guest endpoint is
   * used. Otherwise the host endpoint is called (session cookie auth).
   */
  confirmationCode?: string;
  /** Disable the request — used during the IDLE state of the room state machine. */
  enabled?: boolean;
};

export function useMeetingToken({
  appointmentId,
  confirmationCode,
  enabled = true,
}: UseMeetingTokenInput) {
  const { data: user, isPending: userPending } = useCurrentUser();

  // Wait for the auth check to settle before deciding host vs guest, otherwise
  // a logged-in user with no confirmation code would accidentally hit the
  // guest endpoint on first render.
  const ready = enabled && !userPending;
  const useGuest = Boolean(confirmationCode) || !user;

  return useQuery<MeetingTokenResponse, ApiError>({
    queryKey: [
      "meeting-token",
      appointmentId,
      useGuest ? "guest" : "host",
      confirmationCode ?? null,
    ],
    queryFn: () => {
      if (useGuest) {
        if (!confirmationCode) {
          throw new ApiError(
            400,
            ["Confirmation code is required to join as a guest."],
            null,
          );
        }
        return getMeetingTokenAsGuest(appointmentId, confirmationCode);
      }
      return getMeetingTokenAsHost(appointmentId);
    },
    enabled: ready,
    // Tokens are short-lived (~5 min). Do not retry — let the user click
    // "Try again" so we don't burn through window time on a 403.
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
