"use client";

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
import { Switch } from "@/components/ui/switch";
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
  useBookableResourceMutations,
  useBookableResources,
} from "@/hooks/useBookableResources";
import type { BookableResource } from "@/types";

import { ResourceFormDialog } from "./resource-form-dialog";

export function ResourcesTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookableResource | null>(null);
  const list = useBookableResources(includeInactive);
  const { deleteMutation } = useBookableResourceMutations();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (r: BookableResource) => {
    setEditing(r);
    setDialogOpen(true);
  };
  const handleDelete = (r: BookableResource) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    deleteMutation.mutate(r.id, {
      onSuccess: (res) => {
        toast.success(
          res.deleted === "soft"
            ? "Marked inactive (referenced by appointments)"
            : "Deleted",
        );
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          Show inactive
        </label>
        <Button onClick={openCreate}>Add resource</Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load resources"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.data && list.data.length > 0 ? (
              list.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.resourceType ?? "—"}
                  </TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "outline"}>
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" />}
                      >
                        ⋯
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(r)}
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
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No bookable resources yet — add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editing}
      />
    </div>
  );
}
