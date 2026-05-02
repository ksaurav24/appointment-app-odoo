"use client";

// Wraps the legacy chip-list pickers so the dial can fall back to them when
// the user prefers list view (or for accessibility tooling that needs
// discrete focusable options).

import { useState } from "react";

import { DurationPicker } from "@/components/booking/duration-picker";
import { OpenRangePicker } from "@/components/booking/open-range-picker";
import { SlotList } from "@/components/booking/slot-list";
import type {
  AvailabilityResponse,
  VariableAvailability,
} from "@/types";

type ArcListFallbackProps = {
  availability: AvailabilityResponse;
  selectedStart: string | undefined;
  selectedEnd: string | undefined;
  onChange: (startTime: string, endTime: string) => void;
};

export function ArcListFallback({
  availability,
  selectedStart,
  selectedEnd,
  onChange,
}: ArcListFallbackProps) {
  if (availability.durationMode === "FIXED") {
    return (
      <SlotList
        availability={availability}
        selectedStart={selectedStart}
        onSelect={onChange}
      />
    );
  }
  return (
    <VariableFallback
      availability={availability}
      selectedStart={selectedStart}
      selectedEnd={selectedEnd}
      onChange={onChange}
    />
  );
}

function VariableFallback({
  availability,
  selectedStart,
  selectedEnd,
  onChange,
}: {
  availability: VariableAvailability;
  selectedStart: string | undefined;
  selectedEnd: string | undefined;
  onChange: (startTime: string, endTime: string) => void;
}) {
  const [pendingStart, setPendingStart] = useState<string | undefined>(
    selectedStart,
  );

  const startToUse = pendingStart ?? selectedStart;
  const currentDurationMins =
    selectedStart && selectedEnd
      ? Math.round(
          (new Date(selectedEnd).getTime() -
            new Date(selectedStart).getTime()) /
            60_000,
        )
      : undefined;

  const durations: number[] = [];
  for (
    let d = availability.minDurationMins;
    d <= availability.maxDurationMins;
    d += availability.durationStepMins
  ) {
    durations.push(d);
  }

  return (
    <div className="space-y-4">
      <OpenRangePicker
        availability={availability}
        selectedStart={startToUse}
        onSelect={(s) => {
          setPendingStart(s);
          // If we already have a duration choice, re-emit with the new start.
          if (currentDurationMins) {
            const endIso = new Date(
              new Date(s).getTime() + currentDurationMins * 60_000,
            ).toISOString();
            onChange(s, endIso);
          }
        }}
      />
      {startToUse ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Duration
          </p>
          <DurationPicker
            durations={durations}
            selected={currentDurationMins}
            onSelect={(mins) => {
              const endIso = new Date(
                new Date(startToUse).getTime() + mins * 60_000,
              ).toISOString();
              onChange(startToUse, endIso);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
