"use client";

// SVG ring renderer: background ring, available windows, gap notches, hour
// ticks, and the selected arc. Pure render — no interaction state lives here.

import { describeArc, polarToCartesian } from "./arc-geometry";
import type { RingGeometry, SlotMarker } from "./arc-geometry";

const RING_RADIUS = 120;
const TRACK_WIDTH = 24;
const SELECTED_WIDTH = 26;
// Slot markers ride at the same radius as the track so they read as the
// state of the underlying band, but with a slightly thinner stroke so the
// notch geometry around them stays legible.
const MARKER_WIDTH = TRACK_WIDTH - 2;
const TICK_OUTER = RING_RADIUS + TRACK_WIDTH / 2 + 4;
const TICK_INNER = RING_RADIUS + TRACK_WIDTH / 2 - 4;
const NOTCH_OUTER = RING_RADIUS + TRACK_WIDTH / 2;
const NOTCH_INNER = RING_RADIUS - TRACK_WIDTH / 2;
const LABEL_RADIUS = RING_RADIUS + TRACK_WIDTH / 2 + 18;

export type ArcTrackProps = {
  geom: RingGeometry;
  selectedStartAngle: number | null;
  selectedEndAngle: number | null;
  hourTicks: Array<{ angle: number; label: string }>;
  /** Per-slot occupancy bands (booked/pending). `available` is implicit. */
  slotMarkers?: SlotMarker[];
  cx: number;
  cy: number;
};

export function ArcTrack({
  geom,
  selectedStartAngle,
  selectedEndAngle,
  hourTicks,
  slotMarkers = [],
  cx,
  cy,
}: ArcTrackProps) {
  const trackR = RING_RADIUS;

  const windowArcs = geom.windows.map((w) => {
    const startA = w.offsetMins * geom.degreesPerMin;
    const endA = (w.offsetMins + w.durationMins) * geom.degreesPerMin;
    return describeArc(cx, cy, trackR, startA, endA);
  });

  // Gap notches sit at every window boundary except 0°/360° (the seam).
  const gapNotches = geom.windows
    .slice(1)
    .map((w) => w.offsetMins * geom.degreesPerMin);

  const hasSelection =
    selectedStartAngle !== null && selectedEndAngle !== null;
  const selectedPath = hasSelection
    ? describeArc(cx, cy, trackR, selectedStartAngle, selectedEndAngle)
    : "";

  return (
    <g>
      {/* Background ring (full circle, dimmed). */}
      <circle
        cx={cx}
        cy={cy}
        r={trackR}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={TRACK_WIDTH}
        opacity={0.5}
      />

      {/* Available windows (stronger track on the bookable arcs). */}
      {windowArcs.map((d, i) => (
        <path
          key={`win-${i}`}
          d={d}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="butt"
        />
      ))}

      {/* Per-slot occupancy bands. Drawn on top of the window arc so they
          replace the "available" colour for occupied/pending slots. */}
      {slotMarkers.map((m, i) => {
        const d = describeArc(cx, cy, trackR, m.startAngle, m.endAngle);
        if (!d) return null;
        const isPending = m.state === "pending";
        return (
          <path
            key={`marker-${i}`}
            d={d}
            fill="none"
            // Inline colours so the dial reads the same regardless of the
            // current Tailwind/shadcn theme tokens — amber for pending,
            // muted-foreground for booked.
            stroke={isPending ? "#f59e0b" : "#9ca3af"}
            strokeWidth={MARKER_WIDTH}
            strokeLinecap="butt"
            opacity={isPending ? 0.85 : 0.6}
          >
            <title>
              {isPending
                ? "Has pending approval requests"
                : "Slot is full"}
            </title>
          </path>
        );
      })}

      {/* Gap notches at inter-window seams. */}
      {gapNotches.map((angle, i) => {
        const inner = polarToCartesian(cx, cy, NOTCH_INNER, angle);
        const outer = polarToCartesian(cx, cy, NOTCH_OUTER, angle);
        return (
          <line
            key={`notch-${i}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Selected arc. */}
      {selectedPath ? (
        <path
          d={selectedPath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={SELECTED_WIDTH}
          strokeLinecap="round"
        />
      ) : null}

      {/* Hour ticks + numeric labels. */}
      {hourTicks.map((t, i) => {
        const inner = polarToCartesian(cx, cy, TICK_INNER, t.angle);
        const outer = polarToCartesian(cx, cy, TICK_OUTER, t.angle);
        const label = polarToCartesian(cx, cy, LABEL_RADIUS, t.angle);
        return (
          <g key={`tick-${i}`}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {t.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export const ARC_TRACK_GEOMETRY = {
  RING_RADIUS,
  TRACK_WIDTH,
  SELECTED_WIDTH,
};
