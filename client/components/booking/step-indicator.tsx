type StepIndicatorProps = {
  current: number;
  total: number;
  labels?: string[];
};

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between relative z-10 w-full px-2 text-xs font-semibold">
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < current;
        const isCurrent = stepNum === current;
        const label = labels?.[i];

        return (
          <div key={i} className={`flex flex-col items-center gap-1.5 relative z-10 ${isComplete || isCurrent ? 'text-forest' : 'text-slate-light'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-colors ${
              isCurrent ? 'bg-amber text-white' : 
              isComplete ? 'bg-forest text-white' : 'bg-slate-pale text-slate-light'
            }`}>
              {isComplete ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                stepNum
              )}
            </div>
            {label ? (
              <span className="hidden sm:block absolute top-[120%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-center">
                {label}
              </span>
            ) : null}
          </div>
        );
      })}
      
      {/* Track line container */}
      <div className="absolute top-1/2 -translate-y-1/2 left-5 right-5 h-[2px] bg-cream2 -z-10">
        {/* Progress fill line */}
        <div 
          className="absolute top-0 left-0 h-full bg-forest transition-all duration-500" 
          style={{ width: `${((current - 1) / (total - 1)) * 100}%` }} 
        />
      </div>
    </div>
  );
}
