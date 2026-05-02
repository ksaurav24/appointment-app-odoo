import { BadRequestException } from '@nestjs/common';
import { BookingQuestion, QuestionType } from '@prisma/client';

export interface AnswerInput {
  questionId: string;
  answerText: string | null;
}

export interface NormalizedAnswer {
  questionId: string;
  answerText: string | null;
}

/**
 * Validate the customer's answers against the appointment type's booking
 * questions. Required questions must have a non-empty answer; type-specific
 * checks gate format (number/date) and choice membership. Returns the
 * normalized list — choice answers are trimmed and multiple-choice answers
 * are stored as a comma-separated value.
 */
export function validateAnswers(
  questions: BookingQuestion[],
  answers: AnswerInput[],
): NormalizedAnswer[] {
  // BookingQuestion.id is BigInt; AnswerInput.questionId arrives as a numeric
  // string from the DTO. Compare via string keys so both sides line up.
  const byQuestionId = new Map(answers.map((a) => [a.questionId, a]));
  const out: NormalizedAnswer[] = [];

  for (const q of questions) {
    const qid = q.id.toString();
    const supplied = byQuestionId.get(qid);
    const text = supplied?.answerText?.toString().trim() ?? '';
    if (!text) {
      if (q.isRequired) {
        throw new BadRequestException(
          `Answer to required question "${q.questionText}" is missing`,
        );
      }
      out.push({ questionId: qid, answerText: null });
      continue;
    }

    switch (q.questionType) {
      case QuestionType.NUMBER: {
        const n = Number(text);
        if (!Number.isFinite(n)) {
          throw new BadRequestException(
            `Answer to "${q.questionText}" must be a number`,
          );
        }
        out.push({ questionId: qid, answerText: String(n) });
        break;
      }
      case QuestionType.DATE: {
        const d = new Date(text);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException(
            `Answer to "${q.questionText}" must be a valid date`,
          );
        }
        out.push({ questionId: qid, answerText: text });
        break;
      }
      case QuestionType.SINGLE_CHOICE: {
        const options = (q.options as string[] | null) ?? [];
        if (!options.includes(text)) {
          throw new BadRequestException(
            `Answer to "${q.questionText}" must be one of: ${options.join(', ')}`,
          );
        }
        out.push({ questionId: qid, answerText: text });
        break;
      }
      case QuestionType.MULTIPLE_CHOICE: {
        const options = (q.options as string[] | null) ?? [];
        const picks = text
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const invalid = picks.filter((p) => !options.includes(p));
        if (invalid.length > 0) {
          throw new BadRequestException(
            `Answer to "${q.questionText}" contains invalid choices: ${invalid.join(', ')}`,
          );
        }
        out.push({ questionId: qid, answerText: picks.join(',') });
        break;
      }
      case QuestionType.TEXT:
      default:
        out.push({ questionId: qid, answerText: text });
        break;
    }
  }

  // Reject answers that don't correspond to any question (defensive).
  const validIds = new Set(questions.map((q) => q.id.toString()));
  for (const id of byQuestionId.keys()) {
    if (!validIds.has(id)) {
      throw new BadRequestException(
        `Answer references unknown questionId "${id}"`,
      );
    }
  }

  return out;
}
