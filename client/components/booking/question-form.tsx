"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { BookingQuestion } from "@/types";

type QuestionFormProps = {
  questions: BookingQuestion[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
};

export function QuestionForm({ questions, values, onChange }: QuestionFormProps) {
  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  const setValue = (id: string, val: string) => {
    onChange({ ...values, [id]: val });
  };

  return (
    <div className="space-y-6">
      {sorted.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label className="text-sm font-medium">
            {q.questionText}
            {q.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>

          {q.questionType === "TEXT" ? (
            <Textarea
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
              placeholder="Your answer"
              rows={3}
            />
          ) : q.questionType === "NUMBER" ? (
            <Input
              type="number"
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
            />
          ) : q.questionType === "DATE" ? (
            <Input
              type="date"
              value={values[q.id] ?? ""}
              onChange={(e) => setValue(q.id, e.target.value)}
            />
          ) : q.questionType === "SINGLE_CHOICE" ? (
            <RadioGroup
              value={values[q.id] ?? ""}
              onValueChange={(v) => setValue(q.id, v)}
            >
              {(q.options ?? []).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm">
                    {opt}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : q.questionType === "MULTIPLE_CHOICE" ? (
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => {
                const selected = (values[q.id] ?? "")
                  .split(",")
                  .filter(Boolean);
                const checked = selected.includes(opt);
                return (
                  <div key={opt} className="flex items-center gap-2">
                    <Checkbox
                      id={`${q.id}-${opt}`}
                      checked={checked}
                      onCheckedChange={(next) => {
                        const set = new Set(selected);
                        if (next) set.add(opt);
                        else set.delete(opt);
                        setValue(q.id, [...set].join(","));
                      }}
                    />
                    <Label htmlFor={`${q.id}-${opt}`} className="text-sm">
                      {opt}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function validateAnswers(
  questions: BookingQuestion[],
  values: Record<string, string>,
): { fieldErrors: Record<string, string>; isValid: boolean } {
  const fieldErrors: Record<string, string> = {};
  for (const q of questions) {
    const raw = (values[q.id] ?? "").trim();
    if (q.isRequired && raw === "") {
      fieldErrors[q.id] = "This question is required.";
      continue;
    }
    if (raw === "") continue;
    if (q.questionType === "SINGLE_CHOICE") {
      if (!q.options?.includes(raw)) {
        fieldErrors[q.id] = "Pick one of the options.";
      }
    } else if (q.questionType === "MULTIPLE_CHOICE") {
      const parts = raw.split(",");
      if (parts.some((p) => !q.options?.includes(p))) {
        fieldErrors[q.id] = "All selections must be from the options.";
      }
    } else if (q.questionType === "NUMBER") {
      if (!Number.isFinite(Number(raw))) {
        fieldErrors[q.id] = "Enter a number.";
      }
    } else if (q.questionType === "DATE") {
      if (Number.isNaN(Date.parse(raw))) {
        fieldErrors[q.id] = "Enter a valid date.";
      }
    }
  }
  return { fieldErrors, isValid: Object.keys(fieldErrors).length === 0 };
}
