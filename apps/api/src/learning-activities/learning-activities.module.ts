import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  LearningActivitiesController,
  LearningContentsController,
} from './learning-activities.controller';
import {
  LEARNING_ACTIVITIES_REPOSITORY,
  PrismaLearningActivitiesRepository,
} from './learning-activities.repository';
import { LearningActivitiesService } from './learning-activities.service';
import {
  LEARNING_CONTENTS_REPOSITORY,
  PrismaLearningContentsRepository,
} from './learning-contents.repository';
import { LearningContentsService } from './learning-contents.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LearningActivitiesController, LearningContentsController],
  providers: [
    LearningActivitiesService,
    LearningContentsService,
    {
      provide: LEARNING_ACTIVITIES_REPOSITORY,
      useClass: PrismaLearningActivitiesRepository,
    },
    {
      provide: LEARNING_CONTENTS_REPOSITORY,
      useClass: PrismaLearningContentsRepository,
    },
  ],
  exports: [
    LearningActivitiesService,
    LearningContentsService,
    LEARNING_ACTIVITIES_REPOSITORY,
    LEARNING_CONTENTS_REPOSITORY,
  ],
})
export class LearningActivitiesModule {}
