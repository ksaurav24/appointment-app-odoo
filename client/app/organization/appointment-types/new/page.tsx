"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EntityPicker } from "@/components/organization/appointment-types/entity-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type {
  AssignmentMode,
  CreateAppointmentTypeInput,
  DurationMode,
  EntityType,
  ScheduleType,
} from "@/types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function NewAppointmentTypePage() {
  const router = useRouter();
  const { createMutation } = useAppointmentTypeMutations();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("PERSON");
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("AUTO");
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [durationMode, setDurationMode] = useState<DurationMode>("FIXED");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [minDurationMins, setMinDurationMins] = useState(15);
  const [maxDurationMins, setMaxDurationMins] = useState(60);
  const [durationStepMins, setDurationStepMins] = useState(15);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (effectiveSlug && !SLUG_REGEX.test(effectiveSlug)) {
      toast.error("Slug must be lowercase letters, numbers, and dashes only.");
      return;
    }
    if (entityIds.length === 0) {
      toast.error("Select at least one entity.");
      return;
    }
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      toast.error("Times must be HH:MM (24h).");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time.");
      return;
    }
    if (durationMode === "VARIABLE" && minDurationMins >= maxDurationMins) {
      toast.error("Min duration must be less than max duration.");
      return;
    }

    const body: CreateAppointmentTypeInput = {
      name: name.trim(),
      slug: effectiveSlug || undefined,
      description: description.trim() || undefined,
      entityType,
      assignmentMode,
      entityIds,
      durationMode,
      ...(durationMode === "FIXED"
        ? { durationMinutes }
        : {
            minDurationMins,
            maxDurationMins,
            durationStepMins,
          }),
      scheduleType,
      scheduleRules: [
        {
          dayOfWeek,
          specificDate: null,
          startTime,
          endTime,
          isAvailable: true,
        },
      ],
    };

    createMutation.mutate(body, {
      onSuccess: (created) => {
        toast.success("Appointment type created");
        router.push(`/organization/appointment-types/${created.id}`);
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.messages[0] : "Create failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Create appointment type
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the basics. You&apos;ll add more schedule rules and questions
          on the next page.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="at-name">Name</Label>
              <Input
                id="at-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-slug">Slug</Label>
              <Input
                id="at-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder={slugify(name) || "consultation-30min"}
                pattern={SLUG_REGEX.source}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, dashes. Auto-filled from name.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="at-desc">Description</Label>
              <Textarea
                id="at-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Entity type</Label>
              <RadioGroup
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as EntityType);
                  setEntityIds([]);
                }}
                className="mt-2 flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="PERSON" /> Person
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="RESOURCE" /> Resource
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>Assignment</Label>
              <RadioGroup
                value={assignmentMode}
                onValueChange={(v) => setAssignmentMode(v as AssignmentMode)}
                className="mt-2 flex gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="AUTO" /> Auto-assign
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="MANUAL" /> Customer chooses
                </label>
              </RadioGroup>
            </div>
            <div>
              <Label>
                Available {entityType === "PERSON" ? "persons" : "resources"}
              </Label>
              <div className="mt-2">
                <EntityPicker
                  entityType={entityType}
                  selectedIds={entityIds}
                  onChange={setEntityIds}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={durationMode}
              onValueChange={(v) => setDurationMode(v as DurationMode)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="FIXED" /> Fixed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="VARIABLE" /> Variable
              </label>
            </RadioGroup>
            {durationMode === "FIXED" ? (
              <div className="space-y-1">
                <Label htmlFor="at-dur">Duration (minutes)</Label>
                <Input
                  id="at-dur"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Math.max(1, Number(e.target.value) || 1))
                  }
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="at-min">Min</Label>
                  <Input
                    id="at-min"
                    type="number"
                    min={1}
                    value={minDurationMins}
                    onChange={(e) =>
                      setMinDurationMins(Math.max(1, Number(e.target.value) || 1))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-max">Max</Label>
                  <Input
                    id="at-max"
                    type="number"
                    min={1}
                    value={maxDurationMins}
                    onChange={(e) =>
                      setMaxDurationMins(Math.max(1, Number(e.target.value) || 1))
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-step">Step</Label>
                  <Input
                    id="at-step"
                    type="number"
                    min={1}
                    value={durationStepMins}
                    onChange={(e) =>
                      setDurationStepMins(Math.max(1, Number(e.target.value) || 1))
                    }
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initial schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="WEEKLY" /> Weekly recurring
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="FLEXIBLE" /> Flexible
              </label>
            </RadioGroup>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="at-day">Day of week</Label>
                <select
                  id="at-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="at-start">Start</Label>
                <Input
                  id="at-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="at-end">End</Label>
                <Input
                  id="at-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can add more rules after creating the type.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
