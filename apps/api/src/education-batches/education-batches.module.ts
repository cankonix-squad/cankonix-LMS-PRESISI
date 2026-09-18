import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CurriculumSubjectsModule } from '../curriculum-subjects/curriculum-subjects.module';
import { EducationProgramsModule } from '../education-programs/education-programs.module';
import {
  EDUCATION_BATCHES_REPOSITORY,
  PrismaEducationBatchesRepository,
} from './education-batches.repository';
import { EducationBatchesController } from './education-batches.controller';
import { EducationBatchesService } from './education-batches.service';

@Module({
  imports: [AuditModule, EducationProgramsModule, CurriculumSubjectsModule],
  controllers: [EducationBatchesController],
  providers: [
    EducationBatchesService,
    {
      provide: EDUCATION_BATCHES_REPOSITORY,
      useClass: PrismaEducationBatchesRepository,
    },
  ],
  exports: [EducationBatchesService],
})
export class EducationBatchesModule {}
