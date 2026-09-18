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
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedPrincipal } from '../auth/auth.types';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { ATTENDANCE_PERMISSIONS } from '../attendance/attendance-permissions';
import { AttendanceCorrectionsService } from './attendance-corrections.service';
import { ApplyAttendanceCorrectionDto } from './dto/apply-attendance-correction.dto';
import {
  ApplyAttendanceCorrectionResponseDto,
  AttendanceCorrectionListResponseDto,
  AttendanceCorrectionResponseDto,
} from './dto/attendance-correction-response.dto';
import { ListAttendanceCorrectionsQueryDto } from './dto/list-attendance-corrections-query.dto';

/**
 * Attendance correction & history (TASK-031).
 *
 * Every route declares an explicit permission — this controller does NOT use the
 * `@AllowAuthenticated()` foundation baseline, because "unauthorized correction
 * denied" is an acceptance criterion of this task. The literal `records/...`
 * segment is declared before `:id` so it is never mistaken for a correction id.
 */
@ApiTags('attendance-corrections')
@Controller('attendance-corrections')
export class AttendanceCorrectionsController {
  constructor(private readonly service: AttendanceCorrectionsService) {}

  @Post('records/:recordId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.CORRECTION_MANAGE)
  @ApiOperation({
    summary: 'Apply a correction to an attendance record (reason mandatory)',
  })
  async applyCorrection(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: ApplyAttendanceCorrectionDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<ApplyAttendanceCorrectionResponseDto> {
    return this.service.applyCorrection(recordId, dto, {
      accountId: user?.accountId,
      personId: user?.personId,
    });
  }

  @Get('records/:recordId')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.CORRECTION_READ)
  @ApiOperation({ summary: 'Correction history of one attendance record' })
  async listByRecord(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Query() query: ListAttendanceCorrectionsQueryDto,
  ): Promise<AttendanceCorrectionListResponseDto> {
    return this.service.listByRecord(recordId, query);
  }

  @Get()
  @RequirePermissions(ATTENDANCE_PERMISSIONS.CORRECTION_READ)
  @ApiOperation({ summary: 'List attendance corrections' })
  async list(
    @Query() query: ListAttendanceCorrectionsQueryDto,
  ): Promise<AttendanceCorrectionListResponseDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions(ATTENDANCE_PERMISSIONS.CORRECTION_READ)
  @ApiOperation({ summary: 'Get an attendance correction by ID' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttendanceCorrectionResponseDto> {
    return this.service.getById(id);
  }
}
