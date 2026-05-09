"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ApiError,
  createBookableResource,
  deleteBookableResource,
  getBookableResource,
  getResourceUtilizationReport,
  listBookableResources,
  updateBookableResource,
} from "@/lib/api";
import type {
  BookableResource,
  CreateBookableResourceInput,
  DeleteResult,
  ResourceUtilizationReport,
  UpdateBookableResourceInput,
} from "@/types";

const KEY = "bookable-resources" as const;

export function useBookableResources(includeInactive = false) {
  return useQuery<BookableResource[]>({
    queryKey: [KEY, "list", { includeInactive }],
    queryFn: () => listBookableResources(includeInactive),
    staleTime: 30_000,
  });
}

export function useBookableResource(id: string | undefined) {
  return useQuery<BookableResource>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getBookableResource(id!),
    enabled: !!id,
  });
}

export function useResourceUtilizationReport() {
  return useQuery<ResourceUtilizationReport>({
    queryKey: [KEY, "utilization-report"],
    queryFn: getResourceUtilizationReport,
    staleTime: 60_000,
  });
}

export function useBookableResourceMutations() {
  const qc = useQueryClient();
  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: [KEY, "list"] });
  const invalidateReport = () =>
    qc.invalidateQueries({ queryKey: [KEY, "utilization-report"] });

  const createMutation = useMutation<
    BookableResource,
    ApiError,
    CreateBookableResourceInput
  >({
    mutationFn: createBookableResource,
    onSuccess: () => {
      invalidateList();
      invalidateReport();
    },
  });

  const updateMutation = useMutation<
    BookableResource,
    ApiError,
    { id: string; body: UpdateBookableResourceInput }
  >({
    mutationFn: ({ id, body }) => updateBookableResource(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "list"] });
      qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
      invalidateReport();
    },
  });

  const deleteMutation = useMutation<DeleteResult, ApiError, string>({
    mutationFn: deleteBookableResource,
    onSuccess: () => {
      invalidateList();
      invalidateReport();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
