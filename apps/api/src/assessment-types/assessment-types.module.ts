import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssessmentTypesController } from './assessment-types.controller';
import {
  ASSESSMENT_TYPES_REPOSITORY,
  PrismaAssessmentTypesRepository,
} from './assessment-types.repository';
import { AssessmentTypesService } from './assessment-types.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AssessmentTypesController],
  providers: [
    AssessmentTypesService,
    {
      provide: ASSESSMENT_TYPES_REPOSITORY,
      useClass: PrismaAssessmentTypesRepository,
    },
  ],
  exports: [AssessmentTypesService, ASSESSMENT_TYPES_REPOSITORY],
})
export class AssessmentTypesModule {}
