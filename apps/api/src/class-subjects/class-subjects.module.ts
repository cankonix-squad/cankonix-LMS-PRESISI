import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassSubjectsController } from './class-subjects.controller';
import {
  CLASS_SUBJECTS_REPOSITORY,
  PrismaClassSubjectsRepository,
} from './class-subjects.repository';
import { ClassSubjectsService } from './class-subjects.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ClassSubjectsController],
  providers: [
    ClassSubjectsService,
    {
      provide: CLASS_SUBJECTS_REPOSITORY,
      useClass: PrismaClassSubjectsRepository,
    },
  ],
  exports: [ClassSubjectsService, CLASS_SUBJECTS_REPOSITORY],
})
export class ClassSubjectsModule {}
