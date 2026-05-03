"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Props = {
  stream: MediaStream | null;
  className?: string;
  /** Mirror the preview the way most video chat apps do (selfie view). */
  mirrored?: boolean;
};

/**
 * Local preview — MUST be muted to avoid feedback. Mirrored by default.
 */
export function LocalVideo({ stream, className, mirrored = true }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={cn(
        "h-full w-full bg-black object-cover",
        mirrored && "[transform:scaleX(-1)]",
        className,
      )}
    />
  );
}
