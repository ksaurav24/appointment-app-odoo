"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

  const hasPending = availability.slots.some((s) => s.state === "pending");
  const hasBooked = availability.slots.some((s) => s.state === "booked");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {availability.slots.map((slot) => {
          const isSelected = selectedStart === slot.startTime;
          const isBooked = slot.state === "booked";
          const isPending = slot.state === "pending";

          // Booked slots stay visible (gray, disabled) so the customer can see
          // the day's full shape rather than wondering why a time is missing.
          // Pending slots are still clickable on manual-approval types — the
          // customer is competing for the slot, not consuming it.
          const variant = isSelected ? "default" : "outline";
          const title = isBooked
            ? "Slot is full"
            : isPending
              ? "Slot has pending approval requests — submit yours to compete"
              : undefined;

          return (
            <Button
              key={slot.startTime}
              variant={variant}
              size="sm"
              disabled={isBooked}
              title={title}
              onClick={() => onSelect(slot.startTime, slot.endTime)}
              className={cn(
                // Pending: amber background, still selectable.
                isPending &&
                  !isSelected &&
                  "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-100",
                // Booked: muted background, strikethrough, no hover effect so
                // it reads as occupied rather than just disabled.
                isBooked &&
                  "border-muted bg-muted text-muted-foreground line-through opacity-70 hover:bg-muted",
              )}
            >
              {formatTimeInZone(slot.startTime, availability.timezone)}
            </Button>
          );
        })}
      </div>

      {/* Legend appears only when at least one occupied slot is on screen, so
          a fully-available day stays uncluttered. */}
      {hasPending || hasBooked ? (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {hasPending ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm border border-amber-400 bg-amber-100 dark:bg-amber-950/30"
              />
              Pending approval
            </span>
          ) : null}
          {hasBooked ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm border border-muted-foreground/30 bg-muted"
              />
              Booked
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
