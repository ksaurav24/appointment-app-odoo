import type { OrgDetail } from "@/types";

interface StepReviewProps {
  org: OrgDetail;
  onNext: () => void;
}

export function StepReview({ org, onNext }: StepReviewProps) {
  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Appointment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Confirm the service details before proceeding.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{org.name}</h3>
              <p className="text-sm text-gray-500">General Consultation</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Duration
              </p>
              <p className="mt-1 font-medium text-gray-900">45 Minutes</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Provider
              </p>
              <p className="mt-1 font-medium text-gray-900">Standard Service</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <span className="font-semibold">Info:</span> Payment is not required until the appointment is confirmed by the provider.
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
