import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingQuestionInput,
  validateBookingQuestions,
} from './helpers/validate-appointment-type';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class BookingQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replace the booking question set for an appointment type. Existing
   * questions are deleted (cascading their answers — only valid because
   * unanswered drafts are the typical edit target; questions with answers
   * should not be deleted in production, but the hackathon spec accepts it).
   */
  async replaceQuestions(
    appointmentTypeId: string,
    questions: BookingQuestionInput[],
    tx: PrismaTx,
  ): Promise<void> {
    const normalized = validateBookingQuestions(questions);

    await tx.bookingQuestion.deleteMany({ where: { appointmentTypeId } });
    if (normalized.length === 0) return;

    await tx.bookingQuestion.createMany({
      data: normalized.map((q) => ({
        appointmentTypeId,
        questionText: q.questionText,
        helpText: q.helpText ?? null,
        questionType: q.questionType,
        isRequired: q.isRequired,
        options: q.options ?? Prisma.JsonNull,
        displayOrder: q.displayOrder,
      })),
    });
  }
}
