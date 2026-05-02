"use client";

import { useQuery } from "@tanstack/react-query";

import { listAdminAppointments } from "@/lib/api";
import type { ListAdminAppointmentsQuery } from "@/types";

const KEY = "admin-appointments" as const;

export function useAdminAppointments(query: ListAdminAppointmentsQuery = {}) {
  return useQuery({
    queryKey: [KEY, "list", query],
    queryFn: () => listAdminAppointments(query),
    staleTime: 30_000,
  });
}
