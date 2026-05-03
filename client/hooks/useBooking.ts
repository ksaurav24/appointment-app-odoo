"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acquireSlotLock,
  ApiError,
  cancelMyAppointment,
  createAppointment,
  createPaymentIntent,
  extendSlotLock,
  getMyAppointment,
  listMyAppointments,
  releaseSlotLock,
  rescheduleAppointment,
  submitAppointmentRequest,
  verifyPayment,
} from "@/lib/api";
import type {
  AcquireSlotLockInput,
  AppointmentWithRelations,
  CancelAppointmentInput,
  CreateAppointmentInput,
  CreateAppointmentRequestInput,
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  ListMyAppointmentsQuery,
  RescheduleAppointmentInput,
  SlotLock,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "@/types";

export function appointmentKey(publicId: string) {
  return ["appointments", "me", publicId] as const;
}

export function useAcquireSlotLock() {
  return useMutation<SlotLock, ApiError, AcquireSlotLockInput>({
    mutationFn: acquireSlotLock,
  });
}

export function useExtendSlotLock() {
  return useMutation<SlotLock, ApiError, string>({
    mutationFn: (id) => extendSlotLock(id),
  });
}

export function useReleaseSlotLock() {
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => releaseSlotLock(id),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation<AppointmentWithRelations, ApiError, CreateAppointmentInput>({
    mutationFn: createAppointment,
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
    },
  });
}

export function useSubmitAppointmentRequest(appointmentTypeId: string) {
  const qc = useQueryClient();
  return useMutation<
    AppointmentWithRelations,
    ApiError,
    CreateAppointmentRequestInput
  >({
    mutationFn: (body) => submitAppointmentRequest(appointmentTypeId, body),
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
      // Force the booking page to re-fetch availability so the slot we just
      // applied to flips to `pending` for the current user.
      qc.invalidateQueries({
        queryKey: ["public", "appointment-types", appointmentTypeId, "availability"],
      });
    },
  });
}

export function useAppointment(publicId: string | undefined) {
  return useQuery<AppointmentWithRelations>({
    queryKey: publicId ? appointmentKey(publicId) : ["appointments", "me", "none"],
    queryFn: () => getMyAppointment(publicId!),
    enabled: !!publicId,
    refetchOnWindowFocus: false,
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body?: CancelAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => cancelMyAppointment(publicId, body),
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
    },
  });
}

export function useCreatePaymentIntent() {
  return useMutation<CreatePaymentIntentResult, ApiError, CreatePaymentIntentInput>({
    mutationFn: createPaymentIntent,
  });
}

export function useVerifyPayment() {
  return useMutation<VerifyPaymentResult, ApiError, VerifyPaymentInput>({
    mutationFn: verifyPayment,
  });
}

export function useMyAppointments(query: ListMyAppointmentsQuery = {}) {
  return useQuery<AppointmentWithRelations[]>({
    queryKey: ["appointments", "me", "list", query],
    queryFn: () => listMyAppointments(query),
    staleTime: 30_000,
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation<
    AppointmentWithRelations,
    ApiError,
    { publicId: string; body: RescheduleAppointmentInput }
  >({
    mutationFn: ({ publicId, body }) => rescheduleAppointment(publicId, body),
    onSuccess: (appt) => {
      qc.setQueryData(appointmentKey(appt.publicId), appt);
      qc.invalidateQueries({ queryKey: ["appointments", "me", "list"] });
    },
  });
}
