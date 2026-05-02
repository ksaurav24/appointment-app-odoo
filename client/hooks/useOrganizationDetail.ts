"use client";

// Fetches a single organisation's full detail by its slug.
// Uses TanStack Query so the result is cached — navigating back to the same
// profile page shows the cached data instantly without a re-fetch.

import { useQuery } from "@tanstack/react-query";
import { getOrganizationBySlug } from "@/lib/api";

export function useOrganizationDetail(slug: string) {
  return useQuery({
    // queryKey includes the slug so each org has its own cache entry.
    queryKey: ["organizations", "detail", slug],
    queryFn: () => getOrganizationBySlug(slug),
    // Profile data is stable — 5 minute stale time before background refetch.
    staleTime: 5 * 60_000,
    // Don't fetch if slug is somehow empty (shouldn't happen but defensive).
    enabled: slug.length > 0,
  });
}
