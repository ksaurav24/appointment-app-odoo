"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookablePersons } from "@/hooks/useBookablePersons";
import { useBookableResources } from "@/hooks/useBookableResources";
import type { EntityType } from "@/types";

type Props = {
  entityType: EntityType;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function EntityPicker({ entityType, selectedIds, onChange }: Props) {
  const personsQuery = useBookablePersons({});
  const resourcesQuery = useBookableResources(false);
  const query = entityType === "PERSON" ? personsQuery : resourcesQuery;
  const items = query.data ?? [];

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (query.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    const addEntityHref =
      entityType === "PERSON" ? "/organization/staff" : "/organization/resources";
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No {entityType === "PERSON" ? "persons" : "resources"} yet. You can
        still save this as draft and assign later.{" "}
        <Link href={addEntityHref} className="text-primary hover:underline">
          Add some →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border p-2">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-accent"
        >
          <Checkbox
            checked={selectedIds.includes(item.id)}
            onCheckedChange={() => toggle(item.id)}
          />
          <span className="flex-1 text-sm">{item.name}</span>
          {!item.isActive ? (
            <Badge variant="outline">Inactive</Badge>
          ) : null}
        </label>
      ))}
    </div>
  );
}
