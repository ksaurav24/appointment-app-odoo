// Quick action cards shown in the middle of the customer dashboard.
// WHY server component: these are just styled Links — no state or events.
// Keeping it server-only means zero JS is sent for this section.

import Link from "next/link";
import { ROUTES } from "@/constants";

// Each card definition: icon path, title, description, destination.
// Add or remove cards here to change what appears on the dashboard.
const QUICK_ACTIONS = [
  {
    id: "find-appointments",
    title: "Find Appointments",
    description: "Browse and book new appointments",
    href: ROUTES.findAppointments,
    // Magnifying glass icon
    iconPath:
      "M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
  },
  {
    id: "my-bookings",
    title: "My Bookings",
    description: "View your upcoming appointments",
    href: ROUTES.myBookings,
    // Calendar icon
    iconPath:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  },
  {
    id: "my-profile",
    title: "My Profile",
    description: "Update your personal details",
    href: ROUTES.myProfile,
    // User circle icon
    iconPath:
      "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
] as const;

export function UserQuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {QUICK_ACTIONS.map(({ id, title, description, href, iconPath }) => (
        <Link
          key={id}
          href={href}
          className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all duration-150 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98]"
        >
          {/* Icon + chevron row */}
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 text-blue-600"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
              </svg>
            </div>
            {/* Chevron nudges right on hover — micro-animation for interactivity */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-gray-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Card text */}
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
