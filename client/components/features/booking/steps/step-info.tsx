import { useState } from "react";
import type { BookingData } from "@/types";

interface StepInfoProps {
  formData: BookingData;
  updateFormData: (d: Partial<BookingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepInfo({ formData, updateFormData, onNext, onPrev }: StepInfoProps) {
  const [concern, setConcern] = useState(formData.concern);
  const [notes, setNotes] = useState(formData.notes);

  const handleNext = () => {
    if (concern.trim() !== "") {
      updateFormData({ concern, notes });
      onNext();
    }
  };

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Additional Information</h2>
          <p className="mt-1 text-sm text-gray-500">
            Provide details so we can best prepare for your visit.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="concern" className="block text-sm font-medium text-gray-900">
              What is your primary concern? <span className="text-blue-500">*</span>
            </label>
            <input
              type="text"
              id="concern"
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              placeholder="E.g., Initial consultation, general enquiry, etc."
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
              Additional Notes <span className="font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details you'd like us to know..."
              className="mt-2 block w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
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
          disabled={concern.trim() === ""}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          Confirm Booking
        </button>
      </div>
    </div>
  );
}
