"use client";

import React from "react";

interface StepperHeaderProps {
  currentStep: number;
  totalSteps: number;
}

export function StepperHeader({ currentStep, totalSteps }: StepperHeaderProps) {
  const steps = [
    { num: 1, label: "Review" },
    { num: 2, label: "Date" },
    { num: 3, label: "Time" },
    { num: 4, label: "Details" },
    { num: 5, label: "Done" },
  ];

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
      <div className="relative mx-auto flex max-w-md items-center justify-between">
        {/* Progress bar background line */}
        <div className="absolute left-0 top-4 -z-10 h-0.5 w-full bg-gray-200"></div>
        {/* Active progress line */}
        <div
          className="absolute left-0 top-4 -z-10 h-0.5 bg-blue-500 transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>

        {steps.map((s) => {
          const isCompleted = s.num < currentStep;
          const isCurrent = s.num === currentStep;

          return (
            <div key={s.num} className="flex flex-col items-center gap-2 relative bg-gray-50/50">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                    : isCurrent
                    ? "border-2 border-blue-500 bg-white text-blue-600 shadow-md shadow-blue-100"
                    : "border-2 border-gray-200 bg-white text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              {/* Optional labels on desktop */}
              <span
                className={`hidden text-xs sm:block ${
                  isCurrent || isCompleted ? "font-medium text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
