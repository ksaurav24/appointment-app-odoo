"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAvailability,
  getDurationOptions,
  getPublicAppointmentType,
  getPublicAppointmentTypeByToken,
  listPublicAppointmentTypes,
} from "@/lib/api";
import type {
  AppointmentType,
  AppointmentTypeWithRelations,
  AvailabilityQuery,
  AvailabilityResponse,
  DurationOptionsQuery,
  DurationOptionsResponse,
} from "@/types";

const ROOT_KEY = ["public", "appointment-types"] as const;

export function publicAppointmentTypeKey(id: string) {
  return [...ROOT_KEY, id] as const;
}

export function usePublicAppointmentTypes() {
  return useQuery<AppointmentType[]>({
    queryKey: ROOT_KEY,
    queryFn: listPublicAppointmentTypes,
    staleTime: 60_000,
  });
}

export function usePublicAppointmentType(id: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: id ? publicAppointmentTypeKey(id) : ["public", "appointment-types", "none"],
    queryFn: () => getPublicAppointmentType(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePublicAppointmentTypeByToken(token: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: ["public", "appointment-types", "share", token ?? "none"],
    queryFn: () => getPublicAppointmentTypeByToken(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useAvailability(
  appointmentTypeId: string | undefined,
  query: Partial<AvailabilityQuery>,
) {
  const enabled = !!appointmentTypeId && !!query.date;
  return useQuery<AvailabilityResponse>({
    queryKey: [
      "public",
      "appointment-types",
      appointmentTypeId,
      "availability",
      query,
    ],
    queryFn: () =>
      getAvailability(appointmentTypeId!, {
        date: query.date!,
        entityId: query.entityId,
        timezone: query.timezone,
      }),
    enabled,
    staleTime: 15_000,
  });
}

export function useDurationOptions(
  appointmentTypeId: string | undefined,
  query: Partial<DurationOptionsQuery>,
) {
  const enabled =
    !!appointmentTypeId && !!query.date && !!query.startTime;
  return useQuery<DurationOptionsResponse>({
    queryKey: [
      "public",
      "appointment-types",
      appointmentTypeId,
      "duration-options",
      query,
    ],
    queryFn: () =>
      getDurationOptions(appointmentTypeId!, {
        date: query.date!,
        startTime: query.startTime!,
        entityId: query.entityId,
        timezone: query.timezone,
      }),
    enabled,
    staleTime: 15_000,
  });
}
