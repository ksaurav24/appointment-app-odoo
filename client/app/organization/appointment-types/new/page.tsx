"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { BookingQuestionRow } from "@/components/organization/appointment-types/booking-question-row";
import { EntityPicker } from "@/components/organization/appointment-types/entity-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type {
  AssignmentMode,
  BookingQuestionInput,
  CreateAppointmentTypeInput,
  DurationMode,
  EntityType,
  QuestionType,
  ScheduleRuleInput,
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
  { value: 0, short: "Sun", label: "Sunday" },
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
];

type DayHours = { startTime: string; endTime: string };

const DEFAULT_HOURS: DayHours = { startTime: "09:00", endTime: "17:00" };

const WEEKDAYS_PRESET: Record<number, DayHours> = {
  1: { ...DEFAULT_HOURS },
  2: { ...DEFAULT_HOURS },
  3: { ...DEFAULT_HOURS },
  4: { ...DEFAULT_HOURS },
  5: { ...DEFAULT_HOURS },
};

function MinutesInput({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  required?: boolean;
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        required={required}
      />
      <InputGroupAddon align="inline-end">min</InputGroupAddon>
    </InputGroup>
  );
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export default function NewAppointmentTypePage() {
  const router = useRouter();
  const { createMutation, publishMutation } = useAppointmentTypeMutations();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("PERSON");
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("AUTO");
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [entityIds, setEntityIds] = useState<string[]>([]);
  const [durationMode, setDurationMode] = useState<DurationMode>("FIXED");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [minDurationMins, setMinDurationMins] = useState(15);
  const [maxDurationMins, setMaxDurationMins] = useState(60);
  const [durationStepMins, setDurationStepMins] = useState(15);
  
  // Payment
  const [price, setPrice] = useState("");
  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState(false);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState("");

  // Policy
  const [manualConfirmation, setManualConfirmation] = useState(false);
  const [cancellationAllowed, setCancellationAllowed] = useState(true);
  const [cancellationWindowHours, setCancellationWindowHours] = useState("");
  const [rescheduleAllowed, setRescheduleAllowed] = useState(true);
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState("");
  const [maxReschedulesAllowed, setMaxReschedulesAllowed] = useState("");
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState("1");
  const [manageCapacity, setManageCapacity] = useState(false);

  // Schedule extra
  const [advanceBookingWindowDays, setAdvanceBookingWindowDays] = useState("30");
  const [minimumNoticePeriodHours, setMinimumNoticePeriodHours] = useState("0");

  // Notifications
  const [reminderIntervals, setReminderIntervals] = useState<number[]>([]);
  const [customReminder, setCustomReminder] = useState("");

  // Questions
  const [bookingQuestions, setBookingQuestions] = useState<BookingQuestionInput[]>([]);

  const [scheduleType, setScheduleType] = useState<ScheduleType>("WEEKLY");

  const [weekly, setWeekly] = useState<Record<number, DayHours>>({
    ...WEEKDAYS_PRESET,
  });

  const [flexDate, setFlexDate] = useState("");
  const [flexStart, setFlexStart] = useState("09:00");
  const [flexEnd, setFlexEnd] = useState("17:00");

  const activeDays = Object.keys(weekly)
    .map(Number)
    .sort((a, b) => a - b);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const toggleDay = (day: number) => {
    setWeekly((prev) => {
      const next = { ...prev };
      if (day in next) {
        delete next[day];
      } else {
        const firstActive = Object.keys(prev)
          .map(Number)
          .sort((a, b) => a - b)[0];
        next[day] =
          firstActive != null ? { ...prev[firstActive] } : { ...DEFAULT_HOURS };
      }
      return next;
    });
  };

  const setDayHours = (day: number, patch: Partial<DayHours>) => {
    setWeekly((prev) => ({
      ...prev,
      [day]: { ...prev[day], ...patch },
    }));
  };

  const applyToAll = () => {
    if (activeDays.length < 2) return;
    const ref = weekly[activeDays[0]];
    setWeekly((prev) => {
      const next: Record<number, DayHours> = {};
      for (const d of Object.keys(prev).map(Number)) {
        next[d] = { ...ref };
      }
      return next;
    });
    toast.success("Hours applied to all active days");
  };

  const setPreset = (preset: "weekdays" | "all" | "clear") => {
    if (preset === "weekdays") {
      setWeekly({ ...WEEKDAYS_PRESET });
    } else if (preset === "all") {
      const all: Record<number, DayHours> = {};
      for (const d of DAYS) all[d.value] = { ...DEFAULT_HOURS };
      setWeekly(all);
    } else {
      setWeekly({});
    }
  };

  // --- Notifications Handlers ---
  const addInterval = (minutes: number) => {
    if (minutes < 1) {
      toast.error("Interval must be at least 1 minute");
      return;
    }
    if (reminderIntervals.includes(minutes)) {
      toast.error("This interval is already added");
      return;
    }
    setReminderIntervals((prev) => [...prev, minutes].sort((a, b) => b - a));
  };

  const removeInterval = (minutes: number) => {
    setReminderIntervals((prev) => prev.filter((m) => m !== minutes));
  };

  const addCustomReminder = () => {
    const val = parseInt(customReminder, 10);
    if (isNaN(val) || val < 1) {
      toast.error("Enter a positive number of minutes");
      return;
    }
    addInterval(val);
    setCustomReminder("");
  };

  // --- Questions Handlers ---
  const addQuestion = () => {
    setBookingQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        questionType: "TEXT",
        isRequired: false,
        options: undefined,
      },
    ]);
  };

  const updateQuestion = (idx: number, updated: BookingQuestionInput) => {
    setBookingQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  };

  const deleteQuestion = (idx: number) => {
    setBookingQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: "UP" | "DOWN") => {
    setBookingQuestions((prev) => {
      const copy = [...prev];
      if (dir === "UP" && idx > 0) {
        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      } else if (dir === "DOWN" && idx < copy.length - 1) {
        [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
      }
      return copy;
    });
  };

  const buildBody = (): CreateAppointmentTypeInput | { error: string } => {
    if (effectiveSlug && !SLUG_REGEX.test(effectiveSlug)) {
      return {
        error: "Slug must be lowercase letters, numbers, and dashes only.",
      };
    }
    if (durationMode === "VARIABLE" && minDurationMins >= maxDurationMins) {
      return { error: "Min duration must be less than max duration." };
    }

    const priceNum = price.trim() === "" ? undefined : Number(price);
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      return { error: "Base price must be a non-negative number" };
    }
    if (advancePaymentEnabled) {
      const amt = Number(advancePaymentAmount);
      if (isNaN(amt) || amt <= 0) {
        return { error: "Advance payment amount must be greater than 0" };
      }
    }

    for (let i = 0; i < bookingQuestions.length; i++) {
      const q = bookingQuestions[i];
      if (!q.questionText.trim()) return { error: `Question ${i + 1}: text is required` };
      if (q.questionType === "SINGLE_CHOICE" || q.questionType === "MULTIPLE_CHOICE") {
        if (!q.options || q.options.length === 0) return { error: `Question ${i + 1}: at least one option required` };
      }
    }

    let scheduleRules: ScheduleRuleInput[] = [];

    if (scheduleType === "WEEKLY") {
      if (activeDays.length === 0) {
        return {
          error: "Select at least one day for the weekly schedule.",
        };
      }
      for (const d of activeDays) {
        const { startTime, endTime } = weekly[d];
        if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
          return { error: "All times must be HH:MM (24h)." };
        }
        if (startTime >= endTime) {
          const dayName = DAYS.find((dd) => dd.value === d)?.label;
          return { error: `End time must be after start time on ${dayName}.` };
        }
        scheduleRules.push({
          dayOfWeek: d,
          specificDate: null,
          startTime,
          endTime,
          isAvailable: true,
        });
      }
    } else {
      if (!flexDate) {
        return { error: "Pick a date for the initial flexible schedule rule." };
      }
      if (!TIME_REGEX.test(flexStart) || !TIME_REGEX.test(flexEnd)) {
        return { error: "Times must be HH:MM (24h)." };
      }
      if (flexStart >= flexEnd) {
        return { error: "End time must be after start time." };
      }
      scheduleRules = [
        {
          dayOfWeek: null,
          specificDate: flexDate,
          startTime: flexStart,
          endTime: flexEnd,
          isAvailable: true,
        },
      ];
    }

    return {
      name: name.trim(),
      slug: effectiveSlug || undefined,
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      entityType,
      assignmentMode,
      bufferMinutes,
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
      scheduleRules,
      price: priceNum,
      advancePaymentEnabled,
      advancePaymentAmount: advancePaymentEnabled ? Number(advancePaymentAmount) : undefined,
      manualConfirmation,
      cancellationAllowed,
      cancellationWindowHours: cancellationWindowHours ? Number(cancellationWindowHours) : undefined,
      rescheduleAllowed,
      rescheduleWindowHours: rescheduleWindowHours ? Number(rescheduleWindowHours) : undefined,
      maxReschedulesAllowed: maxReschedulesAllowed ? Number(maxReschedulesAllowed) : undefined,
      maxBookingsPerSlot: Number(maxBookingsPerSlot) || 1,
      manageCapacity,
      advanceBookingWindowDays: advanceBookingWindowDays ? Number(advanceBookingWindowDays) : undefined,
      minimumNoticePeriodHours: minimumNoticePeriodHours ? Number(minimumNoticePeriodHours) : undefined,
      reminderIntervals,
      bookingQuestions: bookingQuestions.map((q, idx) => ({ ...q, displayOrder: idx })),
    };
  };

  const submit = (
    e: React.SyntheticEvent,
    intent: "draft" | "publish",
  ) => {
    e.preventDefault();
    const result = buildBody();
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    createMutation.mutate(result, {
      onSuccess: (created) => {
        const detailUrl = `/organization/appointment-types/${created.id}`;
        if (intent === "publish") {
          publishMutation.mutate(created.id, {
            onSuccess: () => {
              toast.success("Created and published");
              router.push(detailUrl);
            },
            onError: (err) => {
              const msg =
                err instanceof ApiError
                  ? err.messages[0]
                  : "Failed to publish";
              toast.warning(`Created as draft. ${msg}`);
              router.push(detailUrl);
            },
          });
        } else {
          toast.success("Appointment type created");
          router.push(detailUrl);
        }
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Create failed";
        toast.error(msg);
      },
    });
  };

  const isPending = createMutation.isPending || publishMutation.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Create appointment type
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the basics. You can refine schedule rules and add questions on
          the next page.
        </p>
      </header>

      <form
        onSubmit={(e) => submit(e, "draft")}
        className="space-y-4"
      >
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
              <Label htmlFor="at-category">Category</Label>
              <Input
                id="at-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
                maxLength={120}
              />
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
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="basics-manual-confirm"
                checked={manualConfirmation}
                onCheckedChange={setManualConfirmation}
              />
              <Label htmlFor="basics-manual-confirm">
                Require manual confirmation
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff / Resource assignment</CardTitle>
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
            <div className="space-y-1">
              <Label htmlFor="at-buffer">Buffer between bookings</Label>
              <InputGroup>
                <InputGroupInput
                  id="at-buffer"
                  type="number"
                  min={0}
                  step={1}
                  value={bufferMinutes}
                  onChange={(e) =>
                    setBufferMinutes(Math.max(0, Number(e.target.value) || 0))
                  }
                />
                <InputGroupAddon align="inline-end">min</InputGroupAddon>
              </InputGroup>
            </div>
            <div>
              <Label>
                Available {entityType === "PERSON" ? "persons" : "resources"}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Optional for now — you can create this as draft and assign staff
                or resources later.
              </p>
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
                <Label htmlFor="at-dur">Duration</Label>
                <MinutesInput
                  id="at-dur"
                  value={durationMinutes}
                  onChange={setDurationMinutes}
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="at-min">Min</Label>
                  <MinutesInput
                    id="at-min"
                    value={minDurationMins}
                    onChange={setMinDurationMins}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-max">Max</Label>
                  <MinutesInput
                    id="at-max"
                    value={maxDurationMins}
                    onChange={setMaxDurationMins}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="at-step">
                    Step
                    <span className="ml-1 font-normal text-muted-foreground">
                      (increment)
                    </span>
                  </Label>
                  <MinutesInput
                    id="at-step"
                    value={durationStepMins}
                    onChange={setDurationStepMins}
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
          <CardContent className="space-y-4">
            <RadioGroup
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="WEEKLY" /> Weekly recurring
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="FLEXIBLE" /> Specific dates
              </label>
            </RadioGroup>

            {scheduleType === "WEEKLY" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Active days
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => {
                      const active = d.value in weekly;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleDay(d.value)}
                          className={cn(
                            "h-8 min-w-12 rounded-full border px-3 text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-input/30 text-muted-foreground hover:bg-input/50",
                          )}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreset("weekdays")}
                      className="text-primary hover:underline"
                    >
                      Weekdays
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setPreset("all")}
                      className="text-primary hover:underline"
                    >
                      All days
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => setPreset("clear")}
                      className="text-primary hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {activeDays.length === 0 ? (
                  <p className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                    Pick at least one day above to set hours.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Hours per day
                      </Label>
                      {activeDays.length > 1 ? (
                        <button
                          type="button"
                          onClick={applyToAll}
                          className="text-xs text-primary hover:underline"
                        >
                          Apply first day&apos;s hours to all
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {activeDays.map((d) => {
                        const dayMeta = DAYS.find((x) => x.value === d)!;
                        const hrs = weekly[d];
                        return (
                          <div
                            key={d}
                            className="grid grid-cols-[5rem_1fr_auto_1fr] items-center gap-2"
                          >
                            <span className="text-sm font-medium">
                              {dayMeta.label}
                            </span>
                            <Input
                              type="time"
                              value={hrs.startTime}
                              onChange={(e) =>
                                setDayHours(d, { startTime: e.target.value })
                              }
                              required
                              aria-label={`${dayMeta.label} start time`}
                            />
                            <span className="text-xs text-muted-foreground">
                              to
                            </span>
                            <Input
                              type="time"
                              value={hrs.endTime}
                              onChange={(e) =>
                                setDayHours(d, { endTime: e.target.value })
                              }
                              required
                              aria-label={`${dayMeta.label} end time`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Add one date now. You can add more dates after creating.
                </p>
                <div className="grid grid-cols-[1fr_1fr_auto_1fr] items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="at-flex-date">Date</Label>
                    <Input
                      id="at-flex-date"
                      type="date"
                      value={flexDate}
                      onChange={(e) => setFlexDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="at-flex-start">Start</Label>
                    <Input
                      id="at-flex-start"
                      type="time"
                      value={flexStart}
                      onChange={(e) => setFlexStart(e.target.value)}
                      required
                    />
                  </div>
                  <span className="pb-2 text-xs text-muted-foreground">
                    to
                  </span>
                  <div className="space-y-1">
                    <Label htmlFor="at-flex-end">End</Label>
                    <Input
                      id="at-flex-end"
                      type="time"
                      value={flexEnd}
                      onChange={(e) => setFlexEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="pt-4 border-t mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-advance-window">
                  Advance booking window (days)
                </Label>
                <Input
                  id="schedule-advance-window"
                  type="number"
                  min={0}
                  step={1}
                  value={advanceBookingWindowDays}
                  onChange={(e) => setAdvanceBookingWindowDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Leave 0 for unlimited.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule-notice-period">
                  Minimum notice period (hours)
                </Label>
                <Input
                  id="schedule-notice-period"
                  type="number"
                  min={0}
                  step={1}
                  value={minimumNoticePeriodHours}
                  onChange={(e) => setMinimumNoticePeriodHours(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-price">Base price (₹)</Label>
              <Input
                id="payment-price"
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00 — leave blank to not display a price"
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to show the service as free.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  id="payment-advance-enabled"
                  checked={advancePaymentEnabled}
                  onCheckedChange={setAdvancePaymentEnabled}
                />
                <Label htmlFor="payment-advance-enabled">
                  Require advance payment at booking
                </Label>
              </div>
              {advancePaymentEnabled && (
                <div className="space-y-1.5 pl-9">
                  <Label htmlFor="payment-advance-amount">Amount (₹)</Label>
                  <Input
                    id="payment-advance-amount"
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={advancePaymentAmount}
                    onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="policy-cancel"
                  checked={cancellationAllowed}
                  onCheckedChange={setCancellationAllowed}
                />
                <Label htmlFor="policy-cancel">Cancellation allowed</Label>
              </div>
              {cancellationAllowed && (
                <div className="space-y-1.5 pl-9">
                  <Label htmlFor="policy-cancel-window">
                    Cancellation window (hours)
                  </Label>
                  <Input
                    id="policy-cancel-window"
                    type="number"
                    min={0}
                    step={1}
                    value={cancellationWindowHours}
                    onChange={(e) => setCancellationWindowHours(e.target.value)}
                    placeholder="e.g. 24"
                  />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="policy-reschedule"
                  checked={rescheduleAllowed}
                  onCheckedChange={setRescheduleAllowed}
                />
                <Label htmlFor="policy-reschedule">Rescheduling allowed</Label>
              </div>
              {rescheduleAllowed && (
                <div className="grid grid-cols-2 gap-4 pl-9">
                  <div className="space-y-1.5">
                    <Label htmlFor="policy-reschedule-window">
                      Window (hours)
                    </Label>
                    <Input
                      id="policy-reschedule-window"
                      type="number"
                      min={0}
                      step={1}
                      value={rescheduleWindowHours}
                      onChange={(e) => setRescheduleWindowHours(e.target.value)}
                      placeholder="e.g. 24"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="policy-reschedule-max">Max limit</Label>
                    <Input
                      id="policy-reschedule-max"
                      type="number"
                      min={1}
                      step={1}
                      value={maxReschedulesAllowed}
                      onChange={(e) => setMaxReschedulesAllowed(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="policy-manage-capacity"
                  checked={manageCapacity}
                  onCheckedChange={setManageCapacity}
                />
                <Label htmlFor="policy-manage-capacity">
                  Manage capacity
                </Label>
              </div>
              {manageCapacity && (
                <div className="space-y-1.5 pl-9">
                  <Label htmlFor="policy-max-bookings">Max bookings per slot</Label>
                  <Input
                    id="policy-max-bookings"
                    type="number"
                    min={1}
                    step={1}
                    value={maxBookingsPerSlot}
                    onChange={(e) => setMaxBookingsPerSlot(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">
                Reminder intervals (before appointment)
              </Label>
              {reminderIntervals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reminders configured.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {reminderIntervals.map((m) => (
                    <Badge
                      key={m}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {formatInterval(m)} before
                      <button
                        type="button"
                        onClick={() => removeInterval(m)}
                        className="ml-0.5 rounded hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-custom-minutes" className="text-xs uppercase tracking-wide text-muted-foreground">
                Custom (minutes)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="notif-custom-minutes"
                  type="number"
                  min={1}
                  step={1}
                  className="w-36"
                  value={customReminder}
                  onChange={(e) => setCustomReminder(e.target.value)}
                  placeholder="e.g. 1440"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomReminder();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomReminder}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookingQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions added yet.</p>
            ) : (
              <div className="space-y-4">
                {bookingQuestions.map((q, idx) => (
                  <BookingQuestionRow
                    key={idx}
                    question={q}
                    onChange={(next) => updateQuestion(idx, next)}
                    onDelete={() => deleteQuestion(idx)}
                    onMoveUp={() => moveQuestion(idx, "UP")}
                    onMoveDown={() => moveQuestion(idx, "DOWN")}
                    isFirst={idx === 0}
                    isLast={idx === bookingQuestions.length - 1}
                  />
                ))}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="mr-1 h-4 w-4" />
              Add question
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
          >
            {createMutation.isPending && !publishMutation.isPending
              ? "Creating…"
              : "Create draft"}
          </Button>
          <Button
            type="button"
            onClick={(e) => submit(e, "publish")}
            disabled={isPending}
          >
            {publishMutation.isPending
              ? "Publishing…"
              : createMutation.isPending
                ? "Creating…"
                : "Create & publish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
