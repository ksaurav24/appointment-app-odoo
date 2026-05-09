"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import {
  useBookablePersonMutations,
  useBookablePersons,
} from "@/hooks/useBookablePersons";
import type { BookablePerson } from "@/types";

import { PersonFormDialog } from "./person-form-dialog";

export function PersonsTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookablePerson | null>(null);
  const [q, setQ] = useState("");
  const [designation, setDesignation] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");

  const query = useMemo(
    () => ({
      includeInactive,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(designation ? { designation } : {}),
      ...(appointmentTypeId ? { appointmentTypeId } : {}),
    }),
    [includeInactive, q, designation, appointmentTypeId],
  );
  const list = useBookablePersons(query);
  const types = useAppointmentTypes();
  const { deleteMutation } = useBookablePersonMutations();

  const designations = useMemo(() => {
    const raw = (list.data ?? [])
      .map((person) => person.designation?.trim() ?? "")
      .filter((d) => d.length > 0);
    return Array.from(new Set(raw)).sort((a, b) => a.localeCompare(b));
  }, [list.data]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: BookablePerson) => {
    setEditing(p);
    setDialogOpen(true);
  };
  const handleDelete = (p: BookablePerson) => {
    if (!confirm(`Deactivate/remove ${p.name}?`)) return;
    deleteMutation.mutate(p.id, {
      onSuccess: (res) => {
        toast.success(
          res.deleted === "soft"
            ? "Staff member deactivated for future bookings."
            : "Staff member deleted.",
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
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr,1fr,1fr,auto,auto]">
        <Input
          placeholder="Search name, email, phone, designation"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Input
          list="staff-designations"
          placeholder="Filter by designation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        />
        <datalist id="staff-designations">
          {designations.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>

        <select
          value={appointmentTypeId}
          onChange={(e) => setAppointmentTypeId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All appointment types</option>
          {(types.data ?? []).map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
          Show inactive
        </label>
        <Button onClick={openCreate}>Add staff</Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load staff"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Contact email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned appointment types</TableHead>
              <TableHead>Status</TableHead>
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
              list.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.designation ?? "—"}
                  </TableCell>
                  <TableCell>{p.contactEmail ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.assignedAppointmentTypes.length > 0 ? (
                        p.assignedAppointmentTypes.map((type) => (
                          <Badge key={type.id} variant="secondary">
                            {type.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "outline"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                        ⋯
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(p)}
                        >
                          Deactivate / Delete
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
                  No staff members yet — add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PersonFormDialog open={dialogOpen} onOpenChange={setDialogOpen} person={editing} />
    </div>
  );
}
