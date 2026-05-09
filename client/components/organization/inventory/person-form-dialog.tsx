"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useAppointmentTypes } from "@/hooks/useAppointmentTypes";
import { useBookablePersonMutations } from "@/hooks/useBookablePersons";
import type {
  BookablePerson,
  StaffAvailabilityOverride,
  StaffDateException,
  StaffWeeklyRule,
} from "@/types";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: BookablePerson | null;
};

export function PersonFormDialog({ open, onOpenChange, person }: Props) {
  const isEdit = !!person;
  const { createMutation, updateMutation } = useBookablePersonMutations();
  const types = useAppointmentTypes();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [appointmentTypeIds, setAppointmentTypeIds] = useState<string[]>([]);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<
    StaffAvailabilityOverride[]
  >([]);

  const appointmentTypeOptions = useMemo(
    () => (types.data ?? []).filter((t) => t.entityType === "PERSON"),
    [types.data],
  );

  useEffect(() => {
    if (!open) return;
    setName(person?.name ?? "");
    setContactEmail(person?.contactEmail ?? "");
    setPhone(person?.phone ?? "");
    setDesignation(person?.designation ?? "");
    setIsActive(person?.isActive ?? true);
    setAppointmentTypeIds(
      person?.assignedAppointmentTypes.map((type) => type.id) ?? [],
    );
    setAvailabilityOverrides(person?.availabilityOverrides ?? []);
  }, [open, person]);

  const toggleAppointmentType = (id: string) => {
    setAppointmentTypeIds((prev) => {
      if (prev.includes(id)) {
        setAvailabilityOverrides((existing) =>
          existing.filter((override) => override.appointmentTypeId !== id),
        );
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const setOverrideEnabled = (appointmentTypeId: string, enabled: boolean) => {
    setAvailabilityOverrides((prev) => {
      if (enabled) {
        if (prev.some((item) => item.appointmentTypeId === appointmentTypeId)) {
          return prev;
        }
        return [
          ...prev,
          {
            appointmentTypeId,
            timezone: "Asia/Kolkata",
            weeklyRules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
            dateExceptions: [],
          },
        ];
      }
      return prev.filter((item) => item.appointmentTypeId !== appointmentTypeId);
    });
  };

  const updateWeeklyRule = (
    appointmentTypeId: string,
    index: number,
    next: StaffWeeklyRule,
  ) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) => {
        if (item.appointmentTypeId !== appointmentTypeId) return item;
        const rules = [...item.weeklyRules];
        rules[index] = next;
        return { ...item, weeklyRules: rules };
      }),
    );
  };

  const addWeeklyRule = (appointmentTypeId: string) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) =>
        item.appointmentTypeId === appointmentTypeId
          ? {
              ...item,
              weeklyRules: [
                ...item.weeklyRules,
                { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
              ],
            }
          : item,
      ),
    );
  };

  const removeWeeklyRule = (appointmentTypeId: string, index: number) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) => {
        if (item.appointmentTypeId !== appointmentTypeId) return item;
        const rules = item.weeklyRules.filter((_, i) => i !== index);
        return {
          ...item,
          weeklyRules:
            rules.length > 0
              ? rules
              : [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
        };
      }),
    );
  };

  const addException = (appointmentTypeId: string) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) =>
        item.appointmentTypeId === appointmentTypeId
          ? {
              ...item,
              dateExceptions: [...(item.dateExceptions ?? []), { date: "" }],
            }
          : item,
      ),
    );
  };

  const updateException = (
    appointmentTypeId: string,
    index: number,
    next: StaffDateException,
  ) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) => {
        if (item.appointmentTypeId !== appointmentTypeId) return item;
        const exceptions = [...(item.dateExceptions ?? [])];
        exceptions[index] = next;
        return { ...item, dateExceptions: exceptions };
      }),
    );
  };

  const removeException = (appointmentTypeId: string, index: number) => {
    setAvailabilityOverrides((prev) =>
      prev.map((item) =>
        item.appointmentTypeId === appointmentTypeId
          ? {
              ...item,
              dateExceptions: (item.dateExceptions ?? []).filter(
                (_, i) => i !== index,
              ),
            }
          : item,
      ),
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (designation.trim().length === 0) {
      toast.error("Designation is required.");
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      toast.error("Phone must be exactly 10 digits.");
      return;
    }

    const body = {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      phone: phone.trim(),
      designation: designation.trim(),
      appointmentTypeIds,
      availabilityOverrides: availabilityOverrides
        .filter((override) =>
          appointmentTypeIds.includes(override.appointmentTypeId),
        )
        .map((override) => ({
          ...override,
          dateExceptions: (override.dateExceptions ?? []).filter((exception) =>
            exception.date.trim(),
          ),
        })),
      isActive,
    };
    const onError = (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Something went wrong";
      toast.error(msg);
    };
    if (isEdit && person) {
      updateMutation.mutate(
        { id: person.id, body },
        {
          onSuccess: () => {
            toast.success("Staff updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Staff added");
          onOpenChange(false);
        },
        onError,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit staff" : "Add staff"}</DialogTitle>
            <DialogDescription>
              Staff receive booking notifications and can use per-service schedule
              overrides.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="person-name">Full name</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-designation">Designation</Label>
              <Input
                id="person-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-email">Contact email</Label>
              <Input
                id="person-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={254}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-phone">Phone (10 digits)</Label>
              <Input
                id="person-phone"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                required
                inputMode="numeric"
                pattern="\d{10}"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign appointment types</Label>
            <div className="rounded-md border p-3">
              {appointmentTypeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No person-based appointment types yet. You can save this staff
                  now and assign types later.
                </p>
              ) : (
                <div className="space-y-2">
                  {appointmentTypeOptions.map((type) => (
                    <label
                      key={type.id}
                      className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={appointmentTypeIds.includes(type.id)}
                        onCheckedChange={() => toggleAppointmentType(type.id)}
                      />
                      <span className="text-sm">{type.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {appointmentTypeIds.map((appointmentTypeId) => {
            const type = appointmentTypeOptions.find((t) => t.id === appointmentTypeId);
            const override = availabilityOverrides.find(
              (item) => item.appointmentTypeId === appointmentTypeId,
            );
            return (
              <div key={appointmentTypeId} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {type?.name ?? "Appointment type"} override
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={!!override}
                      onCheckedChange={(checked) =>
                        setOverrideEnabled(appointmentTypeId, checked)
                      }
                    />
                    Override org schedule
                  </label>
                </div>

                {override ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Timezone</Label>
                      <Input
                        value={override.timezone ?? ""}
                        onChange={(e) =>
                          setAvailabilityOverrides((prev) =>
                            prev.map((item) =>
                              item.appointmentTypeId === appointmentTypeId
                                ? { ...item, timezone: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder="Asia/Kolkata"
                        maxLength={64}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Working days and hours</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addWeeklyRule(appointmentTypeId)}
                        >
                          Add hours
                        </Button>
                      </div>
                      {override.weeklyRules.map((rule, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-4">
                          <select
                            value={String(rule.dayOfWeek)}
                            onChange={(e) =>
                              updateWeeklyRule(appointmentTypeId, index, {
                                ...rule,
                                dayOfWeek: Number(e.target.value),
                              })
                            }
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {DAY_OPTIONS.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="time"
                            value={rule.startTime}
                            onChange={(e) =>
                              updateWeeklyRule(appointmentTypeId, index, {
                                ...rule,
                                startTime: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="time"
                            value={rule.endTime}
                            onChange={(e) =>
                              updateWeeklyRule(appointmentTypeId, index, {
                                ...rule,
                                endTime: e.target.value,
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeWeeklyRule(appointmentTypeId, index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Date-specific exceptions</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addException(appointmentTypeId)}
                        >
                          Add exception
                        </Button>
                      </div>
                      {(override.dateExceptions ?? []).map((exception, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-4">
                          <Input
                            type="date"
                            value={exception.date}
                            onChange={(e) =>
                              updateException(appointmentTypeId, index, {
                                ...exception,
                                date: e.target.value,
                              })
                            }
                          />
                          <select
                            value={exception.reason ?? ""}
                            onChange={(e) =>
                              updateException(appointmentTypeId, index, {
                                ...exception,
                                reason: e.target.value || undefined,
                              })
                            }
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Reason</option>
                            <option value="VACATION">Vacation</option>
                            <option value="SICK_LEAVE">Sick leave</option>
                            <option value="TRAINING">Training</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <div className="sm:col-span-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                removeException(appointmentTypeId, index)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="person-active" className="text-sm font-normal">
              Active staff member
            </Label>
            <Switch
              id="person-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save staff" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
