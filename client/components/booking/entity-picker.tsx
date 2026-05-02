"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentTypeWithRelations } from "@/types";

type EntityPickerProps = {
  type: AppointmentTypeWithRelations;
  value: string | undefined;
  onChange: (entityId: string) => void;
};

type EntityOption = {
  id: string;
  name: string;
  subtitle?: string;
};

function entityOptions(type: AppointmentTypeWithRelations): EntityOption[] {
  return type.entities.map((e) => {
    if (e.bookablePerson) {
      return {
        id: e.bookablePerson.id,
        name: e.bookablePerson.name,
        subtitle: e.bookablePerson.designation ?? undefined,
      };
    }
    if (e.bookableResource) {
      return {
        id: e.bookableResource.id,
        name: e.bookableResource.name,
        subtitle: e.bookableResource.location ?? undefined,
      };
    }
    return { id: e.id, name: "Unknown" };
  });
}

export function EntityPicker({ type, value, onChange }: EntityPickerProps) {
  const options = entityOptions(type);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <Card
            key={opt.id}
            className={`cursor-pointer transition-colors ${
              selected ? "border-foreground" : "hover:border-foreground/40"
            }`}
            onClick={() => onChange(opt.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChange(opt.id);
            }}
          >
            <CardContent className="p-4">
              <p className="font-medium">{opt.name}</p>
              {opt.subtitle ? (
                <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
