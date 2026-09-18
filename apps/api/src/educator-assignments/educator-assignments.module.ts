import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EducatorAssignmentsController } from './educator-assignments.controller';
import {
  EDUCATOR_ASSIGNMENTS_REPOSITORY,
  PrismaEducatorAssignmentsRepository,
} from './educator-assignments.repository';
import { EducatorAssignmentsService } from './educator-assignments.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [EducatorAssignmentsController],
  providers: [
    EducatorAssignmentsService,
    {
      provide: EDUCATOR_ASSIGNMENTS_REPOSITORY,
      useClass: PrismaEducatorAssignmentsRepository,
    },
  ],
  exports: [EducatorAssignmentsService, EDUCATOR_ASSIGNMENTS_REPOSITORY],
})
export class EducatorAssignmentsModule {}
