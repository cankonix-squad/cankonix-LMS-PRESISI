import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AssignmentSubmissionsController,
  AssignmentsController,
} from './assignments.controller';
import {
  ASSIGNMENTS_REPOSITORY,
  PrismaAssignmentsRepository,
} from './assignments.repository';
import { AssignmentsService } from './assignments.service';
import { SubmissionsService } from './submissions.service';

/**
 * Assignment and submission domain (TASK-024).
 *
 * Both controllers share one repository token: an assignment and its
 * submissions are one aggregate, so splitting the repository would force the
 * two services to reach across a boundary that does not exist in the data.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AssignmentsController, AssignmentSubmissionsController],
  providers: [
    AssignmentsService,
    SubmissionsService,
    { provide: ASSIGNMENTS_REPOSITORY, useClass: PrismaAssignmentsRepository },
  ],
  exports: [AssignmentsService, SubmissionsService, ASSIGNMENTS_REPOSITORY],
})
export class AssignmentsModule {}
