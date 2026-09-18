import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  boundedScore,
  GradingRepository,
  scoreObjective,
} from './grading.service';
import { Prisma } from '@prisma/client';

type GradeInput = {
  answerId: string;
  score: number;
  feedback?: string | null;
  graderPersonId?: string;
};

@Injectable()
export class PrismaGradingRepository implements GradingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async autoGradeAttempt(attemptId: string) {
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          questions: {
            include: {
              questionVersion: { include: { options: true } },
              answer: { include: { grade: true } },
            },
          },
        },
      });
      if (!attempt) throw new NotFoundException('Attempt not found');
      for (const question of attempt.questions) {
        const answer = question.answer;
        if (!answer) continue;
        const rule = question.questionVersion.scoringRule;
        if (!rule) continue;
        const points = Number(question.points);
        const score = scoreObjective(rule, answer.answerPayload, points);
        await tx.answerGrade.upsert({
          where: { attemptAnswerId: answer.id },
          create: {
            attemptAnswerId: answer.id,
            autoScore: score.toFixed(2),
            finalScore: score.toFixed(2),
          },
          update: {
            autoScore: score.toFixed(2),
            finalScore: answer.grade?.manualScore ?? score.toFixed(2),
            gradedAt: new Date(),
          },
        });
      }
      return this.recompute(tx, attemptId);
    });
  }

  async manualGrade(input: GradeInput) {
    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.attemptAnswer.findUnique({
        where: { id: input.answerId },
        include: { attemptQuestion: true, grade: true },
      });
      if (!answer) throw new NotFoundException('Attempt answer not found');
      const score = boundedScore(
        input.score,
        Number(answer.attemptQuestion.points),
      );
      const grade = await tx.answerGrade.upsert({
        where: { attemptAnswerId: answer.id },
        create: {
          attemptAnswerId: answer.id,
          manualScore: score.toFixed(2),
          finalScore: score.toFixed(2),
          graderPersonId: input.graderPersonId,
          feedback: input.feedback,
        },
        update: {
          manualScore: score.toFixed(2),
          finalScore: score.toFixed(2),
          graderPersonId: input.graderPersonId,
          feedback: input.feedback,
          gradedAt: new Date(),
        },
      });
      await this.recompute(tx, answer.attemptQuestion.attemptId);
      return grade;
    });
  }

  private async recompute(tx: Prisma.TransactionClient, attemptId: string) {
    const grades = await tx.answerGrade.findMany({
      where: { attemptAnswer: { attemptQuestion: { attemptId } } },
      select: { finalScore: true },
    });
    const total = grades.reduce(
      (sum, grade) => sum + Number(grade.finalScore),
      0,
    );
    return tx.examAttempt.update({
      where: { id: attemptId },
      data: { score: total.toFixed(2) },
    });
  }
}
