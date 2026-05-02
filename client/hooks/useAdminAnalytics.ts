"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAdminDashboard,
  getAdminTimeseries,
  getTopOrganizations,
} from "@/lib/api";
import type {
  AdminDashboard,
  AdminTimeseriesQuery,
  TimeBucket,
  TopOrganization,
  TopOrganizationsQuery,
} from "@/types";

const KEY = "admin-analytics" as const;

export function useAdminDashboard() {
  return useQuery<AdminDashboard>({
    queryKey: [KEY, "dashboard"],
    queryFn: getAdminDashboard,
    staleTime: 5 * 60_000,
  });
}

export function useAdminTimeseries(query: AdminTimeseriesQuery) {
  return useQuery<TimeBucket[]>({
    queryKey: [KEY, "timeseries", query],
    queryFn: () => getAdminTimeseries(query),
    staleTime: 5 * 60_000,
  });
}

export function useTopOrganizations(query: TopOrganizationsQuery = {}) {
  return useQuery<TopOrganization[]>({
    queryKey: [KEY, "top-organizations", query],
    queryFn: () => getTopOrganizations(query),
    staleTime: 5 * 60_000,
  });
}
