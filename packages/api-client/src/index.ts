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

export type CreateOrganizationInput = {
  code: string;
  name: string;
  parentId?: string | null;
  organizationType?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
};

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
  educatorPersonId: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
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
  sequenceNo: number;
  isRequired: boolean;
  status: LearningActivityStatus;
  createdAt: string;
  updatedAt: string;
};

export type LearningActivityContentType = 'TEXT' | 'LINK' | 'FILE' | 'VIDEO';

export type LearningActivityContent = {
  id: string;
  activityId: string;
  contentType: LearningActivityContentType;
  title: string;
  body: string | null;
  externalUrl: string | null;
  storedFileId: string | null;
  sequenceNo: number;
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
      list(params: { search?: string; page?: number; limit?: number } = {}) {
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
    },

    persons: {
      list(params: { search?: string; page?: number; limit?: number } = {}) {
        return request<ApiListResponse<Person>>(
          `/persons${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
    },

    authorization: {
      roles(params: { search?: string; page?: number; limit?: number } = {}) {
        return request<ApiListResponse<Role>>(
          `/authorization/roles${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
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
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<RoleAssignment>>(
          `/authorization/assignments${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
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

    learningActivities: {
      list(
        params: {
          meetingId?: string;
          status?: string;
          page?: number;
          limit?: number;
        } = {},
      ) {
        return request<ApiListResponse<LearningActivity>>(
          `/learning-activities${buildQuery({ page: 1, limit: 20, ...params })}`,
        );
      },
      update(
        id: string,
        input: {
          title?: string;
          description?: string | null;
          isRequired?: boolean;
          sequenceNo?: number;
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
          status?: AssignmentLifecycleStatus;
          search?: string;
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
  };
}
