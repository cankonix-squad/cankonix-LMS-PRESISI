import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/auth.decorators';
import { AuthenticatedPrincipal } from '../auth/auth.types';
import { RequirePermissions } from '../authorization/authorization.decorators';
import { GraduationTrendQueryDto } from './dto/graduation-trend-query.dto';
import { GraduationTrendResponseDto } from './dto/graduation-trend-response.dto';
import { GraduationTrendService } from './graduation-trend.service';
import { REPORTING_PERMISSIONS } from './reporting-permissions';

@ApiTags('reporting')
@Controller('reporting/executive/graduation-trends')
export class GraduationTrendController {
  constructor(private readonly service: GraduationTrendService) {}

  @Get()
  @RequirePermissions(REPORTING_PERMISSIONS.EXECUTIVE_READ)
  @ApiOkResponse({ type: GraduationTrendResponseDto })
  trends(
    @CurrentUser() user: AuthenticatedPrincipal,
    @Query() query: GraduationTrendQueryDto,
  ): Promise<GraduationTrendResponseDto> {
    return this.service.trends(user.accountId, query);
  }
}
