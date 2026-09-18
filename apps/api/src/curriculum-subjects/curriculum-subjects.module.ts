import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EducationProgramsModule } from '../education-programs/education-programs.module';
import {
  CURRICULA_REPOSITORY,
  PrismaCurriculaRepository,
} from './curricula.repository';
import { CurriculaController } from './curricula.controller';
import { CurriculaService } from './curricula.service';
import {
  SUBJECTS_REPOSITORY,
  PrismaSubjectsRepository,
} from './subjects.repository';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [AuditModule, EducationProgramsModule],
  controllers: [SubjectsController, CurriculaController],
  providers: [
    SubjectsService,
    CurriculaService,
    {
      provide: SUBJECTS_REPOSITORY,
      useClass: PrismaSubjectsRepository,
    },
    {
      provide: CURRICULA_REPOSITORY,
      useClass: PrismaCurriculaRepository,
    },
  ],
  exports: [SubjectsService, CurriculaService],
})
export class CurriculumSubjectsModule {}
