import type { HealthResponse } from '@lms/types';

export type ApiClientOptions = {
  getAccessToken?: () =>
    string | null | undefined | Promise<string | null | undefined>;
};

export type ApiListResponse<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
};

export type ApiMutationResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

/**
 * Paged response as returned by the domains that answer with `{ data, meta }`
 * (attendance, learning progress). Kept separate from `ApiListResponse`, which
 * mirrors the older flat `{ data, page, limit, total }` shape.
 */
export type ApiPagedResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type Organization = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  organizationType: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationTree = Organization & {
  children: OrganizationTree[];
};

export type EducationProgram = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type Curriculum = {
  id: string;
  educationProgramId: string;
  version: string;
  name: string;
  effectiveFrom: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type CreateCurriculumInput = {
  educationProgramId: string;
  version: string;
  name: string;
  effectiveFrom?: string | null;
  status?: Curriculum['status'];
};

export type UpdateCurriculumInput = Partial<CreateCurriculumInput>;

export type Subject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type CreateSubjectInput = {
  code: string;
  name: string;
  description?: string;
  status?: Subject['status'];
};
export type UpdateSubjectInput = Partial<CreateSubjectInput> & {
  description?: string | null;
};

export type EducationBatch = {
  id: string;
  educationProgramId: string;
  curriculumId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
};
export type CreateEducationBatchInput = {
  educationProgramId: string;
  curriculumId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: EducationBatch['status'];
  capacity?: number | null;
};
export type UpdateEducationBatchInput = Partial<CreateEducationBatchInput>;

export type AcademicClass = {
  id: string;
  educationBatchId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
};
export type CreateAcademicClassInput = {
  educationBatchId: string;
  code: string;
  name: string;
  capacity?: number;
  status?: AcademicClass['status'];
};
export type UpdateAcademicClassInput = Partial<CreateAcademicClassInput>;

export type AcademicEnrollmentStatus = 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED';
export type CreateEnrollmentInput = {
  personId: string;
  educationBatchId: string;
  academicClassId?: string;
  enrollmentNumber?: string;
  enrolledAt?: string;
  status?: AcademicEnrollmentStatus;
  metadata?: Record<string, unknown>;
};

export type CreateEducationProgramInput = {
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  status?: EducationProgram['status'];
  metadata?: Record<string, unknown>;
};

export type UpdateEducationProgramInput = {
  organizationId?: string;
  code?: string;
  name?: string;
  description?: string | null;
  status?: EducationProgram['status'];
  metadata?: Record<string, unknown> | null;
};

export type CreateOrganizationInput = {
  code: string;
  name: string;
  parentId?: string | null;
  organizationType?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export type Person = {
  id: string;
  personnelNumber: string;
  fullName: string;
  rank: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type PersonOrganization = {
  id: string;
  personId: string;
  organizationId: string;
  positionName: string | null;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  isActive: boolean;
  organization?: Pick<Organization, 'id' | 'code' | 'name'>;
};

export type CreatePersonInput = {
  personnelNumber: string;
  fullName: string;
  rank?: string;
  title?: string;
  email?: string;
  phone?: string;
  status?: 'ACTIVE' | 'INACTIVE';
};

export type UpdatePersonInput = Partial<CreatePersonInput>;

export type UserAccount = {
  id: string;
  personId: string;
  externalAuthId: string | null;
  username: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserAccountInput = {
  externalAuthId?: string;
  username?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};

export type UpdateUserAccountInput = Partial<CreateUserAccountInput>;

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type Permission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleAssignment = {
  id: string;
  userAccountId: string;
  roleId: string;
  role?: Pick<Role, 'id' | 'code' | 'name' | 'isSystem'>;
  validFrom: string;
  validUntil: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  scopes: RoleAssignmentScope[];
  createdAt: string;
  updatedAt: string;
};

export type RoleAssignmentScope = {
  id: string;
  assignmentId: string;
  scopeType: 'ORGANIZATION' | 'PROGRAM' | 'BATCH' | 'CLASS' | 'CLASS_SUBJECT';
  scopeId: string;
  createdAt: string;
};

export type ScopeInput = Pick<RoleAssignmentScope, 'scopeType' | 'scopeId'>;

export type CreateRoleAssignmentInput = {
  userAccountId: string;
  roleId: string;
  validFrom?: string;
  validUntil?: string;
  scopes?: ScopeInput[];
};

export type AddRoleAssignmentScopesInput = {
  scopes: ScopeInput[];
};

export type RoleAssignmentStatus = RoleAssignment['status'];

// ---------------------------------------------------------------------------
// Learning domain (TASK-020 .. TASK-024)
//
// These mirror the API response DTOs one-for-one. The UI only shapes and
// displays this data: every rule (deadline, attempts, grade ceiling,
// authorization) is enforced server-side, so nothing here re-derives it.
// ---------------------------------------------------------------------------

export type ClassSubject = {
  id: string;
  academicClassId: string;
  subjectId: string;
  curriculumSubjectId?: string;
  code?: string | null;
  displayName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'INACTIVE';
  educatorPersonId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningMeeting = {
  id: string;
  classSubjectId: string;
  meetingNo: number;
  title: string;
  topic: string | null;
  scheduledAt: string | null;
  status: 'PLANNED' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
};

export type LearningActivityStatus =
  'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type LearningActivity = {
  id: string;
  meetingId: string;
  activityTypeId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  sequence: number;
  sequenceNo: number;
  required: boolean;
  isRequired: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  status: LearningActivityStatus;
  createdAt: string;
  updatedAt: string;
};

export type LearningActivityType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requiresContent: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

export type LearningActivityContentType = 'TEXT' | 'LINK' | 'FILE' | 'VIDEO';

export type LearningActivityContent = {
  id: string;
  activityId: string;
  versionGroupId: string;
  contentType: LearningActivityContentType;
  title: string;
  body: string | null;
  objectKey: string | null;
  storedFileId: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  version: number;
  sequenceNo: number;
  status: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
};

export type LearningProgressStatus =
  'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type LearningProgress = {
  id: string;
  enrollmentId: string;
  activityId: string;
  status: LearningProgressStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentLifecycleStatus =
  'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type Assignment = {
  id: string;
  activityId: string;
  assessmentId: string | null;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  maxScore: number;
  attemptsAllowed: number;
  status: AssignmentLifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type AssignmentSubmissionStatus =
  'DRAFT' | 'SUBMITTED' | 'GRADED' | 'RETURNED';

export type SubmissionFile = {
  id: string;
  storedFileId: string;
  label: string | null;
  objectKey: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type AssignmentGrade = {
  id: string;
  score: number;
  graderPersonId: string;
  feedback: string | null;
  gradedAt: string;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  enrollmentId: string;
  attemptNo: number;
  submittedAt: string | null;
  textAnswer: string | null;
  isLate: boolean;
  status: AssignmentSubmissionStatus;
  files: SubmissionFile[];
  grade?: AssignmentGrade;
  createdAt: string;
  updatedAt: string;
};

export type GradeSubmissionInput = {
  score: number;
  feedback?: string;
  returnToParticipant?: boolean;
};

export type ClassSubjectProgressSummary = {
  classSubjectId: string;
  enrollmentCount: number;
  completedCount: number;
  averageProgressPercent: number;
  lastActivityAt: string | null;
};

export type ParticipantProgressSummary = {
  classSubjectId: string;
  enrollmentId: string;
  completedActivities: number;
  totalActivities: number;
  progressPercent: number;
  lastActivityAt: string | null;
};

export type EnrollmentStatus =
  | 'REGISTERED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DROPPED_OUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'TRANSFERRED'
  | 'EXPELLED';

export type Enrollment = {
  id: string;
  personId: string;
  educationBatchId: string;
  academicClassId: string | null;
  enrollmentNumber: string | null;
  enrolledAt: string;
  status: EnrollmentStatus;
  completedAt: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export type UserIdentity = {
  accountId: string;
  personId: string;
  username: string;
  email: string | null;
};

export type StoredFile = {
  id: string;
  objectKey: string;
  namespace: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  ownerUserId: string | null;
  status: 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DownloadUrlResponse = {
  file: StoredFile;
  download: {
    url: string;
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
    expiresInSeconds: number;
    objectKey: string;
    headers: Record<string, string>;
  };
};

export type UploadPolicyResponse = {
  defaultMaxSizeBytes: number | null;
  entries: { mimeType: string; maxSizeBytes: number }[];
};

export type SubmitAssignmentInput = {
  assignmentId: string;
  enrollmentId: string;
  textAnswer?: string;
};

export type SubmitResponse = AssignmentSubmission & {
  attemptsUsed: number;
  attemptsRemaining: number;
};

export type UpdateLearningProgressInput = {
  enrollmentId: string;
  activityId: string;
  status?: LearningProgressStatus;
  progressPercent?: number;
  metadata?: unknown;
};

// ---------------------------------------------------------------------------
// Attendance domain (TASK-030 / TASK-031)
//
// Attendance is server-authoritative: the API decides which sessions exist, who
// may be recorded, and whether a session still accepts writes. The UI sends
// intent and renders the result.
// ---------------------------------------------------------------------------

export type AttendanceMethod = 'MANUAL' | 'QR_CODE' | 'ONLINE' | 'INTEGRATION';

export type AttendanceSessionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';

export type AttendanceStatus =
  'PRESENT' | 'LATE' | 'EXCUSED' | 'SICK' | 'ABSENT';

export type AttendanceSession = {
  id: string;
  classSubjectId: string;
  meetingId: string | null;
  title: string | null;
  startAt: string;
  endAt: string;
  method: AttendanceMethod;
  status: AttendanceSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  note: string | null;
  recordedByUserId: string | null;
  participantName: string | null;
  enrollmentNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSessionDetail = AttendanceSession & {
  records: AttendanceRecord[];
};

export type AttendanceCorrectionStatus = 'PENDING' | 'APPLIED' | 'REJECTED';

/**
 * One immutable entry in a record's correction history.
 *
 * `previousStatus` is what the record held before this correction; the chain of
 * entries reconstructs the full history, because nothing is ever overwritten.
 */
export type AttendanceCorrection = {
  id: string;
  attendanceRecordId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  requestedByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  status: AttendanceCorrectionStatus;
  createdAt: string;
};

export type AttendanceRecordAfterCorrection = {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  note: string | null;
  recordedByUserId: string | null;
  updatedAt: string;
};

export type ApplyAttendanceCorrectionResponse = {
  correction: AttendanceCorrection;
  record: AttendanceRecordAfterCorrection;
};

export type ApplyAttendanceCorrectionInput = {
  newStatus: AttendanceStatus;
  reason: string;
  checkInAt?: string;
  note?: string;
};

export type RecordAttendanceInput = {
  enrollmentId: string;
  status: AttendanceStatus;
  checkInAt?: string;
  note?: string;
};

export type BulkRecordAttendanceInput = {
  records: RecordAttendanceInput[];
};

export type CreateAttendanceSessionInput = {
  classSubjectId: string;
  meetingId?: string;
  title?: string;
  startAt: string;
  endAt: string;
  method?: AttendanceMethod;
  status?: AttendanceSessionStatus;
};

/**
 * Scope of a pre-aggregated attendance summary (TASK-033).
 *
 * `ENROLLMENT` is a participant's whole programme; `ENROLLMENT_SUBJECT` narrows
 * that to one class subject. `CLASS_SUBJECT`, `CLASS`, `BATCH` and `PROGRAM` are
 * the institutional roll-ups of the levels above a participant.
 */
export type AttendanceSummaryScopeType =
  | 'ENROLLMENT'
  | 'ENROLLMENT_SUBJECT'
  | 'CLASS_SUBJECT'
  | 'CLASS'
  | 'BATCH'
  | 'PROGRAM';

/**
 * A precalculated attendance figure.
 *
 * The denominator is `totalSessions`: only CLOSED sessions are eligible, and a
 * closed session with no record counts as ABSENT. `attendancePercentage` is
 * `(presentCount + lateCount) / totalSessions * 100` for a personal scope and
 * the equivalent participant-weighted figure for a group scope, rounded to 2
 * decimals. Corrections change the counts and the percentage, never the
 * denominator.
 */
export type AttendanceSummary = {
  id: string;
  scopeType: AttendanceSummaryScopeType;
  scopeId: string;
  enrollmentId: string | null;
  classSubjectId: string | null;
  academicClassId: string | null;
  educationBatchId: string | null;
  academicProgramId: string | null;
  totalSessions: number;
  participants: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  sickCount: number;
  absentCount: number;
  attendancePercentage: number;
  recalculatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSummaryList = {
  data: AttendanceSummary[];
  total: number;
  page: number;
  limit: number;
};

export type ListAttendanceSummariesQuery = {
  scopeType?: AttendanceSummaryScopeType;
  scopeId?: string;
  enrollmentId?: string;
  classSubjectId?: string;
  academicClassId?: string;
  educationBatchId?: string;
  academicProgramId?: string;
  page?: number;
  limit?: number;
};

export type RefreshAttendanceSummaryInput = {
  scopeType: AttendanceSummaryScopeType;
  scopeId: string;
  classSubjectId?: string;
};

/**
 * Lifecycle of an assessment (TASK-040).
 *
 * `DRAFT -> PUBLISHED` exposes it to participants, `CLOSED` ends entry while
 * keeping results readable, and `ARCHIVED` retires it for good. Unpublishing
 * (`PUBLISHED -> DRAFT`) is allowed so a mistaken publish can be taken back
 * without deleting anything; `CLOSED` and `ARCHIVED` are terminal for their
 * inputs.
 */
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type AssessmentTypeStatus = 'ACTIVE' | 'INACTIVE';

/**
 * A data-driven assessment method. QUIZ, EXAM, ASSIGNMENT, PRACTICAL,
 * OBSERVATION and COMPETENCY are seeded rows, not a closed enum: an institution
 * adds its own method without a schema or code change.
 */
export type AssessmentType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AssessmentTypeStatus;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentTypeList = {
  data: AssessmentType[];
  total: number;
  page: number;
  limit: number;
};

export type ListAssessmentTypesQuery = {
  search?: string;
  status?: AssessmentTypeStatus;
  page?: number;
  limit?: number;
};

export type CreateAssessmentTypeInput = {
  code: string;
  name: string;
  description?: string;
  status?: AssessmentTypeStatus;
};

export type UpdateAssessmentTypeInput = Partial<CreateAssessmentTypeInput> & {
  description?: string | null;
};

/**
 * An umbrella assessment record.
 *
 * `maxScore` is the denominator every score for this assessment is measured
 * against and is frozen once the assessment is `PUBLISHED` or `CLOSED`. `weight`
 * is `null` until a grading scheme (TASK-050) aggregates several assessments.
 */
export type Assessment = {
  id: string;
  classSubjectId: string;
  assessmentTypeId: string;
  title: string;
  description: string | null;
  maxScore: number;
  weight: number | null;
  availableFrom: string | null;
  availableUntil: string | null;
  status: AssessmentStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentList = {
  data: Assessment[];
  total: number;
  page: number;
  limit: number;
};

export type ListAssessmentsQuery = {
  classSubjectId?: string;
  academicClassId?: string;
  curriculumSubjectId?: string;
  assessmentTypeId?: string;
  status?: AssessmentStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateAssessmentInput = {
  classSubjectId: string;
  assessmentTypeId: string;
  title: string;
  description?: string;
  maxScore: number;
  weight?: number;
  availableFrom?: string;
  availableUntil?: string;
  status?: AssessmentStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateAssessmentInput = {
  assessmentTypeId?: string;
  title?: string;
  description?: string | null;
  maxScore?: number;
  weight?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  status?: AssessmentStatus;
  metadata?: Record<string, unknown>;
};

export type ChangeAssessmentStatusInput = {
  status: AssessmentStatus;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Grading domain (TASK-050)
//
// A grading scheme groups assessments under a class subject and assigns
// percentage weights, so a weighted final grade can be computed automatically.
// A scheme is a curriculum decision, so its routes carry a different permission
// from marking one individual answer.
// ---------------------------------------------------------------------------

export type GradingSchemeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type GradingScheme = {
  id: string;
  classSubjectId: string;
  name: string;
  status: GradingSchemeStatus;
  createdAt: string;
  updatedAt: string;
};

export type GradingSchemeList = {
  data: GradingScheme[];
  total: number;
  page: number;
  limit: number;
};

export type GradingComponent = {
  id: string;
  schemeId: string;
  assessmentId: string;
  name: string;
  weight: number;
  required: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateGradingSchemeInput = {
  classSubjectId: string;
  name: string;
  status?: GradingSchemeStatus;
};

export type CreateGradingComponentInput = {
  assessmentId: string;
  name: string;
  weight: number;
  required?: boolean;
};

export type FinalGradeStatus = 'CALCULATED' | 'APPROVED' | 'REOPENED';

export type FinalGrade = {
  id: string;
  enrollmentId: string;
  classSubjectId: string;
  gradingSchemeId: string;
  numericScore: number;
  gradeCode: string | null;
  status: FinalGradeStatus;
  calculatedAt: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinalGradeList = {
  data: FinalGrade[];
  total: number;
  page: number;
  limit: number;
};

export type CalculateFinalGradeInput = {
  enrollmentId: string;
  classSubjectId: string;
  gradingSchemeId: string;
};

// ---------------------------------------------------------------------------
// Graduation domain (TASK-052 / TASK-053 / TASK-054 / TASK-055)
//
// Mirrors the API response DTOs one-for-one. The UI only displays and drives
// these workflows; every lifecycle guard (rule freezing, no decision without
// evaluation, certificate issue only from an approved PASS decision) is the
// backend's job.

export type GraduationComponentTypeDto =
  'ATTENDANCE_PERCENTAGE' | 'FINAL_SCORE' | 'REQUIRED_SUBJECT' | 'FINAL_EXAM';

export type GraduationRuleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type GraduationRuleComponentDto = {
  id: string;
  graduationRuleId: string;
  componentType: GraduationComponentTypeDto;
  label: string;
  thresholdValue?: number | null;
  subjectId?: string | null;
  assessmentId?: string | null;
  required: boolean;
  sortOrder: number;
};

export type GraduationRule = {
  id: string;
  educationBatchId: string;
  code: string;
  name: string;
  description?: string | null;
  version: number;
  status: GraduationRuleStatus;
  publishedAt?: string | null;
  publishedByUserId?: string | null;
  components: GraduationRuleComponentDto[];
  createdAt: string;
  updatedAt: string;
};

export type GraduationRuleList = {
  data: GraduationRule[];
  total: number;
  page: number;
  limit: number;
};

export type GraduationEvaluationOutcome =
  'PENDING' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'SUPERSEDED';

export type GraduationEvaluationDetail = {
  id: string;
  componentType: GraduationComponentTypeDto;
  label: string;
  observedValue?: number | null;
  thresholdValue?: number | null;
  passed: boolean;
  note?: string | null;
};

export type GraduationEvaluation = {
  id: string;
  enrollmentId: string;
  graduationRuleId: string;
  outcome: GraduationEvaluationOutcome;
  evaluatedAt: string;
  evaluatedByUserId?: string | null;
  snapshot: Record<string, unknown>;
  details: GraduationEvaluationDetail[];
};

export type BatchEvaluationSummary = {
  educationBatchId: string;
  graduationRuleId: string;
  total: number;
  eligible: number;
  notEligible: number;
  results: GraduationEvaluation[];
};

export type CreateGraduationRuleComponentInput = {
  componentType: GraduationComponentTypeDto;
  label: string;
  thresholdValue?: number | null;
  subjectId?: string | null;
  assessmentId?: string | null;
  required?: boolean;
  sortOrder?: number;
};

export type CreateGraduationRuleInput = {
  educationBatchId: string;
  code: string;
  name: string;
  description?: string | null;
  components: CreateGraduationRuleComponentInput[];
};

export type UpdateGraduationRuleInput = {
  name?: string;
  description?: string | null;
  components?: CreateGraduationRuleComponentInput[];
};

export type GraduationDecisionOutcome =
  'PASS' | 'FAIL' | 'REMEDIAL' | 'WITHDRAWN';

export type GraduationDecisionStatus = 'DRAFT' | 'APPROVED' | 'REVOKED';

export type GraduationDecisionEvaluation = {
  id: string;
  enrollmentId: string;
  graduationRuleId: string;
  outcome: GraduationEvaluationOutcome;
  evaluatedAt: string;
  snapshot: Record<string, unknown>;
};

export type GraduationDecision = {
  id: string;
  graduationEvaluationId: string;
  decision: GraduationDecisionOutcome;
  status: GraduationDecisionStatus;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  revokedByUserId?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  evaluation?: GraduationDecisionEvaluation;
};

export type GraduationDecisionList = {
  data: GraduationDecision[];
  total: number;
  page: number;
  limit: number;
};

export type CreateGraduationDecisionInput = {
  graduationEvaluationId: string;
  decision: GraduationDecisionOutcome;
  note?: string | null;
};

export type CertificateTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type CertificateTemplate = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  version: number;
  status: CertificateTemplateStatus;
  templateObjectKey?: string | null;
  config?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CertificateTemplateList = {
  data: CertificateTemplate[];
  total: number;
  page: number;
  limit: number;
};

export type CreateCertificateTemplateInput = {
  code: string;
  name: string;
  description?: string | null;
  templateObjectKey?: string | null;
  config?: Record<string, unknown> | null;
};

export type UpdateCertificateTemplateInput = {
  name?: string;
  description?: string | null;
  templateObjectKey?: string | null;
  config?: Record<string, unknown> | null;
};

export type CertificateStatus = 'ISSUED' | 'REVOKED';

export type Certificate = {
  id: string;
  decisionId: string;
  templateId: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt: string;
  issuedByUserId?: string | null;
  fileId?: string | null;
  holderName: string;
  programName: string;
  batchName: string;
  templateName: string;
  templateVersion: number;
  createdAt: string;
};

export type CertificateList = {
  data: Certificate[];
  total: number;
  page: number;
  limit: number;
};

export type IssueCertificateInput = {
  decisionId: string;
  templateId: string;
  fileId?: string | null;
};

// ---------------------------------------------------------------------------
// Question bank domain (TASK-041 / TASK-047)
//
// The educator contract includes the answer key (`isCorrect`, `scoringRule`,
// `explanation`) because an author needs it. It is never the student contract:
// the API exposes a separate, allow-listed student projection behind its own
// `question.participate` permission, so nothing here may be reused for a
// participant-facing screen.
// ---------------------------------------------------------------------------

/** ACTIVE/INACTIVE pair shared by every controlled vocabulary in the project. */
export type QuestionBankStatus = 'ACTIVE' | 'INACTIVE';
export type QuestionStatus = 'ACTIVE' | 'INACTIVE';

/**
 * A version is frozen once published: a correction is a NEW version, never an
 * edit, which is why `SUPERSEDED` exists as a first-class state.
 */
export type QuestionVersionStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';

export type QuestionBank = {
  id: string;
  curriculumSubjectId: string;
  code: string;
  name: string;
  description: string | null;
  status: QuestionBankStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionBankList = {
  data: QuestionBank[];
  total: number;
  page: number;
  limit: number;
};

export type ListQuestionBanksQuery = {
  curriculumSubjectId?: string;
  curriculumId?: string;
  subjectId?: string;
  status?: QuestionBankStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateQuestionBankInput = {
  curriculumSubjectId: string;
  code: string;
  name: string;
  description?: string;
  status?: QuestionBankStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateQuestionBankInput = {
  name?: string;
  description?: string | null;
  status?: QuestionBankStatus;
  metadata?: Record<string, unknown>;
};

/**
 * A data-driven question type. `hasOptions`/`multiSelect` drive the authoring
 * form instead of any code comparing a type against a known string, so a new
 * type works without a UI change.
 */
export type QuestionType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hasOptions: boolean;
  multiSelect: boolean;
  status: QuestionBankStatus;
  createdAt: string;
  updatedAt: string;
};

export type QuestionTypeList = {
  data: QuestionType[];
  total: number;
  page: number;
  limit: number;
};

export type QuestionOption = {
  id: string;
  key: string;
  label: string;
  isCorrect: boolean;
  value: number | null;
  sortOrder: number;
};

export type QuestionVersion = {
  id: string;
  questionId: string;
  version: number;
  stem: string;
  scoringRule: Record<string, unknown> | null;
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
  maxScore: number;
  status: QuestionVersionStatus;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
};

export type Question = {
  id: string;
  questionBankId: string;
  questionTypeId: string;
  code: string | null;
  status: QuestionStatus;
  versionCount: number;
  latestVersion: QuestionVersion | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionList = {
  data: Question[];
  total: number;
  page: number;
  limit: number;
};

export type ListQuestionsQuery = {
  questionTypeId?: string;
  status?: QuestionStatus;
  versionStatus?: QuestionVersionStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type QuestionOptionInput = {
  key: string;
  label: string;
  isCorrect?: boolean;
  value?: number;
  sortOrder?: number;
};

export type CreateQuestionInput = {
  questionTypeId: string;
  code?: string;
  stem: string;
  scoringRule?: Record<string, unknown>;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  maxScore: number;
  options?: QuestionOptionInput[];
};

export type UpdateQuestionInput = {
  questionTypeId?: string;
  code?: string | null;
  status?: QuestionStatus;
};

export type CreateQuestionVersionInput = {
  stem: string;
  scoringRule?: Record<string, unknown>;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  maxScore: number;
  options?: QuestionOptionInput[];
};

export type UpdateQuestionVersionInput = Partial<CreateQuestionVersionInput>;

export type Exam = {
  id: string;
  assessmentId: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  attemptsAllowed: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultImmediately: boolean;
  status: string;
  blueprint?: ExamBlueprint | null;
};
export type ExamBlueprintRule = {
  id?: string;
  code: string;
  label: string | null;
  count: number;
  pointsPerQuestion: number;
  questionBankId: string | null;
  questionTypeId: string | null;
  topic: string | null;
  difficulty: string | null;
};
/**
 * The rule shape accepted by the save endpoint.
 *
 * Separate from `ExamBlueprintRule` on purpose: the server always returns every
 * field (null when unset), but a caller only has to send the ones it means to
 * constrain, so a rule is not forced to fabricate values it never chose.
 */
export type ExamBlueprintRuleInput = {
  code: string;
  label?: string;
  count: number;
  pointsPerQuestion: number;
  questionBankId?: string;
  questionTypeId?: string;
  topic?: string;
  difficulty?: string;
};
export type ExamBlueprint = {
  id: string;
  title: string | null;
  selectionMode?: string;
  rules: ExamBlueprintRule[];
};
export type SessionStatus =
  'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';

/**
 * Participant lifecycle. The API only accepts `INVITED`/`ELIGIBLE` additions
 * while the session is still `DRAFT` or `SCHEDULED`.
 */
export type ParticipantStatus =
  'INVITED' | 'ELIGIBLE' | 'DISQUALIFIED' | 'COMPLETED';

/**
 * Exam lifecycle. Only `PATCH /exams/:id/status` moves an exam between these,
 * and each transition is permission-guarded and audited server-side instead of
 * being inferred from a partial update.
 */
export type ExamStatus =
  'DRAFT' | 'VALIDATED' | 'SCHEDULED' | 'CLOSED' | 'ARCHIVED';

export type ExamSession = {
  id: string;
  examId: string;
  startAt: string;
  endAt: string;
  status: SessionStatus;
  participants?: ExamParticipant[];
};
export type ExamParticipant = {
  id: string;
  sessionId: string;
  enrollmentId: string;
  status: ParticipantStatus;
};
export type CreateExamInput = Omit<Partial<Exam>, 'id' | 'status'> & {
  assessmentId: string;
  title: string;
  durationMinutes: number;
};
export type UpdateExamInput = Partial<Omit<CreateExamInput, 'assessmentId'>>;
export type CreateExamSessionInput = {
  examId: string;
  startAt: string;
  endAt: string;
  settings?: Record<string, unknown>;
};
export type AddExamParticipantInput = {
  enrollmentId: string;
  status?: ParticipantStatus;
  accommodations?: Record<string, unknown>;
};
export type ManualExamGradeInput = {
  score: number;
  feedback?: string | null;
  graderPersonId: string;
};

// ---------------------------------------------------------------------------
// Attempt runtime (TASK-044 / TASK-045)
//
// Participant-facing contract. The API guarantees these payloads contain no
// answer key, so nothing here may be extended with server-only fields.
// ---------------------------------------------------------------------------

export type AttemptStatus =
  'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'CANCELLED';

export type AttemptAnswer = {
  answerPayload: Record<string, unknown>;
  revision: number;
  savedAt: string;
};

export type AttemptOption = {
  key: string;
  label: string;
  sortOrder: number;
};

export type AttemptQuestion = {
  id: string;
  sequence: number;
  points: number;
  optionOrder: unknown;
  questionVersionId: string;
  stem: string;
  topic: string | null;
  difficulty: string | null;
  /**
   * Data-driven answering modality. Render radios, checkboxes or a textarea from
   * these flags instead of comparing `code` against a known string, so a newly
   * seeded type needs no UI change.
   */
  questionType: {
    code: string;
    name: string;
    hasOptions: boolean;
    multiSelect: boolean;
  };
  options: AttemptOption[];
  answer: AttemptAnswer | null;
};

export type Attempt = {
  id: string;
  participantId: string;
  attemptNo: number;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  status: AttemptStatus;
  score: number | null;
  questions: AttemptQuestion[];
};

export type StartAttemptInput = {
  participantId: string;
};

export type SaveAttemptAnswerInput = {
  answerPayload: Record<string, unknown>;
  /** The revision the client last observed; the server rejects a stale write. */
  revision: number;
};

// ---------------------------------------------------------------------------
// Reporting domain (TASK-060 / TASK-061 / TASK-062 / TASK-063 / TASK-064)
//
// Read-heavy contracts. Every figure is served from the stored reporting read
// model; the admin UI only displays these, it never computes them. Average
// numbers here are already the backend's weighted/summed values — the client
// must not re-derive them.

export type ReportingScopeType =
  | 'ORGANIZATION'
  | 'PROGRAM'
  | 'BATCH'
  | 'CLASS'
  | 'CLASS_SUBJECT'
  | 'ENROLLMENT';

/** Reported metrics for one scope (TASK-060). */
export type ReportingMetrics = {
  participants: number;
  activeParticipants: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
  gradedCount: number;
  unapprovedGradeCount: number;
};

export type ReportingScopeMetric = {
  id: string;
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  organizationId: string | null;
  educationProgramId: string | null;
  educationBatchId: string | null;
  academicClassId: string | null;
  classSubjectId: string | null;
  metrics: ReportingMetrics;
  generatedAt: string;
  recalculatedAt: string;
};

export type ReportingMetricsList = {
  data: ReportingScopeMetric[];
  total: number;
  page: number;
  limit: number;
};

export type RefreshReportingInput = {
  scopeType?: ReportingScopeType;
  scopeId?: string;
  organizationId?: string;
};

export type RefreshReportingResult = {
  refreshed: number;
  scopes: string[];
  refreshedAt: string;
};

/** Executive KPI roll-up grain (TASK-061). */
export type ExecutiveOverviewScope =
  'NATIONAL' | 'ORGANIZATION' | 'PROGRAM' | 'BATCH';

export type ExecutiveKpiBlock = {
  participants: number;
  activeParticipants: number;
  institutions: number;
  programs: number;
  batches: number;
  classes: number;
  averageProgressPercent: number;
  attendancePercentage: number;
  totalSessions: number;
  averageFinalScore: number;
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
  certificationRate: number;
};

export type ExecutiveScope = {
  scope: ExecutiveOverviewScope;
  scopeId: string | null;
  accessLevel: 'NATIONAL' | 'SCOPED';
  institutionCount: number;
  periodFrom: string | null;
  periodTo: string | null;
};

export type ExecutiveBreakdownItem = {
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  metrics: ReportingMetrics;
  recalculatedAt: string;
};

export type ExecutiveBreakdownList = {
  data: ExecutiveBreakdownItem[];
  total: number;
  page: number;
  limit: number;
};

export type ExecutiveOverview = {
  scope: ExecutiveScope;
  kpis: ExecutiveKpiBlock;
  breakdown: ExecutiveBreakdownList;
  generatedAt: string;
};

export type ExecutiveOverviewQuery = {
  scope?: ExecutiveOverviewScope;
  scopeId?: string;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  limit?: number;
};

/** KPI detail level (TASK-063). */
export type KpiDetailLevel =
  'PROGRAM' | 'BATCH' | 'CLASS' | 'CLASS_SUBJECT' | 'ENROLLMENT';

export type KpiDistributionBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  participants: number;
};

export type KpiDistributions = {
  attendance: KpiDistributionBucket[];
  learningProgress: KpiDistributionBucket[];
  finalScore: KpiDistributionBucket[];
  remedialRisk: KpiDistributionBucket[];
};

export type KpiAttentionItem = {
  scopeType: ReportingScopeType;
  scopeId: string;
  scopeName: string | null;
  severity: number;
  reasons: string[];
  metrics: ReportingMetrics;
  recalculatedAt: string;
};

export type KpiTrendPoint = {
  period: string;
  scopeCount: number;
  kpis: ExecutiveKpiBlock;
};

export type ExecutiveKpiDetail = {
  scope: ExecutiveScope;
  level: ReportingScopeType;
  summary: ExecutiveKpiBlock;
  distributions: KpiDistributions;
  attention: KpiAttentionItem[];
  trends: KpiTrendPoint[];
  total: number;
  page: number;
  limit: number;
  generatedAt: string;
};

export type ExecutiveKpiQuery = {
  scope?: ExecutiveOverviewScope;
  scopeId?: string;
  level?: KpiDetailLevel;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  limit?: number;
  attentionLimit?: number;
  trendLimit?: number;
};

/** Drill-down walk (TASK-062). */
export type DrilldownChild = {
  level: ReportingScopeType;
  id: string;
  name: string | null;
  code: string | null;
  parentId: string | null;
  childCount: number;
  hasChildren: boolean;
  metrics: ReportingMetrics | null;
  recalculatedAt: string | null;
};

export type DrilldownTrailEntry = {
  level: ReportingScopeType;
  id: string | null;
};

export type DrilldownList = {
  level: ReportingScopeType;
  parentId: string | null;
  parentLevel: ReportingScopeType | null;
  trail: DrilldownTrailEntry[];
  openableLevels: ReportingScopeType[];
  data: DrilldownChild[];
  total: number;
  page: number;
  limit: number;
};

export type DrilldownQuery = {
  level: ReportingScopeType;
  parentId?: string;
  page?: number;
  limit?: number;
};

/** Graduation trend (TASK-064). */
export type GraduationTrendGranularity =
  'COHORT' | 'YEAR' | 'QUARTER' | 'MONTH';

export type GraduationTrendPoint = {
  period: string;
  scopeCount: number;
  evaluationCount: number;
  eligibleCount: number;
  approvedCount: number;
  passCount: number;
  failCount: number;
  remedialCount: number;
  withdrawnCount: number;
  certificateIssuedCount: number;
  passRate: number;
  failRate: number;
  remedialRate: number;
  certificationRate: number;
};

export type GraduationTrend = {
  scope: ExecutiveScope;
  level: ReportingScopeType;
  granularity: GraduationTrendGranularity;
  trends: GraduationTrendPoint[];
  generatedAt: string;
};

export type GraduationTrendQuery = {
  scope?: ExecutiveOverviewScope;
  scopeId?: string;
  level?: KpiDetailLevel;
  granularity?: GraduationTrendGranularity;
  periodFrom?: string;
  periodTo?: string;
  limit?: number;
};

// ---------------------------------------------------------------------------
// Audit Trail (TASK-006, TASK-009AG)
// ---------------------------------------------------------------------------

/** One audit trail entry as returned by `GET /audit-logs`. */
export type AuditLogEntry = {
  id: string;
  actorUserAccountId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  /** State before the mutation (already redacted server-side). */
  before: unknown;
  /** State after the mutation (already redacted server-side). */
  after: unknown;
  /** Supplementary redacted context. */
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditLogList = {
  data: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
};

export type AuditLogQuery = {
  actorUserAccountId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
};

function isHealthResponse(body: unknown): body is HealthResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'status' in body &&
    body.status === 'ok'
  );
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function createApiClient(
  baseUrl: string,
  options: ApiClientOptions = {},
) {
  const root = trimBaseUrl(baseUrl);

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await fetch(`${root}/api/v1${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // ignore non-json error bodies
      }
      throw new Error(
        getErrorMessage(body, `API request failed: ${response.status}`),
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function mutate<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiMutationResult<T>> {
    try {
      return { ok: true, data: await request<T>(path, init) };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : 'Unknown API error',
      };
    }
  }

  return {
    async health(): Promise<HealthResponse> {
      const response = await fetch(`${root}/api/v1/health`, {
        cache: 'no-store',
      });
      if (!response.ok)
        throw new Error(`Health request failed: ${response.status}`);
      const body: unknown = await response.json();
      if (!isHealthResponse(body)) throw new Error('Invalid health response');
      return { status: 'ok' };
    },

    me() {
      return request<UserIdentity>('/me');
    },

    enrollments: {
      list(
        params: {
          personId?: string;
          educationBatchId?: string;
          academicClassId?: string;
          status?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Enrollment>>(
          `/enrollments${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      listByPerson(personId: string) {
        return request<Enrollment[]>(`/enrollments/persons/${personId}`);
      },
      get(id: string) {
        return request<Enrollment>(`/enrollments/${id}`);
      },
      create(input: CreateEnrollmentInput) {
        return mutate<Enrollment>('/enrollments', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      updateStatus(
        id: string,
        status: AcademicEnrollmentStatus,
        reason?: string,
      ) {
        return mutate<Enrollment>(`/enrollments/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, reason }),
        });
      },
      transferClass(id: string, academicClassId: string) {
        return mutate<Enrollment>(`/enrollments/${id}/class`, {
          method: 'PATCH',
          body: JSON.stringify({ academicClassId }),
        });
      },
    },

    files: {
      getDownloadUrl(id: string) {
        return request<DownloadUrlResponse>(`/files/${id}/download-url`);
      },
      getUploadPolicy() {
        return request<UploadPolicyResponse>('/files/upload-policy');
      },
    },

    organizations: {
      list(
        params: {
          search?: string;
          status?: Organization['status'];
          parentId?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Organization>>(
          `/organizations${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      tree(id: string) {
        return request<OrganizationTree>(`/organizations/${id}/tree`);
      },
      create(input: CreateOrganizationInput) {
        return mutate<Organization>('/organizations', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateOrganizationInput) {
        return mutate<Organization>(`/organizations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    educationPrograms: {
      list(
        params: {
          organizationId?: string;
          search?: string;
          status?: EducationProgram['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<EducationProgram>>(
          `/education-programs${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<EducationProgram>(`/education-programs/${id}`);
      },
      create(input: CreateEducationProgramInput) {
        return mutate<EducationProgram>('/education-programs', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateEducationProgramInput) {
        return mutate<EducationProgram>(`/education-programs/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    curricula: {
      list(
        params: {
          educationProgramId?: string;
          status?: Curriculum['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Curriculum>>(
          `/curricula${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<Curriculum>(`/curricula/${id}`);
      },
      create(input: CreateCurriculumInput) {
        return mutate<Curriculum>('/curricula', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateCurriculumInput) {
        return mutate<Curriculum>(`/curricula/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    subjects: {
      list(
        params: {
          search?: string;
          status?: Subject['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Subject>>(
          `/subjects${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<Subject>(`/subjects/${id}`);
      },
      create(input: CreateSubjectInput) {
        return mutate<Subject>('/subjects', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateSubjectInput) {
        return mutate<Subject>(`/subjects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    educationBatches: {
      list(
        params: {
          educationProgramId?: string;
          curriculumId?: string;
          status?: EducationBatch['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<EducationBatch>>(
          `/education-batches${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<EducationBatch>(`/education-batches/${id}`);
      },
      create(input: CreateEducationBatchInput) {
        return mutate<EducationBatch>('/education-batches', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateEducationBatchInput) {
        return mutate<EducationBatch>(`/education-batches/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    academicClasses: {
      list(
        params: {
          educationBatchId?: string;
          educationProgramId?: string;
          status?: AcademicClass['status'];
          search?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiPagedResponse<AcademicClass>>(
          `/academic-classes${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<AcademicClass>(`/academic-classes/${id}`);
      },
      create(input: CreateAcademicClassInput) {
        return mutate<AcademicClass>('/academic-classes', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateAcademicClassInput) {
        return mutate<AcademicClass>(`/academic-classes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    persons: {
      list(
        params: {
          search?: string;
          status?: Person['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Person>>(
          `/persons${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      create(input: CreatePersonInput) {
        return mutate<Person>('/persons', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      getAccount(personId: string) {
        return request<UserAccount>(`/persons/${personId}/account`);
      },
      listOrganizations(personId: string) {
        return request<PersonOrganization[]>(
          `/persons/${personId}/organizations`,
        );
      },
      createAccount(personId: string, input: CreateUserAccountInput) {
        return mutate<UserAccount>(`/persons/${personId}/account`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(personId: string, input: UpdatePersonInput) {
        return mutate<Person>(`/persons/${personId}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      updateAccount(personId: string, input: UpdateUserAccountInput) {
        return mutate<UserAccount>(`/persons/${personId}/account`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    authorization: {
      roles(
        params: {
          search?: string;
          status?: Role['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Role>>(
          `/authorization/roles${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      role(id: string) {
        return request<Role & { permissions: Permission[] }>(
          `/authorization/roles/${id}`,
        );
      },
      rolePermissions(id: string) {
        return request<Permission[]>(`/authorization/roles/${id}/permissions`);
      },
      permissions(
        params: { search?: string; page?: number; limit?: number } = {},
      ) {
        return request<ApiListResponse<Permission>>(
          `/authorization/permissions${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      assignments(
        params: {
          userAccountId?: string;
          roleId?: string;
          status?: RoleAssignment['status'];
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<RoleAssignment>>(
          `/authorization/assignments${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      createAssignment(input: CreateRoleAssignmentInput) {
        return mutate<RoleAssignment>('/authorization/assignments', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      addAssignmentScopes(id: string, input: AddRoleAssignmentScopesInput) {
        return mutate<RoleAssignment>(
          `/authorization/assignments/${id}/scopes`,
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
        );
      },
      updateAssignmentStatus(id: string, status: RoleAssignmentStatus) {
        return mutate<RoleAssignment>(
          `/authorization/assignments/${id}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          },
        );
      },
      async removeAssignmentScope(id: string, scopeId: string) {
        try {
          return {
            ok: true as const,
            data: await request<RoleAssignment>(
              `/authorization/assignments/${id}/scopes/${scopeId}`,
              { method: 'DELETE' },
            ),
          };
        } catch (error) {
          return {
            ok: false as const,
            status: 0,
            message:
              error instanceof Error ? error.message : 'Unknown API error',
          };
        }
      },
    },

    classSubjects: {
      list(
        params: {
          academicClassId?: string;
          subjectId?: string;
          educatorPersonId?: string;
          status?: string;
          search?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<ClassSubject>>(
          `/class-subjects${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<ClassSubject>(`/class-subjects/${id}`);
      },
    },

    learningMeetings: {
      list(
        params: {
          classSubjectId?: string;
          status?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningMeeting>>(
          `/learning-meetings${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
    },

    learningActivityTypes: {
      list(
        params: {
          status?: string;
          search?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningActivityType>>(
          `/learning-activity-types${buildQuery({ page: 1, limit: 100, ...params })}`,
        );
      },
    },

    learningActivities: {
      list(
        params: {
          meetingId?: string;
          status?: string;
          search?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningActivity>>(
          `/learning-activities${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      create(input: {
        meetingId: string;
        activityTypeId: string;
        title: string;
        instructions?: string | null;
        required?: boolean;
        availableFrom?: string | null;
        availableUntil?: string | null;
        sequence?: number;
        status?: LearningActivityStatus;
      }) {
        return mutate<LearningActivity>('/learning-activities', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      createContent(
        activityId: string,
        input: {
          contentType: LearningActivityContentType;
          title: string;
          objectKey?: string | null;
          externalUrl?: string | null;
          mimeType?: string | null;
          sizeBytes?: number;
        },
      ) {
        return mutate<LearningActivityContent>(
          `/learning-activities/${activityId}/contents`,
          { method: 'POST', body: JSON.stringify(input) },
        );
      },
      update(
        id: string,
        input: {
          activityTypeId?: string;
          sequence?: number;
          title?: string;
          instructions?: string | null;
          required?: boolean;
          availableFrom?: string | null;
          availableUntil?: string | null;
          status?: LearningActivityStatus;
        },
      ) {
        return mutate<LearningActivity>(`/learning-activities/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, status: LearningActivityStatus) {
        return mutate<LearningActivity>(`/learning-activities/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
    },

    learningActivityContents: {
      listByActivity(
        activityId: string,
        params: {
          status?: string;
          includeSuperseded?: boolean;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningActivityContent>>(
          `/learning-activities/${activityId}/contents${buildQuery({ page: 1, limit: 50, ...params, includeSuperseded: params.includeSuperseded ? 'true' : undefined })}`,
        );
      },
      list(
        params: { activityId?: string; page?: number; limit?: number } = {},
      ) {
        return request<ApiListResponse<LearningActivityContent>>(
          `/learning-activity-contents${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      create(input: {
        activityId: string;
        contentType: LearningActivityContentType;
        title: string;
        body?: string | null;
        externalUrl?: string | null;
        storedFileId?: string | null;
        sequenceNo?: number;
      }) {
        return mutate<LearningActivityContent>('/learning-activity-contents', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(
        id: string,
        input: {
          title?: string;
          objectKey?: string | null;
          externalUrl?: string | null;
          mimeType?: string | null;
          sizeBytes?: number | null;
          status?: LearningActivityContent['status'];
        },
      ) {
        return mutate<LearningActivityContent>(`/learning-contents/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    learningProgress: {
      listByClassSubject(
        classSubjectId: string,
        params: { page?: number; limit?: number } = {},
      ) {
        return request<
          ApiListResponse<ClassSubjectProgressSummary> & {
            classSubject?: ClassSubjectProgressSummary;
          }
        >(
          `/learning-progress/summary/class-subjects/${classSubjectId}${buildQuery(
            { page: 1, limit: 20, ...params },
          )}`,
        );
      },
      getParticipantSummary(classSubjectId: string, enrollmentId: string) {
        return request<ParticipantProgressSummary>(
          `/learning-progress/summary/class-subjects/${classSubjectId}/enrollments/${enrollmentId}`,
        );
      },
      findOne(enrollmentId: string, activityId: string) {
        return request<LearningProgress>(
          `/learning-progress/enrollments/${enrollmentId}/activities/${activityId}`,
        );
      },
      listClassSubjectProgress(
        params: {
          classSubjectId?: string;
          enrollmentId?: string;
          status?: LearningProgressStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningProgress>>(
          `/learning-progress${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      recordProgress(input: UpdateLearningProgressInput) {
        return mutate<LearningProgress>('/learning-progress', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
    },

    assignments: {
      list(
        params: {
          classSubjectId?: string;
          activityId?: string;
          meetingId?: string;
          search?: string;
          status?: AssignmentLifecycleStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<Assignment>>(
          `/assignments${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<Assignment>(`/assignments/${id}`);
      },
      create(input: {
        activityId: string;
        assessmentId?: string | null;
        title: string;
        instructions?: string | null;
        dueAt?: string | null;
        maxScore?: number;
        attemptsAllowed?: number;
      }) {
        return mutate<Assignment>('/assignments', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(
        id: string,
        input: {
          title?: string;
          instructions?: string | null;
          dueAt?: string | null;
          maxScore?: number;
          attemptsAllowed?: number;
        },
      ) {
        return mutate<Assignment>(`/assignments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, status: AssignmentLifecycleStatus) {
        return mutate<Assignment>(`/assignments/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
    },

    submissions: {
      list(
        params: {
          assignmentId?: string;
          enrollmentId?: string;
          submissionStatus?: AssignmentSubmissionStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<AssignmentSubmission>>(
          `/assignment-submissions${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<AssignmentSubmission>(`/assignment-submissions/${id}`);
      },
      submit(input: SubmitAssignmentInput) {
        return mutate<SubmitResponse>('/assignment-submissions', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      updateTextAnswer(id: string, textAnswer: string | null) {
        return mutate<AssignmentSubmission>(`/assignment-submissions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ textAnswer }),
        });
      },
      attachFile(id: string, storedFileId: string, label?: string) {
        return mutate<AssignmentSubmission>(
          `/assignment-submissions/${id}/files`,
          {
            method: 'POST',
            body: JSON.stringify({ storedFileId, label }),
          },
        );
      },
      detachFile(id: string, storedFileId: string) {
        return mutate<AssignmentSubmission>(
          `/assignment-submissions/${id}/files/${storedFileId}`,
          { method: 'DELETE' },
        );
      },
      grade(id: string, input: GradeSubmissionInput) {
        return mutate<AssignmentSubmission>(
          `/assignment-submissions/${id}/grade`,
          { method: 'POST', body: JSON.stringify(input) },
        );
      },
      returnToParticipant(id: string) {
        return mutate<AssignmentSubmission>(
          `/assignment-submissions/${id}/return`,
          { method: 'POST' },
        );
      },
    },

    attendance: {
      listSessions(
        params: {
          classSubjectId?: string;
          meetingId?: string;
          status?: AttendanceSessionStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiPagedResponse<AttendanceSession>>(
          `/attendance/sessions${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      getSession(id: string) {
        return request<AttendanceSessionDetail>(`/attendance/sessions/${id}`);
      },
      createSession(input: CreateAttendanceSessionInput) {
        return mutate<AttendanceSession>('/attendance/sessions', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      changeSessionStatus(id: string, status: AttendanceSessionStatus) {
        return mutate<AttendanceSession>(`/attendance/sessions/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
      listRecords(
        params: {
          sessionId?: string;
          enrollmentId?: string;
          status?: AttendanceStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiPagedResponse<AttendanceRecord>>(
          `/attendance/records${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      record(input: RecordAttendanceInput & { sessionId: string }) {
        return mutate<AttendanceRecord>('/attendance/records', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      bulkRecord(sessionId: string, input: BulkRecordAttendanceInput) {
        return mutate<AttendanceRecord[]>(
          `/attendance/sessions/${sessionId}/records/bulk`,
          { method: 'POST', body: JSON.stringify(input) },
        );
      },
    },

    attendanceCorrections: {
      listByRecord(
        recordId: string,
        params: { page?: number; limit?: number } = {},
      ) {
        return request<ApiPagedResponse<AttendanceCorrection>>(
          `/attendance-corrections/records/${recordId}${buildQuery({
            page: 1,
            limit: 20,
            ...params,
          })}`,
        );
      },
      list(
        params: {
          recordId?: string;
          sessionId?: string;
          requestedByUserId?: string;
          status?: AttendanceCorrectionStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiPagedResponse<AttendanceCorrection>>(
          `/attendance-corrections${buildQuery({
            page: 1,
            limit: 20,
            ...params,
          })}`,
        );
      },
      apply(recordId: string, input: ApplyAttendanceCorrectionInput) {
        return mutate<ApplyAttendanceCorrectionResponse>(
          `/attendance-corrections/records/${recordId}`,
          { method: 'POST', body: JSON.stringify(input) },
        );
      },
    },

    /**
     * Pre-aggregated attendance figures (TASK-033).
     *
     * Every read here is a single lookup against a summary row, so reporting
     * screens do not scan raw attendance records. `refresh` is the only method
     * that recalculates from the raw tables, and the API also refreshes the
     * affected scopes automatically when attendance changes.
     */
    attendanceSummary: {
      list(params: ListAttendanceSummariesQuery = {}) {
        return request<AttendanceSummaryList>(
          `/attendance-summary${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      getEnrollment(enrollmentId: string, classSubjectId?: string) {
        return request<AttendanceSummary>(
          `/attendance-summary/enrollments/${enrollmentId}${buildQuery({
            classSubjectId,
          })}`,
        );
      },
      getClassSubject(classSubjectId: string) {
        return request<AttendanceSummary>(
          `/attendance-summary/class-subjects/${classSubjectId}`,
        );
      },
      getClass(academicClassId: string) {
        return request<AttendanceSummary>(
          `/attendance-summary/classes/${academicClassId}`,
        );
      },
      getBatch(educationBatchId: string) {
        return request<AttendanceSummary>(
          `/attendance-summary/batches/${educationBatchId}`,
        );
      },
      getProgram(educationProgramId: string) {
        return request<AttendanceSummary>(
          `/attendance-summary/programs/${educationProgramId}`,
        );
      },
      refresh(input: RefreshAttendanceSummaryInput) {
        return mutate<AttendanceSummary>('/attendance-summary/refresh', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
    },

    /**
     * Data-driven assessment method vocabulary (TASK-040).
     */
    assessmentTypes: {
      list(params: ListAssessmentTypesQuery = {}) {
        return request<AssessmentTypeList>(
          `/assessment-types${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      get(id: string) {
        return request<AssessmentType>(`/assessment-types/${id}`);
      },
      create(input: CreateAssessmentTypeInput) {
        return mutate<AssessmentType>('/assessment-types', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateAssessmentTypeInput) {
        return mutate<AssessmentType>(`/assessment-types/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },

    /**
     * Umbrella assessments (TASK-040).
     *
     * `list` filters by class subject; `changeStatus` is the only way to move
     * through DRAFT/PUBLISHED/CLOSED/ARCHIVED, so every lifecycle change is
     * guarded and audited.
     */
    assessments: {
      list(params: ListAssessmentsQuery = {}) {
        return request<AssessmentList>(
          `/assessments${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      get(id: string) {
        return request<Assessment>(`/assessments/${id}`);
      },
      create(input: CreateAssessmentInput) {
        return mutate<Assessment>('/assessments', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateAssessmentInput) {
        return mutate<Assessment>(`/assessments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, input: ChangeAssessmentStatusInput) {
        return mutate<Assessment>(`/assessments/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
    },
    /**
     * Question banks and their questions (TASK-041).
     *
     * Authoring contract only: responses include the answer key, so this must
     * never be called with a participant's token.
     */
    questionBanks: {
      list(params: ListQuestionBanksQuery = {}) {
        return request<QuestionBankList>(
          `/question-banks${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      get(id: string) {
        return request<QuestionBank>(`/question-banks/${id}`);
      },
      create(input: CreateQuestionBankInput) {
        return mutate<QuestionBank>('/question-banks', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateQuestionBankInput) {
        return mutate<QuestionBank>(`/question-banks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      listQuestions(bankId: string, params: ListQuestionsQuery = {}) {
        return request<QuestionList>(
          `/question-banks/${bankId}/questions${buildQuery({
            page: 1,
            limit: 50,
            ...params,
          })}`,
        );
      },
      createQuestion(bankId: string, input: CreateQuestionInput) {
        return mutate<Question>(`/question-banks/${bankId}/questions`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
    },

    /** Read-only, data-driven question type vocabulary (TASK-041). */
    questionTypes: {
      list(
        params: {
          status?: QuestionStatus;
          search?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<QuestionTypeList>(
          `/question-types${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
    },

    questions: {
      get(id: string) {
        return request<Question>(`/questions/${id}`);
      },
      update(id: string, input: UpdateQuestionInput) {
        return mutate<Question>(`/questions/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      createVersion(id: string, input: CreateQuestionVersionInput) {
        return mutate<QuestionVersion>(`/questions/${id}/versions`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      updateVersion(
        id: string,
        versionId: string,
        input: UpdateQuestionVersionInput,
      ) {
        return mutate<QuestionVersion>(
          `/questions/${id}/versions/${versionId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(input),
          },
        );
      },
      publishVersion(id: string, versionId: string) {
        return mutate<QuestionVersion>(
          `/questions/${id}/versions/${versionId}/publish`,
          { method: 'POST' },
        );
      },
    },

    exams: {
      get(id: string) {
        return request<Exam>(`/exams/${id}`);
      },
      create(input: CreateExamInput) {
        return mutate<Exam>('/exams', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: Partial<CreateExamInput>) {
        return mutate<Exam>(`/exams/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      saveBlueprint(
        id: string,
        input: {
          title?: string;
          description?: string;
          rules: ExamBlueprintRuleInput[];
        },
      ) {
        return mutate<ExamBlueprint>(`/exams/${id}/blueprint`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, status: string) {
        return mutate<Exam>(`/exams/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
    },
    examSessions: {
      get(id: string) {
        return request<ExamSession>(`/exam-sessions/${id}`);
      },
      create(input: CreateExamSessionInput) {
        return mutate<ExamSession>('/exam-sessions', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, status: ExamSession['status']) {
        return mutate<ExamSession>(`/exam-sessions/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
      addParticipant(id: string, input: AddExamParticipantInput) {
        return mutate<ExamParticipant>(`/exam-sessions/${id}/participants`, {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
    },
    /**
     * Exam attempt runtime (TASK-044 / TASK-045).
     *
     * `start` is idempotent: calling it while an attempt is in progress returns
     * that same attempt, which is what makes refresh/resume safe. The deadline
     * is the server's `expiresAt`; the client clock is never trusted.
     */
    attempts: {
      start(input: StartAttemptInput) {
        return mutate<Attempt>('/attempts', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      get(id: string) {
        return request<Attempt>(`/attempts/${id}`);
      },
      submit(id: string) {
        return mutate<Attempt>(`/attempts/${id}/submit`, { method: 'POST' });
      },
      saveAnswer(
        attemptId: string,
        attemptQuestionId: string,
        input: SaveAttemptAnswerInput,
      ) {
        return mutate<AttemptAnswer>(
          `/attempts/${attemptId}/questions/${attemptQuestionId}/answer`,
          {
            method: 'PUT',
            body: JSON.stringify(input),
          },
        );
      },
    },

    examGrading: {
      autoGrade(attemptId: string) {
        return mutate<unknown>(`/exam-grading/${attemptId}/auto`, {
          method: 'POST',
        });
      },
      manualGrade(answerId: string, input: ManualExamGradeInput) {
        return mutate<unknown>(`/exam-grading/answers/${answerId}`, {
          method: 'PUT',
          body: JSON.stringify(input),
        });
      },
    },

    /**
     * Grading schemes and their components (TASK-050).
     *
     * A scheme groups assessments under a class subject and assigns percentage
     * weights so the final grade can be computed automatically. The backend
     * returns a plain array (no pagination wrapper yet).
     */
    gradingSchemes: {
      list(
        params: {
          classSubjectId?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<GradingScheme[]>(
          `/grading-schemes${buildQuery(params)}`,
        );
      },
      get(id: string) {
        return request<GradingScheme>(`/grading-schemes/${id}`);
      },
      create(input: CreateGradingSchemeInput) {
        return mutate<GradingScheme>('/grading-schemes', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      addComponent(schemeId: string, input: CreateGradingComponentInput) {
        return mutate<GradingComponent>(
          `/grading-schemes/${schemeId}/components`,
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
        );
      },
    },

    /**
     * Final grades per enrollment per class subject (TASK-050). There is no
     * list endpoint yet: a final grade is produced on demand by
     * `calculate`/`recalculate` and read back by id.
     */
    finalGrades: {
      get(id: string) {
        return request<FinalGrade>(`/final-grades/${id}`);
      },
      calculate(input: CalculateFinalGradeInput) {
        return mutate<FinalGrade>('/final-grades/calculate', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      recalculate(input: CalculateFinalGradeInput) {
        return mutate<FinalGrade>('/final-grades/recalculate', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      approve(id: string, approvedByUserId: string) {
        return mutate<FinalGrade>(`/final-grades/${id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ approvedByUserId }),
        });
      },
      reopen(id: string, reopenedByUserId: string, note?: string) {
        return mutate<FinalGrade>(`/final-grades/${id}/reopen`, {
          method: 'POST',
          body: JSON.stringify({ reopenedByUserId, note }),
        });
      },
    },

    /**
     * Graduation rules and evaluation (TASK-052).
     */
    graduation: {
      listRules(
        params: {
          educationBatchId?: string;
          status?: GraduationRuleStatus;
          code?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<GraduationRuleList>(
          `/graduation/rules${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      getRule(id: string) {
        return request<GraduationRule>(`/graduation/rules/${id}`);
      },
      createRule(input: CreateGraduationRuleInput) {
        return mutate<GraduationRule>('/graduation/rules', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      updateRule(id: string, input: UpdateGraduationRuleInput) {
        return mutate<GraduationRule>(`/graduation/rules/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      changeRuleStatus(id: string, status: GraduationRuleStatus) {
        return mutate<GraduationRule>(`/graduation/rules/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      },
      evaluateBatch(input: {
        educationBatchId: string;
        graduationRuleId: string;
      }) {
        return mutate<BatchEvaluationSummary>('/graduation/evaluations/batch', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      listEvaluations(enrollmentId: string) {
        return request<GraduationEvaluation[]>(
          `/graduation/enrollments/${enrollmentId}/evaluations`,
        );
      },
    },

    /**
     * Formal graduation decisions (TASK-053).
     */
    graduationDecisions: {
      list(
        params: {
          status?: GraduationDecisionStatus;
          decision?: GraduationDecisionOutcome;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<GraduationDecisionList>(
          `/graduation/decisions${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<GraduationDecision>(`/graduation/decisions/${id}`);
      },
      create(input: CreateGraduationDecisionInput) {
        return mutate<GraduationDecision>('/graduation/decisions', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      approve(id: string) {
        return mutate<GraduationDecision>(
          `/graduation/decisions/${id}/approve`,
          {
            method: 'PATCH',
            body: JSON.stringify({}),
          },
        );
      },
      revoke(id: string, revokedReason: string) {
        return mutate<GraduationDecision>(
          `/graduation/decisions/${id}/revoke`,
          {
            method: 'PATCH',
            body: JSON.stringify({ revokedReason }),
          },
        );
      },
    },

    /**
     * Certificate templates (TASK-054).
     */
    certificateTemplates: {
      list(
        params: {
          code?: string;
          status?: CertificateTemplateStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<CertificateTemplateList>(
          `/certificate-templates${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<CertificateTemplate>(`/certificate-templates/${id}`);
      },
      create(input: CreateCertificateTemplateInput) {
        return mutate<CertificateTemplate>('/certificate-templates', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      update(id: string, input: UpdateCertificateTemplateInput) {
        return mutate<CertificateTemplate>(`/certificate-templates/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
      },
      changeStatus(id: string, status: CertificateTemplateStatus) {
        return mutate<CertificateTemplate>(
          `/certificate-templates/${id}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          },
        );
      },
    },

    /**
     * Issued certificates (TASK-055).
     */
    certificates: {
      list(
        params: {
          templateId?: string;
          status?: CertificateStatus;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<CertificateList>(
          `/certificates${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<Certificate>(`/certificates/${id}`);
      },
      issue(input: IssueCertificateInput) {
        return mutate<Certificate>('/certificates', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      revoke(id: string, revokedReason: string) {
        return mutate<Certificate>(`/certificates/${id}/revoke`, {
          method: 'PATCH',
          body: JSON.stringify({ revokedReason }),
        });
      },
    },

    /**
     * Read-only audit trail (TASK-006, TASK-009AG).
     *
     * There is deliberately no create/update/delete here: entries are written by
     * the application services that perform the audited mutation, and the trail
     * is immutable. Reading requires the `audit.log.read` permission server-side.
     */
    audit: {
      list(params: AuditLogQuery = {}) {
        return request<AuditLogList>(
          `/audit-logs${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      get(id: string) {
        return request<AuditLogEntry>(`/audit-logs/${id}`);
      },
    },

    /**
     * Reporting read model (TASK-060 through TASK-064).
     *
     * Read-heavy contracts only. The admin UI consumes these; nothing here
     * re-derives figures the backend already computed. Permission checks
     * (`reporting.metric.read`, `reporting.metric.refresh`,
     * `reporting.executive.read`) are enforced server-side.
     */
    reporting: {
      listMetrics(
        params: {
          scopeType?: ReportingScopeType;
          scopeId?: string;
          organizationId?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ReportingMetricsList>(
          `/reporting/metrics${buildQuery({ page: 1, limit: 50, ...params })}`,
        );
      },
      getMetric(scopeType: ReportingScopeType, scopeId: string) {
        return request<ReportingScopeMetric>(
          `/reporting/metrics/${scopeType}/${scopeId}`,
        );
      },
      refreshMetrics(input: RefreshReportingInput) {
        return mutate<RefreshReportingResult>('/reporting/metrics/refresh', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      executiveOverview(params: ExecutiveOverviewQuery = {}) {
        return request<ExecutiveOverview>(
          `/reporting/executive/overview${buildQuery({ ...params })}`,
        );
      },
      executiveInstitution(organizationId: string) {
        return request<ExecutiveBreakdownItem>(
          `/reporting/executive/institutions/${organizationId}`,
        );
      },
      executiveKpis(params: ExecutiveKpiQuery = {}) {
        return request<ExecutiveKpiDetail>(
          `/reporting/executive/kpis${buildQuery({ page: 1, limit: 25, ...params })}`,
        );
      },
      executiveDrilldown(params: DrilldownQuery) {
        return request<DrilldownList>(
          `/reporting/executive/drilldown${buildQuery({ page: 1, limit: 25, ...params })}`,
        );
      },
      graduationTrends(params: GraduationTrendQuery = {}) {
        return request<GraduationTrend>(
          `/reporting/executive/graduation-trends${buildQuery({ ...params })}`,
        );
      },
    },
  };
}
