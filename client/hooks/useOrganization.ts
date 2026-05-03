"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, createOrganization, getMyOrganization } from "@/lib/api";
import type { CreateOrganizationInput, Organization } from "@/types";

const ORG_KEY = ["organization", "me"] as const;

export function useMyOrganization(enabled = true) {
  return useQuery<Organization | null>({
    queryKey: ORG_KEY,
    queryFn: getMyOrganization,
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();

  return useMutation<Organization, ApiError, CreateOrganizationInput>({
    mutationFn: createOrganization,
    onSuccess: (org) => {
      qc.setQueryData(ORG_KEY, org);
    },
  });
}
