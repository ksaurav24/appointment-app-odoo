"use client";

// Welcome banner shown at the top of the customer dashboard.
// WHY "use client": reads user name from Zustand, which is browser-only.
// The banner is personalized — it can't be rendered on the server without
// the user's name, which is only available after client-side hydration.

import { useAppStore } from "@/store/useAppStore";

export function UserWelcomeBanner() {
  const user = useAppStore((state) => state.user);

  // Derive the avatar initial from the first letter of the user's name.
  // Fallback to "U" if Zustand hasn't hydrated yet (very brief flash).
  const initial = user?.name?.charAt(0).toUpperCase() ?? "U";
  const name = user?.name ?? "Customer";

  return (
    <div className="flex items-center gap-5 rounded-xl border border-blue-100 bg-blue-50 p-6">
      {/* Avatar circle with first initial */}
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white"
      >
        {initial}
      </div>

      {/* Greeting text */}
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your bookings and discover new appointments.
        </p>
      </div>

      {/* Role badge — confirms the user is a customer, not an organiser */}
      <span className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-600">
        Customer
      </span>
    </div>
  );
}
