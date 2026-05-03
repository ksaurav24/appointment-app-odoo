"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import type { IceServerConfig, MeetingRole, PeerStatePayload } from "@/types";

export type UsePeerConnectionInput = {
  socket: Socket | null;
  iceServers: IceServerConfig[];
  role: MeetingRole;
  /** Local camera + mic stream (already acquired via `useMediaDevices`). */
  localStream: MediaStream | null;
  /**
   * The other peer's socket id once known:
   * - HOST: set after clicking "Admit"
   * - GUEST: set on receiving `admitted { hostSocketId }`
   * Until set, no peer connection is created.
   */
  remoteSocketId: string | null;
  onRemoteStream: (stream: MediaStream) => void;
  onPeerStateChange: (state: PeerStatePayload) => void;
};

export type UsePeerConnectionResult = {
  connectionState: RTCPeerConnectionState | "new";
  iceConnectionState: RTCIceConnectionState | "new";
  /** Replace the outgoing video track — used by screen-share toggle. */
  replaceVideoTrack: (track: MediaStreamTrack | null) => Promise<void>;
};

type SignalingPayload = {
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

/**
 * Orchestrates the 1:1 peer connection between HOST and GUEST.
 *
 * - HOST creates the offer once `remoteSocketId` is set (i.e. after admit).
 * - GUEST waits for the inbound `webrtc:offer` and answers.
 *
 * Exposes `replaceVideoTrack` so the screen-share toggle can swap the
 * outgoing video sender's track without renegotiation.
 */
export function usePeerConnection({
  socket,
  iceServers,
  role,
  localStream,
  remoteSocketId,
  onRemoteStream,
  onPeerStateChange,
}: UsePeerConnectionInput): UsePeerConnectionResult {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  // Stash the original camera track so that screen-share-stop can restore it
  // without the meeting-room having to thread it back to us.
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [connectionState, setConnectionState] = useState<
    RTCPeerConnectionState | "new"
  >("new");
  const [iceConnectionState, setIceConnectionState] = useState<
    RTCIceConnectionState | "new"
  >("new");

  // Latest callback refs so the socket handlers always see fresh closures
  // without forcing the effect to re-run (and tear down the PC).
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onPeerStateChangeRef = useRef(onPeerStateChange);
  useEffect(() => {
    onRemoteStreamRef.current = onRemoteStream;
  }, [onRemoteStream]);
  useEffect(() => {
    onPeerStateChangeRef.current = onPeerStateChange;
  }, [onPeerStateChange]);

  useEffect(() => {
    if (!socket || !localStream || !remoteSocketId) return;

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    // Add local tracks before any negotiation.
    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === "video") {
        videoSenderRef.current = sender;
        originalVideoTrackRef.current = track;
      }
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("webrtc:ice", {
          to: remoteSocketId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      const [remote] = e.streams;
      if (remote) onRemoteStreamRef.current(remote);
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };
    pc.oniceconnectionstatechange = () => {
      setIceConnectionState(pc.iceConnectionState);
    };

    // ── Signaling listeners ───────────────────────────────────────
    const onOffer = async (payload: SignalingPayload) => {
      if (payload.from !== remoteSocketId || !payload.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", {
          to: remoteSocketId,
          sdp: answer,
        });
      } catch (err) {
        console.error("Failed to handle offer", err);
      }
    };

    const onAnswer = async (payload: SignalingPayload) => {
      if (payload.from !== remoteSocketId || !payload.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } catch (err) {
        console.error("Failed to handle answer", err);
      }
    };

    const onIce = async (payload: SignalingPayload) => {
      if (payload.from !== remoteSocketId || !payload.candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error("Failed to add ICE candidate", err);
      }
    };

    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice", onIce);

    // HOST kicks off negotiation. GUEST waits for the inbound offer above.
    if (role === "HOST") {
      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { to: remoteSocketId, sdp: offer });
        } catch (err) {
          console.error("Failed to create offer", err);
        }
      })();
    }

    return () => {
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice", onIce);
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.getSenders().forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {
          // ignore teardown errors
        }
      });
      pc.close();
      pcRef.current = null;
      videoSenderRef.current = null;
      originalVideoTrackRef.current = null;
    };
  }, [socket, localStream, remoteSocketId, role, iceServers]);

  const replaceVideoTrack = useCallback(
    async (track: MediaStreamTrack | null): Promise<void> => {
      const sender = videoSenderRef.current;
      if (!sender) return;
      await sender.replaceTrack(track);
    },
    [],
  );

  return {
    connectionState,
    iceConnectionState,
    replaceVideoTrack,
  };
}
