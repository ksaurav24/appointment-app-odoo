// Pure helpers for the arc-time-picker. No React, no DOM.
// The dial's 360° wraps the day's available windows concatenated end-to-end,
// with multi-window days getting visible "gap notches" but no extra angular
// space — every degree of the ring is bookable time.

import type {
  AvailabilityResponse,
  FixedAvailability,
  VariableAvailability,
} from "@/types";

const MS_PER_MIN = 60_000;

export type RingWindow = {
  startMs: number;
  endMs: number;
  durationMins: number;
  offsetMins: number; // cumulative duration of all earlier windows
};

export type RingGeometry = {
  windows: RingWindow[];
  totalMins: number;
  degreesPerMin: number;
};

export type SnapTarget = {
  iso: string;
  angle: number;
  capacity?: number;
};

export type EndTarget = {
  iso: string;
  angle: number;
  durationMins: number;
};

/**
 * Per-slot occupancy marker for the dial. Fixed-mode slots that have a
 * non-default state (`pending` or `booked`) are rendered as colored bands
 * over the ring so the customer sees who's competing for which time.
 * `available` slots are intentionally omitted since the underlying window
 * arc already represents them.
 */
export type SlotMarker = {
  startAngle: number;
  endAngle: number;
  state: "pending" | "booked";
};

function mergeContiguous(
  ranges: { startMs: number; endMs: number }[],
): { startMs: number; endMs: number }[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.startMs - b.startMs);
  const out = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = out[out.length - 1];
    if (sorted[i].startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, sorted[i].endMs);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

export function buildGeometry(a: AvailabilityResponse): RingGeometry {
  const raw =
    a.durationMode === "FIXED"
      ? a.slots.map((s) => ({
          startMs: new Date(s.startTime).getTime(),
          endMs: new Date(s.endTime).getTime(),
        }))
      : a.openRanges.map((r) => ({
          startMs: new Date(r.startTime).getTime(),
          endMs: new Date(r.endTime).getTime(),
        }));

  const merged = mergeContiguous(raw);
  let offsetMins = 0;
  const windows: RingWindow[] = merged.map((r) => {
    const durationMins = Math.round((r.endMs - r.startMs) / MS_PER_MIN);
    const w: RingWindow = {
      startMs: r.startMs,
      endMs: r.endMs,
      durationMins,
      offsetMins,
    };
    offsetMins += durationMins;
    return w;
  });

  const totalMins = offsetMins;
  return {
    windows,
    totalMins,
    degreesPerMin: totalMins > 0 ? 360 / totalMins : 0,
  };
}

export function timeToAngle(iso: string, geom: RingGeometry): number | null {
  if (geom.totalMins === 0) return null;
  const t = new Date(iso).getTime();
  for (const w of geom.windows) {
    if (t >= w.startMs && t <= w.endMs) {
      const minsIn = (t - w.startMs) / MS_PER_MIN;
      return (w.offsetMins + minsIn) * geom.degreesPerMin;
    }
  }
  return null;
}

export function angleToTime(angleDeg: number, geom: RingGeometry): string | null {
  if (geom.totalMins === 0) return null;
  const a = ((angleDeg % 360) + 360) % 360;
  const minsIntoRing = a / geom.degreesPerMin;
  for (const w of geom.windows) {
    if (
      minsIntoRing >= w.offsetMins &&
      minsIntoRing <= w.offsetMins + w.durationMins
    ) {
      const ms = w.startMs + (minsIntoRing - w.offsetMins) * MS_PER_MIN;
      return new Date(ms).toISOString();
    }
  }
  const last = geom.windows[geom.windows.length - 1];
  return new Date(last.endMs).toISOString();
}

export function getValidStartTargets(
  a: AvailabilityResponse,
  geom: RingGeometry,
): SnapTarget[] {
  if (geom.totalMins === 0) return [];
  if (a.durationMode === "FIXED") {
    const out: SnapTarget[] = [];
    for (const s of a.slots) {
      // Booked slots have remainingCapacity === 0 — skip them so drag/snap
      // can't land on a slot the customer can't take. Pending slots are
      // selectable (the customer is competing for the slot).
      if (s.remainingCapacity <= 0) continue;
      const angle = timeToAngle(s.startTime, geom);
      if (angle === null) continue;
      out.push({ iso: s.startTime, angle, capacity: s.remainingCapacity });
    }
    return out;
  }
  return getVariableStartTargets(a, geom);
}

/**
 * Build the colored marker bands the dial overlays on top of the window
 * arcs. Only fixed-mode slots produce markers; variable-mode availability
 * has no discrete slots to mark in v1.
 */
export function getSlotMarkers(
  a: AvailabilityResponse,
  geom: RingGeometry,
): SlotMarker[] {
  if (geom.totalMins === 0 || a.durationMode !== "FIXED") return [];
  const fixed = a as FixedAvailability;
  const out: SlotMarker[] = [];
  for (const s of fixed.slots) {
    if (s.state === "available") continue;
    const startAngle = timeToAngle(s.startTime, geom);
    const endAngle = timeToAngle(s.endTime, geom);
    if (startAngle === null || endAngle === null) continue;
    out.push({ startAngle, endAngle, state: s.state });
  }
  return out;
}

function getVariableStartTargets(
  v: VariableAvailability,
  geom: RingGeometry,
): SnapTarget[] {
  const out: SnapTarget[] = [];
  for (const w of geom.windows) {
    const lastStartOffset = w.durationMins - v.minDurationMins;
    if (lastStartOffset < 0) continue;
    for (let off = 0; off <= lastStartOffset; off += v.durationStepMins) {
      const ms = w.startMs + off * MS_PER_MIN;
      const angle = (w.offsetMins + off) * geom.degreesPerMin;
      out.push({ iso: new Date(ms).toISOString(), angle });
    }
  }
  return out;
}

// VARIABLE: end-handle valid set, given the chosen start. Constrained to the
// same window as the start (long appointments cannot span a gap).
export function getValidEndTargets(
  startIso: string,
  v: VariableAvailability,
  geom: RingGeometry,
): EndTarget[] {
  const startMs = new Date(startIso).getTime();
  const win = geom.windows.find(
    (w) => startMs >= w.startMs && startMs < w.endMs,
  );
  if (!win) return [];
  const startOffsetInWindow = (startMs - win.startMs) / MS_PER_MIN;
  const remainingMins = win.durationMins - startOffsetInWindow;

  const out: EndTarget[] = [];
  for (
    let d = v.minDurationMins;
    d <= v.maxDurationMins;
    d += v.durationStepMins
  ) {
    if (d > remainingMins) break;
    const endMs = startMs + d * MS_PER_MIN;
    const endAngle =
      (win.offsetMins + startOffsetInWindow + d) * geom.degreesPerMin;
    out.push({
      iso: new Date(endMs).toISOString(),
      angle: endAngle,
      durationMins: d,
    });
  }
  return out;
}

export function circularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function snapToNearest<T extends { angle: number }>(
  targetAngle: number,
  candidates: T[],
): T | null {
  if (candidates.length === 0) return null;
  const t = ((targetAngle % 360) + 360) % 360;
  let best = candidates[0];
  let bestDist = circularDistance(t, best.angle);
  for (let i = 1; i < candidates.length; i += 1) {
    const c = candidates[i];
    const d = circularDistance(t, c.angle);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

// SVG arc path. 0° at top, increasing clockwise.
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const sweep = (((endDeg - startDeg) % 360) + 360) % 360;
  if (sweep < 0.01) return "";
  // If sweep is effectively 360°, draw a full circle as two arcs (SVG can't do
  // a single 360° arc in one `A` command).
  if (sweep > 359.99) {
    const top = polarToCartesian(cx, cy, r, 0);
    const bottom = polarToCartesian(cx, cy, r, 180);
    return `M ${top.x} ${top.y} A ${r} ${r} 0 1 1 ${bottom.x} ${bottom.y} A ${r} ${r} 0 1 1 ${top.x} ${top.y}`;
  }
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

// (dx, dy) is pointer position relative to ring centre (CSS pixel coords:
// y grows downward). 0° = top, increasing clockwise.
export function pointToAngle(dx: number, dy: number): number {
  const rad = Math.atan2(dx, -dy);
  const deg = (rad * 180) / Math.PI;
  return (deg + 360) % 360;
}

// Hour ticks for the available range (skip ticks inside gaps).
// Returns absolute angle on the ring for each whole hour that is INSIDE a
// window (not on a window boundary except where naturally aligned).
export function getHourTicks(
  geom: RingGeometry,
  timezone: string,
): Array<{ angle: number; label: string }> {
  const out: Array<{ angle: number; label: string }> = [];
  for (const w of geom.windows) {
    // Walk in 1-minute steps across the window and pick the first ms whose
    // local hour rolls over. Cheaper: iterate hour-aligned local times.
    const startDate = new Date(w.startMs);
    const endDate = new Date(w.endMs);
    // Build an iterator stepping by 60 minutes, starting at the first hour-
    // aligned local time after startDate.
    let cursorMs = w.startMs;
    // Find the first whole-hour ms >= w.startMs in the given timezone.
    cursorMs = nextHourAligned(cursorMs, timezone);
    while (cursorMs < endDate.getTime()) {
      if (cursorMs >= startDate.getTime()) {
        const minsIn = (cursorMs - w.startMs) / MS_PER_MIN;
        const angle = (w.offsetMins + minsIn) * geom.degreesPerMin;
        const label = new Date(cursorMs).toLocaleTimeString("en-US", {
          hour: "numeric",
          timeZone: timezone,
          hour12: false,
        });
        // The locale string can include a leading zero or trailing minutes;
        // strip whitespace and any ":00".
        out.push({ angle, label: label.replace(/[^\d]/g, "") });
      }
      cursorMs += 60 * MS_PER_MIN;
    }
  }
  return out;
}

// Returns the smallest ms >= t whose minute field is :00 in the given timezone.
function nextHourAligned(t: number, timezone: string): number {
  const date = new Date(t);
  const minute = parseInt(
    date.toLocaleTimeString("en-US", {
      minute: "2-digit",
      timeZone: timezone,
      hour12: false,
    }),
    10,
  );
  if (Number.isNaN(minute) || minute === 0) return t;
  return t + (60 - minute) * MS_PER_MIN;
}
