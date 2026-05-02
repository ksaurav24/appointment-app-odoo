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
  listBookableResources,
  updateBookableResource,
} from "@/lib/api";
import type {
  BookableResource,
  CreateBookableResourceInput,
  DeleteResult,
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

export function useBookableResourceMutations() {
  const qc = useQueryClient();
  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: [KEY, "list"] });

  const createMutation = useMutation<
    BookableResource,
    ApiError,
    CreateBookableResourceInput
  >({
    mutationFn: createBookableResource,
    onSuccess: invalidateList,
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
    },
  });

  const deleteMutation = useMutation<DeleteResult, ApiError, string>({
    mutationFn: deleteBookableResource,
    onSuccess: invalidateList,
  });

  return { createMutation, updateMutation, deleteMutation };
}
