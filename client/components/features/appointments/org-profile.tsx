"use client";

// Organisation public profile page content.
// WHY client component: uses useOrganizationDetail (a useQuery hook) and booking modal state.
// The page.tsx (server component) handles metadata separately.

import { useState } from "react";
import Link from "next/link";
import { useOrganizationDetail } from "@/hooks/useOrganizationDetail";
import { ROUTES } from "@/constants";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/features/booking/booking-modal";

interface OrgProfileProps {
  // slug comes from the URL param, passed down from the page component.
  slug: string;
}

export function OrgProfile({ slug }: OrgProfileProps) {
  const { data: org, isPending, isError, error } = useOrganizationDetail(slug);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // ── Loading state ──
  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-28 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  // ── Error / 404 state ──
  if (isError) {
    const msg =
      error instanceof Error ? error.message : "Could not load organisation.";
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-red-700">{msg}</p>
        <Link
          href={ROUTES.findAppointments}
          className="mt-4 inline-block text-xs text-blue-600 hover:underline"
        >
          ← Back to all organisations
        </Link>
      </div>
    );
  }

  const initial = org.name.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Back navigation */}
      <Link
        href={ROUTES.findAppointments}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors duration-150"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        Back to all organisations
      </Link>

      {/* ── Hero card: avatar, name, badge, location, hours ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          {/* Large avatar initial */}
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl font-bold text-blue-600"
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
              {/* Slot badge */}
              <span
                className={[
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  org.appointmentCount > 0
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-400",
                ].join(" ")}
              >
                {org.appointmentCount}{" "}
                {org.appointmentCount === 1 ? "slot available" : "slots available"}
              </span>
            </div>
            {/* Location */}
            <div className="mt-2 flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-gray-500">{org.address}</p>
            </div>
            {/* Working hours */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-gray-500">{org.workingHours}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── About section ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">About</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {org.description}
        </p>
      </div>

      {/* ── Contact section ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
        <dl className="mt-3 space-y-2">
          <div className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-xs font-medium text-gray-400">
              Phone
            </dt>
            <dd className="text-sm text-gray-700">{org.contactPhone}</dd>
          </div>
          {org.contactEmail && (
            <div className="flex items-center gap-3">
              <dt className="w-28 shrink-0 text-xs font-medium text-gray-400">
                Email
              </dt>
              <dd className="text-sm text-gray-700">{org.contactEmail}</dd>
            </div>
          )}
          <div className="flex items-center gap-3">
            <dt className="w-28 shrink-0 text-xs font-medium text-gray-400">
              Timezone
            </dt>
            <dd className="text-sm text-gray-700">{org.timezone}</dd>
          </div>
        </dl>
      </div>

      {/* ── Book CTA ── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
        <p className="text-sm font-semibold text-gray-900">
          Ready to book an appointment?
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Click below to start scheduling your visit with {org.name}.
        </p>
        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98]"
        >
          Book an Appointment
        </button>
      </div>

      {/* Booking Wizard Modal */}
      {org && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          org={org}
        />
      )}
    </div>
  );
}
