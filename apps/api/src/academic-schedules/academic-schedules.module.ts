import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AcademicSchedulesController } from './academic-schedules.controller';
import {
  ACADEMIC_SCHEDULES_REPOSITORY,
  PrismaAcademicSchedulesRepository,
} from './academic-schedules.repository';
import { AcademicSchedulesService } from './academic-schedules.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AcademicSchedulesController],
  providers: [
    AcademicSchedulesService,
    {
      provide: ACADEMIC_SCHEDULES_REPOSITORY,
      useClass: PrismaAcademicSchedulesRepository,
    },
  ],
  exports: [AcademicSchedulesService, ACADEMIC_SCHEDULES_REPOSITORY],
})
export class AcademicSchedulesModule {}
