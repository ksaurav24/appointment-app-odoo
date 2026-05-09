"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ApiError,
  createBookablePerson,
  deleteBookablePerson,
  getBookablePerson,
  listBookablePersons,
  updateBookablePerson,
} from "@/lib/api";
import type {
  BookablePerson,
  CreateBookablePersonInput,
  DeleteResult,
  ListBookablePersonsQuery,
  UpdateBookablePersonInput,
} from "@/types";

const KEY = "bookable-persons" as const;

export function useBookablePersons(query: ListBookablePersonsQuery = {}) {
  return useQuery<BookablePerson[]>({
    queryKey: [KEY, "list", query],
    queryFn: () => listBookablePersons(query),
    staleTime: 30_000,
  });
}

export function useBookablePerson(id: string | undefined) {
  return useQuery<BookablePerson>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getBookablePerson(id!),
    enabled: !!id,
  });
}

export function useBookablePersonMutations() {
  const qc = useQueryClient();
  const invalidateList = () =>
    qc.invalidateQueries({ queryKey: [KEY, "list"] });

  const createMutation = useMutation<
    BookablePerson,
    ApiError,
    CreateBookablePersonInput
  >({
    mutationFn: createBookablePerson,
    onSuccess: invalidateList,
  });

  const updateMutation = useMutation<
    BookablePerson,
    ApiError,
    { id: string; body: UpdateBookablePersonInput }
  >({
    mutationFn: ({ id, body }) => updateBookablePerson(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY, "list"] });
      qc.invalidateQueries({ queryKey: [KEY, "detail", id] });
    },
  });

  const deleteMutation = useMutation<DeleteResult, ApiError, string>({
    mutationFn: deleteBookablePerson,
    onSuccess: invalidateList,
  });

  return { createMutation, updateMutation, deleteMutation };
}
