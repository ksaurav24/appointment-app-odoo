"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateUser,
  changeUserRole,
  deactivateUser,
  getAdminUser,
  listAdminUsers,
} from "@/lib/api";
import type { ChangeRoleInput, ListUsersQuery } from "@/types";

const KEY = "admin-users" as const;

export function useAdminUsers(query: ListUsersQuery = {}) {
  return useQuery({
    queryKey: [KEY, "list", query],
    queryFn: () => listAdminUsers(query),
    staleTime: 30_000,
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "detail", userId],
    queryFn: () => getAdminUser(userId!),
    enabled: !!userId,
  });
}

export function useAdminUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [KEY] });

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: invalidate,
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: ChangeRoleInput }) =>
      changeUserRole(userId, body),
    onSuccess: invalidate,
  });

  return { activateMutation, deactivateMutation, changeRoleMutation };
}
