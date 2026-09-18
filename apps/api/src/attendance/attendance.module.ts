import { Module } from '@nestjs/common';
import { AttendanceSummaryModule } from '../attendance-summary/attendance-summary.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ATTENDANCE_REPOSITORY } from './attendance.types';
import { PrismaAttendanceRepository } from './attendance.repository';

@Module({
  imports: [PrismaModule, AuditModule, AttendanceSummaryModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useClass: PrismaAttendanceRepository,
    },
  ],
  exports: [AttendanceService, ATTENDANCE_REPOSITORY],
})
export class AttendanceModule {}
