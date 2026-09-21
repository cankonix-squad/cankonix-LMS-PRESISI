import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportingScopeType } from '@prisma/client';
import { ExecutiveKpis, toExecutiveKpis } from './executive-kpis';
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
  ExecutiveOverviewQueryDto,
  ExecutiveOverviewScopeDto,
} from './dto/executive-overview-query.dto';
import {
  ExecutiveBreakdownItemResponseDto,
  ExecutiveOverviewResponseDto,
} from './dto/executive-overview-response.dto';
import { REPORTING_REPOSITORY, ReportingRepository } from './reporting.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

/**
 * Executive overview (TASK-061).
 *
 * ## The one thing this service must not do
 *
 * It must not decide how much to show from the request. The request says *which*
 * grain was asked for; the caller's **grant** says how far they may see. Those
 * are resolved separately and in that order, so a caller cannot obtain national
 * figures by typing `scope=NATIONAL` any more than they can by typing someone
 * else's institution id.
 *
 * ## Why the grain is validated before anything is read
 *
 * Two checks happen before a single row is fetched:
 *
 * 1. the grant must not be empty — a caller with no scope gets `403`, not a
 *    dashboard full of zeroes that looks like a quiet term;
 * 2. the request must fall inside the grant — otherwise `403`, for the same
 *    reason: an empty report and a denied report are different statements and
 *    only one of them is true.
 *
 * ## Read-only, and only over the read model
 *
 * Every query goes through the reporting repository, which reads
 * `reporting_metrics` and nothing else. The executive overview therefore costs
 * the same whether the institution has taught for one term or ten, which is the
 * property TASK-060 built the read model for.
 *
 * ## Why a read is not audited
 *
 * `AGENTS.md` requires audit logging for *sensitive mutations*, and this is not
 * one: it writes nothing. Adding an audit row per dashboard view would put a
 * write on the read path this task exists to keep cheap, and would fill the audit
 * trail with page views that make the mutations harder to find. The control here
 * is the permission plus the resolved scope, both of which are enforced before a
 * single row is read.
 */
@Injectable()
export class ExecutiveReportingService {
  constructor(
    @Inject(REPORTING_REPOSITORY)
    private readonly repo: ReportingRepository,
    @Inject(EXECUTIVE_SCOPE_GRANT_RESOLVER)
    private readonly scopeResolver: ExecutiveScopeGrantResolver,
  ) {}

  /**
   * Assembles the overview.
   *
   * The response echoes the resolved scope back, including `accessLevel`, because
   * an executive reading a number needs to know what population it covers. A
   * scoped caller who asked for `NATIONAL` receives their own institutions' data
   * plus `accessLevel: 'SCOPED'`, which is the honest answer: the figures are not
   * national, and the response says so rather than implying otherwise.
   */
  async overview(
    userAccountId: string,
    query: ExecutiveOverviewQueryDto,
  ): Promise<ExecutiveOverviewResponseDto> {
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
    const level = aggregateLevelFor(requestedScope);

    const filter = toExecutiveMetricFilter(narrowed, level, period);

    const [sums, counts, breakdown] = await Promise.all([
      this.repo.readExecutiveSums(filter),
      this.repo.countExecutiveScopes(filter),
      this.repo.listExecutiveBreakdown(
        filter,
        query.page ?? DEFAULT_PAGE,
        query.limit ?? DEFAULT_LIMIT,
      ),
    ]);

    const kpis: ExecutiveKpis = toExecutiveKpis(sums);

    return {
      scope: {
        scope: requestedScope as never,
        scopeId: query.scopeId ?? null,
        accessLevel: executiveAccessLevel(grant),
        institutionCount: grant.unrestricted ? 0 : grant.organizationIds.length,
        periodFrom: period.from ? period.from.toISOString() : null,
        periodTo: period.to ? period.to.toISOString() : null,
      },
      kpis: {
        ...kpis,
        institutions: counts.institutions,
        programs: counts.programs,
        batches: counts.batches,
        classes: counts.classes,
      },
      breakdown: {
        data: breakdown.data.map(toBreakdownItem),
        total: breakdown.total,
        page: query.page ?? DEFAULT_PAGE,
        limit: query.limit ?? DEFAULT_LIMIT,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Reads one institution's stored metrics.
   *
   * Deliberately narrow: it takes an organization id, checks the grant against
   * that id, and then reads. It does not accept an arbitrary scope type or id
   * from the caller, because the wider surface — walking Organization → Program →
   * Batch → Class → ClassSubject → participant — is TASK-062's job, and every step
   * of it needs its own parent-child check.
   */
  async institutionDetail(
    userAccountId: string,
    organizationId: string,
  ): Promise<ExecutiveBreakdownItemResponseDto> {
    const grant = await this.scopeResolver.resolveGrant(userAccountId);

    if (isEmptyExecutiveScopeGrant(grant)) {
      throw new ForbiddenException(
        'Access denied: no reporting scope is granted to this account',
      );
    }

    const narrowed = narrowExecutiveScope(
      grant,
      'ORGANIZATION',
      organizationId,
    );
    if (!narrowed) {
      throw new ForbiddenException(
        `Access denied: ORGANIZATION:${organizationId} is outside the reporting scope granted to this account`,
      );
    }

    const row = await this.repo.find(
      ReportingScopeType.ORGANIZATION,
      organizationId,
    );
    if (!row) {
      throw new NotFoundException(
        `No reporting metrics for organization ${organizationId}; run a refresh first`,
      );
    }

    return toBreakdownItem(row);
  }
}

/**
 * Maps the requested grain onto the level whose rows are summed.
 *
 * `NATIONAL` sums organizations, because organizations are the top disjoint
 * roster. Summing a deeper level for a national figure would work arithmetically
 * but would mean a national total whose `institutions` count came from a
 * different level than its participants, which is the kind of inconsistency a
 * reader cannot detect and therefore cannot discount.
 */
function aggregateLevelFor(scope: ExecutiveOverviewScope): ReportingScopeType {
  switch (scope) {
    case 'NATIONAL':
      return ReportingScopeType.ORGANIZATION;
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

/**
 * Parses the inclusive period.
 *
 * `periodEnd` is widened to the end of its day. An executive asking for
 * "1 January to 31 March" means the whole of 31 March, and a batch that starts on
 * that date should be included — treating the bound as midnight would silently
 * drop the last day, which is the kind of off-by-one nobody notices until a
 * quarterly figure disagrees with a monthly one.
 */
function parsePeriod(
  periodFrom: string | undefined,
  periodTo: string | undefined,
): { from: Date | null; to: Date | null } {
  return {
    from: periodFrom ? new Date(periodFrom) : null,
    to: periodTo ? new Date(`${periodTo.slice(0, 10)}T23:59:59.999Z`) : null,
  };
}

function toBreakdownItem(row: {
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  recalculatedAt: Date;
}): ExecutiveBreakdownItemResponseDto {
  return {
    scopeType: row.scopeType as never,
    scopeId: row.scopeId,
    scopeName: row.scopeName,
    metrics: {
      participants: row.participants,
      activeParticipants: row.activeParticipants,
      averageProgressPercent: row.averageProgressPercent,
      attendancePercentage: row.attendancePercentage,
      totalSessions: row.totalSessions,
      averageFinalScore: row.averageFinalScore,
      gradedCount: row.gradedCount,
      unapprovedGradeCount: row.unapprovedGradeCount,
    },
    recalculatedAt: row.recalculatedAt.toISOString(),
  };
}
