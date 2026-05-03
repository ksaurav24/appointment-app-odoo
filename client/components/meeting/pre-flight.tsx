"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { LocalVideo } from "./local-video";

type Props = {
  stream: MediaStream | null;
  isPending: boolean;
  error: Error | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  onSelectMic: (id: string) => void;
  onSelectCamera: (id: string) => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onContinue: () => void;
  onRetry: () => void;
};

export function PreFlight({
  stream,
  isPending,
  error,
  audioEnabled,
  videoEnabled,
  microphones,
  cameras,
  onSelectMic,
  onSelectCamera,
  onToggleAudio,
  onToggleVideo,
  onContinue,
  onRetry,
}: Props) {
  const currentMic = stream?.getAudioTracks()[0]?.getSettings().deviceId ?? "";
  const currentCam = stream?.getVideoTracks()[0]?.getSettings().deviceId ?? "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="text-white">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Get ready to join
        </h1>
        <p className="text-sm text-white/70">
          Check your camera and microphone before you join.
        </p>
      </header>

      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        {isPending ? (
          <div className="flex h-full w-full items-center justify-center text-white/70">
            <Spinner className="size-6" />
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/80">
            <p>{error.message}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <LocalVideo stream={stream} />
        )}
      </div>

      <div className="grid gap-3 text-white sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-white/60">
            Microphone
          </span>
          <select
            className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
            value={currentMic}
            onChange={(e) => onSelectMic(e.target.value)}
            disabled={microphones.length === 0}
          >
            {microphones.length === 0 ? (
              <option value="">Default</option>
            ) : (
              microphones.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-white/60">
            Camera
          </span>
          <select
            className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
            value={currentCam}
            onChange={(e) => onSelectCamera(e.target.value)}
            disabled={cameras.length === 0}
          >
            {cameras.length === 0 ? (
              <option value="">Default</option>
            ) : (
              cameras.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={audioEnabled ? "secondary" : "destructive"}
            onClick={onToggleAudio}
          >
            {audioEnabled ? "Mute mic" : "Unmute mic"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={videoEnabled ? "secondary" : "destructive"}
            onClick={onToggleVideo}
          >
            {videoEnabled ? "Camera off" : "Camera on"}
          </Button>
        </div>
        <Button
          type="button"
          onClick={onContinue}
          disabled={isPending || Boolean(error) || !stream}
        >
          Join meeting
        </Button>
      </div>
    </div>
  );
}
