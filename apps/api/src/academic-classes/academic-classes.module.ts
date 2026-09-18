import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EducationBatchesModule } from '../education-batches/education-batches.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AcademicClassesController } from './academic-classes.controller';
import {
  ACADEMIC_CLASSES_REPOSITORY,
  PrismaAcademicClassesRepository,
} from './academic-classes.repository';
import { AcademicClassesService } from './academic-classes.service';

@Module({
  imports: [PrismaModule, AuditModule, EducationBatchesModule],
  controllers: [AcademicClassesController],
  providers: [
    AcademicClassesService,
    {
      provide: ACADEMIC_CLASSES_REPOSITORY,
      useClass: PrismaAcademicClassesRepository,
    },
  ],
  exports: [AcademicClassesService, ACADEMIC_CLASSES_REPOSITORY],
})
export class AcademicClassesModule {}
