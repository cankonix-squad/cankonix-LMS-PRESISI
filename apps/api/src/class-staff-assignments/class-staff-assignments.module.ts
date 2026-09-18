import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassStaffAssignmentsController } from './class-staff-assignments.controller';
import {
  CLASS_STAFF_ASSIGNMENTS_REPOSITORY,
  PrismaClassStaffAssignmentsRepository,
} from './class-staff-assignments.repository';
import { ClassStaffAssignmentsService } from './class-staff-assignments.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ClassStaffAssignmentsController],
  providers: [
    ClassStaffAssignmentsService,
    {
      provide: CLASS_STAFF_ASSIGNMENTS_REPOSITORY,
      useClass: PrismaClassStaffAssignmentsRepository,
    },
  ],
  exports: [ClassStaffAssignmentsService, CLASS_STAFF_ASSIGNMENTS_REPOSITORY],
})
export class ClassStaffAssignmentsModule {}
