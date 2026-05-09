"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveAppointmentType,
  ApiError,
  unarchiveAppointmentType,
  createAppointmentType,
  deleteAppointmentType,
  getAppointmentType,
  listAppointmentTypes,
  publishAppointmentType,
  regenerateShareToken,
  setAppointmentTypeEntities,
  setAppointmentTypeQuestions,
  setAppointmentTypeSchedule,
  unpublishAppointmentType,
  updateAppointmentType,
} from "@/lib/api";
import type {
  AppointmentType,
  AppointmentTypeWithRelations,
  CreateAppointmentTypeInput,
  ListAppointmentTypesQuery,
  SetBookingQuestionsInput,
  SetEntitiesInput,
  SetScheduleInput,
  UpdateAppointmentTypeInput,
} from "@/types";

const KEY = "appointment-types" as const;

export function useAppointmentTypes(query: ListAppointmentTypesQuery = {}) {
  return useQuery<AppointmentType[]>({
    queryKey: [KEY, "list", query],
    queryFn: () => listAppointmentTypes(query),
    staleTime: 30_000,
  });
}

export function useAppointmentType(id: string | undefined) {
  return useQuery<AppointmentTypeWithRelations>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getAppointmentType(id!),
    enabled: !!id,
  });
}

export function useAppointmentTypeMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => qc.invalidateQueries({ queryKey: [KEY] });
  const invalidateDetail = (id: string) => {
    qc.invalidateQueries({ queryKey: [KEY, "list"] });
    qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
  };

  const createMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    CreateAppointmentTypeInput
  >({
    mutationFn: createAppointmentType,
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    { id: string; body: UpdateAppointmentTypeInput }
  >({
    mutationFn: ({ id, body }) => updateAppointmentType(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const deleteMutation = useMutation<void, ApiError, string>({
    mutationFn: deleteAppointmentType,
    onSuccess: invalidateAll,
  });

  const setEntitiesMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    { id: string; body: SetEntitiesInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeEntities(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const setScheduleMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    { id: string; body: SetScheduleInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeSchedule(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const setQuestionsMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    { id: string; body: SetBookingQuestionsInput }
  >({
    mutationFn: ({ id, body }) => setAppointmentTypeQuestions(id, body),
    onSuccess: (_data, { id }) => invalidateDetail(id),
  });

  const publishMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    string
  >({
    mutationFn: publishAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const unpublishMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    string
  >({
    mutationFn: unpublishAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const regenerateShareTokenMutation = useMutation<
    { shareToken: string },
    ApiError,
    string
  >({
    mutationFn: regenerateShareToken,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const archiveMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    string
  >({
    mutationFn: archiveAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  const unarchiveMutation = useMutation<
    AppointmentTypeWithRelations,
    ApiError,
    string
  >({
    mutationFn: unarchiveAppointmentType,
    onSuccess: (_data, id) => invalidateDetail(id),
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    setEntitiesMutation,
    setScheduleMutation,
    setQuestionsMutation,
    publishMutation,
    unpublishMutation,
    regenerateShareTokenMutation,
    archiveMutation,
    unarchiveMutation,
  };
}
