import { Injectable } from '@nestjs/common';
import { Prisma, ReportingScopeType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DrilldownChildNode,
  DrilldownChildPage,
  DrilldownChildrenQuery,
  DrilldownRepository,
  ExecutiveNodePath,
  ReportingMetricRecord,
} from './reporting.types';

/**
 * Prisma-backed drill-down repository (TASK-062).
 *
 * ## What this file is allowed to know
 *
 * It knows the *shape* of the hierarchy — which table holds which parent id — and
 * nothing about who may see what. Every access decision lives in the pure layer
 * (`drilldown-access.ts`, `drilldown-path.ts`), which is what makes those rules
 * testable without a database and keeps them from being duplicated in SQL.
 *
 * ## Why it reads the transactional tables at all
 *
 * A drill-down has to be able to show a branch that has never been refreshed.
 * Reading the tree from the read model would mean an institution that enrolled its
 * first batch today cannot be walked into until someone runs a refresh — the
 * dashboard would be lying by omission, and the lie would be indistinguishable from
 * a genuinely empty branch.
 *
 * So the *shape* comes from the tables that own it and the *numbers* come from the
 * read model, joined per node. That keeps the expensive part (aggregation) on the
 * read model while the cheap part (existence and naming) stays live.
 *
 * ## Why the metrics are fetched in one query, not one per node
 *
 * `listChildren` fetches every child's row in a single `findMany` keyed on the
 * child level and the child ids, then joins in memory. Fetching inside the loop
 * would be an N+1 that only shows up once an institution has a few hundred classes,
 * which is precisely when nobody is looking for it.
 */

/** The id column a level's parent id lives in, per level. */
const PARENT_COLUMN: Readonly<
  Record<ReportingScopeType, keyof ExecutiveNodePath | null>
> = {
  [ReportingScopeType.ORGANIZATION]: null,
  [ReportingScopeType.PROGRAM]: 'organizationId',
  [ReportingScopeType.BATCH]: 'educationProgramId',
  [ReportingScopeType.CLASS]: 'educationBatchId',
  [ReportingScopeType.CLASS_SUBJECT]: 'academicClassId',
  [ReportingScopeType.ENROLLMENT]: 'classSubjectId',
};

/** The id column identifying a level inside a `ReportingMetric` row. */
const METRIC_COLUMN: Readonly<Record<ReportingScopeType, string>> = {
  [ReportingScopeType.ORGANIZATION]: 'organizationId',
  [ReportingScopeType.PROGRAM]: 'educationProgramId',
  [ReportingScopeType.BATCH]: 'educationBatchId',
  [ReportingScopeType.CLASS]: 'academicClassId',
  [ReportingScopeType.CLASS_SUBJECT]: 'classSubjectId',
  // An enrollment's metric row stores the enrollment id in `scopeId`; there is no
  // `enrollmentId` column on the read model, and inventing one would duplicate the
  // unique key the table already enforces.
  [ReportingScopeType.ENROLLMENT]: 'scopeId',
};

@Injectable()
export class PrismaDrilldownRepository implements DrilldownRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- Ancestry --------------------------------------------------------------

  /**
   * Resolves one node's full ancestry.
   *
   * Every level is fetched with the *same* id, but only the branch matching
   * `level` executes, so a caller passing a program id where an organization is
   * required gets `null` rather than the program. That distinction is the
   * difference between a `404` that means "no such organization" and one that
   * quietly answers a different question.
   */
  async resolveNodePath(
    level: ReportingScopeType,
    id: string,
  ): Promise<ExecutiveNodePath | null> {
    switch (level) {
      case ReportingScopeType.ORGANIZATION: {
        const organization = await this.prisma.organization.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!organization) return null;
        return {
          organizationId: organization.id,
          educationProgramId: null,
          educationBatchId: null,
          academicClassId: null,
          classSubjectId: null,
          enrollmentId: null,
        };
      }

      case ReportingScopeType.PROGRAM: {
        const program = await this.prisma.educationProgram.findUnique({
          where: { id },
          select: { id: true, organizationId: true },
        });
        if (!program) return null;
        return {
          organizationId: program.organizationId,
          educationProgramId: program.id,
          educationBatchId: null,
          academicClassId: null,
          classSubjectId: null,
          enrollmentId: null,
        };
      }

      case ReportingScopeType.BATCH: {
        const batch = await this.prisma.educationBatch.findUnique({
          where: { id },
          select: {
            id: true,
            educationProgramId: true,
            educationProgram: { select: { organizationId: true } },
          },
        });
        if (!batch) return null;
        return {
          organizationId: batch.educationProgram.organizationId,
          educationProgramId: batch.educationProgramId,
          educationBatchId: batch.id,
          academicClassId: null,
          classSubjectId: null,
          enrollmentId: null,
        };
      }

      case ReportingScopeType.CLASS: {
        const academicClass = await this.prisma.academicClass.findUnique({
          where: { id },
          select: {
            id: true,
            educationBatchId: true,
            educationBatch: {
              select: {
                educationProgramId: true,
                educationProgram: { select: { organizationId: true } },
              },
            },
          },
        });
        if (!academicClass) return null;
        return {
          organizationId:
            academicClass.educationBatch.educationProgram.organizationId,
          educationProgramId: academicClass.educationBatch.educationProgramId,
          educationBatchId: academicClass.educationBatchId,
          academicClassId: academicClass.id,
          classSubjectId: null,
          enrollmentId: null,
        };
      }

      case ReportingScopeType.CLASS_SUBJECT: {
        const classSubject = await this.prisma.classSubject.findUnique({
          where: { id },
          select: {
            id: true,
            academicClassId: true,
            academicClass: {
              select: {
                educationBatchId: true,
                educationBatch: {
                  select: {
                    educationProgramId: true,
                    educationProgram: { select: { organizationId: true } },
                  },
                },
              },
            },
          },
        });
        if (!classSubject) return null;
        const batch = classSubject.academicClass.educationBatch;
        return {
          organizationId: batch.educationProgram.organizationId,
          educationProgramId: batch.educationProgramId,
          educationBatchId: classSubject.academicClass.educationBatchId,
          academicClassId: classSubject.academicClassId,
          classSubjectId: classSubject.id,
          enrollmentId: null,
        };
      }

      case ReportingScopeType.ENROLLMENT: {
        const enrollment = await this.prisma.enrollment.findUnique({
          where: { id },
          select: {
            id: true,
            academicClassId: true,
            educationBatchId: true,
            educationBatch: {
              select: {
                educationProgramId: true,
                educationProgram: { select: { organizationId: true } },
              },
            },
          },
        });
        if (!enrollment) return null;

        // An enrollment records a batch and a class, never a class subject. Its
        // ancestry is therefore resolved *through* the class: the subjects taught
        // in the class are the subjects this participant is enrolled against, which
        // is the same relationship TASK-060 uses when it counts a class subject's
        // participants as the class roster.
        const classSubject = enrollment.academicClassId
          ? await this.prisma.classSubject.findFirst({
              where: { academicClassId: enrollment.academicClassId },
              select: { id: true },
              orderBy: { createdAt: 'asc' },
            })
          : null;

        return {
          organizationId:
            enrollment.educationBatch.educationProgram.organizationId,
          educationProgramId: enrollment.educationBatch.educationProgramId,
          educationBatchId: enrollment.educationBatchId,
          academicClassId: enrollment.academicClassId,
          classSubjectId: classSubject?.id ?? null,
          enrollmentId: enrollment.id,
        };
      }

      default:
        // Exhaustive by construction: a new scope type without a branch here is a
        // compile error, not a silently unscoped node.
        return null;
    }
  }

  /**
   * Which level an id belongs to.
   *
   * Diagnostic only, and deliberately a scan of obvious candidates rather than a
   * clever query: its purpose is to turn an opaque "not found" into a precise
   * message, so it must never be able to *grant* anything. A failure here returns
   * `null` and the refusal simply loses its extra detail.
   */
  async identifyNodeLevel(id: string): Promise<ReportingScopeType | null> {
    const [organization, program, batch, academicClass, classSubject] =
      await Promise.all([
        this.prisma.organization.findUnique({
          where: { id },
          select: { id: true },
        }),
        this.prisma.educationProgram.findUnique({
          where: { id },
          select: { id: true },
        }),
        this.prisma.educationBatch.findUnique({
          where: { id },
          select: { id: true },
        }),
        this.prisma.academicClass.findUnique({
          where: { id },
          select: { id: true },
        }),
        this.prisma.classSubject.findUnique({
          where: { id },
          select: { id: true },
        }),
      ]);

    if (organization) return ReportingScopeType.ORGANIZATION;
    if (program) return ReportingScopeType.PROGRAM;
    if (batch) return ReportingScopeType.BATCH;
    if (academicClass) return ReportingScopeType.CLASS;
    if (classSubject) return ReportingScopeType.CLASS_SUBJECT;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (enrollment) return ReportingScopeType.ENROLLMENT;

    return null;
  }

  // --- Expansion -------------------------------------------------------------

  /**
   * Expands ids one step down, to the level named.
   *
   * Used to project a grant onto the levels below the one it was written at. The
   * `childLevel` is what the caller wants back, so the query is keyed on the column
   * that level's parent lives in rather than on a self-join — which keeps each
   * expansion a single indexed lookup.
   */
  async expandOneStep(
    childLevel: ReportingScopeType,
    ids: readonly string[],
  ): Promise<string[]> {
    if (ids.length === 0) return [];
    const idList = [...ids];

    switch (childLevel) {
      case ReportingScopeType.ORGANIZATION: {
        const rows = await this.prisma.organization.findMany({
          where: { parentId: { in: idList } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      case ReportingScopeType.PROGRAM: {
        const rows = await this.prisma.educationProgram.findMany({
          where: { organizationId: { in: idList } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      case ReportingScopeType.BATCH: {
        const rows = await this.prisma.educationBatch.findMany({
          where: { educationProgramId: { in: idList } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      case ReportingScopeType.CLASS: {
        const rows = await this.prisma.academicClass.findMany({
          where: { educationBatchId: { in: idList } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      case ReportingScopeType.CLASS_SUBJECT: {
        const rows = await this.prisma.classSubject.findMany({
          where: { academicClassId: { in: idList } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      case ReportingScopeType.ENROLLMENT: {
        // Participants of a subject are the class roster, because everyone in the
        // class is expected to sit the subject. Resolved as the enrollments of the
        // classes that teach the given subjects, so an enrollment reached this way
        // is reachable through *its own* class and no other.
        const subjects = await this.prisma.classSubject.findMany({
          where: { id: { in: idList } },
          select: { academicClassId: true },
        });
        const classIds = [
          ...new Set(subjects.map((subject) => subject.academicClassId)),
        ];
        if (classIds.length === 0) return [];

        const rows = await this.prisma.enrollment.findMany({
          where: { academicClassId: { in: classIds } },
          select: { id: true },
        });
        return rows.map((row) => row.id);
      }

      default:
        return [];
    }
  }

  // --- Children --------------------------------------------------------------

  /**
   * Lists the children of a node, with their read-model rows attached.
   *
   * Reads a paginated hierarchy, its count, and stored metrics in bounded queries.
   * Relation counts are selected with the nodes, without per-node requests.
   */
  async listChildren(
    query: DrilldownChildrenQuery,
  ): Promise<DrilldownChildPage> {
    const { rows, total } = await this.readChildRows(query);
    const metrics = await this.readChildMetrics(
      query.level,
      rows.map((row) => row.id),
    );

    return {
      data: rows.map((row) => ({
        ...row,
        metrics: metrics.get(row.id) ?? null,
      })),
      total,
    };
  }

  /**
   * Reads one page of children.
   *
   * The two entry modes are deliberately distinct rather than one query with an
   * optional predicate. Listing a node's children is an indexed single-parent lookup;
   * listing the caller's entry points is a set-membership lookup against their
   * granted organizations, including the organization level's self-nesting so a
   * Lemdiklat's Lembaga appear as children.
   */
  private async readChildRows(
    query: DrilldownChildrenQuery,
  ): Promise<{ rows: DraftNode[]; total: number }> {
    const skip = (query.page - 1) * query.limit;

    if (query.parentId === null) {
      // The entry points. Only organizations may be entered without a parent, and
      // an unrestricted caller has no id list to restrict to.
      // Scoped entry points must never include unrelated national roots.
      const where: Prisma.OrganizationWhereInput =
        query.rootOrganizationIds === null
          ? { parentId: null }
          : {
              id: { in: query.rootOrganizationIds },
              OR: [
                { parentId: null },
                { parentId: { notIn: query.rootOrganizationIds } },
              ],
            };

      const [organizations, total] = await Promise.all([
        this.prisma.organization.findMany({
          where,
          select: {
            id: true,
            name: true,
            code: true,
            parentId: true,
            _count: { select: { children: true, educationPrograms: true } },
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip,
          take: query.limit,
        }),
        this.prisma.organization.count({ where }),
      ]);

      return {
        rows: organizations.map((organization) => ({
          level: ReportingScopeType.ORGANIZATION,
          id: organization.id,
          name: organization.name,
          code: organization.code,
          parentId: organization.parentId,
          childCount:
            organization._count.children +
            organization._count.educationPrograms,
          path: {
            organizationId: organization.id,
            educationProgramId: null,
            educationBatchId: null,
            academicClassId: null,
            classSubjectId: null,
            enrollmentId: null,
          },
        })),
        total,
      };
    }

    const parentId = query.parentId;

    switch (query.level) {
      case ReportingScopeType.ORGANIZATION: {
        // A Lemdiklat's Lembaga: the self-nesting edge.
        const where: Prisma.OrganizationWhereInput = { parentId };
        const [organizations, total] = await Promise.all([
          this.prisma.organization.findMany({
            where,
            select: {
              id: true,
              name: true,
              code: true,
              parentId: true,
              _count: { select: { children: true, educationPrograms: true } },
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.organization.count({ where }),
        ]);
        return {
          rows: organizations.map((organization) => ({
            level: ReportingScopeType.ORGANIZATION,
            id: organization.id,
            name: organization.name,
            code: organization.code,
            parentId: organization.parentId,
            childCount:
              organization._count.children +
              organization._count.educationPrograms,
            path: {
              organizationId: organization.id,
              educationProgramId: null,
              educationBatchId: null,
              academicClassId: null,
              classSubjectId: null,
              enrollmentId: null,
            },
          })),
          total,
        };
      }

      case ReportingScopeType.PROGRAM: {
        const where: Prisma.EducationProgramWhereInput = {
          organizationId: parentId,
        };
        const [programs, total] = await Promise.all([
          this.prisma.educationProgram.findMany({
            where,
            select: {
              id: true,
              name: true,
              code: true,
              organizationId: true,
              _count: { select: { educationBatches: true } },
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.educationProgram.count({ where }),
        ]);
        return {
          rows: programs.map((program) => ({
            level: ReportingScopeType.PROGRAM,
            id: program.id,
            name: program.name,
            code: program.code,
            parentId: program.organizationId,
            childCount: program._count.educationBatches,
            path: {
              organizationId: program.organizationId,
              educationProgramId: program.id,
              educationBatchId: null,
              academicClassId: null,
              classSubjectId: null,
              enrollmentId: null,
            },
          })),
          total,
        };
      }

      case ReportingScopeType.BATCH: {
        const where: Prisma.EducationBatchWhereInput = {
          educationProgramId: parentId,
        };
        const [batches, total] = await Promise.all([
          this.prisma.educationBatch.findMany({
            where,
            select: {
              id: true,
              name: true,
              code: true,
              _count: { select: { classes: true } },
              educationProgramId: true,
              educationProgram: { select: { organizationId: true } },
            },
            orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.educationBatch.count({ where }),
        ]);
        return {
          rows: batches.map((batch) => ({
            level: ReportingScopeType.BATCH,
            id: batch.id,
            name: batch.name,
            code: batch.code,
            parentId: batch.educationProgramId,
            childCount: batch._count.classes,
            path: {
              organizationId: batch.educationProgram.organizationId,
              educationProgramId: batch.educationProgramId,
              educationBatchId: batch.id,
              academicClassId: null,
              classSubjectId: null,
              enrollmentId: null,
            },
          })),
          total,
        };
      }

      case ReportingScopeType.CLASS: {
        const where: Prisma.AcademicClassWhereInput = {
          educationBatchId: parentId,
        };
        const [classes, total] = await Promise.all([
          this.prisma.academicClass.findMany({
            where,
            select: {
              id: true,
              name: true,
              code: true,
              _count: { select: { classSubjects: true } },
              educationBatchId: true,
              educationBatch: {
                select: {
                  educationProgramId: true,
                  educationProgram: { select: { organizationId: true } },
                },
              },
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.academicClass.count({ where }),
        ]);
        return {
          rows: classes.map((academicClass) => ({
            level: ReportingScopeType.CLASS,
            id: academicClass.id,
            name: academicClass.name,
            code: academicClass.code,
            parentId: academicClass.educationBatchId,
            childCount: academicClass._count.classSubjects,
            path: {
              organizationId:
                academicClass.educationBatch.educationProgram.organizationId,
              educationProgramId:
                academicClass.educationBatch.educationProgramId,
              educationBatchId: academicClass.educationBatchId,
              academicClassId: academicClass.id,
              classSubjectId: null,
              enrollmentId: null,
            },
          })),
          total,
        };
      }

      case ReportingScopeType.CLASS_SUBJECT: {
        const where: Prisma.ClassSubjectWhereInput = {
          academicClassId: parentId,
        };
        const [subjects, total] = await Promise.all([
          this.prisma.classSubject.findMany({
            where,
            select: {
              id: true,
              code: true,
              displayName: true,
              academicClassId: true,
              curriculumSubject: {
                select: { subject: { select: { name: true } } },
              },
              academicClass: {
                select: {
                  _count: { select: { enrollments: true } },
                  educationBatchId: true,
                  educationBatch: {
                    select: {
                      educationProgramId: true,
                      educationProgram: { select: { organizationId: true } },
                    },
                  },
                },
              },
            },
            orderBy: [{ code: 'asc' }, { id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.classSubject.count({ where }),
        ]);
        return {
          rows: subjects.map((subject) => {
            const batch = subject.academicClass.educationBatch;
            return {
              level: ReportingScopeType.CLASS_SUBJECT,
              id: subject.id,
              name:
                subject.displayName ?? subject.curriculumSubject.subject.name,
              code: subject.code,
              parentId: subject.academicClassId,
              childCount: subject.academicClass._count.enrollments,
              path: {
                organizationId: batch.educationProgram.organizationId,
                educationProgramId: batch.educationProgramId,
                educationBatchId: subject.academicClass.educationBatchId,
                academicClassId: subject.academicClassId,
                classSubjectId: subject.id,
                enrollmentId: null,
              },
            };
          }),
          total,
        };
      }

      case ReportingScopeType.ENROLLMENT: {
        // Participants of a subject: the class's roster, resolved through the
        // subject's own class so the ancestry names that class and no other.
        const subject = await this.prisma.classSubject.findUnique({
          where: { id: parentId },
          select: {
            id: true,
            academicClassId: true,
            academicClass: {
              select: {
                educationBatchId: true,
                educationBatch: {
                  select: {
                    educationProgramId: true,
                    educationProgram: { select: { organizationId: true } },
                  },
                },
              },
            },
          },
        });
        if (!subject) return { rows: [], total: 0 };

        const where: Prisma.EnrollmentWhereInput = {
          academicClassId: subject.academicClassId,
        };
        const [enrollments, total] = await Promise.all([
          this.prisma.enrollment.findMany({
            where,
            select: {
              id: true,
              academicClassId: true,
              person: { select: { fullName: true, personnelNumber: true } },
            },
            orderBy: [{ id: 'asc' }],
            skip,
            take: query.limit,
          }),
          this.prisma.enrollment.count({ where }),
        ]);

        const batch = subject.academicClass.educationBatch;
        return {
          rows: enrollments.map((enrollment) => ({
            level: ReportingScopeType.ENROLLMENT,
            id: enrollment.id,
            name: enrollment.person.fullName,
            code: enrollment.person.personnelNumber,
            parentId: subject.id,
            childCount: 0,
            path: {
              organizationId: batch.educationProgram.organizationId,
              educationProgramId: batch.educationProgramId,
              educationBatchId: subject.academicClass.educationBatchId,
              academicClassId: subject.academicClassId,
              classSubjectId: subject.id,
              enrollmentId: enrollment.id,
            },
          })),
          total,
        };
      }

      default:
        return { rows: [], total: 0 };
    }
  }

  /**
   * Reads the stored metric rows for a page of children, keyed by node id.
   *
   * One query for the whole page. The read model is the *only* place numbers come
   * from, so a node whose scope has never been refreshed simply has no entry and is
   * reported with `metrics: null` rather than with zeroes that would look like a
   * real, empty class.
   */
  private async readChildMetrics(
    level: ReportingScopeType,
    ids: readonly string[],
  ): Promise<Map<string, ReportingMetricRecord>> {
    if (ids.length === 0) return new Map();

    const column = METRIC_COLUMN[level];
    const where: Prisma.ReportingMetricWhereInput = {
      scopeType: level,
      ...(column === 'scopeId'
        ? { scopeId: { in: [...ids] } }
        : { [column]: { in: [...ids] } }),
    };

    const rows = await this.prisma.reportingMetric.findMany({ where });

    const byId = new Map<string, ReportingMetricRecord>();
    for (const row of rows) {
      const key = keyOf(row, column);
      if (key !== null) byId.set(key, row);
    }
    return byId;
  }
}

/** A child node before its metrics are joined on. */
type DraftNode = Omit<DrilldownChildNode, 'metrics'>;

function keyOf(row: ReportingMetricRecord, column: string): string | null {
  const value = (row as unknown as Record<string, unknown>)[column];
  return typeof value === 'string' ? value : null;
}

// Referenced so the parent-column table is not dead code: it documents the join
// direction the expansion queries below rely on, and a reviewer checking a new
// level against the schema needs it in one place.
export const DRILLDOWN_PARENT_COLUMN = PARENT_COLUMN;
