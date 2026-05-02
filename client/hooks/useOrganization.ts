"use client";

// Manages all mutations related to the Organisation resource.
// One hook per data domain \u2014 components never import API functions directly.
// This hook is the only place in the app that calls createOrganization.

import { useMutation } from "@tanstack/react-query";
import { createOrganization } from "@/lib/api";
import type { CreateOrgPayload } from "@/types";

export function useOrganization() {
  const createOrgMutation = useMutation({
    mutationFn: (payload: CreateOrgPayload) => createOrganization(payload),
    // No cache invalidation here \u2014 after submission the user is redirected
    // to the submitted page and won't see a list that needs refreshing.
  });

  return { createOrgMutation };
}
