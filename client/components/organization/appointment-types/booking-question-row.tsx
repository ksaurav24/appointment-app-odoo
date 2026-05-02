"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BookingQuestionInput, QuestionType } from "@/types";

const QUESTION_TYPES: QuestionType[] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
];

const CHOICE_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"];

function isChoiceType(qt: QuestionType): boolean {
  return CHOICE_TYPES.includes(qt);
}

type Props = {
  question: BookingQuestionInput;
  onChange: (next: BookingQuestionInput) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

export function BookingQuestionRow({
  question,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const handleTypeChange = (newType: QuestionType) => {
    const wasChoice = isChoiceType(question.questionType);
    const willBeChoice = isChoiceType(newType);
    onChange({
      ...question,
      questionType: newType,
      options: willBeChoice ? (wasChoice ? question.options : []) : undefined,
    });
  };

  const optionsText = (question.options ?? []).join("\n");

  const handleOptionsChange = (text: string) => {
    const lines = text
      .split("\n")
      .map((l) => l) // keep as-is for editing; trim on validate
    onChange({ ...question, options: lines });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Question text */}
        <div className="min-w-48 flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Question</Label>
          <Input
            value={question.questionText}
            onChange={(e) =>
              onChange({ ...question, questionText: e.target.value })
            }
            placeholder="e.g. What is your preferred time?"
          />
        </div>

        {/* Question type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={question.questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt} value={qt}>
                {qt}
              </option>
            ))}
          </select>
        </div>

        {/* Required switch */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Required</Label>
          <div className="flex h-9 items-center">
            <Switch
              checked={question.isRequired ?? false}
              onCheckedChange={(val) =>
                onChange({ ...question, isRequired: val })
              }
            />
          </div>
        </div>

        {/* Move + delete controls */}
        <div className="flex items-end gap-1 pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label="Move up"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label="Move down"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            Remove
          </Button>
        </div>
      </div>

      {/* Options textarea (choice types only) */}
      {isChoiceType(question.questionType) && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Options (one per line)
          </Label>
          <Textarea
            value={optionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            rows={3}
            placeholder={"Option A\nOption B\nOption C"}
          />
        </div>
      )}
    </div>
  );
}
