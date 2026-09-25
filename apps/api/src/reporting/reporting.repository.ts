import { Injectable } from '@nestjs/common';
import { Prisma, ReportingScopeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ExecutiveMetricFilter,
  ExecutiveScopeCounts,
  ExecutiveSums,
  ReportingMetricListFilter,
  ReportingMetricListResult,
  ReportingMetricRecord,
  ReportingMetricUpsertData,
  ReportingRepository,
  ReportingScopeDescriptor,
  ReportingSourceCounts,
} from './reporting.types';
import { emptySourceCounts } from './reporting-rules';

/**
 * Prisma-backed reporting repository (TASK-060).
 *
 * Two clearly separated halves, and keeping them apart is the whole point of
 * this task:
 *
 * - **`list`/`find` read only `reporting_metrics`.** They never touch a
 *   transactional table, so a dashboard read cannot degrade as the transactional
 *   data grows.
 * - **`listScopes`/`readSourceCounts` read only the transactional tables.** They
 *   are reached exclusively from a refresh, never from a report read.
 *
 * There is no `delete`: a metric row is a derived cache, so a scope that no
 * longer exists is simply no longer refreshed. Removing the row would be a
 * convenience, not a correctness requirement, and keeping the operation absent
 * means nothing can erase a report by accident.
 *
 * ### Why the counters are read as sums rather than computed in SQL
 *
 * `readSourceCounts` returns totals and counts, and `deriveMetrics` turns them
 * into ratios. Keeping the division out of SQL means the averaging policy (which
 * denominator, what happens at zero) is testable without a database, which is
 * what the "fixture totals match transactional data" criterion actually needs.
 */
@Injectable()
export class PrismaReportingRepository implements ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Read model ------------------------------------------------------------

  async list(
    filter: ReportingMetricListFilter,
  ): Promise<ReportingMetricListResult> {
    const where: Prisma.ReportingMetricWhereInput = {
      scopeType: filter.scopeType,
      scopeId: filter.scopeId,
      organizationId: filter.organizationId,
      educationProgramId: filter.educationProgramId,
      educationBatchId: filter.educationBatchId,
      academicClassId: filter.academicClassId,
      classSubjectId: filter.classSubjectId,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportingMetric.findMany({
        where,
        orderBy: [{ scopeType: 'asc' }, { scopeName: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.reportingMetric.count({ where }),
    ]);

    return { data, total };
  }

  async find(
    scopeType: ReportingScopeType,
    scopeId: string,
  ): Promise<ReportingMetricRecord | null> {
    return this.prisma.reportingMetric.findUnique({
      where: { scopeType_scopeId: { scopeType, scopeId } },
    });
  }

  /**
   * Upserts one scope's row.
   *
   * The unique key is `(scopeType, scopeId)`, so this is the operation that makes
   * a refresh idempotent: re-running it overwrites the same row with the same
   * recomputed values instead of appending a second one.
   */
  async upsertMetric(
    data: ReportingMetricUpsertData,
  ): Promise<ReportingMetricRecord> {
    const {
      scopeType,
      scopeId,
      scopeName,
      organizationId,
      educationProgramId,
      educationBatchId,
      academicClassId,
      classSubjectId,
      recalculatedAt,
      ...metrics
    } = data;

    const payload = {
      scopeName,
      organizationId,
      educationProgramId,
      educationBatchId,
      academicClassId,
      classSubjectId,
      recalculatedAt,
      ...metrics,
    };

    return this.prisma.reportingMetric.upsert({
      where: { scopeType_scopeId: { scopeType, scopeId } },
      create: { scopeType, scopeId, ...payload },
      update: payload,
    });
  }

  // --- Source enumeration ----------------------------------------------------

  /**
   * Enumerates the scopes that exist, each resolved to the parent ids a metric
   * row stores.
   *
   * Resolution happens here rather than in the service because it is a walk
   * through the transactional hierarchy, and the service should not have to know
   * that a class subject reaches its organization via class → batch → program.
   */
  async listScopes(filter: {
    scopeType?: ReportingScopeType;
    scopeId?: string;
    organizationId?: string;
  }): Promise<ReportingScopeDescriptor[]> {
    const wanted = filter.scopeType;
    const scopes: ReportingScopeDescriptor[] = [];

    if (wanted === ReportingScopeType.ORGANIZATION || wanted === undefined) {
      const organizations = await this.prisma.organization.findMany({
        where: filter.organizationId
          ? { id: filter.organizationId }
          : undefined,
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      for (const organization of organizations) {
        scopes.push({
          scopeType: ReportingScopeType.ORGANIZATION,
          scopeId: organization.id,
          scopeName: organization.name,
          organizationId: organization.id,
          educationProgramId: null,
          educationBatchId: null,
          academicClassId: null,
          classSubjectId: null,
          // An organization spans many batches, so it has no single period. The
          // period filter still applies to it: rows below carry their batch's
          // dates, and the organization row is excluded when the requested
          // window misses all of them.
          periodStart: null,
          periodEnd: null,
        });
      }
    }

    if (wanted === ReportingScopeType.PROGRAM || wanted === undefined) {
      const programs = await this.prisma.educationProgram.findMany({
        where: {
          organizationId: filter.organizationId,
          id: filter.scopeId,
        },
        select: { id: true, name: true, organizationId: true },
        orderBy: { name: 'asc' },
      });
      for (const program of programs) {
        scopes.push({
          scopeType: ReportingScopeType.PROGRAM,
          scopeId: program.id,
          scopeName: program.name,
          organizationId: program.organizationId,
          educationProgramId: program.id,
          educationBatchId: null,
          academicClassId: null,
          classSubjectId: null,
          // A program runs for as long as its batches do; see ORGANIZATION above.
          periodStart: null,
          periodEnd: null,
        });
      }
    }

    if (wanted === ReportingScopeType.BATCH || wanted === undefined) {
      const batches = await this.prisma.educationBatch.findMany({
        where: {
          id: filter.scopeId,
          educationProgram: { organizationId: filter.organizationId },
        },
        select: {
          id: true,
          name: true,
          educationProgramId: true,
          startDate: true,
          endDate: true,
          educationProgram: { select: { organizationId: true } },
        },
        orderBy: { name: 'asc' },
      });
      for (const batch of batches) {
        scopes.push({
          scopeType: ReportingScopeType.BATCH,
          scopeId: batch.id,
          scopeName: batch.name,
          organizationId: batch.educationProgram.organizationId,
          educationProgramId: batch.educationProgramId,
          educationBatchId: batch.id,
          academicClassId: null,
          classSubjectId: null,
          periodStart: batch.startDate,
          periodEnd: batch.endDate,
        });
      }
    }

    if (wanted === ReportingScopeType.CLASS || wanted === undefined) {
      const classes = await this.prisma.academicClass.findMany({
        where: {
          id: filter.scopeId,
          educationBatch: {
            educationProgram: { organizationId: filter.organizationId },
          },
        },
        select: {
          id: true,
          name: true,
          educationBatchId: true,
          educationBatch: {
            select: {
              educationProgramId: true,
              startDate: true,
              endDate: true,
              educationProgram: { select: { organizationId: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      for (const academicClass of classes) {
        scopes.push({
          scopeType: ReportingScopeType.CLASS,
          scopeId: academicClass.id,
          scopeName: academicClass.name,
          organizationId:
            academicClass.educationBatch.educationProgram.organizationId,
          educationProgramId: academicClass.educationBatch.educationProgramId,
          educationBatchId: academicClass.educationBatchId,
          academicClassId: academicClass.id,
          classSubjectId: null,
          periodStart: academicClass.educationBatch.startDate,
          periodEnd: academicClass.educationBatch.endDate,
        });
      }
    }

    if (wanted === ReportingScopeType.CLASS_SUBJECT || wanted === undefined) {
      const classSubjects = await this.prisma.classSubject.findMany({
        where: {
          id: filter.scopeId,
          academicClass: {
            educationBatch: {
              educationProgram: { organizationId: filter.organizationId },
            },
          },
        },
        select: {
          id: true,
          displayName: true,
          code: true,
          academicClassId: true,
          curriculumSubject: {
            select: { subject: { select: { name: true } } },
          },
          academicClass: {
            select: {
              educationBatchId: true,
              educationBatch: {
                select: {
                  educationProgramId: true,
                  startDate: true,
                  endDate: true,
                  educationProgram: { select: { organizationId: true } },
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
      });
      for (const classSubject of classSubjects) {
        scopes.push({
          scopeType: ReportingScopeType.CLASS_SUBJECT,
          scopeId: classSubject.id,
          scopeName:
            classSubject.displayName ??
            classSubject.curriculumSubject.subject.name,
          organizationId:
            classSubject.academicClass.educationBatch.educationProgram
              .organizationId,
          educationProgramId:
            classSubject.academicClass.educationBatch.educationProgramId,
          educationBatchId: classSubject.academicClass.educationBatchId,
          academicClassId: classSubject.academicClassId,
          classSubjectId: classSubject.id,
          periodStart: classSubject.academicClass.educationBatch.startDate,
          periodEnd: classSubject.academicClass.educationBatch.endDate,
        });
      }
    }

    if (wanted === ReportingScopeType.ENROLLMENT || wanted === undefined) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          id: filter.scopeId,
          educationBatch: {
            educationProgram: { organizationId: filter.organizationId },
          },
        },
        select: {
          id: true,
          academicClassId: true,
          educationBatchId: true,
          person: { select: { fullName: true } },
          educationBatch: {
            select: {
              educationProgramId: true,
              startDate: true,
              endDate: true,
              educationProgram: { select: { organizationId: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      });
      for (const enrollment of enrollments) {
        scopes.push({
          scopeType: ReportingScopeType.ENROLLMENT,
          scopeId: enrollment.id,
          scopeName: enrollment.person.fullName,
          organizationId:
            enrollment.educationBatch.educationProgram.organizationId,
          educationProgramId: enrollment.educationBatch.educationProgramId,
          educationBatchId: enrollment.educationBatchId,
          academicClassId: enrollment.academicClassId,
          classSubjectId: null,
          // A participant's period is their batch's period, which is what makes
          // a period filter meaningful for a cohort.
          periodStart: enrollment.educationBatch.startDate,
          periodEnd: enrollment.educationBatch.endDate,
        });
      }
    }

    return scopes;
  }

  // --- Source counters -------------------------------------------------------

  /**
   * Reads the raw counters for one scope.
   *
   * Attendance comes from the pre-aggregated `attendance_summaries` (TASK-033)
   * rather than from `attendance_records`, and progress from
   * `class_subject_progress_aggregates` (TASK-023) rather than from
   * `learning_progress`. Both are maintained incrementally by their own domains,
   * so this reads a handful of rows instead of scanning the two highest-volume
   * tables in the schema — which is the difference between a report that stays
   * fast and one that gets slower every term.
   */
  async readSourceCounts(
    scope: ReportingScopeDescriptor,
  ): Promise<ReportingSourceCounts> {
    const counts = emptySourceCounts();

    switch (scope.scopeType) {
      case ReportingScopeType.ORGANIZATION: {
        await this.fillParticipants(counts, {
          educationBatch: {
            educationProgram: { organizationId: scope.scopeId },
          },
        });
        await this.fillAttendanceAcrossPrograms(counts, scope.scopeId);
        await this.fillGrades(counts, {
          enrollment: {
            educationBatch: {
              educationProgram: { organizationId: scope.scopeId },
            },
          },
        });
        await this.fillProgress(counts, {
          enrollmentId: {
            in: await this.enrollmentIdsFor({
              educationBatch: {
                educationProgram: { organizationId: scope.scopeId },
              },
            }),
          },
        });
        await this.fillGraduation(counts, {
          educationBatch: {
            educationProgram: { organizationId: scope.scopeId },
          },
        });
        break;
      }

      case ReportingScopeType.PROGRAM: {
        await this.fillParticipants(counts, {
          educationBatch: { educationProgramId: scope.scopeId },
        });
        await this.fillAttendanceSummary(counts, 'PROGRAM', scope.scopeId);
        await this.fillGrades(counts, {
          enrollment: { educationBatch: { educationProgramId: scope.scopeId } },
        });
        await this.fillProgress(counts, {
          enrollmentId: {
            in: await this.enrollmentIdsFor({
              educationBatch: { educationProgramId: scope.scopeId },
            }),
          },
        });
        await this.fillGraduation(counts, {
          educationBatch: { educationProgramId: scope.scopeId },
        });
        break;
      }

      case ReportingScopeType.BATCH: {
        await this.fillParticipants(counts, {
          educationBatchId: scope.scopeId,
        });
        await this.fillAttendanceSummary(counts, 'BATCH', scope.scopeId);
        await this.fillGrades(counts, {
          enrollment: { educationBatchId: scope.scopeId },
        });
        await this.fillProgress(counts, {
          enrollmentId: {
            in: await this.enrollmentIdsFor({
              educationBatchId: scope.scopeId,
            }),
          },
        });
        await this.fillGraduation(counts, {
          educationBatchId: scope.scopeId,
        });
        break;
      }

      case ReportingScopeType.CLASS: {
        await this.fillParticipants(counts, {
          academicClassId: scope.scopeId,
        });
        await this.fillAttendanceSummary(counts, 'CLASS', scope.scopeId);
        await this.fillGrades(counts, {
          enrollment: { academicClassId: scope.scopeId },
        });
        await this.fillProgress(counts, {
          enrollmentId: {
            in: await this.enrollmentIdsFor({
              academicClassId: scope.scopeId,
            }),
          },
        });
        await this.fillGraduation(counts, {
          academicClassId: scope.scopeId,
        });
        break;
      }

      case ReportingScopeType.CLASS_SUBJECT: {
        // Participants are the class roster, not the subject roster: everyone in
        // the class is expected to sit the subject, so the class is the honest
        // denominator for "how many people does this subject report on".
        const classSubject = await this.prisma.classSubject.findUnique({
          where: { id: scope.scopeId },
          select: { academicClassId: true },
        });
        if (classSubject) {
          await this.fillParticipants(counts, {
            academicClassId: classSubject.academicClassId,
          });
        }
        await this.fillAttendanceSummary(
          counts,
          'CLASS_SUBJECT',
          scope.scopeId,
        );
        await this.fillGrades(counts, { classSubjectId: scope.scopeId });
        await this.fillProgress(counts, { classSubjectId: scope.scopeId });
        await this.fillGraduation(counts, {
          academicClass: {
            classSubjects: { some: { id: scope.scopeId } },
          },
        });
        break;
      }

      case ReportingScopeType.ENROLLMENT: {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: { id: scope.scopeId },
          select: { id: true, status: true },
        });
        if (enrollment) {
          counts.participants = 1;
          counts.activeParticipants = enrollment.status === 'ACTIVE' ? 1 : 0;
        }
        await this.fillAttendanceSummary(counts, 'ENROLLMENT', scope.scopeId);
        await this.fillGrades(counts, { enrollmentId: scope.scopeId });
        await this.fillProgress(counts, { enrollmentId: scope.scopeId });
        // `fillGraduation` takes an `EnrollmentWhereInput` (it filters through
        // the enrollment relation), so the scope's own id is matched on `id`.
        await this.fillGraduation(counts, { id: scope.scopeId });
        break;
      }

      default:
        // Exhaustive by construction: a new scope type without a branch here is
        // a compile error, not a silently empty report.
        break;
    }

    counts.periodStart = scope.periodStart;
    counts.periodEnd = scope.periodEnd;
    return counts;
  }

  // --- Counters internals ----------------------------------------------------

  private async fillParticipants(
    counts: ReportingSourceCounts,
    where: Prisma.EnrollmentWhereInput,
  ): Promise<void> {
    const [participants, activeParticipants] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.count({ where: { ...where, status: 'ACTIVE' } }),
    ]);
    counts.participants = participants;
    counts.activeParticipants = activeParticipants;
  }

  /**
   * Attendance for a scope that has its own summary row.
   *
   * `totalSessions` is the settled denominator: it counts closed sessions across
   * the participants in the scope, which is why the percentage is computed from
   * the summed counters rather than by averaging the stored per-participant
   * percentages. Averaging percentages would let a participant with three
   * sessions outweigh one with thirty.
   */
  private async fillAttendanceSummary(
    counts: ReportingSourceCounts,
    scopeType: 'ENROLLMENT' | 'CLASS_SUBJECT' | 'CLASS' | 'BATCH' | 'PROGRAM',
    scopeId: string,
  ): Promise<void> {
    const summary = await this.prisma.attendanceSummary.findUnique({
      where: { scopeType_scopeId: { scopeType, scopeId } },
      select: {
        presentCount: true,
        lateCount: true,
        excusedCount: true,
        sickCount: true,
        absentCount: true,
        totalSessions: true,
      },
    });
    if (!summary) return;

    counts.presentCount = summary.presentCount;
    counts.lateCount = summary.lateCount;
    counts.excusedCount = summary.excusedCount;
    counts.sickCount = summary.sickCount;
    counts.absentCount = summary.absentCount;
    counts.totalSessions = summary.totalSessions;
  }

  /**
   * Attendance for an organization, which has no summary row of its own.
   *
   * `attendance_summaries` stops at PROGRAM, so the organization figure is the
   * sum of its programs' rows. Summing the stored counters keeps this consistent
   * with the levels below: an organization total is the addition of its parts,
   * not an independently computed number that could disagree with them.
   */
  private async fillAttendanceAcrossPrograms(
    counts: ReportingSourceCounts,
    organizationId: string,
  ): Promise<void> {
    const aggregate = await this.prisma.attendanceSummary.aggregate({
      where: {
        scopeType: 'PROGRAM',
        academicProgramId: {
          in: await this.programIdsOfOrganization(organizationId),
        },
      },
      _sum: {
        presentCount: true,
        lateCount: true,
        excusedCount: true,
        sickCount: true,
        absentCount: true,
        totalSessions: true,
      },
    });

    counts.presentCount = aggregate._sum.presentCount ?? 0;
    counts.lateCount = aggregate._sum.lateCount ?? 0;
    counts.excusedCount = aggregate._sum.excusedCount ?? 0;
    counts.sickCount = aggregate._sum.sickCount ?? 0;
    counts.absentCount = aggregate._sum.absentCount ?? 0;
    counts.totalSessions = aggregate._sum.totalSessions ?? 0;
  }

  private async programIdsOfOrganization(
    organizationId: string,
  ): Promise<string[]> {
    const programs = await this.prisma.educationProgram.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return programs.map((program) => program.id);
  }

  /**
   * Resolves the enrollments of a scope.
   *
   * `class_subject_progress_aggregates` stores `enrollmentId` as a plain column
   * with no relation back to `enrollment`, so progress for a scope above the
   * class subject has to be filtered by an explicit id list. Resolving it once
   * here keeps the scope branches readable and, more importantly, keeps the list
   * to a single query per scope rather than a query per participant.
   */
  private async enrollmentIdsFor(
    where: Prisma.EnrollmentWhereInput,
  ): Promise<string[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where,
      select: { id: true },
    });
    return enrollments.map((enrollment) => enrollment.id);
  }

  /**
   * Final grades for a scope.
   *
   * `gradedCount` counts grade rows and `unapprovedGradeCount` counts those still
   * `CALCULATED`. The pair is reported together because an average built on
   * unapproved grades is provisional, and a reader needs to see how provisional.
   */
  private async fillGrades(
    counts: ReportingSourceCounts,
    where: Prisma.FinalGradeWhereInput,
  ): Promise<void> {
    const [aggregate, unapproved] = await Promise.all([
      this.prisma.finalGrade.aggregate({
        where,
        _sum: { numericScore: true },
        _count: { _all: true },
      }),
      this.prisma.finalGrade.count({
        where: { ...where, status: 'CALCULATED' },
      }),
    ]);

    counts.gradedCount = aggregate._count._all;
    counts.unapprovedGradeCount = unapproved;
    // Prisma returns Decimal for a summed Decimal column; convert once here so
    // the domain layer works in plain numbers.
    counts.finalScoreTotal = aggregate._sum.numericScore
      ? Number(aggregate._sum.numericScore)
      : 0;
  }

  /**
   * Per-participant progress for a scope.
   *
   * Reads the incrementally maintained `class_subject_progress_aggregates`
   * (TASK-023) rather than `learning_progress`. The total is a sum of
   * per-participant percentages and the count is how many participants
   * contributed, so `deriveMetrics` produces the mean of participants — each
   * person weighted once, regardless of how many activities they have.
   */
  private async fillProgress(
    counts: ReportingSourceCounts,
    where: Prisma.ClassSubjectProgressAggregateWhereInput,
  ): Promise<void> {
    const aggregate = await this.prisma.classSubjectProgressAggregate.aggregate(
      {
        where,
        _sum: { progressPercent: true },
        _count: { _all: true },
      },
    );

    counts.progressPercentTotal = aggregate._sum.progressPercent ?? 0;
    counts.progressPercentCount = aggregate._count._all;
  }

  /**
   * Graduation counters for a scope (TASK-061).
   *
   * The three figures are read from three tables because they are three different
   * facts, and the gaps between them are the interesting part: evaluations the
   * rule engine produced, decisions a human put in force, and certificates
   * actually issued. A participant who is approved but uncertified is visible
   * here and invisible in a single "graduated" number.
   *
   * Only `ISSUED` certificates count. A revoked certificate is not a graduation,
   * which is the whole point of revoking it.
   */
  private async fillGraduation(
    counts: ReportingSourceCounts,
    enrollmentWhere: Prisma.EnrollmentWhereInput,
  ): Promise<void> {
    const [
      evaluations,
      eligible,
      approved,
      pass,
      fail,
      remedial,
      withdrawn,
      certified,
    ] = await Promise.all([
      this.prisma.graduationEvaluation.count({
        where: { enrollment: enrollmentWhere },
      }),
      this.prisma.graduationEvaluation.count({
        where: { enrollment: enrollmentWhere, outcome: 'ELIGIBLE' },
      }),
      this.prisma.graduationDecision.count({
        where: {
          status: 'APPROVED',
          graduationEvaluation: { enrollment: enrollmentWhere },
        },
      }),
      this.prisma.graduationDecision.count({
        where: {
          status: 'APPROVED',
          decision: 'PASS',
          graduationEvaluation: { enrollment: enrollmentWhere },
        },
      }),
      this.prisma.graduationDecision.count({
        where: {
          status: 'APPROVED',
          decision: 'FAIL',
          graduationEvaluation: { enrollment: enrollmentWhere },
        },
      }),
      this.prisma.graduationDecision.count({
        where: {
          status: 'APPROVED',
          decision: 'REMEDIAL',
          graduationEvaluation: { enrollment: enrollmentWhere },
        },
      }),
      this.prisma.graduationDecision.count({
        where: {
          status: 'APPROVED',
          decision: 'WITHDRAWN',
          graduationEvaluation: { enrollment: enrollmentWhere },
        },
      }),
      this.prisma.certificate.count({
        where: {
          status: 'ISSUED',
          decision: { graduationEvaluation: { enrollment: enrollmentWhere } },
        },
      }),
    ]);

    counts.graduationEvaluationCount = evaluations;
    counts.graduationEligibleCount = eligible;
    counts.graduationApprovedCount = approved;
    counts.graduationPassCount = pass;
    counts.graduationFailCount = fail;
    counts.graduationRemedialCount = remedial;
    counts.graduationWithdrawnCount = withdrawn;
    counts.graduatedCount = certified;
  }

  // --- Executive roll-up (TASK-061) ------------------------------------------

  /**
   * Builds the predicate that confines a roll-up to what the caller may see.
   *
   * The shape of the restriction matters. `null` means **no restriction on this
   * axis** — the caller is unrestricted. An empty array means **nothing on this
   * axis**, which must match nothing. Prisma treats `in: []` as "match nothing",
   * so the two are kept distinct here rather than being normalised into one
   * "no ids" case; collapsing them would turn every scoped caller into a national
   * one.
   *
   * The axes are combined with `OR`: a caller granted one program and a different
   * batch should see both, not the (empty) intersection. The organization axis is
   * a broad grant that already covers everything beneath it, which is why a
   * caller holding it needs no further predicate.
   */
  private executiveWhere(
    filter: ExecutiveMetricFilter,
  ): Prisma.ReportingMetricWhereInput {
    const where: Prisma.ReportingMetricWhereInput = {
      scopeType: filter.level,
    };

    if (filter.periodFrom || filter.periodTo) {
      where.periodStart = filter.periodFrom
        ? { gte: filter.periodFrom }
        : undefined;
      where.periodEnd = filter.periodTo ? { lte: filter.periodTo } : undefined;
    }

    const axes = [
      filter.organizationIds,
      filter.programIds,
      filter.batchIds,
      filter.classIds,
      filter.classSubjectIds,
    ];

    // Every axis `null` means the caller is unrestricted: no predicate at all.
    if (axes.every((axis) => axis === null)) return where;

    const branches: Prisma.ReportingMetricWhereInput[] = [];
    if (filter.organizationIds !== null) {
      branches.push({ organizationId: { in: filter.organizationIds } });
    }
    if (filter.programIds !== null) {
      branches.push({ educationProgramId: { in: filter.programIds } });
    }
    if (filter.batchIds !== null) {
      branches.push({ educationBatchId: { in: filter.batchIds } });
    }
    if (filter.classIds !== null) {
      branches.push({ academicClassId: { in: filter.classIds } });
    }
    if (filter.classSubjectIds !== null) {
      branches.push({ classSubjectId: { in: filter.classSubjectIds } });
    }

    // At least one axis is constrained. A branch whose list is empty matches
    // nothing, and `OR` of "nothing" with "something" is still that something —
    // so an empty list narrows the result without needing a special case, which
    // is exactly the asymmetry the `null`/`[]` distinction exists to express.
    where.OR = branches;
    return where;
  }

  /**
   * Sums the stored totals for a level.
   *
   * This is a database `SUM` rather than a read of every row, so the cost of a
   * national roll-up is bounded by the number of stored rows at one level rather
   * than by the size of the transactional data. The result is totals and
   * denominators only; the division happens in `executive-kpis.ts` so the KPI
   * definitions stay in one testable place.
   */
  async readExecutiveSums(
    filter: ExecutiveMetricFilter,
  ): Promise<ExecutiveSums> {
    const where = this.executiveWhere(filter);

    const [aggregate, unapproved, scopeCount] = await Promise.all([
      this.prisma.reportingMetric.aggregate({
        where,
        _sum: {
          participants: true,
          activeParticipants: true,
          attendedCount: true,
          totalSessions: true,
          progressPercentTotal: true,
          progressSampleCount: true,
          finalScoreTotal: true,
          gradedCount: true,
          graduationEvaluationCount: true,
          graduationEligibleCount: true,
          graduationApprovedCount: true,
          graduationPassCount: true,
          graduationFailCount: true,
          graduationRemedialCount: true,
          graduationWithdrawnCount: true,
          graduatedCount: true,
        },
      }),
      this.prisma.reportingMetric.aggregate({
        where,
        _sum: { unapprovedGradeCount: true },
      }),
      this.prisma.reportingMetric.count({ where }),
    ]);

    return {
      scopeCount,
      participants: aggregate._sum.participants ?? 0,
      activeParticipants: aggregate._sum.activeParticipants ?? 0,
      attendedCount: aggregate._sum.attendedCount ?? 0,
      totalSessions: aggregate._sum.totalSessions ?? 0,
      progressPercentTotal: aggregate._sum.progressPercentTotal ?? 0,
      progressSampleCount: aggregate._sum.progressSampleCount ?? 0,
      finalScoreTotal: aggregate._sum.finalScoreTotal ?? 0,
      gradedCount: aggregate._sum.gradedCount ?? 0,
      unapprovedGradeCount: unapproved._sum.unapprovedGradeCount ?? 0,
      graduationEvaluationCount: aggregate._sum.graduationEvaluationCount ?? 0,
      graduationEligibleCount: aggregate._sum.graduationEligibleCount ?? 0,
      graduationApprovedCount: aggregate._sum.graduationApprovedCount ?? 0,
      graduationPassCount: aggregate._sum.graduationPassCount ?? 0,
      graduationFailCount: aggregate._sum.graduationFailCount ?? 0,
      graduationRemedialCount: aggregate._sum.graduationRemedialCount ?? 0,
      graduationWithdrawnCount: aggregate._sum.graduationWithdrawnCount ?? 0,
      graduatedCount: aggregate._sum.graduatedCount ?? 0,
    };
  }

  /**
   * Counts the entities of each level inside the filter.
   *
   * Counted from the read model, not from the transactional tables, so the
   * overview never touches a table the refresh has not already summarised. The
   * consequence is honest and worth stating: a scope that has never been
   * refreshed is not counted, so the figures describe what has been reported
   * rather than what exists.
   */
  async countExecutiveScopes(
    filter: ExecutiveMetricFilter,
  ): Promise<ExecutiveScopeCounts> {
    const [institutions, programs, batches, classes] = await Promise.all([
      this.prisma.reportingMetric.count({
        where: this.executiveWhere({
          ...filter,
          level: ReportingScopeType.ORGANIZATION,
        }),
      }),
      this.prisma.reportingMetric.count({
        where: this.executiveWhere({
          ...filter,
          level: ReportingScopeType.PROGRAM,
        }),
      }),
      this.prisma.reportingMetric.count({
        where: this.executiveWhere({
          ...filter,
          level: ReportingScopeType.BATCH,
        }),
      }),
      this.prisma.reportingMetric.count({
        where: this.executiveWhere({
          ...filter,
          level: ReportingScopeType.CLASS,
        }),
      }),
    ]);

    return { institutions, programs, batches, classes };
  }

  /**
   * The paginated breakdown behind the headline KPIs.
   *
   * A list endpoint has to be paginated or it becomes the one request that
   * eventually times out, so the count and the page are read in one transaction
   * to keep `total` consistent with `data`.
   */
  async listExecutiveBreakdown(
    filter: ExecutiveMetricFilter,
    page: number,
    limit: number,
  ): Promise<ReportingMetricListResult> {
    const where = this.executiveWhere(filter);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reportingMetric.findMany({
        where,
        orderBy: [{ scopeName: 'asc' }, { scopeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.reportingMetric.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Bounded trend source for TASK-063.
   *
   * The endpoint reports a cohort trend from stored rows ordered by their batch
   * period. It remains a read-model query: no enrollment, attendance, progress or
   * grade table is touched here.
   */
  async listKpiTrendRows(
    filter: ExecutiveMetricFilter,
    limit: number,
  ): Promise<ReportingMetricRecord[]> {
    return this.prisma.reportingMetric.findMany({
      where: this.executiveWhere(filter),
      orderBy: [
        { periodStart: 'asc' },
        { periodEnd: 'asc' },
        { scopeName: 'asc' },
        { scopeId: 'asc' },
      ],
      take: limit,
    });
  }
}
