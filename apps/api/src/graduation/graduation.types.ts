import type {
  GraduationComponentType,
  GraduationEvaluationOutcome,
  GraduationRuleStatus,
} from '@prisma/client';

export type {
  GraduationComponentType,
  GraduationEvaluationOutcome,
  GraduationRuleStatus,
};

/**
 * Numeric values that Prisma may hand back for a `Decimal` column.
 *
 * Prisma returns `Decimal` instances rather than plain numbers, and they do not
 * survive `JSON.stringify` cleanly, so every boundary in this module converts
 * through this type explicitly instead of relying on implicit coercion.
 */
export type NumericLike = number | string | { toNumber(): number };

/** A rule component as stored, before it is interpreted by the evaluator. */
export interface GraduationRuleComponentRecord {
  id: string;
  graduationRuleId: string;
  componentType: GraduationComponentType;
  label: string;
  thresholdValue: NumericLike | null;
  subjectId: string | null;
  assessmentId: string | null;
  required: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A graduation rule with its components loaded. */
export interface GraduationRuleRecord {
  id: string;
  educationBatchId: string;
  code: string;
  name: string;
  description: string | null;
  version: number;
  status: GraduationRuleStatus;
  publishedAt: Date | null;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  components: GraduationRuleComponentRecord[];
}

export interface GraduationRuleListFilter {
  educationBatchId?: string;
  status?: GraduationRuleStatus;
  code?: string;
  page: number;
  limit: number;
}

export interface GraduationRuleListResult {
  data: GraduationRuleRecord[];
  total: number;
}

export interface GraduationRuleCreateData {
  educationBatchId: string;
  code: string;
  name: string;
  description: string | null;
  components: Array<{
    componentType: GraduationComponentType;
    label: string;
    thresholdValue: number | null;
    subjectId: string | null;
    assessmentId: string | null;
    required: boolean;
    sortOrder: number;
  }>;
}

export interface GraduationRuleUpdateData {
  name?: string;
  description?: string | null;
}

/** One observed component result, produced by the evaluator. */
export interface GraduationComponentOutcome {
  componentType: GraduationComponentType;
  label: string;
  observedValue: number | null;
  thresholdValue: number | null;
  passed: boolean;
  note: string | null;
}

/** The evidence bundle persisted with an evaluation and returned to callers. */
export interface GraduationSnapshot {
  ruleId: string;
  ruleCode: string;
  ruleVersion: number;
  ruleStatus: GraduationRuleStatus;
  enrollmentId: string;
  educationBatchId: string;
  evaluatedAt: string;
  components: GraduationComponentOutcome[];
  /** True only when every `required` component passed. */
  eligible: boolean;
}

export interface GraduationEvaluationDetailRecord {
  id: string;
  graduationEvaluationId: string;
  componentType: GraduationComponentType;
  label: string;
  observedValue: NumericLike | null;
  thresholdValue: NumericLike | null;
  passed: boolean;
  note: string | null;
  createdAt: Date;
}

export interface GraduationEvaluationRecord {
  id: string;
  enrollmentId: string;
  graduationRuleId: string;
  outcome: GraduationEvaluationOutcome;
  evaluatedAt: Date;
  evaluatedByUserId: string | null;
  snapshot: unknown;
  createdAt: Date;
  updatedAt: Date;
  details: GraduationEvaluationDetailRecord[];
}

/**
 * Inputs the evaluator needs about one participant.
 *
 * These are gathered by the repository so the service can stay a pure function
 * of its inputs — which is what makes the outcome reproducible and testable
 * without a database.
 */
export interface EnrollmentEvaluationContext {
  enrollmentId: string;
  educationBatchId: string;
  status: string;
  /** Attendance percentage (0–100) for the enrollment, or null if unknown. */
  attendancePercentage: number | null;
  /** Final grade per class subject, keyed by classSubjectId. */
  finalScoresByClassSubject: Map<string, number>;
  /** Final grade per curriculum subject, keyed by curriculumSubjectId. */
  finalScoresByCurriculumSubject: Map<string, number>;
  /** Highest scored attempt for the referenced assessment, or null. */
  finalExamScoresByAssessment: Map<string, number>;
}

/** Repository contract for the graduation domain (TASK-052). */
export interface GraduationRepository {
  createRule(data: GraduationRuleCreateData): Promise<GraduationRuleRecord>;
  updateRule(
    id: string,
    data: GraduationRuleUpdateData,
  ): Promise<GraduationRuleRecord>;
  findRuleById(id: string): Promise<GraduationRuleRecord | null>;
  listRules(
    filter: GraduationRuleListFilter,
  ): Promise<GraduationRuleListResult>;
  updateRuleStatus(
    id: string,
    status: GraduationRuleStatus,
    publishedByUserId: string | null,
  ): Promise<GraduationRuleRecord>;
  findLatestPublishedRuleForBatch(
    educationBatchId: string,
  ): Promise<GraduationRuleRecord | null>;
  listEnrollmentsForBatch(
    educationBatchId: string,
  ): Promise<Array<{ enrollmentId: string }>>;
  loadEvaluationContext(
    enrollmentId: string,
  ): Promise<EnrollmentEvaluationContext | null>;
  supersedeOpenEvaluations(enrollmentId: string, ruleId: string): Promise<void>;
  createEvaluation(data: {
    enrollmentId: string;
    graduationRuleId: string;
    outcome: GraduationEvaluationOutcome;
    evaluatedByUserId: string | null;
    snapshot: GraduationSnapshot;
    details: GraduationComponentOutcome[];
  }): Promise<GraduationEvaluationRecord>;
  findEvaluationById(id: string): Promise<GraduationEvaluationRecord | null>;
  listEvaluationsForEnrollment(
    enrollmentId: string,
  ): Promise<GraduationEvaluationRecord[]>;
  findAssessmentMaxScore(assessmentId: string): Promise<number | null>;
}

export const GRADUATION_REPOSITORY = Symbol('GRADUATION_REPOSITORY');
