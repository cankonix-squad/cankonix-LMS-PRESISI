import type { ReportingScopeType } from '@prisma/client';

export type { ReportingScopeType };

/**
 * Reported metrics for one scope.
 *
 * Every value is derived from the transactional tables. Floats are used rather
 * than `Decimal` because these are display figures, not money: a rounded average
 * is the honest representation, and carrying false precision would imply the
 * number is exact when it is a mean over a moving population.
 */
export interface ReportingMetrics {
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
}

/**
 * A stored metric row, flattened.
 *
 * The parent id columns are denormalized on purpose so a drill-down can select a
 * subtree with one indexed predicate instead of walking the hierarchy.
 */
export interface ReportingMetricRecord {
  id: string;
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  organizationId: string | null;
  educationProgramId: string | null;
  educationBatchId: string | null;
  academicClassId: string | null;
  classSubjectId: string | null;
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  attendedCount: number;
  progressPercentTotal: number;
  progressSampleCount: number;
  finalScoreTotal: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  recalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportingMetricListFilter {
  scopeType?: ReportingScopeType;
  scopeId?: string;
  organizationId?: string;
  educationProgramId?: string;
  educationBatchId?: string;
  academicClassId?: string;
  classSubjectId?: string;
  page: number;
  limit: number;
}

export interface ReportingMetricListResult {
  data: ReportingMetricRecord[];
  total: number;
}

/** What a refresh needs to write for one scope. */
export interface ReportingMetricUpsertData extends ReportingMetrics {
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  organizationId: string | null;
  educationProgramId: string | null;
  educationBatchId: string | null;
  academicClassId: string | null;
  classSubjectId: string | null;
  attendedCount: number;
  progressPercentTotal: number;
  progressSampleCount: number;
  finalScoreTotal: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  recalculatedAt: Date;
}

/**
 * A scope to be refreshed, resolved to the ids a metric row needs.
 *
 * Produced by the source-query side of the repository, which is the only place
 * that knows how to walk from an enrollment up to its organization.
 */
export interface ReportingScopeDescriptor {
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  organizationId: string | null;
  educationProgramId: string | null;
  educationBatchId: string | null;
  academicClassId: string | null;
  classSubjectId: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

/**
 * Raw counters read from the transactional tables for one scope.
 *
 * Kept distinct from `ReportingMetrics` because these are the honest inputs —
 * sums and counts — while the metrics are the derived ratios. Separating them
 * keeps the averaging rules in the pure domain layer where they can be tested,
 * instead of buried in SQL.
 */
export interface ReportingSourceCounts {
  participants: number;
  activeParticipants: number;
  progressPercentTotal: number;
  progressPercentCount: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  sickCount: number;
  absentCount: number;
  totalSessions: number;
  finalScoreTotal: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}

/**
 * Which stored scopes an executive roll-up may read (TASK-061).
 *
 * A `null` field means "no restriction on this axis". An empty array means "no
 * scope on this axis", which matches nothing — the distinction matters, because
 * collapsing the two would turn a caller with no grants into one with all of
 * them.
 */
export interface ExecutiveMetricFilter {
  level: ReportingScopeType;
  organizationIds: string[] | null;
  programIds: string[] | null;
  batchIds: string[] | null;
  classIds: string[] | null;
  classSubjectIds: string[] | null;
  periodFrom: Date | null;
  periodTo: Date | null;
}

/**
 * Summed totals read from the read model for one level (TASK-061).
 *
 * Everything here is additive, which is what makes a roll-up exact: totals are
 * summed and then divided once, rather than averaging the averages stored on
 * each row. `progressSampleCount` and `gradedCount` are the denominators that
 * make that possible.
 */
export interface ExecutiveSums {
  scopeCount: number;
  participants: number;
  activeParticipants: number;
  attendedCount: number;
  totalSessions: number;
  progressPercentTotal: number;
  progressSampleCount: number;
  finalScoreTotal: number;
  gradedCount: number;
  unapprovedGradeCount: number;
  graduationEvaluationCount: number;
  graduationEligibleCount: number;
  graduationApprovedCount: number;
  graduationPassCount: number;
  graduationFailCount: number;
  graduationRemedialCount: number;
  graduationWithdrawnCount: number;
  graduatedCount: number;
}

/** Entity counts per level inside a filter (TASK-061). */
export interface ExecutiveScopeCounts {
  institutions: number;
  programs: number;
  batches: number;
  classes: number;
}

/**
 * A node's ancestry (TASK-062).
 *
 * Every axis a grant can be written against, so "is this node at or below a
 * granted node" becomes a pure function over data the repository has already
 * fetched — no second query, and no per-node walk up the hierarchy.
 */
export interface ExecutiveNodePath {
  organizationId: string | null;
  educationProgramId: string | null;
  educationBatchId: string | null;
  academicClassId: string | null;
  classSubjectId: string | null;
  enrollmentId: string | null;
}

/**
 * One child node of the drill-down walk (TASK-062).
 *
 * Deliberately *not* a `ReportingMetricRecord`: a node exists in the hierarchy
 * whether or not the read model has a row for it, and a walk that could only show
 * refreshed nodes would silently skip a real branch. `metrics` is therefore
 * nullable, and the response says so rather than pretending the branch is absent.
 */
export interface DrilldownChildNode {
  level: ReportingScopeType;
  id: string;
  name: string | null;
  code: string | null;
  /**
   * The immediate parent, as the *domain* records it — not as the caller supplied
   * it. Echoed so a client can rebuild a breadcrumb without a second request.
   */
  parentId: string | null;
  /** How many nodes sit one level below this one. */
  childCount: number;
  /** The node's ancestry, used for the in-memory reach re-check. */
  path: ExecutiveNodePath;
  /** The stored read-model row, or `null` when never refreshed. */
  metrics: ReportingMetricRecord | null;
}

/** One page of drill-down children. */
export interface DrilldownChildPage {
  data: DrilldownChildNode[];
  total: number;
}

/** What the drill-down asks the repository for. */
export interface DrilldownChildrenQuery {
  /** The level of the children to return. */
  level: ReportingScopeType;
  /**
   * The node whose children are wanted, or `null` for the caller's entry points.
   *
   * `null` is only ever passed for the organization level; every other level is
   * defined by the node that contains it.
   */
  parentId: string | null;
  /**
   * The granted organization ids, or `null` when the caller is unrestricted.
   *
   * Applied only when `parentId` is `null`. When a parent is named, that parent's
   * own reach check has already established that everything beneath it is in
   * scope, so narrowing again would add a predicate that can only be redundant.
   */
  rootOrganizationIds: string[] | null;
  page: number;
  limit: number;
}

/**
 * The hierarchy facts the drill-down needs (TASK-062).
 *
 * Kept as its own contract rather than folded into `ReportingRepository`, because
 * it is a different kind of dependency. `ReportingRepository` reads the read model
 * and never computes; this one resolves parent-child relationships from the tables
 * that own them and then *joins* the read model onto the result. Separating them is
 * what keeps the "reporting reads never compute" invariant checkable by reading a
 * single file.
 */
export interface DrilldownRepository {
  /**
   * The ancestry of a node, or `null` when no such row exists.
   *
   * The level is asserted rather than inferred: a caller passing a program id where
   * an organization is required must be told that, not handed the program.
   */
  resolveNodePath(
    level: ReportingScopeType,
    id: string,
  ): Promise<ExecutiveNodePath | null>;

  /**
   * Which level an id belongs to, or `null` when it belongs to none.
   *
   * Used only to make a refusal precise: knowing that a supplied parent id is a
   * program is what turns "not found" into "that is a program, and this level needs
   * a batch". It never decides access, so a diagnostic lookup that fails cannot
   * widen anything.
   */
  identifyNodeLevel(id: string): Promise<ReportingScopeType | null>;

  /**
   * Expands seed ids one step down.
   *
   * Used to project a grant onto the levels below the one it was written at: a grant
   * on a batch has to resolve to that batch's classes, and only the repository knows
   * how to ask.
   */
  expandOneStep(
    level: ReportingScopeType,
    ids: readonly string[],
  ): Promise<string[]>;

  /** The children of a node, with their stored metrics attached. */
  listChildren(query: DrilldownChildrenQuery): Promise<DrilldownChildPage>;
}

export const DRILLDOWN_REPOSITORY = Symbol('DRILLDOWN_REPOSITORY');

export interface ReportingRepository {
  /** Reads the stored read model. Never computes. */
  list(filter: ReportingMetricListFilter): Promise<ReportingMetricListResult>;
  find(
    scopeType: ReportingScopeType,
    scopeId: string,
  ): Promise<ReportingMetricRecord | null>;
  /** Recomputes and upserts one scope's row. Idempotent by construction. */
  upsertMetric(data: ReportingMetricUpsertData): Promise<ReportingMetricRecord>;
  /** Enumerates the scopes that exist for a filter, resolved to their parents. */
  listScopes(filter: {
    scopeType?: ReportingScopeType;
    scopeId?: string;
    organizationId?: string;
  }): Promise<ReportingScopeDescriptor[]>;
  /** Reads the raw counters for one resolved scope. */
  readSourceCounts(
    scope: ReportingScopeDescriptor,
  ): Promise<ReportingSourceCounts>;

  /**
   * Sums the stored totals for a set of scopes (TASK-061).
   *
   * Returns totals and denominators rather than ratios, for the same reason
   * `readSourceCounts` does: the division is policy, and policy belongs in a pure
   * function that can be tested without a database.
   */
  readExecutiveSums(filter: ExecutiveMetricFilter): Promise<ExecutiveSums>;
  /**
   * Counts the scopes of one type inside a filter (TASK-061).
   *
   * Kept separate from `readExecutiveSums` because the counts are of *entities*
   * (how many institutions, programs, batches, classes) while the sums are of
   * *people and work*. Folding them into one query would return a row of zeroes
   * for a level with no rows, which is indistinguishable from a real zero.
   */
  countExecutiveScopes(
    filter: ExecutiveMetricFilter,
  ): Promise<ExecutiveScopeCounts>;
  /** Paginated breakdown rows inside a filter (TASK-061). */
  listExecutiveBreakdown(
    filter: ExecutiveMetricFilter,
    page: number,
    limit: number,
  ): Promise<ReportingMetricListResult>;
  /** Bounded period rows for KPI trend output (TASK-063). */
  listKpiTrendRows(
    filter: ExecutiveMetricFilter,
    limit: number,
  ): Promise<ReportingMetricRecord[]>;
}

export const REPORTING_REPOSITORY = Symbol('REPORTING_REPOSITORY');
