"use client";

import { useEffect, useReducer, useRef } from "react";
import { io, type Socket } from "socket.io-client";

export type MeetingSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type UseMeetingSocketInput = {
  /** JWT minted by `/appointments/:id/meeting-token[/guest]`. */
  token: string | null | undefined;
  /** Set to false during pre-flight to delay opening the connection. */
  enabled: boolean;
};

export type UseMeetingSocketResult = {
  socket: Socket | null;
  status: MeetingSocketStatus;
  error: Error | null;
};

type State = {
  socket: Socket | null;
  status: MeetingSocketStatus;
  error: Error | null;
};

type Action =
  | { type: "init"; socket: Socket }
  | { type: "connected" }
  | { type: "disconnected" }
  | { type: "error"; error: Error }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init":
      return { socket: action.socket, status: "connecting", error: null };
    case "connected":
      return { ...state, status: "connected" };
    case "disconnected":
      // A disconnect AFTER a successful connection means we lost the
      // active session mid-call. Surface as an error so the room can
      // transition to ENDED. A disconnect from any other prior state
      // (e.g. cleanup before connect, programmatic teardown) is benign
      // and returns us to idle.
      if (state.status === "connected") {
        return {
          ...state,
          status: "error",
          error: new Error("Connection lost"),
        };
      }
      return { ...state, status: "idle" };
    case "error":
      return { ...state, status: "error", error: action.error };
    case "reset":
      return { socket: null, status: "idle", error: null };
  }
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ?? "https://api.appointly.sauravcodes.in"
  );
}

/**
 * Per-meeting socket — unlike `availability-socket`, this is intentionally
 * NOT a singleton. Each `<MeetingRoom>` mount gets its own connection so
 * leaving the room cleanly tears down the WebSocket and the corresponding
 * server-side room presence.
 */
export function useMeetingSocket({
  token,
  enabled,
}: UseMeetingSocketInput): UseMeetingSocketResult {
  const [state, dispatch] = useReducer(reducer, {
    socket: null,
    status: "idle" as MeetingSocketStatus,
    error: null,
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    const s = io(`${baseUrl()}/meeting`, {
      auth: { token },
      transports: ["websocket"],
      withCredentials: true,
      // We do NOT want auto-reconnect with a stale token after a network
      // drop — the JWT is only validated at handshake. If we get
      // disconnected, surface it and let the user re-join.
      reconnection: false,
    });
    socketRef.current = s;

    const onConnect = () => dispatch({ type: "connected" });
    const onDisconnect = () => dispatch({ type: "disconnected" });
    const onConnectError = (err: Error) =>
      dispatch({ type: "error", error: err });

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    dispatch({ type: "init", socket: s });

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
      socketRef.current = null;
      dispatch({ type: "reset" });
    };
  }, [enabled, token]);

  return state;
}
