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
    <ol className="flex w-full items-start gap-1">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === steps.length - 1;

        return (
          <li key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2 w-full">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all shadow-sm",
                  done &&
                    "border-forest bg-forest text-white shadow-forest/20",
                  active &&
                    "border-forest bg-white text-forest shadow-forest/30",
                  !done &&
                    !active &&
                    "border-gray-300 bg-gray-50 text-gray-400",
                )}
              >
                {done ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    className="size-5"
                  />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs text-center font-semibold leading-tight",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast ? (
              <div className="flex-1 mx-1 h-0.5 transition-colors"
                aria-hidden
                style={{
                  backgroundColor: done ? "rgb(34, 97, 51)" : "rgb(226, 232, 240)",
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
