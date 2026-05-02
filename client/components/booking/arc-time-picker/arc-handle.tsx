"use client";

// A single draggable handle on the arc. Pointer-move math lives in the parent
// ArcTimePicker, which knows the SVG bounding rect. This component is just
// the focusable, ARIA-compliant visual.

import { forwardRef } from "react";

import { polarToCartesian } from "./arc-geometry";

export type ArcHandleProps = {
  cx: number;
  cy: number;
  radius: number;
  angle: number;
  active: boolean;
  locked?: boolean;
  reduceMotion?: boolean;
  ariaLabel: string;
  ariaValueText: string;
  ariaValueNow: number;
  ariaValueMin: number;
  ariaValueMax: number;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<SVGGElement>) => void;
};

export const ArcHandle = forwardRef<SVGGElement, ArcHandleProps>(
  function ArcHandle(
    {
      cx,
      cy,
      radius,
      angle,
      active,
      locked,
      reduceMotion,
      ariaLabel,
      ariaValueText,
      ariaValueNow,
      ariaValueMin,
      ariaValueMax,
      onPointerDown,
      onKeyDown,
    },
    ref,
  ) {
    const pos = polarToCartesian(cx, cy, radius, angle);
    const knobR = locked ? 8 : 14;
    const hitR = locked ? 16 : 22;

    const transitionStyle =
      reduceMotion || active
        ? undefined
        : { transition: "cx 120ms cubic-bezier(0.2, 0.8, 0.2, 1), cy 120ms cubic-bezier(0.2, 0.8, 0.2, 1)" };

    if (locked) {
      return (
        <g ref={ref} aria-hidden>
          <circle
            cx={pos.x}
            cy={pos.y}
            r={knobR}
            fill="var(--background)"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            style={transitionStyle}
          />
        </g>
      );
    }

    return (
      <g
        ref={ref}
        role="slider"
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        aria-valuenow={ariaValueNow}
        aria-valuemin={ariaValueMin}
        aria-valuemax={ariaValueMax}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="outline-none focus-visible:[&_.knob]:stroke-[3px]"
      >
        {/* Invisible hit area for fat-finger targets. */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={hitR}
          fill="transparent"
          style={{ cursor: "grab" }}
        />
        <circle
          className="knob"
          cx={pos.x}
          cy={pos.y}
          r={knobR}
          fill="var(--background)"
          stroke="var(--primary)"
          strokeWidth={2}
          style={transitionStyle}
        />
      </g>
    );
  },
);
