"use client";

// Main interactive section of /appointments.
// WHY client component: owns the search input state and submit handler.
// The page itself (appointments/page.tsx) is a server component for metadata.

import { useState } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { OrgCard } from "./org-card";
import { Button } from "@/components/ui/button";

export function AppointmentsBrowser() {
  // inputValue: what the user is currently typing in the search box.
  // searchQuery: the term that was last *submitted* — drives the data fetch.
  // WHY two states: we don't want to re-query on every keystroke (expensive).
  // The query only fires when the user explicitly clicks Search or presses Enter.
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orgs = [], isPending, isError } = useOrganizations(searchQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(inputValue.trim());
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    // Auto-reset results when user fully clears the search box.
    if (e.target.value === "") setSearchQuery("");
  }

  return (
    <div>
      {/* ── Hero Section ── */}
      <div className="py-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Find the Right Organisation
        </h1>
        <p className="mt-1 text-lg font-semibold text-blue-600">
          Book Your Appointment
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Search from trusted organisations and book your appointment in
          seconds.
        </p>

        {/* Search bar — submit on button click or Enter key */}
        <form
          onSubmit={handleSearch}
          className="mx-auto mt-7 flex w-full max-w-xl gap-2"
        >
          <div className="relative flex-1">
            {/* Magnifying glass icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              id="org-search"
              type="search"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Search by name, service, or location..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* ── Results Section ── */}
      <div>
        {/* Header row: label + count */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {searchQuery ? `Results for "${searchQuery}"` : "All Organisations"}
          </h2>
          {!isPending && (
            <p className="text-xs text-gray-400">
              {orgs.length} {orgs.length === 1 ? "organisation" : "organisations"} found
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {isPending && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 animate-pulse rounded-xl border border-gray-100 bg-gray-100"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-red-700">
              Could not load organisations.
            </p>
            <p className="mt-1 text-xs text-red-500">
              Please check your connection and try again.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isPending && !isError && orgs.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-gray-700">
              No organisations found
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try a different name, service, or location.
            </p>
          </div>
        )}

        {/* Results grid */}
        {!isPending && !isError && orgs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {orgs.map((org) => (
              <OrgCard key={org.id} org={org} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
