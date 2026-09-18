import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamSessionsController } from './exam-sessions.controller';
import {
  EXAM_SESSIONS_REPOSITORY,
  ExamSessionsService,
  PrismaExamSessionsRepository,
} from './exam-sessions.service';
@Module({
  imports: [PrismaModule],
  controllers: [ExamSessionsController],
  providers: [
    ExamSessionsService,
    {
      provide: EXAM_SESSIONS_REPOSITORY,
      useClass: PrismaExamSessionsRepository,
    },
  ],
  exports: [ExamSessionsService],
})
export class ExamSessionsModule {}
