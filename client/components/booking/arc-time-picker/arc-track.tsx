"use client";

// SVG ring renderer: background ring, available windows, gap notches, hour
// ticks, and the selected arc. Pure render — no interaction state lives here.

import { describeArc, polarToCartesian } from "./arc-geometry";
import type { RingGeometry } from "./arc-geometry";

const RING_RADIUS = 120;
const TRACK_WIDTH = 24;
const SELECTED_WIDTH = 26;
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
  cx: number;
  cy: number;
};

export function ArcTrack({
  geom,
  selectedStartAngle,
  selectedEndAngle,
  hourTicks,
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
