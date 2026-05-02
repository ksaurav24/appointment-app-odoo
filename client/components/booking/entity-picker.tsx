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
              selected
                ? "bg-accent ring-2 ring-foreground"
                : "hover:bg-accent/40 hover:ring-foreground/40"
            }`}
            onClick={() => onChange(opt.id)}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChange(opt.id);
            }}
          >
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{opt.name}</p>
                {opt.subtitle ? (
                  <p className="text-xs text-muted-foreground">{opt.subtitle}</p>
                ) : null}
              </div>
              {selected ? (
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="size-3"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 10.5l3.5 3.5L15 7" />
                  </svg>
                </span>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
