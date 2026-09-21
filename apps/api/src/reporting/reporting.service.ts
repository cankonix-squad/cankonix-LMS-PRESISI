import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportingScopeType } from '@prisma/client';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  deriveMetricFields,
  scopeKey,
  scopeNamesItsParent,
} from './reporting-rules';
import {
  REPORTING_REPOSITORY,
  ReportingMetricListFilter,
  ReportingMetricRecord,
  ReportingRepository,
  ReportingScopeDescriptor,
} from './reporting.types';
import {
  ListReportingMetricsQueryDto,
  RefreshReportingDto,
} from './dto/reporting-query.dto';
import {
  ReportingMetricsListResponseDto,
  ReportingRefreshResponseDto,
  ReportingScopeResponseDto,
  toReportingMetricsResponse,
} from './dto/reporting-response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

/**
 * Reporting application service (TASK-060).
 *
 * ### The boundary this task exists to draw
 *
 * A report read touches **only** `reporting_metrics`. It never joins, counts or
 * averages a transactional table. Every number a report shows was computed
 * earlier by `refresh` and stored, which is what stops an executive dashboard
 * from getting slower every term as enrollments, attendance records and grades
 * accumulate.
 *
 * The transactional tables remain the source of truth. Nothing in this service
 * writes a domain row, and every column it stores is derived — the read model can
 * be thrown away and rebuilt from source at any time.
 *
 * ### Why `refresh` is idempotent
 *
 * `refresh` recomputes each scope from source and upserts on
 * `(scopeType, scopeId)`. Running it twice produces the same row, not double the
 * counts, because the counters are read fresh from source each time rather than
 * accumulated into whatever is already stored. That property is what makes it
 * safe to call on a schedule, after a backfill, or by hand after an incident —
 * and it is asserted directly by a test.
 *
 * ### Redis
 *
 * `docs/03-data-architecture.md` allows Redis as a cache but not as a source. So
 * this service does not introduce a cache layer: the read model in PostgreSQL is
 * already the thing that makes reads cheap, and adding Redis in front of it would
 * create a second place where a stale number could live without removing the
 * first.
 */
@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @Inject(REPORTING_REPOSITORY)
    private readonly repo: ReportingRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fast read path. Reads the read model only; never computes.
   *
   * A filter is required to be specific enough to be useful but is not required
   * to be complete: an unfiltered list is a legitimate "show me every scope we
   * have", bounded by pagination.
   */
  async listMetrics(
    query: ListReportingMetricsQueryDto,
  ): Promise<ReportingMetricsListResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const filter: ReportingMetricListFilter = {
      scopeType: query.scopeType as unknown as ReportingScopeType | undefined,
      scopeId: query.scopeId,
      organizationId: query.organizationId,
      page,
      limit,
    };

    const result = await this.repo.list(filter);
    return {
      data: result.data.map(toResponse),
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * Reads one scope's stored metrics.
   *
   * Returns 404 rather than computing on demand. A missing row means that scope
   * has not been refreshed, which is operational information the caller needs —
   * silently computing a one-off number would hide the fact that the report was
   * never built, and would put a cold transactional scan back on the read path
   * this task exists to keep clear.
   */
  async getMetric(
    scopeType: ReportingScopeType,
    scopeId: string,
  ): Promise<ReportingScopeResponseDto> {
    const record = await this.repo.find(scopeType, scopeId);
    if (!record) {
      throw new NotFoundException(
        `No reporting metrics for ${scopeType}:${scopeId}; run a refresh first`,
      );
    }
    return toResponse(record);
  }

  /**
   * Recomputes the read model from transactional data.
   *
   * Idempotent: each scope is read fresh from source and upserted, so repeating
   * the call converges on the same rows rather than compounding.
   *
   * Every scope is refreshed independently, and a scope that fails is logged and
   * skipped rather than aborting the run. That choice is deliberate: a partial
   * refresh leaves the read model *stale*, while an aborted refresh leaves it
   * *half-updated with no record of where it stopped*, and stale is easier to
   * reason about and to retry.
   */
  async refresh(
    dto: RefreshReportingDto,
  ): Promise<ReportingRefreshResponseDto> {
    const scopes = await this.repo.listScopes({
      scopeType: dto.scopeType as unknown as ReportingScopeType | undefined,
      scopeId: dto.scopeId,
      organizationId: dto.organizationId,
    });

    if (
      dto.scopeType !== undefined &&
      dto.scopeId !== undefined &&
      scopes.length === 0
    ) {
      throw new NotFoundException(
        `No reporting scope ${dto.scopeType}:${dto.scopeId}`,
      );
    }

    const refreshedAt = new Date();
    const refreshed: string[] = [];

    for (const scope of scopes) {
      try {
        await this.refreshScope(scope, refreshedAt);
        refreshed.push(scopeKey(scope.scopeType, scope.scopeId));
      } catch (error) {
        this.logger.warn(
          `Reporting refresh failed for ${scopeKey(scope.scopeType, scope.scopeId)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    await this.audit.record({
      action: AUDIT_ACTIONS.REPORTING_REFRESHED,
      resourceType: AUDIT_RESOURCE_TYPES.REPORTING_METRIC,
      metadata: {
        scopeType: dto.scopeType ?? null,
        scopeId: dto.scopeId ?? null,
        organizationId: dto.organizationId ?? null,
        refreshed: refreshed.length,
        // A refresh that silently skipped scopes would look identical to a clean
        // one without this, and the difference matters when someone is deciding
        // whether a report can be trusted.
        attempted: scopes.length,
      },
    });

    return {
      refreshed: refreshed.length,
      scopes: refreshed,
      refreshedAt: refreshedAt.toISOString(),
    };
  }

  /**
   * Recomputes and stores one scope.
   *
   * Refuses a descriptor that does not name its own parent. That is a guard
   * against a resolved scope arriving with an inconsistent ancestry — the row it
   * would write is what a later drill-down filters on, so a wrong parent id here
   * would put a scope in the wrong branch of the hierarchy.
   */
  private async refreshScope(
    scope: ReportingScopeDescriptor,
    recalculatedAt: Date,
  ): Promise<void> {
    if (!scopeNamesItsParent(scope)) {
      throw new Error(
        `Scope ${scopeKey(scope.scopeType, scope.scopeId)} does not resolve to its parent`,
      );
    }

    const counts = await this.repo.readSourceCounts(scope);
    // `deriveMetricFields` rather than `deriveMetrics`: the row stores the
    // unrounded totals and their denominators as well as the rounded averages,
    // because a later roll-up (TASK-061) must be `sum(total) / sum(count)` and
    // cannot reconstruct that from two rounded means.
    const metrics = deriveMetricFields(counts);

    await this.repo.upsertMetric({
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
      scopeName: scope.scopeName,
      organizationId: scope.organizationId,
      educationProgramId: scope.educationProgramId,
      educationBatchId: scope.educationBatchId,
      academicClassId: scope.academicClassId,
      classSubjectId: scope.classSubjectId,
      recalculatedAt,
      ...metrics,
    });
  }
}

function toResponse(record: ReportingMetricRecord): ReportingScopeResponseDto {
  return {
    id: record.id,
    scopeType: record.scopeType as never,
    scopeId: record.scopeId,
    scopeName: record.scopeName,
    organizationId: record.organizationId,
    educationProgramId: record.educationProgramId,
    educationBatchId: record.educationBatchId,
    academicClassId: record.academicClassId,
    classSubjectId: record.classSubjectId,
    metrics: toReportingMetricsResponse(record),
    generatedAt: new Date().toISOString(),
    recalculatedAt: record.recalculatedAt.toISOString(),
  };
}
