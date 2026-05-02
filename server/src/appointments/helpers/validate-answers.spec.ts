import { BadRequestException } from '@nestjs/common';
import { BookingQuestion, QuestionType } from '@prisma/client';
import { validateAnswers } from './validate-answers';

const baseQuestion: Omit<
  BookingQuestion,
  'id' | 'questionType' | 'options' | 'isRequired'
> = {
  appointmentTypeId: 'at-1',
  questionText: 'placeholder',
  displayOrder: 0,
};

const q = (overrides: Partial<BookingQuestion>): BookingQuestion => ({
  id: 1n,
  questionType: QuestionType.TEXT,
  options: null,
  isRequired: false,
  ...baseQuestion,
  ...overrides,
});

describe('validateAnswers', () => {
  it('throws when a required question is unanswered', () => {
    expect(() =>
      validateAnswers(
        [q({ id: 1n, isRequired: true, questionText: 'name' })],
        [],
      ),
    ).toThrow(BadRequestException);
  });

  it('returns a null answer for an optional unanswered question', () => {
    const result = validateAnswers([q({ id: 1n })], []);
    expect(result).toEqual([{ questionId: '1', answerText: null }]);
  });

  it('rejects non-numeric answers for NUMBER questions', () => {
    expect(() =>
      validateAnswers(
        [q({ id: 1n, questionType: QuestionType.NUMBER })],
        [{ questionId: '1', answerText: 'twelve' }],
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects choices not in the option list for SINGLE_CHOICE', () => {
    expect(() =>
      validateAnswers(
        [
          q({
            id: 1n,
            questionType: QuestionType.SINGLE_CHOICE,
            options: ['yes', 'no'],
          }),
        ],
        [{ questionId: '1', answerText: 'maybe' }],
      ),
    ).toThrow(BadRequestException);
  });

  it('accepts MULTIPLE_CHOICE comma list and normalises whitespace', () => {
    const result = validateAnswers(
      [
        q({
          id: 1n,
          questionType: QuestionType.MULTIPLE_CHOICE,
          options: ['football', 'cricket', 'casual'],
        }),
      ],
      [{ questionId: '1', answerText: 'football,  cricket  ' }],
    );
    expect(result[0].answerText).toBe('football,cricket');
  });

  it('rejects answers referencing unknown question ids', () => {
    expect(() =>
      validateAnswers(
        [q({ id: 1n })],
        [{ questionId: '9', answerText: 'oops' }],
      ),
    ).toThrow(BadRequestException);
  });
});
