import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LearningProgressController } from './learning-progress.controller';
import {
  LEARNING_PROGRESS_REPOSITORY,
  PrismaLearningProgressRepository,
} from './learning-progress.repository';
import { LearningProgressService } from './learning-progress.service';

/**
 * Learning Progress Module (TASK-023).
 *
 * Provides incremental progress tracking and pre-calculated aggregates for
 * participants across learning activities and class subjects.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LearningProgressController],
  providers: [
    LearningProgressService,
    {
      provide: LEARNING_PROGRESS_REPOSITORY,
      useClass: PrismaLearningProgressRepository,
    },
  ],
  exports: [LearningProgressService, LEARNING_PROGRESS_REPOSITORY],
})
export class LearningProgressModule {}
