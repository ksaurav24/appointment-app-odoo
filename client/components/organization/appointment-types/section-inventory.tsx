"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import { EntityPicker } from "@/components/organization/appointment-types/entity-picker";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

function getEntityName(entity: AppointmentTypeWithRelations["entities"][number]) {
  return entity.bookablePerson?.name ?? entity.bookableResource?.name ?? "—";
}

function getEntityId(entity: AppointmentTypeWithRelations["entities"][number]) {
  return entity.bookablePersonId ?? entity.bookableResourceId;
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  AUTO: "Server picks an entity automatically",
  MANUAL: "Customer picks one of these at checkout",
};

export function SectionInventory({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { setEntitiesMutation } = useAppointmentTypeMutations();

  const initialSelected = type.entities
    .map(getEntityId)
    .filter((x): x is string => !!x);

  const [selected, setSelected] = useState<string[]>(initialSelected);

  const handleEdit = () => {
    setSelected(
      type.entities.map(getEntityId).filter((x): x is string => !!x),
    );
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEntitiesMutation.mutate(
      { id: type.id, body: { entityIds: selected } },
      {
        onSuccess: () => {
          toast.success("Saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Failed to save";
          toast.error(msg);
        },
      },
    );
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Staff / Resource assignment</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Entity type</dt>
            <dd>
              <Badge variant="outline">{type.entityType}</Badge>
            </dd>
            <dt className="text-muted-foreground">Assignment</dt>
            <dd>{ASSIGNMENT_LABELS[type.assignmentMode] ?? type.assignmentMode}</dd>
          </dl>
          {type.entities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entities assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {type.entities.map((e) => (
                <Badge key={e.id} variant="secondary">
                  {getEntityName(e)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff / Resource assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Entity type</dt>
            <dd>
              <Badge variant="outline">{type.entityType}</Badge>
            </dd>
            <dt className="text-muted-foreground">Assignment</dt>
            <dd>{ASSIGNMENT_LABELS[type.assignmentMode] ?? type.assignmentMode}</dd>
          </dl>

          <EntityPicker
            entityType={type.entityType}
            selectedIds={selected}
            onChange={setSelected}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={setEntitiesMutation.isPending}
            >
              {setEntitiesMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
