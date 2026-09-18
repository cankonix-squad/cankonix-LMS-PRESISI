import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceSummaryScopeType } from '@prisma/client';
import { ATTENDANCE_PERMISSIONS } from '../attendance/attendance-permissions';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { AttendanceSummaryService } from './attendance-summary.service';
import {
  AttendanceSummaryListResponseDto,
  AttendanceSummaryResponseDto,
} from './dto/attendance-summary-response.dto';
import { QueryAttendanceSummaryDto } from './dto/query-attendance-summary.dto';
import { RefreshAttendanceSummaryDto } from './dto/refresh-attendance-summary.dto';

/**
 * Reporting read model over attendance (TASK-033).
 *
 * Every route here is a permission-gated summary lookup. No route exposes a
 * "scan all records" operation: the only way to move a number is an explicit
 * refresh, which recalculates one scope from the raw tables and rewrites that
 * scope's row.
 */
@ApiTags('attendance-summary')
@Controller('attendance-summary')
export class AttendanceSummaryController {
  constructor(private readonly service: AttendanceSummaryService) {}

  @Get()
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'List pre-aggregated attendance summaries' })
  async listSummaries(
    @Query() query: QueryAttendanceSummaryDto,
  ): Promise<AttendanceSummaryListResponseDto> {
    return this.service.listSummaries(query);
  }

  @Post('refresh')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_REFRESH)
  @ApiOperation({
    summary: 'Recalculate one attendance summary scope from the raw records',
  })
  async refresh(
    @Body() dto: RefreshAttendanceSummaryDto,
  ): Promise<AttendanceSummaryResponseDto> {
    if (dto.classSubjectId) {
      return this.service.refreshEnrollmentSubject(
        dto.scopeId,
        dto.classSubjectId,
      );
    }

    return this.service.refresh(dto.scopeType, dto.scopeId);
  }

  @Get('enrollments/:enrollmentId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'Attendance summary for one enrollment' })
  async getEnrollmentSummary(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query('classSubjectId') classSubjectId?: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.service.getEnrollmentSummary(enrollmentId, classSubjectId);
  }

  @Get('class-subjects/:classSubjectId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'Attendance summary for one class subject' })
  async getClassSubjectSummary(
    @Param('classSubjectId', ParseUUIDPipe) classSubjectId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.service.getSummary(
      AttendanceSummaryScopeType.CLASS_SUBJECT,
      classSubjectId,
    );
  }

  @Get('classes/:academicClassId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'Attendance summary for one academic class' })
  async getClassSummary(
    @Param('academicClassId', ParseUUIDPipe) academicClassId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.service.getSummary(
      AttendanceSummaryScopeType.CLASS,
      academicClassId,
    );
  }

  @Get('batches/:educationBatchId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'Attendance summary for one education batch' })
  async getBatchSummary(
    @Param('educationBatchId', ParseUUIDPipe) educationBatchId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.service.getSummary(
      AttendanceSummaryScopeType.BATCH,
      educationBatchId,
    );
  }

  @Get('programs/:educationProgramId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.SUMMARY_READ)
  @ApiOperation({ summary: 'Attendance summary for one education program' })
  async getProgramSummary(
    @Param('educationProgramId', ParseUUIDPipe) educationProgramId: string,
  ): Promise<AttendanceSummaryResponseDto> {
    return this.service.getSummary(
      AttendanceSummaryScopeType.PROGRAM,
      educationProgramId,
    );
  }
}
