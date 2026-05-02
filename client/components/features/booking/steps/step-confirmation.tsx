import { useRouter } from "next/navigation";
import type { BookingData, OrgDetail } from "@/types";
import { ROUTES } from "@/constants";

interface StepConfirmationProps {
  org: OrgDetail;
  formData: BookingData;
  onClose: () => void;
}

export function StepConfirmation({ org, formData, onClose }: StepConfirmationProps) {
  const router = useRouter();

  const handleViewBookings = () => {
    onClose();
    router.push(ROUTES.myBookings);
  };

  const handleBrowseMore = () => {
    onClose();
    router.push(ROUTES.findAppointments);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center pb-10 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="h-10 w-10"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h2>
      <p className="mt-2 max-w-sm text-gray-500">
        Your appointment with <span className="font-semibold text-gray-900">{org.name}</span> has
        been successfully scheduled.
      </p>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-gray-100 bg-gray-50 p-6 text-left shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Appointment Details</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Date</dt>
            <dd className="font-medium text-gray-900">
              {formData.date
                ? new Date(formData.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Time</dt>
            <dd className="font-medium text-gray-900">{formData.timeSlot}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Service</dt>
            <dd className="font-medium text-gray-900">General Consultation</dd>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-3">
            <dt className="text-gray-500">Concern</dt>
            <dd
              className="max-w-[150px] truncate font-medium text-gray-900 text-right"
              title={formData.concern}
            >
              {formData.concern}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex w-full max-w-sm gap-3">
        <button
          onClick={handleBrowseMore}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50 active:scale-[0.98]"
        >
          Browse More
        </button>
        <button
          onClick={handleViewBookings}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98]"
        >
          My Bookings
        </button>
      </div>
    </div>
  );
}
