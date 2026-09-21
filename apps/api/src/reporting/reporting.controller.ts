import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReportingScopeType } from '@prisma/client';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { REPORTING_PERMISSIONS } from './reporting-permissions';
import { ReportingService } from './reporting.service';
import {
  ListReportingMetricsQueryDto,
  RefreshReportingDto,
} from './dto/reporting-query.dto';
import {
  ReportingMetricsListResponseDto,
  ReportingRefreshResponseDto,
  ReportingScopeResponseDto,
} from './dto/reporting-response.dto';

/**
 * Reporting read model (TASK-060).
 *
 * This task intentionally exposes only the boundary: a read of stored metrics and
 * a refresh that rebuilds them. The executive overview (TASK-061), the
 * drill-down (TASK-062) and the KPI detail (TASK-063) are separate tasks and are
 * deliberately not anticipated here.
 *
 * `reporting.metric.read` is separate from `reporting.metric.refresh` because
 * reading a report is routine while rebuilding the read model is a maintenance
 * act that writes derived rows for many scopes at once.
 *
 * The `api/v1` prefix is applied globally in `app.ts`; paths here are relative.
 */
@ApiTags('reporting')
@Controller('reporting/metrics')
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get()
  @RequirePermissions(REPORTING_PERMISSIONS.READ)
  @ApiOkResponse({ type: ReportingMetricsListResponseDto })
  list(
    @Query() query: ListReportingMetricsQueryDto,
  ): Promise<ReportingMetricsListResponseDto> {
    return this.reporting.listMetrics(query);
  }

  /**
   * Refreshes the read model from transactional data.
   *
   * Exposed as a route rather than left as an internal-only service call because
   * the spec allows "internal refresh jobs/services", and a job on a schedule is
   * not the only way an operator needs to run one — after a backfill or an
   * incident, a human needs to trigger it deliberately and see what it did.
   */
  @Post('refresh')
  @RequirePermissions(REPORTING_PERMISSIONS.REFRESH)
  @ApiOkResponse({ type: ReportingRefreshResponseDto })
  refresh(
    @Body() dto: RefreshReportingDto,
  ): Promise<ReportingRefreshResponseDto> {
    return this.reporting.refresh(dto);
  }

  @Get(':scopeType/:scopeId')
  @RequirePermissions(REPORTING_PERMISSIONS.READ)
  @ApiOkResponse({ type: ReportingScopeResponseDto })
  findOne(
    @Param('scopeType') scopeType: string,
    @Param('scopeId', ParseUUIDPipe) scopeId: string,
  ): Promise<ReportingScopeResponseDto> {
    return this.reporting.getMetric(scopeType as ReportingScopeType, scopeId);
  }
}
