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
          const title = isBooked
            ? "Slot is full"
            : isPending
              ? "Slot has pending approval requests — submit yours to compete"
              : undefined;

          return (
            <button
              key={slot.startTime}
              disabled={isBooked}
              title={title}
              onClick={() => onSelect(slot.startTime, slot.endTime)}
              className={cn(
                "rounded-lg border-[1.5px] px-2 py-2 text-center text-xs font-medium transition-all",
                // Default available slot
                !isSelected && !isBooked && !isPending &&
                  "border-cream2 bg-white text-muted-foreground hover:border-forest hover:text-forest",
                // Selected slot
                isSelected &&
                  "border-forest bg-forest text-white",
                // Pending: amber tones
                isPending && !isSelected &&
                  "border-amber bg-amber-pale text-amber-deep hover:bg-amber-pale/80",
                // Booked: muted, line-through
                isBooked &&
                  "border-cream2 bg-slate-pale text-slate-light line-through cursor-default opacity-70",
              )}
            >
              {formatTimeInZone(slot.startTime, availability.timezone)}
            </button>
          );
        })}
      </div>

      {/* Legend appears only when at least one occupied slot is on screen, so
          a fully-available day stays uncluttered. */}
      {hasPending || hasBooked ? (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block text-foreground">●</span>
            Available
          </span>
          {hasPending ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm border border-amber bg-amber-pale"
              />
              Pending approval
            </span>
          ) : null}
          {hasBooked ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-sm border border-cream2 bg-slate-pale line-through"
              />
              Booked
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
