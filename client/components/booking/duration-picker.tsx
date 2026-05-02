"use client";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";

type DurationPickerProps = {
  durations: number[];
  selected: number | undefined;
  onSelect: (mins: number) => void;
  isLoading?: boolean;
};

export function DurationPicker({
  durations,
  selected,
  onSelect,
  isLoading,
}: DurationPickerProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading durations…</p>;
  }
  if (durations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No durations fit at this start time.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {durations.map((mins) => (
        <Button
          key={mins}
          variant={selected === mins ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(mins)}
        >
          {formatDuration(mins)}
        </Button>
      ))}
    </div>
  );
}
