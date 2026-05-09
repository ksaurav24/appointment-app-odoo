"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  useAppointmentTypeMutations,
  useAppointmentTypes,
} from "@/hooks/useAppointmentTypes";
import type { AppointmentType, ListAppointmentTypesQuery } from "@/types";

function formatDuration(t: AppointmentType): string {
  if (t.durationMode === "FIXED") return `${t.durationMinutes ?? "?"} min`;
  return `${t.minDurationMins ?? "?"}–${t.maxDurationMins ?? "?"} min, step ${t.durationStepMins ?? "?"}`;
}

const FILTERS: {
  label: string;
  value: "all" | "published" | "drafts" | "archived";
}[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Drafts", value: "drafts" },
  { label: "Archived", value: "archived" },
];

export function TypesTable() {
  const [filter, setFilter] = useState<
    "all" | "published" | "drafts" | "archived"
  >("all");
  const query: ListAppointmentTypesQuery =
    filter === "all"
      ? {}
      : filter === "published"
        ? { visibility: "PUBLISHED" }
        : filter === "drafts"
          ? { visibility: "DRAFT" }
          : { visibility: "ARCHIVED" };

  const list = useAppointmentTypes(query);
  const { deleteMutation } = useAppointmentTypeMutations();

  const handleDelete = (t: AppointmentType) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    deleteMutation.mutate(t.id, {
      onSuccess: () => toast.success("Deleted"),
      onError: (err) => {
        const msg = err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button render={<Link href="/organization/appointment-types/new" />}>
          Create
        </Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load appointment types"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.data && list.data.length > 0 ? (
              list.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/organization/appointment-types/${t.id}`}
                      className="hover:underline"
                    >
                      {t.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.entityType}</Badge>
                  </TableCell>
                  <TableCell>{formatDuration(t)}</TableCell>
                  <TableCell>{t.scheduleType}</TableCell>
                  <TableCell>
                    <Badge variant={t.visibility === "PUBLISHED" ? "default" : "secondary"}>
                      {t.visibility.charAt(0) + t.visibility.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" />}
                      >
                        ⋯
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/organization/appointment-types/${t.id}`}
                            >
                              View
                            </Link>
                          }
                        />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(t)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No appointment types yet — create one to start taking
                  bookings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
