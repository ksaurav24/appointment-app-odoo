"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateOrganization,
  approveOrganization,
  deactivateOrganization,
  listAdminOrganizations,
  rejectOrganization,
} from "@/lib/api";
import type {
  AdminOrganizationStatusFilter,
  RejectOrganizationInput,
} from "@/types";

const KEY = "admin-organizations" as const;

export function useAdminOrganizations(
  status: AdminOrganizationStatusFilter = "APPROVED",
) {
  return useQuery({
    queryKey: [KEY, "list", { status }],
    queryFn: () => listAdminOrganizations(status),
    staleTime: 30_000,
  });
}

export function useAdminOrganizationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const approveMutation = useMutation({
    mutationFn: approveOrganization,
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      organizationId,
      body,
    }: {
      organizationId: string;
      body: RejectOrganizationInput;
    }) => rejectOrganization(organizationId, body),
    onSuccess: invalidate,
  });

  const activateMutation = useMutation({
    mutationFn: activateOrganization,
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateOrganization,
    onSuccess: invalidate,
  });

  return {
    approveMutation,
    rejectMutation,
    activateMutation,
    deactivateMutation,
  };
}
