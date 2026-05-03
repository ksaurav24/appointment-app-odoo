type StepIndicatorProps = {
  current: number;
  total: number;
};

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? "bg-foreground" : "bg-foreground/20"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        Step {current} of {total}
      </span>
    </div>
  );
}
