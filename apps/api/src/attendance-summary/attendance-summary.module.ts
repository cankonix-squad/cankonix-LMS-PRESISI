import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceSummaryController } from './attendance-summary.controller';
import { AttendanceSummaryService } from './attendance-summary.service';
import { PrismaAttendanceSummaryRepository } from './attendance-summary.repository';
import { ATTENDANCE_SUMMARY_REPOSITORY } from './attendance-summary.types';

/**
 * `AttendanceSummaryService` is exported because attendance and correction
 * writes refresh derived summaries through it. The repository stays private:
 * every caller goes through the service, so the read path can never be bypassed
 * and the raw-scan policy lives in exactly one place.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AttendanceSummaryController],
  providers: [
    AttendanceSummaryService,
    {
      provide: ATTENDANCE_SUMMARY_REPOSITORY,
      useClass: PrismaAttendanceSummaryRepository,
    },
  ],
  exports: [AttendanceSummaryService],
})
export class AttendanceSummaryModule {}
