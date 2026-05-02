// Shared timeline stepper shown at the top of every onboarding page.
// It is a SERVER component (no useState/useEffect needed) \u2014 just receives
// currentStep as a prop and renders all 3 nodes accordingly.
//
// WHY a shared component: all 3 pages show identical stepper markup.
// One component = one place to change if we ever add a Step 4.

interface OnboardingStepperProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: "Setup" },
  { number: 2, label: "Details" },
  { number: 3, label: "Submit" },
] as const;

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const isDone = step.number < currentStep;     // steps before current
          const isActive = step.number === currentStep; // the current step
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step.number} className="flex items-center">
              {/* Step node: green tick when done, blue ring when active, gray when future */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-200",
                    isDone
                      ? "border-green-500 bg-green-500 text-white"
                      : isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-400",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? (
                    // Checkmark SVG for completed steps
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={[
                    "text-xs",
                    isActive ? "font-semibold text-blue-600" : "text-gray-400",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps \u2014 turns green when left step is done */}
              {!isLast && (
                <div
                  className={[
                    "mb-4 h-0.5 w-16 sm:w-24",
                    isDone ? "bg-green-400" : "bg-gray-200",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
