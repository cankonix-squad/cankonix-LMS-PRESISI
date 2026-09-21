import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { ExecutiveReportingService } from './executive-reporting.service';
import { REPORTING_PERMISSIONS } from './reporting-permissions';
import { ExecutiveOverviewQueryDto } from './dto/executive-overview-query.dto';
import {
  ExecutiveBreakdownItemResponseDto,
  ExecutiveOverviewResponseDto,
} from './dto/executive-overview-response.dto';

/**
 * Executive overview (TASK-061).
 *
 * ## Why a separate permission from the metric read
 *
 * `reporting.metric.read` grants a look at the stored read model at whatever
 * grain the caller was scoped to. `reporting.executive.read` grants the
 * *institution-wide* view, which is a different disclosure: it aggregates across
 * every participant in reach rather than reporting a scope the caller already
 * administers. Keeping them separate means an operator who may refresh metrics
 * is not thereby able to read the national dashboard.
 *
 * ## Why the principal is what is passed, not a scope
 *
 * The controller passes `user.accountId` and nothing else about reach. The
 * service resolves the grant from that account, so no request parameter can
 * widen a report: `scope` selects the *grain*, and the grant decides how far
 * that grain may reach.
 *
 * The drill-down into a specific institution is deliberately one level deep and
 * takes an organization id; the full National → … → participant walk is TASK-062
 * and is not anticipated here.
 */
@ApiTags('reporting')
@Controller('reporting/executive')
export class ExecutiveReportingController {
  constructor(private readonly executive: ExecutiveReportingService) {}

  /**
   * KPIs at the requested grain, plus the institution list at that grain.
   *
   * A caller with no granted scope, or one asking for a grain outside their
   * grant, receives `403` rather than an empty dashboard: a zeroed report and a
   * denied report are different statements about the institution, and only one
   * of them would be true.
   */
  @Get('overview')
  @RequirePermissions(REPORTING_PERMISSIONS.EXECUTIVE_READ)
  @ApiOkResponse({ type: ExecutiveOverviewResponseDto })
  overview(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Query() query: ExecutiveOverviewQueryDto,
  ): Promise<ExecutiveOverviewResponseDto> {
    return this.executive.overview(user.accountId, query);
  }

  /**
   * One institution's stored metrics.
   *
   * Exposed separately from the overview because the overview answers "how are we
   * doing" while this answers "how is this institution doing", and the second
   * question has its own scope check — an id in the URL must not be able to reach
   * an institution the caller's grant does not cover.
   */
  @Get('institutions/:organizationId')
  @RequirePermissions(REPORTING_PERMISSIONS.EXECUTIVE_READ)
  @ApiOkResponse({ type: ExecutiveBreakdownItemResponseDto })
  institution(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<ExecutiveBreakdownItemResponseDto> {
    return this.executive.institutionDetail(user.accountId, organizationId);
  }
}
