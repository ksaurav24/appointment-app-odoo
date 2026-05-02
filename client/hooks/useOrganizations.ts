"use client";

// TanStack Query hook for fetching the public organisation list.
// WHY useQuery (not useState + useEffect): Query handles caching, stale state,
// and background refetches automatically. The same list doesn't need to be
// re-fetched every time the user types a character — staleTime handles that.

import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@/lib/api";

export function useOrganizations(query: string) {
  return useQuery({
    // queryKey includes the search term so each unique search has its own cache entry.
    // When the user types "clinic", the result is cached under ["organizations", "clinic"].
    // If they retype "clinic" later, it returns the cached result instantly.
    queryKey: ["organizations", "list", query],
    queryFn: () => getOrganizations(query || undefined),
    // 1 minute stale time — the public org list doesn't change frequently.
    // BACKEND NOTE: adjust once you know the real update frequency.
    staleTime: 60_000,
  });
}
