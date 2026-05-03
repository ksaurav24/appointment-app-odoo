"use client";

// Composite arc time picker. One dial that lets users pick a start (and, for
// VARIABLE/RANGE appointment types, a duration) by dragging or arrow-keying
// handles. Falls back to the legacy chip pickers via a "Use list view" toggle.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatDuration, formatTimeInZone } from "@/lib/format";
import type {
  AvailabilityResponse,
  FixedAvailability,
  VariableAvailability,
} from "@/types";

import {
  buildGeometry,
  getHourTicks,
  getSlotMarkers,
  getValidEndTargets,
  getValidStartTargets,
  pointToAngle,
  snapToNearest,
  timeToAngle,
} from "./arc-geometry";
import type { EndTarget } from "./arc-geometry";
import { ArcHandle } from "./arc-handle";
import { ARC_TRACK_GEOMETRY, ArcTrack } from "./arc-track";
import { ArcListFallback } from "./arc-list-fallback";

const STORAGE_KEY = "booking:time-input-mode";
const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const HANDLE_RADIUS = ARC_TRACK_GEOMETRY.RING_RADIUS;
const SNAP_PREVIEW_THRESHOLD_DEG = 4; // within this distance, latch visually

type ArcTimePickerProps = {
  availability: AvailabilityResponse;
  selectedStart: string | undefined;
  selectedEnd: string | undefined;
  onChange: (startTime: string, endTime: string) => void;
};

type DraggingHandle = "start" | "end" | null;

export function ArcTimePicker({
  availability,
  selectedStart,
  selectedEnd,
  onChange,
}: ArcTimePickerProps) {
  const [showListView, setShowListView] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "list";
  });
  const reduceMotion = usePrefersReducedMotion();

  const toggleListView = () => {
    const next = !showListView;
    setShowListView(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "list" : "dial");
    }
  };

  if (showListView) {
    return (
      <div className="space-y-3">
        <ToggleRow showingList={true} onToggle={toggleListView} />
        <ArcListFallback
          availability={availability}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ToggleRow showingList={false} onToggle={toggleListView} />
      <DialView
        availability={availability}
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
        onChange={onChange}
        reduceMotion={reduceMotion}
      />
    </div>
  );
}

function ToggleRow({
  showingList,
  onToggle,
}: {
  showingList: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {showingList ? "Use dial view" : "Use list view"}
      </button>
    </div>
  );
}

function DialView({
  availability,
  selectedStart,
  selectedEnd,
  onChange,
  reduceMotion,
}: {
  availability: AvailabilityResponse;
  selectedStart: string | undefined;
  selectedEnd: string | undefined;
  onChange: (startTime: string, endTime: string) => void;
  reduceMotion: boolean;
}) {
  const geom = useMemo(() => buildGeometry(availability), [availability]);
  const validStarts = useMemo(
    () => getValidStartTargets(availability, geom),
    [availability, geom],
  );
  const validEnds = useMemo<EndTarget[]>(() => {
    if (availability.durationMode !== "VARIABLE" || !selectedStart) return [];
    return getValidEndTargets(selectedStart, availability, geom);
  }, [availability, geom, selectedStart]);
  const hourTicks = useMemo(
    () => getHourTicks(geom, availability.timezone),
    [geom, availability.timezone],
  );
  const slotMarkers = useMemo(
    () => getSlotMarkers(availability, geom),
    [availability, geom],
  );

  const startAngle = selectedStart ? timeToAngle(selectedStart, geom) : null;
  const endAngle = selectedEnd ? timeToAngle(selectedEnd, geom) : null;

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DraggingHandle>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const lastSnappedRef = useRef<{ start: string | null; end: string | null }>({
    start: selectedStart ?? null,
    end: selectedEnd ?? null,
  });

  const commitFromStart = useCallback(
    (startIso: string) => {
      if (availability.durationMode === "FIXED") {
        const slot = (availability as FixedAvailability).slots.find(
          (s) => s.startTime === startIso,
        );
        if (!slot) return;
        if (lastSnappedRef.current.start !== startIso) {
          lastSnappedRef.current = { start: startIso, end: slot.endTime };
          onChange(slot.startTime, slot.endTime);
        }
        return;
      }
      const v = availability as VariableAvailability;
      const ends = getValidEndTargets(startIso, v, geom);
      if (ends.length === 0) return;
      // Preserve current duration if it's still valid; otherwise pick the
      // closest available, defaulting to minDurationMins.
      const desiredDuration =
        selectedStart && selectedEnd
          ? Math.round(
              (new Date(selectedEnd).getTime() -
                new Date(selectedStart).getTime()) /
                60_000,
            )
          : v.minDurationMins;
      let chosen = ends[0];
      let bestDiff = Math.abs(chosen.durationMins - desiredDuration);
      for (const c of ends) {
        const d = Math.abs(c.durationMins - desiredDuration);
        if (d < bestDiff) {
          chosen = c;
          bestDiff = d;
        }
      }
      if (lastSnappedRef.current.start !== startIso) {
        lastSnappedRef.current = { start: startIso, end: chosen.iso };
        onChange(startIso, chosen.iso);
      }
    },
    [availability, geom, onChange, selectedEnd, selectedStart],
  );

  const commitFromEnd = useCallback(
    (endIso: string) => {
      if (!selectedStart || availability.durationMode !== "VARIABLE") return;
      if (lastSnappedRef.current.end !== endIso) {
        lastSnappedRef.current = {
          start: selectedStart,
          end: endIso,
        };
        onChange(selectedStart, endIso);
      }
    },
    [availability.durationMode, onChange, selectedStart],
  );

  const angleFromPointer = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      if (dx === 0 && dy === 0) return null;
      return pointToAngle(dx, dy);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      const angle = angleFromPointer(e.clientX, e.clientY);
      if (angle === null) return;
      setPreviewAngle(angle);
      if (dragging === "start") {
        const target = snapToNearest(angle, validStarts);
        if (target) commitFromStart(target.iso);
      } else {
        const target = snapToNearest(angle, validEnds);
        if (target) commitFromEnd(target.iso);
      }
    },
    [
      angleFromPointer,
      commitFromEnd,
      commitFromStart,
      dragging,
      validEnds,
      validStarts,
    ],
  );

  const onPointerUp = useCallback(() => {
    setDragging(null);
    setPreviewAngle(null);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  const startSvgDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (validStarts.length === 0) return;
    const angle = angleFromPointer(e.clientX, e.clientY);
    if (angle === null) return;
    const target = snapToNearest(angle, validStarts);
    if (!target) return;
    commitFromStart(target.iso);
    setDragging("start");
    setPreviewAngle(angle);
  };

  const startHandleDrag = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    setDragging("start");
    const angle = angleFromPointer(e.clientX, e.clientY);
    if (angle !== null) setPreviewAngle(angle);
  };

  const endHandleDrag = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    setDragging("end");
    const angle = angleFromPointer(e.clientX, e.clientY);
    if (angle !== null) setPreviewAngle(angle);
  };

  const stepStart = (delta: number) => {
    if (validStarts.length === 0) return;
    const idx =
      validStarts.findIndex((t) => t.iso === selectedStart) === -1
        ? 0
        : validStarts.findIndex((t) => t.iso === selectedStart);
    const next = clamp(idx + delta, 0, validStarts.length - 1);
    commitFromStart(validStarts[next].iso);
  };

  const stepEnd = (delta: number) => {
    if (validEnds.length === 0) return;
    const idx =
      validEnds.findIndex((t) => t.iso === selectedEnd) === -1
        ? 0
        : validEnds.findIndex((t) => t.iso === selectedEnd);
    const next = clamp(idx + delta, 0, validEnds.length - 1);
    commitFromEnd(validEnds[next].iso);
  };

  const onStartKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    handleArrowKey(e, stepStart, validStarts);
  };
  const onEndKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    handleArrowKey(e, stepEnd, validEnds);
  };

  // Visual angles: use snapped (committed) angle when within snap-preview
  // threshold, else the raw pointer angle while dragging — so the handle
  // smoothly tracks the finger but "latches" to ticks.
  const visibleStartAngle = computeVisibleAngle({
    snappedAngle: startAngle,
    previewAngle,
    isDragging: dragging === "start",
  });
  const visibleEndAngle = computeVisibleAngle({
    snappedAngle: endAngle,
    previewAngle,
    isDragging: dragging === "end",
  });

  // Empty state. Distinguish "schedule existed but every slot is full" from
  // "nothing scheduled at all" so the customer doesn't think they picked a
  // bad day when really every slot just sold out.
  if (
    geom.totalMins === 0 ||
    validStarts.length === 0 ||
    (availability.durationMode === "FIXED" &&
      (availability as FixedAvailability).slots.length === 0)
  ) {
    const allBooked =
      availability.durationMode === "FIXED" &&
      (availability as FixedAvailability).slots.length > 0 &&
      (availability as FixedAvailability).slots.every(
        (s) => s.state === "booked",
      );
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-input bg-muted/30 px-3 py-12">
        <DialEmptySvg />
        <p className="text-sm text-muted-foreground">
          {allBooked
            ? "All times on this day are fully booked."
            : "No times available on this day."}
        </p>
      </div>
    );
  }

  const centerLabel = renderCenterLabel({
    availability,
    selectedStart,
    selectedEnd,
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="touch-none select-none"
        onPointerDown={startSvgDrag}
        role="application"
        aria-label="Time picker dial"
      >
        <ArcTrack
          geom={geom}
          selectedStartAngle={visibleStartAngle}
          selectedEndAngle={visibleEndAngle}
          hourTicks={hourTicks}
          slotMarkers={slotMarkers}
          cx={CENTER}
          cy={CENTER}
        />
        <foreignObject
          x={CENTER - 90}
          y={CENTER - 32}
          width={180}
          height={64}
          aria-hidden
        >
          <div className="flex h-full w-full flex-col items-center justify-center text-center">
            {centerLabel}
          </div>
        </foreignObject>
        {visibleStartAngle !== null ? (
          <ArcHandle
            cx={CENTER}
            cy={CENTER}
            radius={HANDLE_RADIUS}
            angle={visibleStartAngle}
            active={dragging === "start"}
            reduceMotion={reduceMotion}
            ariaLabel="Start time"
            ariaValueText={
              selectedStart
                ? `Start ${formatTimeInZone(selectedStart, availability.timezone)}`
                : "Start time not set"
            }
            ariaValueNow={Math.max(
              0,
              validStarts.findIndex((t) => t.iso === selectedStart),
            )}
            ariaValueMin={0}
            ariaValueMax={Math.max(0, validStarts.length - 1)}
            onPointerDown={startHandleDrag}
            onKeyDown={onStartKeyDown}
          />
        ) : null}
        {availability.durationMode === "VARIABLE" && visibleEndAngle !== null ? (
          <ArcHandle
            cx={CENTER}
            cy={CENTER}
            radius={HANDLE_RADIUS}
            angle={visibleEndAngle}
            active={dragging === "end"}
            reduceMotion={reduceMotion}
            ariaLabel="End time"
            ariaValueText={
              selectedEnd
                ? `End ${formatTimeInZone(selectedEnd, availability.timezone)}`
                : "End time not set"
            }
            ariaValueNow={Math.max(
              0,
              validEnds.findIndex((t) => t.iso === selectedEnd),
            )}
            ariaValueMin={0}
            ariaValueMax={Math.max(0, validEnds.length - 1)}
            onPointerDown={endHandleDrag}
            onKeyDown={onEndKeyDown}
          />
        ) : availability.durationMode === "FIXED" && visibleEndAngle !== null ? (
          <ArcHandle
            cx={CENTER}
            cy={CENTER}
            radius={HANDLE_RADIUS}
            angle={visibleEndAngle}
            active={false}
            locked
            reduceMotion={reduceMotion}
            ariaLabel="End time"
            ariaValueText=""
            ariaValueNow={0}
            ariaValueMin={0}
            ariaValueMax={0}
          />
        ) : null}
      </svg>
      <p className="text-xs text-muted-foreground">
        Drag the handles or use arrow keys.
      </p>
      {slotMarkers.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          {slotMarkers.some((m) => m.state === "pending") ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: "#f59e0b" }}
              />
              Pending approval
            </span>
          ) : null}
          {slotMarkers.some((m) => m.state === "booked") ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: "#9ca3af" }}
              />
              Booked
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function computeVisibleAngle({
  snappedAngle,
  previewAngle,
  isDragging,
}: {
  snappedAngle: number | null;
  previewAngle: number | null;
  isDragging: boolean;
}): number | null {
  if (snappedAngle === null) return null;
  if (!isDragging || previewAngle === null) return snappedAngle;
  const diff = circularSignedDiff(previewAngle, snappedAngle);
  if (Math.abs(diff) <= SNAP_PREVIEW_THRESHOLD_DEG) return snappedAngle;
  return previewAngle;
}

function circularSignedDiff(a: number, b: number): number {
  return (((a - b) % 360) + 540) % 360 - 180;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function handleArrowKey(
  e: React.KeyboardEvent<SVGGElement>,
  step: (delta: number) => void,
  candidates: { iso: string }[],
) {
  if (candidates.length === 0) return;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowUp":
      e.preventDefault();
      step(1);
      return;
    case "ArrowLeft":
    case "ArrowDown":
      e.preventDefault();
      step(-1);
      return;
    case "Home":
      e.preventDefault();
      step(-candidates.length);
      return;
    case "End":
      e.preventDefault();
      step(candidates.length);
      return;
    case "PageUp":
      e.preventDefault();
      step(4);
      return;
    case "PageDown":
      e.preventDefault();
      step(-4);
      return;
    default:
      return;
  }
}

function renderCenterLabel({
  availability,
  selectedStart,
  selectedEnd,
}: {
  availability: AvailabilityResponse;
  selectedStart: string | undefined;
  selectedEnd: string | undefined;
}) {
  if (!selectedStart || !selectedEnd) {
    return (
      <p className="text-sm text-muted-foreground">Drag to begin</p>
    );
  }
  const tz = availability.timezone;
  const durationMins = Math.round(
    (new Date(selectedEnd).getTime() - new Date(selectedStart).getTime()) /
      60_000,
  );
  return (
    <>
      <p className="font-heading text-base font-semibold leading-tight">
        {formatTimeInZone(selectedStart, tz)}
        <span className="text-muted-foreground"> – </span>
        {formatTimeInZone(selectedEnd, tz)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatDuration(durationMins)}
      </p>
    </>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function DialEmptySvg() {
  return (
    <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden>
      <circle
        cx={60}
        cy={60}
        r={48}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={10}
        opacity={0.5}
      />
    </svg>
  );
}
