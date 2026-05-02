"use client";

// Bottom section of the customer dashboard — two information cards side by side.
// Card 1: Account Information (name, email, edit button)
// Card 2: Upgrade Account (become an organisation CTA)
//
// WHY "use client": reads user name/email from Zustand (browser-only state).

import Link from "next/link";
import { ROUTES } from "@/constants";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function UserAccountInfo() {
  const user = useAppStore((state) => state.user);

  const initial = user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

      {/* ── Card 1: Account Information ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Account Information
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Your personal details and account info
        </p>

        {/* User row: avatar + name/email + edit button */}
        <div className="mt-4 flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
          >
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {user?.name ?? "—"}
            </p>
            <p className="truncate text-xs text-gray-500">
              {user?.email ?? "—"}
            </p>
          </div>

          {/* Edit Profile — links to /profile when that page is built */}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={ROUTES.myProfile}>Edit Profile</Link>
          </Button>
        </div>
      </div>

      {/* ── Card 2: Upgrade / Become an Organisation ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Upgrade Account
        </p>
        <p className="mt-0.5 text-xs text-gray-500">Unlock more features</p>

        <div className="mt-4 flex items-start gap-3">
          {/* Building icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-gray-500"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Become an Organisation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Start accepting appointments, manage bookings, and grow your
              business as a verified organiser.
            </p>
            {/* TODO: wire to org upgrade flow once built */}
            <Button variant="outline" size="sm" className="mt-3">
              Get Started
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
