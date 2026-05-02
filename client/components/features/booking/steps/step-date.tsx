import { useState } from "react";
import type { BookingData } from "@/types";

interface StepDateProps {
  formData: BookingData;
  updateFormData: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepDate({ formData, updateFormData, onNext, onPrev }: StepDateProps) {
  // A simple 14-day mock calendar for the demo.
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(formData.date);

  const handleNext = () => {
    if (selectedDateStr) {
      updateFormData({ date: selectedDateStr });
      onNext();
    }
  };

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Select a Date</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose an available day for your appointment.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {days.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const isSelected = selectedDateStr === dateStr;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const disabled = isWeekend; // Mock: weekends disabled

            return (
              <button
                key={dateStr}
                disabled={disabled}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : disabled
                    ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-50"
                    : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                }`}
              >
                <span
                  className={`text-xs font-medium uppercase tracking-wide ${
                    isSelected ? "text-blue-600" : disabled ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`mt-1 text-xl font-semibold ${
                    isSelected ? "text-blue-900" : disabled ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {date.getDate()}
                </span>
                <span
                  className={`mt-0.5 text-xs ${
                    isSelected ? "text-blue-600" : disabled ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {date.toLocaleDateString("en-US", { month: "short" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedDateStr}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
