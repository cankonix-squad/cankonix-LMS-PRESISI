import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedPrincipal } from '../auth/auth.types';
import { AllowAuthenticated } from '../authorization/authorization.decorators';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceSessionDto,
  UpdateAttendanceSessionDto,
  UpdateAttendanceSessionStatusDto,
} from './dto/create-attendance-session.dto';
import {
  ListAttendanceRecordsQueryDto,
  ListAttendanceSessionsQueryDto,
} from './dto/list-attendance-query.dto';
import {
  AttendanceRecordListResponseDto,
  AttendanceRecordResponseDto,
  AttendanceSessionDetailResponseDto,
  AttendanceSessionListResponseDto,
  AttendanceSessionResponseDto,
} from './dto/attendance-response.dto';
import {
  BulkRecordAttendanceDto,
  RecordAttendanceDto,
} from './dto/record-attendance.dto';

@ApiTags('attendance')
@AllowAuthenticated()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new attendance session' })
  async createSession(
    @Body() dto: CreateAttendanceSessionDto,
  ): Promise<AttendanceSessionResponseDto> {
    return this.service.createSession(dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List attendance sessions' })
  async listSessions(
    @Query() query: ListAttendanceSessionsQueryDto,
  ): Promise<AttendanceSessionListResponseDto> {
    return this.service.listSessions(query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get an attendance session by ID with records' })
  async getSessionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttendanceSessionDetailResponseDto> {
    return this.service.getSessionById(id);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Update an attendance session' })
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceSessionDto,
  ): Promise<AttendanceSessionResponseDto> {
    return this.service.updateSession(id, dto);
  }

  @Patch('sessions/:id/status')
  @ApiOperation({ summary: 'Open, close, or cancel an attendance session' })
  async updateSessionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceSessionStatusDto,
  ): Promise<AttendanceSessionResponseDto> {
    return this.service.updateSessionStatus(id, dto);
  }

  @Post('records')
  @ApiOperation({ summary: 'Record single participant attendance' })
  async recordAttendance(
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<AttendanceRecordResponseDto> {
    return this.service.recordAttendance(dto, user?.accountId);
  }

  @Post('sessions/:id/records/bulk')
  @ApiOperation({ summary: 'Bulk record attendance for a session' })
  async bulkRecordAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkRecordAttendanceDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<AttendanceRecordResponseDto[]> {
    return this.service.bulkRecordAttendance(id, dto, user?.accountId);
  }

  @Get('records')
  @ApiOperation({
    summary: 'List attendance records by session, enrollment, or status',
  })
  async listRecords(
    @Query() query: ListAttendanceRecordsQueryDto,
  ): Promise<AttendanceRecordListResponseDto> {
    return this.service.listRecords(query);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get an attendance record by ID' })
  async getRecordById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttendanceRecordResponseDto> {
    return this.service.getRecordById(id);
  }
}
