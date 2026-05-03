"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { PeerStatePayload } from "@/types";

type Props = {
  stream: MediaStream | null;
  peerState: PeerStatePayload;
  className?: string;
};

export function RemoteVideo({ stream, peerState, className }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn("relative h-full w-full bg-black", className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn(
          "h-full w-full bg-black",
          peerState.screen ? "object-contain" : "object-cover",
        )}
      />
      {!peerState.video && !peerState.screen ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white/80">
          Camera off
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2">
        {!peerState.audio ? (
          <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            Muted
          </span>
        ) : null}
        {peerState.screen ? (
          <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
            Sharing screen
          </span>
        ) : null}
      </div>
    </div>
  );
}
