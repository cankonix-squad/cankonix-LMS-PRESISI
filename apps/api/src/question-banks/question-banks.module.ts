import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  PrismaQuestionBanksRepository,
  PrismaQuestionsRepository,
  PrismaQuestionVersionsRepository,
  QUESTION_BANKS_REPOSITORY,
  QUESTIONS_REPOSITORY,
  QUESTION_VERSIONS_REPOSITORY,
} from './question-banks.repository';
import {
  QuestionBanksController,
  QuestionsController,
  QuestionTypesController,
} from './question-banks.controller';
import { QuestionBanksService } from './question-banks.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    QuestionBanksController,
    QuestionTypesController,
    QuestionsController,
  ],
  providers: [
    QuestionBanksService,
    {
      provide: QUESTION_BANKS_REPOSITORY,
      useClass: PrismaQuestionBanksRepository,
    },
    {
      provide: QUESTIONS_REPOSITORY,
      useClass: PrismaQuestionsRepository,
    },
    {
      provide: QUESTION_VERSIONS_REPOSITORY,
      useClass: PrismaQuestionVersionsRepository,
    },
  ],
  exports: [
    QuestionBanksService,
    QUESTION_BANKS_REPOSITORY,
    QUESTIONS_REPOSITORY,
    QUESTION_VERSIONS_REPOSITORY,
  ],
})
export class QuestionBanksModule {}
