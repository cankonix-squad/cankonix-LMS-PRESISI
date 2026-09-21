import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { ExecutiveKpiQueryDto } from './dto/kpi-query.dto';
import { DetailedExecutiveKpiResponseDto } from './dto/kpi-response.dto';
import { KpiService } from './kpi.service';
import { REPORTING_PERMISSIONS } from './reporting-permissions';

@ApiTags('reporting')
@Controller('reporting/executive/kpis')
export class KpiController {
  constructor(private readonly kpis: KpiService) {}

  @Get()
  @RequirePermissions(REPORTING_PERMISSIONS.EXECUTIVE_READ)
  @ApiOkResponse({ type: DetailedExecutiveKpiResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Query() query: ExecutiveKpiQueryDto,
  ): Promise<DetailedExecutiveKpiResponseDto> {
    return this.kpis.detail(user.accountId, query);
  }
}
