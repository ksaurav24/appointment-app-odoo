"use client";

import { useEffect, useRef, useState } from "react";

import { formatRemaining } from "@/lib/format";

type SlotLockCountdownProps = {
  expiresAt: string;
  onExtend: () => void;
  onExpired: () => void;
};

const EXTEND_THRESHOLD_MS = 60_000;

export function SlotLockCountdown({
  expiresAt,
  onExtend,
  onExpired,
}: SlotLockCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const extendedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    extendedRef.current = false;
  }, [expiresAt]);

  const remainingMs = new Date(expiresAt).getTime() - now;

  useEffect(() => {
    if (remainingMs <= 0) {
      onExpired();
      return;
    }
    if (
      remainingMs > 0 &&
      remainingMs <= EXTEND_THRESHOLD_MS &&
      !extendedRef.current
    ) {
      extendedRef.current = true;
      onExtend();
    }
  }, [remainingMs, onExtend, onExpired]);

  const isAmber = remainingMs <= EXTEND_THRESHOLD_MS;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm ${
        isAmber
          ? "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-foreground/10 bg-muted/40 text-foreground"
      }`}
    >
      Your slot is held for {formatRemaining(expiresAt, now)}.
    </div>
  );
}
