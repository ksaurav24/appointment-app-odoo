import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

type Step = { key: string; label: string };

export function Stepper({
  steps,
  currentIndex,
}: {
  steps: Step[];
  currentIndex: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4"
                />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "ml-1 h-px w-6 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
