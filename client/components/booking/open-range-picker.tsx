"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatTimeInZone } from "@/lib/format";
import type { VariableAvailability } from "@/types";

type OpenRangePickerProps = {
  availability: VariableAvailability;
  selectedStart: string | undefined;
  onSelect: (startTime: string) => void;
};

function generateStartTimes(
  rangeStart: string,
  rangeEnd: string,
  rangeDurationMins: number,
  minDurationMins: number,
  stepMins: number,
): string[] {
  if (rangeDurationMins < minDurationMins) return [];
  const out: string[] = [];
  const start = new Date(rangeStart).getTime();
  const end = new Date(rangeEnd).getTime();
  for (
    let t = start;
    t + minDurationMins * 60_000 <= end;
    t += stepMins * 60_000
  ) {
    out.push(new Date(t).toISOString());
  }
  return out;
}

export function OpenRangePicker({
  availability,
  selectedStart,
  onSelect,
}: OpenRangePickerProps) {
  const startTimes = useMemo(() => {
    return availability.openRanges.flatMap((r) =>
      generateStartTimes(
        r.startTime,
        r.endTime,
        r.durationMinutes,
        availability.minDurationMins,
        availability.durationStepMins,
      ),
    );
  }, [availability]);

  if (startTimes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No times available on this day.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {startTimes.map((iso) => (
        <Button
          key={iso}
          variant={selectedStart === iso ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(iso)}
        >
          {formatTimeInZone(iso, availability.timezone)}
        </Button>
      ))}
    </div>
  );
}
