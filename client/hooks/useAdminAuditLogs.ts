"use client";

import { useQuery } from "@tanstack/react-query";

import { listAuditLogs } from "@/lib/api";
import type { ListAuditLogsQuery } from "@/types";

const KEY = "admin-audit-logs" as const;

export function useAdminAuditLogs(query: ListAuditLogsQuery = {}) {
  return useQuery({
    queryKey: [KEY, "list", query],
    queryFn: () => listAuditLogs(query),
    staleTime: 30_000,
  });
}
