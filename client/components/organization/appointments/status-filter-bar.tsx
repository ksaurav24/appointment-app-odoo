"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import type { AppointmentStatus } from "@/types";

const STATUSES: { value: AppointmentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

export function StatusFilterBar() {
  const router = useRouter();
  const search = useSearchParams();
  const status = search.get("status") ?? "ALL";
  const appointmentTypeId = search.get("appointmentTypeId") ?? "";
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  const upcomingOnly = search.get("upcomingOnly") === "true";

  const types = useAppointmentTypes();

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "status" && v === "ALL")) {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    next.delete("skip");
    router.push(`?${next.toString()}`);
  };

  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            variant={status === s.value ? "default" : "outline"}
            size="sm"
            onClick={() => update({ status: s.value })}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Appointment type</Label>
          <select
            value={appointmentTypeId}
            onChange={(e) =>
              update({ appointmentTypeId: e.target.value || null })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All types</option>
            {(types.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => update({ from: e.target.value || null })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => update({ to: e.target.value || null })}
          />
        </div>
        <div className="flex items-end justify-between rounded-md border px-3 py-2">
          <Label className="text-sm font-normal">Upcoming only</Label>
          <Switch
            checked={upcomingOnly}
            onCheckedChange={(v) =>
              update({ upcomingOnly: v ? "true" : null })
            }
          />
        </div>
      </div>
    </div>
  );
}
