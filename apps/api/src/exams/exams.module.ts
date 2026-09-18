import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamsController } from './exams.controller';
import {
  EXAMS_REPOSITORY,
  ExamsService,
  PrismaExamsRepository,
} from './exams.service';
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ExamsController],
  providers: [
    ExamsService,
    { provide: EXAMS_REPOSITORY, useClass: PrismaExamsRepository },
  ],
  exports: [ExamsService],
})
export class ExamsModule {}
