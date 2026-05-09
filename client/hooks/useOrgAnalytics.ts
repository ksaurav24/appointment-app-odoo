"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getOrgByAppointmentType,
  getOrgBusyHours,
  getOrgDashboard,
  getOrgStaffPerformance,
  getOrgTimeseries,
} from "@/lib/api";
import type {
  OrgByAppointmentType,
  OrgBusyHours,
  OrgDashboard,
  OrgStaffPerformance,
  OrgTimeseriesQuery,
  TimeBucket,
} from "@/types";

const KEY = "org-analytics" as const;

export function useOrgDashboard() {
  return useQuery<OrgDashboard>({
    queryKey: [KEY, "dashboard"],
    queryFn: getOrgDashboard,
    staleTime: 60_000,
  });
}

export function useOrgTimeseries(query: OrgTimeseriesQuery) {
  return useQuery<TimeBucket[]>({
    queryKey: [KEY, "timeseries", query],
    queryFn: () => getOrgTimeseries(query),
    staleTime: 60_000,
  });
}

export function useOrgByAppointmentType() {
  return useQuery<OrgByAppointmentType[]>({
    queryKey: [KEY, "by-appointment-type"],
    queryFn: getOrgByAppointmentType,
    staleTime: 60_000,
  });
}

export function useOrgBusyHours() {
  return useQuery<OrgBusyHours>({
    queryKey: [KEY, "busy-hours"],
    queryFn: getOrgBusyHours,
    staleTime: 5 * 60_000,
  });
}

export function useOrgStaffPerformance() {
  return useQuery<OrgStaffPerformance[]>({
    queryKey: [KEY, "staff-performance"],
    queryFn: getOrgStaffPerformance,
    staleTime: 60_000,
  });
}
