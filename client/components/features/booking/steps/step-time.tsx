import { useState } from "react";
import type { BookingData } from "@/types";

interface StepTimeProps {
  formData: BookingData;
  updateFormData: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const MOCK_SLOTS = [
  { time: "09:00 AM", available: 2 },
  { time: "09:30 AM", available: 0 },
  { time: "10:00 AM", available: 1 },
  { time: "10:30 AM", available: 4 },
  { time: "11:00 AM", available: 2 },
  { time: "11:30 AM", available: 1 },
  { time: "02:00 PM", available: 3 },
  { time: "02:30 PM", available: 0 },
  { time: "03:00 PM", available: 2 },
  { time: "03:30 PM", available: 5 },
  { time: "04:00 PM", available: 1 },
];

export function StepTime({ formData, updateFormData, onNext, onPrev }: StepTimeProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(formData.timeSlot);

  const handleNext = () => {
    if (selectedSlot) {
      updateFormData({ timeSlot: selectedSlot });
      onNext();
    }
  };

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Select a Time</h2>
          <p className="mt-1 text-sm text-gray-500">
            Showing available slots for{" "}
            {formData.date
              ? new Date(formData.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "selected date"}
            .
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MOCK_SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.time;
            const disabled = slot.available === 0;

            return (
              <button
                key={slot.time}
                disabled={disabled}
                onClick={() => setSelectedSlot(slot.time)}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : disabled
                    ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400 opacity-50"
                    : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                }`}
              >
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-blue-900" : disabled ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {slot.time}
                </span>
                <span
                  className={`mt-0.5 text-xs ${
                    isSelected ? "text-blue-600" : disabled ? "text-gray-400" : "text-green-600"
                  }`}
                >
                  {disabled ? "Fully Booked" : `${slot.available} left`}
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
          disabled={!selectedSlot}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
