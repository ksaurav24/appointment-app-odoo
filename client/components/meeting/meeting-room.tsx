"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import { useMediaDevices } from "@/hooks/use-media-devices";
import { useMeetingSocket } from "@/hooks/use-meeting-socket";
import { useMeetingToken } from "@/hooks/use-meeting-token";
import { usePeerConnection } from "@/hooks/use-peer-connection";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PeerStatePayload } from "@/types";

import { EndedScreen } from "./ended-screen";
import { LocalVideo } from "./local-video";
import { MeetingControls } from "./meeting-controls";
import { PreFlight } from "./pre-flight";
import { RemoteVideo } from "./remote-video";
import { WaitingBanner } from "./waiting-banner";

export type MeetingRoomProps = {
  appointmentId: string;
  /** Provided in the share/booking-detail flow (guest path). */
  confirmationCode?: string;
};

type Phase =
  | "TOKEN" // requesting meeting token
  | "PREFLIGHT" // mic/cam permission + device picker
  | "SIGNALING" // socket connecting
  | "WAITING_HOST" // guest, host hasn't presented yet
  | "WAITING_ADMIT" // guest, host present, awaiting admit
  | "WAITING_GUEST" // host, guest hasn't joined yet
  | "GUEST_PRESENT" // host, guest is waiting (admit/reject UI)
  | "IN_CALL"
  | "ENDED";

type EndedReason = "left" | "rejected" | "peer-left" | "error";

export function MeetingRoom({
  appointmentId,
  confirmationCode,
}: MeetingRoomProps) {
  const tokenQuery = useMeetingToken({ appointmentId, confirmationCode });
  const role = tokenQuery.data?.role;
  const iceServers = useMemo(
    () => tokenQuery.data?.iceServers ?? [],
    [tokenQuery.data?.iceServers],
  );

  const media = useMediaDevices({ audio: true, video: true });

  const [phase, setPhase] = useState<Phase>("TOKEN");
  const [endedReason, setEndedReason] = useState<EndedReason | null>(null);
  const [pendingGuestSocketId, setPendingGuestSocketId] = useState<
    string | null
  >(null);
  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeerState, setRemotePeerState] = useState<PeerStatePayload>({
    audio: true,
    video: true,
    screen: false,
  });

  const [screenEnabled, setScreenEnabled] = useState(false);
  const [screenPending, setScreenPending] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Move from TOKEN → PREFLIGHT once we have a token + role.
  useEffect(() => {
    if (phase !== "TOKEN" || !tokenQuery.data) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPhase("PREFLIGHT");
    });
    return () => {
      cancelled = true;
    };
  }, [phase, tokenQuery.data]);

  // Connect the socket once the user clicks "Join meeting" in pre-flight.
  // We connect for any phase past PREFLIGHT.
  const socketEnabled =
    phase !== "TOKEN" && phase !== "PREFLIGHT" && phase !== "ENDED";

  const { socket, status: socketStatus, error: socketError } = useMeetingSocket(
    {
      token: tokenQuery.data?.token,
      enabled: socketEnabled,
    },
  );

  // Once socket is connected, transition into the role-appropriate waiting state.
  useEffect(() => {
    if (phase !== "SIGNALING" || socketStatus !== "connected") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (role === "HOST") {
        setPhase("WAITING_GUEST");
      } else if (role === "GUEST") {
        setPhase(hostPresent ? "WAITING_ADMIT" : "WAITING_HOST");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase, socketStatus, role, hostPresent]);

  // Socket-error / handshake failure → end with toast.
  useEffect(() => {
    if (socketStatus !== "error" || !socketError) return;
    toast.error(socketError.message || "Failed to join meeting");
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setEndedReason("error");
      setPhase("ENDED");
    });
    return () => {
      cancelled = true;
    };
  }, [socketStatus, socketError]);

  // Wire up meeting-specific signaling listeners (admission flow only;
  // webrtc:* is handled inside usePeerConnection).
  useEffect(() => {
    if (!socket) return;

    const onHostPresent = () => {
      setHostPresent(true);
      setPhase((p) => (p === "WAITING_HOST" ? "WAITING_ADMIT" : p));
    };
    const onGuestWaiting = (payload: { socketId: string }) => {
      setPendingGuestSocketId(payload.socketId);
      setPhase((p) => (p === "WAITING_GUEST" ? "GUEST_PRESENT" : p));
    };
    const onAdmitted = (payload: { hostSocketId: string }) => {
      setRemoteSocketId(payload.hostSocketId);
      setPhase("IN_CALL");
    };
    const onRejected = () => {
      toast.error("The host declined to admit you to this meeting.");
      setEndedReason("rejected");
      setPhase("ENDED");
    };
    const onPeerState = (
      payload: { from: string } & PeerStatePayload,
    ) => {
      // Only listen to our paired peer's state updates.
      if (remoteSocketId && payload.from !== remoteSocketId) return;
      setRemotePeerState({
        audio: payload.audio,
        video: payload.video,
        screen: payload.screen,
      });
    };
    const onPeerLeft = (payload: {
      socketId: string;
      role: "HOST" | "GUEST";
    }) => {
      if (remoteSocketId && payload.socketId !== remoteSocketId) return;
      setEndedReason("peer-left");
      setPhase("ENDED");
    };

    socket.on("host:present", onHostPresent);
    socket.on("guest:waiting", onGuestWaiting);
    socket.on("admitted", onAdmitted);
    socket.on("rejected", onRejected);
    socket.on("peer:state", onPeerState);
    socket.on("peer:left", onPeerLeft);

    return () => {
      socket.off("host:present", onHostPresent);
      socket.off("guest:waiting", onGuestWaiting);
      socket.off("admitted", onAdmitted);
      socket.off("rejected", onRejected);
      socket.off("peer:state", onPeerState);
      socket.off("peer:left", onPeerLeft);
    };
  }, [socket, remoteSocketId]);

  const handleRemoteStream = useCallback((s: MediaStream) => {
    setRemoteStream(s);
  }, []);

  const handlePeerStateChange = useCallback((s: PeerStatePayload) => {
    setRemotePeerState(s);
  }, []);

  const { replaceVideoTrack, connectionState } = usePeerConnection({
    socket,
    iceServers,
    role: role ?? "GUEST",
    localStream: media.stream,
    remoteSocketId,
    onRemoteStream: handleRemoteStream,
    onPeerStateChange: handlePeerStateChange,
  });

  // Once tracks flow, ensure we are in IN_CALL (host already set it on
  // admit-click below; this also covers the guest path).
  useEffect(() => {
    if (
      !remoteSocketId ||
      !(connectionState === "connected" || remoteStream) ||
      phase === "IN_CALL" ||
      phase === "ENDED"
    ) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPhase("IN_CALL");
    });
    return () => {
      cancelled = true;
    };
  }, [connectionState, remoteStream, remoteSocketId, phase]);

  // Broadcast our local A/V/screen state on every change.
  useEffect(() => {
    if (!socket || phase !== "IN_CALL") return;
    socket.emit("peer:state", {
      audio: media.audioEnabled,
      video: media.videoEnabled,
      screen: screenEnabled,
    });
  }, [
    socket,
    phase,
    media.audioEnabled,
    media.videoEnabled,
    screenEnabled,
  ]);

  const handleAdmit = useCallback(() => {
    if (!socket || !pendingGuestSocketId) return;
    socket.emit("host:admit", { guestSocketId: pendingGuestSocketId });
    setRemoteSocketId(pendingGuestSocketId);
    setPhase("IN_CALL");
  }, [socket, pendingGuestSocketId]);

  const handleReject = useCallback(() => {
    if (!socket || !pendingGuestSocketId) return;
    socket.emit("host:reject", { guestSocketId: pendingGuestSocketId });
    setPendingGuestSocketId(null);
    setPhase("WAITING_GUEST");
  }, [socket, pendingGuestSocketId]);

  const handleLeave = useCallback(() => {
    setEndedReason("left");
    setPhase("ENDED");
  }, []);

  const stopScreenShare = useCallback(async () => {
    const camTrack = cameraTrackRef.current;
    try {
      await replaceVideoTrack(camTrack);
    } catch (err) {
      console.error("Failed to restore camera track", err);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    cameraTrackRef.current = null;
    setScreenEnabled(false);
  }, [replaceVideoTrack, screenStreamRef, cameraTrackRef]);

  const handleToggleScreen = useCallback(async () => {
    if (screenPending) return;
    setScreenPending(true);
    try {
      if (screenEnabled) {
        await stopScreenShare();
        return;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
        toast.error("Screen sharing is not supported in this browser.");
        return;
      }

      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) {
        toast.error("No screen track available.");
        return;
      }

      const camTrack = media.stream?.getVideoTracks()[0] ?? null;
      cameraTrackRef.current = camTrack;
      screenStreamRef.current = display;

      // When the user stops sharing via the browser's chrome ("Stop sharing"
      // button), we need to react and restore the camera.
      screenTrack.onended = () => {
        void stopScreenShare();
      };

      await replaceVideoTrack(screenTrack);
      setScreenEnabled(true);
    } catch (err) {
      // User cancelled the picker is the most common path — keep quiet.
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "AbortError")
      ) {
        return;
      }
      console.error("Screen share failed", err);
      toast.error("Failed to share screen");
    } finally {
      setScreenPending(false);
    }
  }, [
    screenEnabled,
    screenPending,
    media.stream,
    replaceVideoTrack,
    stopScreenShare,
    screenStreamRef,
    cameraTrackRef,
  ]);

  // Cleanup: stop any active screen share on unmount.
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    };
  }, [screenStreamRef]);

  // ── Render branches ─────────────────────────────────────────────

  if (tokenQuery.isPending || phase === "TOKEN") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (tokenQuery.isError) {
    const msg =
      tokenQuery.error instanceof ApiError
        ? tokenQuery.error.messages[0]
        : "Failed to load meeting token";
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <h1 className="font-heading text-xl font-semibold">
          Can&apos;t join meeting
        </h1>
        <p className="text-sm text-white/70">{msg}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => tokenQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "ENDED") {
    const reasonText: Record<EndedReason, string> = {
      left: "You left the meeting.",
      "peer-left": "The other participant left the meeting.",
      rejected: "The host declined to admit you.",
      error: "We couldn't establish the connection.",
    };
    return (
      <EndedScreen
        reason={endedReason ? reasonText[endedReason] : undefined}
      />
    );
  }

  if (phase === "PREFLIGHT") {
    return (
      <PreFlight
        stream={media.stream}
        isPending={media.isPending}
        error={media.error}
        audioEnabled={media.audioEnabled}
        videoEnabled={media.videoEnabled}
        microphones={media.devices.microphones}
        cameras={media.devices.cameras}
        onSelectMic={media.selectMic}
        onSelectCamera={media.selectCamera}
        onToggleAudio={media.toggleAudio}
        onToggleVideo={media.toggleVideo}
        onContinue={() => setPhase("SIGNALING")}
        onRetry={media.retry}
      />
    );
  }

  // SIGNALING / WAITING_* / GUEST_PRESENT / IN_CALL all render the same
  // canvas — the difference is which overlays show on top.
  const showLocal = media.stream;
  const showRemote = phase === "IN_CALL" && remoteStream;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-black">
      {/* Remote video as the main canvas */}
      <div className="flex-1 relative">
        {showRemote ? (
          <RemoteVideo stream={remoteStream} peerState={remotePeerState} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-white">
              {phase === "SIGNALING" ? (
                <>
                  <Spinner className="size-6" />
                  <p className="text-sm text-white/70">Connecting…</p>
                </>
              ) : phase === "WAITING_HOST" ? (
                <WaitingBanner
                  variant="guest"
                  message="Waiting for the host to start the meeting…"
                />
              ) : phase === "WAITING_ADMIT" ? (
                <WaitingBanner variant="guest" />
              ) : phase === "WAITING_GUEST" ? (
                <WaitingBanner
                  variant="host"
                  guestLabel="Customer"
                  onAdmit={() => undefined}
                  onReject={() => undefined}
                />
              ) : phase === "GUEST_PRESENT" ? (
                <WaitingBanner
                  variant="host"
                  guestLabel="Customer"
                  onAdmit={handleAdmit}
                  onReject={handleReject}
                />
              ) : (
                <Spinner className="size-6" />
              )}
            </div>
          </div>
        )}

        {/* Local PIP — shown as soon as we have a stream */}
        {showLocal ? (
          <div className="absolute right-4 top-4 aspect-video w-40 overflow-hidden rounded-md border border-white/10 shadow-lg sm:w-56">
            <LocalVideo stream={media.stream} />
          </div>
        ) : null}
      </div>

      {/* Bottom controls — only meaningful in/just-before call */}
      {phase === "IN_CALL" ||
      phase === "WAITING_GUEST" ||
      phase === "WAITING_HOST" ||
      phase === "WAITING_ADMIT" ||
      phase === "GUEST_PRESENT" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
          <div className="pointer-events-auto">
            <MeetingControls
              audioEnabled={media.audioEnabled}
              videoEnabled={media.videoEnabled}
              screenEnabled={screenEnabled}
              screenPending={screenPending}
              onToggleAudio={media.toggleAudio}
              onToggleVideo={media.toggleVideo}
              onToggleScreen={() => void handleToggleScreen()}
              onLeave={handleLeave}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
