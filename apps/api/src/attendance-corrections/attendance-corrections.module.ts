import { Module } from '@nestjs/common';
import { AttendanceSummaryModule } from '../attendance-summary/attendance-summary.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceCorrectionsController } from './attendance-corrections.controller';
import { PrismaAttendanceCorrectionsRepository } from './attendance-corrections.repository';
import { AttendanceCorrectionsService } from './attendance-corrections.service';
import { ATTENDANCE_CORRECTIONS_REPOSITORY } from './attendance-corrections.types';

@Module({
  imports: [PrismaModule, AuditModule, AttendanceSummaryModule],
  controllers: [AttendanceCorrectionsController],
  providers: [
    AttendanceCorrectionsService,
    {
      provide: ATTENDANCE_CORRECTIONS_REPOSITORY,
      useClass: PrismaAttendanceCorrectionsRepository,
    },
  ],
  exports: [AttendanceCorrectionsService, ATTENDANCE_CORRECTIONS_REPOSITORY],
})
export class AttendanceCorrectionsModule {}
