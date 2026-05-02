"use client";

import { Button } from "@/components/ui/button";
import { formatTimeInZone } from "@/lib/format";
import type { FixedAvailability } from "@/types";

type SlotListProps = {
  availability: FixedAvailability;
  selectedStart: string | undefined;
  onSelect: (startTime: string, endTime: string) => void;
};

export function SlotList({
  availability,
  selectedStart,
  onSelect,
}: SlotListProps) {
  if (availability.slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No times available on this day.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {availability.slots.map((slot) => {
        const isFull = slot.remainingCapacity <= 0;
        const isSelected = selectedStart === slot.startTime;
        return (
          <Button
            key={slot.startTime}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={isFull}
            onClick={() => onSelect(slot.startTime, slot.endTime)}
          >
            {formatTimeInZone(slot.startTime, availability.timezone)}
          </Button>
        );
      })}
    </div>
  );
}
