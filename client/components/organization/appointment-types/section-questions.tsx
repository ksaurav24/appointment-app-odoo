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
import { BookingQuestionRow } from "@/components/organization/appointment-types/booking-question-row";
import type {
  AppointmentTypeWithRelations,
  BookingQuestionInput,
  QuestionType,
} from "@/types";

const CHOICE_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"];

function isChoiceType(qt: QuestionType): boolean {
  return CHOICE_TYPES.includes(qt);
}

type Props = {
  type: AppointmentTypeWithRelations;
};

function buildInitial(type: AppointmentTypeWithRelations): BookingQuestionInput[] {
  return [...type.bookingQuestions]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((q) => ({
      questionText: q.questionText,
      helpText: q.helpText ?? undefined,
      questionType: q.questionType,
      isRequired: q.isRequired,
      options: q.options ?? undefined,
      displayOrder: q.displayOrder,
    }));
}

export function SectionQuestions({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { setQuestionsMutation } = useAppointmentTypeMutations();

  const [questions, setQuestions] = useState<BookingQuestionInput[]>(() =>
    buildInitial(type),
  );

  const handleEdit = () => {
    setQuestions(buildInitial(type));
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleAdd = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        questionType: "TEXT",
        isRequired: false,
        options: undefined,
        displayOrder: prev.length,
      },
    ]);
  };

  const handleChange = (idx: number, next: BookingQuestionInput) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...next, displayOrder: i } : q)),
    );
  };

  const handleDelete = (idx: number) => {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((q, i) => ({ ...q, displayOrder: i })),
    );
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((q, i) => ({ ...q, displayOrder: i }));
    });
  };

  const handleMoveDown = (idx: number) => {
    setQuestions((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((q, i) => ({ ...q, displayOrder: i }));
    });
  };

  const validate = (): string | null => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        return `Question ${i + 1}: text is required`;
      }
      if (isChoiceType(q.questionType)) {
        const opts = q.options ?? [];
        if (opts.length === 0) {
          return `Question ${i + 1}: at least one option required for choice type`;
        }
        for (const opt of opts) {
          if (!opt.trim()) {
            return `Question ${i + 1}: option text must not be empty`;
          }
        }
      }
    }
    return null;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setQuestionsMutation.mutate(
      { id: type.id, body: { questions } },
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

  const sorted = [...type.bookingQuestions].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking questions</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions configured yet.</p>
          ) : (
            <ol className="space-y-2">
              {sorted.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 text-sm">
                  <span className="min-w-[1.5rem] text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="flex-1">
                    {q.questionText}
                    {q.isRequired && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                    {q.helpText && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.helpText}
                      </p>
                    )}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {q.questionType}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking questions</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions yet — add one.
            </p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <BookingQuestionRow
                  key={idx}
                  question={q}
                  onChange={(next) => handleChange(idx, next)}
                  onDelete={() => handleDelete(idx)}
                  onMoveUp={() => handleMoveUp(idx)}
                  onMoveDown={() => handleMoveDown(idx)}
                  isFirst={idx === 0}
                  isLast={idx === questions.length - 1}
                />
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
          >
            Add question
          </Button>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={setQuestionsMutation.isPending}
            >
              {setQuestionsMutation.isPending ? "Saving..." : "Save"}
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
