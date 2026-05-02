// Organisation card displayed in the browse/search results list.
// Pure presentational — receives one OrgListing and renders a clickable card.
// Server component: no state, no events, just a styled Link.

import Link from "next/link";
import { orgProfilePath } from "@/constants";
import type { OrgListing } from "@/types";

interface OrgCardProps {
  org: OrgListing;
}

export function OrgCard({ org }: OrgCardProps) {
  // First letter of org name used as the avatar initial.
  const initial = org.name.charAt(0).toUpperCase();

  return (
    <Link
      href={orgProfilePath(org.slug)}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {/* Top row: avatar + org name + appointment slot badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600"
          >
            {initial}
          </div>
          <p className="text-sm font-semibold leading-tight text-gray-900">
            {org.name}
          </p>
        </div>
        {/* Badge turns blue when slots are available, gray when none */}
        <span
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            org.appointmentCount > 0
              ? "bg-blue-50 text-blue-600"
              : "bg-gray-100 text-gray-400",
          ].join(" ")}
        >
          {org.appointmentCount}{" "}
          {org.appointmentCount === 1 ? "slot" : "slots"}
        </span>
      </div>

      {/* Location */}
      <div className="mt-3 flex items-center gap-1.5">
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
        <p className="truncate text-xs text-gray-500">{org.address}</p>
      </div>

      {/* Description — clamped to 2 lines so cards stay uniform height */}
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">
        {org.description}
      </p>

      {/* Working hours */}
      <div className="mt-3 flex items-center gap-1.5">
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
        <p className="text-xs text-gray-400">{org.workingHours}</p>
      </div>
    </Link>
  );
}
