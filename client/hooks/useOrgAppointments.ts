"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ApiError,
  approveOrgAppointment,
  cancelOrgAppointment,
  completeOrgAppointment,
  getOrgAppointment,
  listOrgAppointments,
  noShowOrgAppointment,
  rejectOrgAppointment,
  rescheduleOrgAppointment,
} from "@/lib/api";
import type {
  AppointmentWithRelations,
  CancelAppointmentInput,
  ListOrgAppointmentsQuery,
  RejectAppointmentInput,
  RescheduleAppointmentInput,
} from "@/types";

const KEY = "org-appointments" as const;
const ANALYTICS_KEY = "org-analytics" as const;

export function useOrgAppointments(query: ListOrgAppointmentsQuery = {}) {
  return useQuery<AppointmentWithRelations[]>({
    queryKey: [KEY, "list", query],
    queryFn: () => listOrgAppointments(query),
    staleTime: 15_000,
  });
}

export function useOrgAppointment(publicId: string | undefined) {
  return useQuery<AppointmentWithRelations>({
    queryKey: [KEY, "detail", publicId],
    queryFn: () => getOrgAppointment(publicId!),
    enabled: !!publicId,
  });
}

export function useOrgAppointmentMutations() {
  const qc = useQueryClient();

  const invalidateAfterAction = (publicId: string) => {
    qc.invalidateQueries({ queryKey: [KEY, "list"] });
    qc.invalidateQueries({ queryKey: [KEY, "detail", publicId] });
    qc.invalidateQueries({ queryKey: [ANALYTICS_KEY] });
  };

  const approveMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    string
  >({
    mutationFn: approveOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const rejectMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body: RejectAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => rejectOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  const completeMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    string
  >({
    mutationFn: completeOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const noShowMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    string
  >({
    mutationFn: noShowOrgAppointment,
    onSuccess: (_d, publicId) => invalidateAfterAction(publicId),
  });

  const cancelMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body: CancelAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => cancelOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  const rescheduleMutation = useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body: RescheduleAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) =>
      rescheduleOrgAppointment(publicId, body),
    onSuccess: (_d, { publicId }) => invalidateAfterAction(publicId),
  });

  return {
    approveMutation,
    rejectMutation,
    completeMutation,
    noShowMutation,
    cancelMutation,
    rescheduleMutation,
  };
}
