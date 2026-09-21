import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ReportingScopeType } from '@prisma/client';
import { toExecutiveKpis } from './executive-kpis';
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
  buildAttentionList,
  buildKpiDistribution,
  buildKpiTrends,
  buildRemedialRiskDistribution,
} from './kpi-rules';
import {
  REPORTING_REPOSITORY,
  ReportingMetricRecord,
  ReportingRepository,
} from './reporting.types';
import {
  ExecutiveKpiQueryDto,
  KpiDetailLevelDto,
  toKpiReportingLevel,
} from './dto/kpi-query.dto';
import {
  DetailedExecutiveKpiResponseDto,
  KpiAttentionItemResponseDto,
} from './dto/kpi-response.dto';
import { ExecutiveOverviewScopeDto } from './dto/executive-overview-query.dto';
import { toReportingMetricsResponse } from './dto/reporting-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const DEFAULT_ATTENTION_LIMIT = 10;
const DEFAULT_TREND_LIMIT = 12;

/**
 * Attendance, learning and performance KPI detail (TASK-063).
 *
 * This service reads only `reporting_metrics`. The raw attendance, progress and
 * grade tables remain behind the refresh boundary created in TASK-060, so KPI
 * detail is bounded by the number of stored aggregate rows rather than by the
 * volume of classroom activity.
 */
@Injectable()
export class KpiService {
  constructor(
    @Inject(REPORTING_REPOSITORY)
    private readonly repo: ReportingRepository,
    @Inject(EXECUTIVE_SCOPE_GRANT_RESOLVER)
    private readonly scopeResolver: ExecutiveScopeGrantResolver,
  ) {}

  async detail(
    userAccountId: string,
    query: ExecutiveKpiQueryDto,
  ): Promise<DetailedExecutiveKpiResponseDto> {
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
    const level = toReportingScopeType(query.level);
    const detailFilter = toExecutiveMetricFilter(narrowed, level, period);
    const summaryFilter = toExecutiveMetricFilter(
      narrowed,
      summaryLevelFor(requestedScope),
      period,
    );

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const attentionLimit = query.attentionLimit ?? DEFAULT_ATTENTION_LIMIT;
    const trendLimit = query.trendLimit ?? DEFAULT_TREND_LIMIT;

    const [sums, counts, rows, trendRows] = await Promise.all([
      this.repo.readExecutiveSums(summaryFilter),
      this.repo.countExecutiveScopes(summaryFilter),
      this.repo.listExecutiveBreakdown(detailFilter, page, limit),
      this.repo.listKpiTrendRows(
        toExecutiveMetricFilter(narrowed, trendLevelFor(query.level), period),
        trendLimit * 20,
      ),
    ]);

    const summary = toExecutiveKpis(sums);
    const distributions = {
      attendance: buildKpiDistribution(rows.data, 'attendancePercentage'),
      learningProgress: buildKpiDistribution(
        rows.data,
        'averageProgressPercent',
      ),
      finalScore: buildKpiDistribution(rows.data, 'averageFinalScore'),
      remedialRisk: buildRemedialRiskDistribution(rows.data),
    };

    return {
      scope: {
        scope: requestedScope as never,
        scopeId: query.scopeId ?? null,
        accessLevel: executiveAccessLevel(grant),
        periodFrom: period.from ? period.from.toISOString() : null,
        periodTo: period.to ? period.to.toISOString() : null,
      },
      level: toKpiReportingLevel(query.level),
      summary: {
        ...summary,
        institutions: counts.institutions,
        programs: counts.programs,
        batches: counts.batches,
        classes: counts.classes,
      },
      distributions,
      attention: buildAttentionList(rows.data, attentionLimit).map(
        toAttentionItem,
      ),
      trends: buildKpiTrends(trendRows, trendLimit).map((point) => ({
        ...point,
        kpis: {
          ...point.kpis,
          institutions: 0,
          programs: 0,
          batches: 0,
          classes: 0,
        },
      })),
      total: rows.total,
      page,
      limit,
      generatedAt: new Date().toISOString(),
    };
  }
}

function toReportingScopeType(
  level: KpiDetailLevelDto | undefined,
): ReportingScopeType {
  return (level ?? KpiDetailLevelDto.CLASS) as unknown as ReportingScopeType;
}

function summaryLevelFor(scope: ExecutiveOverviewScope): ReportingScopeType {
  switch (scope) {
    case 'NATIONAL':
    case 'ORGANIZATION':
      return ReportingScopeType.ORGANIZATION;
    case 'PROGRAM':
      return ReportingScopeType.PROGRAM;
    case 'BATCH':
      return ReportingScopeType.BATCH;
    default:
      return ReportingScopeType.ORGANIZATION;
  }
}

function trendLevelFor(
  level: KpiDetailLevelDto | undefined,
): ReportingScopeType {
  const requested = toReportingScopeType(level);
  return requested === ReportingScopeType.ENROLLMENT
    ? ReportingScopeType.CLASS
    : requested;
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

function toAttentionItem(item: {
  row: ReportingMetricRecord;
  severity: number;
  reasons: string[];
}): KpiAttentionItemResponseDto {
  return {
    scopeType: item.row.scopeType as never,
    scopeId: item.row.scopeId,
    scopeName: item.row.scopeName,
    severity: item.severity,
    reasons: item.reasons,
    metrics: toReportingMetricsResponse(item.row),
    recalculatedAt: item.row.recalculatedAt.toISOString(),
  };
}
