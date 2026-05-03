"use client";

import * as React from "react";

import { scorePassword } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

type Props = {
  password: string;
  context?: { email?: string; fullName?: string };
  className?: string;
};

const SEGMENT_COLORS = [
  "bg-destructive",   // 1 — Weak (red)
  "bg-amber-500",     // 2 — Fair
  "bg-lime-500",      // 3 — Good
  "bg-emerald-500",   // 4 — Strong
];

const LABEL_COLORS = [
  "",                            // 0 — never rendered
  "text-destructive",
  "text-amber-600 dark:text-amber-500",
  "text-lime-700 dark:text-lime-500",
  "text-emerald-700 dark:text-emerald-500",
];

export function PasswordStrengthMeter({ password, context, className }: Props) {
  if (!password) return null;

  const { score, label, unmet } = scorePassword(password, context);

  return (
    <div
      aria-live="polite"
      className={cn("space-y-1.5", className)}
    >
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < score;
          const colorClass = filled
            ? SEGMENT_COLORS[Math.min(score - 1, 3)]
            : "bg-muted";
          return (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                colorClass,
              )}
            />
          );
        })}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-xs font-medium", LABEL_COLORS[score])}>
          {label}
        </span>
        {unmet.length > 0 ? (
          <span className="truncate text-xs text-muted-foreground">
            {unmet.join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
