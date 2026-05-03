"use client";

import { useEffect, useMemo, useState } from "react";

export type UseJoinWindowInput = {
  startTime: string | Date;
  endTime: string | Date;
  /** Minutes before startTime when the meeting becomes joinable. */
  beforeMins?: number;
  /** Minutes after endTime where joining is still tolerated (lets late
   * arrivals slip in if the host hasn't ended the call yet). */
  afterMins?: number;
};

export type JoinWindow = {
  canJoin: boolean;
  /** ms until the join window opens. Negative if already open or closed. */
  joinsInMs: number;
  /**
   * Human-friendly status. "Open now" / "Opens in 12 min" / "Closed".
   * Suitable for use as a button label or tooltip.
   */
  label: string;
};

/**
 * Coarse-grained ticker — re-renders every 30s so the gate flips at the right
 * moment without a per-second timer eating CPU on long detail pages.
 */
const TICK_MS = 30_000;

function formatLeadTime(ms: number): string {
  const totalMins = Math.max(0, Math.round(ms / 60_000));
  if (totalMins < 60) return `${totalMins} min`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function useJoinWindow({
  startTime,
  endTime,
  beforeMins = 10,
  afterMins = 30,
}: UseJoinWindowInput): JoinWindow {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const startMs = useMemo(
    () => new Date(startTime).getTime(),
    [startTime],
  );
  const endMs = useMemo(() => new Date(endTime).getTime(), [endTime]);

  const opensAt = startMs - beforeMins * 60_000;
  const closesAt = endMs + afterMins * 60_000;

  const canJoin = now >= opensAt && now <= closesAt;
  const joinsInMs = opensAt - now;

  let label: string;
  if (canJoin) {
    label = "Open now";
  } else if (now < opensAt) {
    label = `Opens in ${formatLeadTime(joinsInMs)}`;
  } else {
    label = "Closed";
  }

  return { canJoin, joinsInMs, label };
}
