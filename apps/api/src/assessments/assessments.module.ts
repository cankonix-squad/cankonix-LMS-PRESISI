import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ASSESSMENTS_REPOSITORY,
  PrismaAssessmentsRepository,
} from './assessments.repository';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AssessmentsController],
  providers: [
    AssessmentsService,
    {
      provide: ASSESSMENTS_REPOSITORY,
      useClass: PrismaAssessmentsRepository,
    },
  ],
  exports: [AssessmentsService, ASSESSMENTS_REPOSITORY],
})
export class AssessmentsModule {}
