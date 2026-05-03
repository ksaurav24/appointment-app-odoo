"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseMediaDevicesInput = {
  audio: boolean;
  video: boolean;
};

export type DeviceLists = {
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
};

export type UseMediaDevicesResult = {
  stream: MediaStream | null;
  error: Error | null;
  isPending: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  toggleAudio: () => boolean;
  toggleVideo: () => boolean;
  retry: () => void;
  devices: DeviceLists;
  selectMic: (deviceId: string) => void;
  selectCamera: (deviceId: string) => void;
};

/**
 * Acquires a local MediaStream for the meeting pre-flight + in-call use.
 *
 * The toggles flip `track.enabled` rather than stopping/starting tracks so
 * that the existing `RTCRtpSender`s on the peer connection continue to
 * function — flipping `enabled` is what other clients render as a black
 * frame / silence without renegotiation.
 */
export function useMediaDevices({
  audio,
  video,
}: UseMediaDevicesInput): UseMediaDevicesResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(audio);
  const [videoEnabled, setVideoEnabled] = useState(video);
  const [devices, setDevices] = useState<DeviceLists>({
    microphones: [],
    cameras: [],
  });
  const [micId, setMicId] = useState<string | undefined>(undefined);
  const [camId, setCamId] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      // Defer to a task so the lint rule against synchronous setState
      // inside an effect body is satisfied — and so the consumer renders
      // once before we surface the error.
      queueMicrotask(() => {
        if (cancelled) return;
        setError(
          new Error("Media devices are not available in this browser."),
        );
        setIsPending(false);
      });
      return () => {
        cancelled = true;
      };
    }

    // Reset transient state for the new acquisition pass. Deferred via
    // microtask so we don't trip react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      if (cancelled) return;
      setIsPending(true);
      setError(null);
    });

    const constraints: MediaStreamConstraints = {
      audio: audio
        ? micId
          ? { deviceId: { exact: micId } }
          : true
        : false,
      video: video
        ? camId
          ? { deviceId: { exact: camId } }
          : true
        : false,
    };

    void navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        // Stop any prior stream before swapping.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        streamRef.current = s;
        setStream(s);

        // Apply enabled state — when the user toggled mute before a device
        // change, preserve their intent on the new tracks.
        s.getAudioTracks().forEach((t) => (t.enabled = audioEnabled));
        s.getVideoTracks().forEach((t) => (t.enabled = videoEnabled));

        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          if (cancelled) return;
          setDevices({
            microphones: all.filter((d) => d.kind === "audioinput"),
            cameras: all.filter((d) => d.kind === "videoinput"),
          });
        } catch {
          // Device enumeration is non-essential; ignore failures.
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to access camera or microphone."),
        );
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });

    return () => {
      cancelled = true;
    };
    // audioEnabled / videoEnabled intentionally omitted — toggling them
    // shouldn't re-acquire the stream. Devices changes do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, video, micId, camId, reloadKey]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const toggleAudio = useCallback((): boolean => {
    const s = streamRef.current;
    if (!s) return audioEnabled;
    const next = !audioEnabled;
    s.getAudioTracks().forEach((t) => (t.enabled = next));
    setAudioEnabled(next);
    return next;
  }, [audioEnabled]);

  const toggleVideo = useCallback((): boolean => {
    const s = streamRef.current;
    if (!s) return videoEnabled;
    const next = !videoEnabled;
    s.getVideoTracks().forEach((t) => (t.enabled = next));
    setVideoEnabled(next);
    return next;
  }, [videoEnabled]);

  const retry = useCallback(() => {
    setReloadKey((n) => n + 1);
  }, []);

  return {
    stream,
    error,
    isPending,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    retry,
    devices,
    selectMic: setMicId,
    selectCamera: setCamId,
  };
}
