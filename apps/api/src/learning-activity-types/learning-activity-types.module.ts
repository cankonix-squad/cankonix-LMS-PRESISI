import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LearningActivityTypesController } from './learning-activity-types.controller';
import {
  LEARNING_ACTIVITY_TYPES_REPOSITORY,
  PrismaLearningActivityTypesRepository,
} from './learning-activity-types.repository';
import { LearningActivityTypesService } from './learning-activity-types.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LearningActivityTypesController],
  providers: [
    LearningActivityTypesService,
    {
      provide: LEARNING_ACTIVITY_TYPES_REPOSITORY,
      useClass: PrismaLearningActivityTypesRepository,
    },
  ],
  exports: [LearningActivityTypesService, LEARNING_ACTIVITY_TYPES_REPOSITORY],
})
export class LearningActivityTypesModule {}
