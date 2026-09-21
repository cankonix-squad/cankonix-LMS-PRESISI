import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FinalGradesController } from './final-grades.controller';
import {
  FINAL_GRADES_REPOSITORY,
  FinalGradesService,
} from './final-grades.service';
import { PrismaFinalGradesRepository } from './final-grades.repository';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FinalGradesController],
  providers: [
    FinalGradesService,
    {
      provide: FINAL_GRADES_REPOSITORY,
      useClass: PrismaFinalGradesRepository,
    },
  ],
  exports: [FinalGradesService, FINAL_GRADES_REPOSITORY],
})
export class FinalGradesModule {}
