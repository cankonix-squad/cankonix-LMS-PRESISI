import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ReportingScopeType } from '@prisma/client';
import {
  ExecutiveOverviewScope,
  executiveAccessLevel,
  isEmptyExecutiveScopeGrant,
  narrowExecutiveScope,
  toExecutiveMetricFilter,
} from './executive-scope';
import {
  EXECUTIVE_SCOPE_GRANT_RESOLVER,
  ExecutiveScopeGrantResolver,
} from './executive-scope.resolver';
import {
  GraduationTrendGranularity,
  buildGraduationTrends,
} from './graduation-trend-rules';
import { REPORTING_REPOSITORY, ReportingRepository } from './reporting.types';
import { ExecutiveOverviewScopeDto } from './dto/executive-overview-query.dto';
import {
  GraduationTrendGranularityDto,
  GraduationTrendQueryDto,
} from './dto/graduation-trend-query.dto';
import { GraduationTrendResponseDto } from './dto/graduation-trend-response.dto';
import { KpiDetailLevelDto } from './dto/kpi-query.dto';

const DEFAULT_LIMIT = 12;

/**
 * Graduation/pass/fail/remedial trends (TASK-064).
 *
 * This read path consumes only `reporting_metrics`. Graduation decision outcome
 * counts are captured during explicit reporting refresh, so the trend endpoint
 * does not touch graduation/evaluation/certificate transactional tables.
 */
@Injectable()
export class GraduationTrendService {
  constructor(
    @Inject(REPORTING_REPOSITORY)
    private readonly repo: ReportingRepository,
    @Inject(EXECUTIVE_SCOPE_GRANT_RESOLVER)
    private readonly scopeResolver: ExecutiveScopeGrantResolver,
  ) {}

  async trends(
    userAccountId: string,
    query: GraduationTrendQueryDto,
  ): Promise<GraduationTrendResponseDto> {
    const grant = await this.scopeResolver.resolveGrant(userAccountId);
    if (isEmptyExecutiveScopeGrant(grant)) {
      throw new ForbiddenException(
        'Access denied: no reporting scope is granted to this account',
      );
    }

    const requestedScope = (query.scope ??
      ExecutiveOverviewScopeDto.NATIONAL) as ExecutiveOverviewScope;
    const narrowed = narrowExecutiveScope(grant, requestedScope, query.scopeId);
    if (!narrowed) {
      throw new ForbiddenException(
        `Access denied: ${requestedScope}${
          query.scopeId ? `:${query.scopeId}` : ''
        } is outside the reporting scope granted to this account`,
      );
    }

    const period = parsePeriod(query.periodFrom, query.periodTo);
    const level = toTrendLevel(query.level);
    const filter = toExecutiveMetricFilter(narrowed, level, period);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const granularity = (query.granularity ??
      GraduationTrendGranularityDto.COHORT) as GraduationTrendGranularity;

    const rows = await this.repo.listKpiTrendRows(filter, limit * 200);

    return {
      scope: {
        scope: requestedScope as never,
        scopeId: query.scopeId ?? null,
        accessLevel: executiveAccessLevel(grant),
        periodFrom: period.from ? period.from.toISOString() : null,
        periodTo: period.to ? period.to.toISOString() : null,
      },
      level: level as never,
      granularity: granularity as never,
      trends: buildGraduationTrends(rows, limit, granularity),
      generatedAt: new Date().toISOString(),
    };
  }
}

function toTrendLevel(
  level: KpiDetailLevelDto | undefined,
): ReportingScopeType {
  return (level ?? KpiDetailLevelDto.BATCH) as unknown as ReportingScopeType;
}

function parsePeriod(
  periodFrom: string | undefined,
  periodTo: string | undefined,
): { from: Date | null; to: Date | null } {
  return {
    from: periodFrom ? new Date(periodFrom) : null,
    to: periodTo ? new Date(`${periodTo.slice(0, 10)}T23:59:59.999Z`) : null,
  };
}
