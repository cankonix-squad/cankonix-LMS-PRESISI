import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LearningMeetingsController } from './learning-meetings.controller';
import {
  LEARNING_MEETINGS_REPOSITORY,
  PrismaLearningMeetingsRepository,
} from './learning-meetings.repository';
import { LearningMeetingsService } from './learning-meetings.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LearningMeetingsController],
  providers: [
    LearningMeetingsService,
    {
      provide: LEARNING_MEETINGS_REPOSITORY,
      useClass: PrismaLearningMeetingsRepository,
    },
  ],
  exports: [LearningMeetingsService, LEARNING_MEETINGS_REPOSITORY],
})
export class LearningMeetingsModule {}
