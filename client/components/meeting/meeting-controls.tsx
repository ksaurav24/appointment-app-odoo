"use client";

import { Button } from "@/components/ui/button";

type Props = {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onLeave: () => void;
  /** Disable screen-share toggle while a swap is in progress. */
  screenPending?: boolean;
};

export function MeetingControls({
  audioEnabled,
  videoEnabled,
  screenEnabled,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onLeave,
  screenPending = false,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
      <Button
        type="button"
        variant={audioEnabled ? "secondary" : "destructive"}
        size="sm"
        onClick={onToggleAudio}
        aria-pressed={!audioEnabled}
        aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {audioEnabled ? "Mute" : "Unmute"}
      </Button>
      <Button
        type="button"
        variant={videoEnabled ? "secondary" : "destructive"}
        size="sm"
        onClick={onToggleVideo}
        aria-pressed={!videoEnabled}
        aria-label={videoEnabled ? "Turn camera off" : "Turn camera on"}
      >
        {videoEnabled ? "Camera off" : "Camera on"}
      </Button>
      <Button
        type="button"
        variant={screenEnabled ? "default" : "secondary"}
        size="sm"
        onClick={onToggleScreen}
        disabled={screenPending}
        aria-pressed={screenEnabled}
      >
        {screenEnabled ? "Stop sharing" : "Share screen"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onLeave}
      >
        Leave
      </Button>
    </div>
  );
}
