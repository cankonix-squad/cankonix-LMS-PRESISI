/**
 * Audit action catalogue (TASK-006).
 *
 * Actions are stored as lowercase, dot-separated `<resource>.<event>` strings.
 * They are data, not an enum: a future domain adds its own constants here without
 * a database migration, and the audit trail stays queryable by action prefix.
 *
 * These strings are a public contract for audit consumers (reporting, security
 * review, SIEM export). Renaming an existing value silently breaks historical
 * queries, so treat them as append-only too — add a new action instead.
 */
export const AUDIT_ACTIONS = {
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',

  EDUCATION_PROGRAM_CREATED: 'education_program.created',
  EDUCATION_PROGRAM_UPDATED: 'education_program.updated',

  EDUCATION_BATCH_CREATED: 'education_batch.created',
  EDUCATION_BATCH_UPDATED: 'education_batch.updated',

  ACADEMIC_CLASS_CREATED: 'academic_class.created',
  ACADEMIC_CLASS_UPDATED: 'academic_class.updated',

  CLASS_SUBJECT_CREATED: 'class_subject.created',
  CLASS_SUBJECT_UPDATED: 'class_subject.updated',

  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_STATUS_CHANGED: 'enrollment.status_changed',
  ENROLLMENT_CLASS_TRANSFERRED: 'enrollment.class_transferred',

  EDUCATOR_TYPE_CREATED: 'educator_type.created',
  EDUCATOR_TYPE_UPDATED: 'educator_type.updated',

  EDUCATOR_ASSIGNMENT_CREATED: 'educator_assignment.created',
  EDUCATOR_ASSIGNMENT_UPDATED: 'educator_assignment.updated',
  EDUCATOR_ASSIGNMENT_ENDED: 'educator_assignment.ended',

  CLASS_STAFF_ASSIGNMENT_CREATED: 'class_staff_assignment.created',
  CLASS_STAFF_ASSIGNMENT_UPDATED: 'class_staff_assignment.updated',
  CLASS_STAFF_ASSIGNMENT_ENDED: 'class_staff_assignment.ended',

  ACADEMIC_SCHEDULE_CREATED: 'academic_schedule.created',
  ACADEMIC_SCHEDULE_UPDATED: 'academic_schedule.updated',
  ACADEMIC_SCHEDULE_CANCELLED: 'academic_schedule.cancelled',

  LEARNING_MEETING_CREATED: 'learning_meeting.created',
  LEARNING_MEETING_UPDATED: 'learning_meeting.updated',
  LEARNING_MEETING_STATUS_CHANGED: 'learning_meeting.status_changed',
  LEARNING_MEETING_REORDERED: 'learning_meeting.reordered',

  LEARNING_ACTIVITY_TYPE_CREATED: 'learning_activity_type.created',
  LEARNING_ACTIVITY_TYPE_UPDATED: 'learning_activity_type.updated',

  LEARNING_ACTIVITY_CREATED: 'learning_activity.created',
  LEARNING_ACTIVITY_UPDATED: 'learning_activity.updated',
  LEARNING_ACTIVITY_STATUS_CHANGED: 'learning_activity.status_changed',
  LEARNING_ACTIVITY_REORDERED: 'learning_activity.reordered',

  LEARNING_CONTENT_CREATED: 'learning_content.created',
  LEARNING_CONTENT_UPDATED: 'learning_content.updated',
  LEARNING_CONTENT_STATUS_CHANGED: 'learning_content.status_changed',
  LEARNING_CONTENT_VERSION_CREATED: 'learning_content.version_created',

  LEARNING_PROGRESS_STARTED: 'learning_progress.started',
  LEARNING_PROGRESS_UPDATED: 'learning_progress.updated',
  LEARNING_PROGRESS_COMPLETED: 'learning_progress.completed',

  ASSESSMENT_TYPE_CREATED: 'assessment_type.created',
  ASSESSMENT_TYPE_UPDATED: 'assessment_type.updated',

  ASSESSMENT_CREATED: 'assessment.created',
  ASSESSMENT_UPDATED: 'assessment.updated',
  ASSESSMENT_STATUS_CHANGED: 'assessment.status_changed',

  QUESTION_BANK_CREATED: 'question_bank.created',
  QUESTION_BANK_UPDATED: 'question_bank.updated',

  QUESTION_CREATED: 'question.created',
  QUESTION_UPDATED: 'question.updated',

  QUESTION_VERSION_CREATED: 'question_version.created',
  QUESTION_VERSION_UPDATED: 'question_version.updated',
  QUESTION_VERSION_PUBLISHED: 'question_version.published',
  EXAM_CREATED: 'exam.created',
  EXAM_STATUS_CHANGED: 'exam.status_changed',
  EXAM_AUTO_GRADED: 'exam.auto_graded',
  EXAM_MANUAL_GRADED: 'exam.manual_graded',

  GRADING_SCHEME_CREATED: 'grading_scheme.created',
  GRADING_SCHEME_STATUS_CHANGED: 'grading_scheme.status_changed',
  GRADING_COMPONENT_CREATED: 'grading_component.created',

  FINAL_GRADE_CALCULATED: 'final_grade.calculated',
  FINAL_GRADE_APPROVED: 'final_grade.approved',
  FINAL_GRADE_REOPENED: 'final_grade.reopened',

  GRADUATION_RULE_CREATED: 'graduation_rule.created',
  GRADUATION_RULE_UPDATED: 'graduation_rule.updated',
  GRADUATION_RULE_PUBLISHED: 'graduation_rule.published',
  GRADUATION_RULE_ARCHIVED: 'graduation_rule.archived',
  GRADUATION_RULE_COMPONENT_CREATED: 'graduation_rule_component.created',

  GRADUATION_EVALUATION_RUN: 'graduation_evaluation.run',

  GRADUATION_DECISION_CREATED: 'graduation_decision.created',
  GRADUATION_DECISION_APPROVED: 'graduation_decision.approved',
  GRADUATION_DECISION_CORRECTED: 'graduation_decision.corrected',
  GRADUATION_DECISION_REVOKED: 'graduation_decision.revoked',

  CERTIFICATE_TEMPLATE_CREATED: 'certificate_template.created',
  CERTIFICATE_TEMPLATE_UPDATED: 'certificate_template.updated',
  CERTIFICATE_TEMPLATE_STATUS_CHANGED: 'certificate_template.status_changed',
  CERTIFICATE_ISSUED: 'certificate.issued',
  CERTIFICATE_FILE_ATTACHED: 'certificate.file_attached',
  CERTIFICATE_REVOKED: 'certificate.revoked',

  REPORTING_REFRESHED: 'reporting.refreshed',

  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_UPDATED: 'assignment.updated',
  ASSIGNMENT_STATUS_CHANGED: 'assignment.status_changed',
  ASSIGNMENT_SUBMISSION_CREATED: 'assignment_submission.created',
  ASSIGNMENT_SUBMISSION_SUBMITTED: 'assignment_submission.submitted',
  ASSIGNMENT_SUBMISSION_FILE_ATTACHED: 'assignment_submission.file_attached',
  ASSIGNMENT_SUBMISSION_FILE_DETACHED: 'assignment_submission.file_detached',
  ASSIGNMENT_GRADED: 'assignment.graded',
  ASSIGNMENT_GRADE_RETURNED: 'assignment.grade_returned',

  ATTENDANCE_SESSION_CREATED: 'attendance_session.created',
  ATTENDANCE_SESSION_UPDATED: 'attendance_session.updated',
  ATTENDANCE_SESSION_STATUS_CHANGED: 'attendance_session.status_changed',
  ATTENDANCE_RECORDED: 'attendance_record.recorded',
  ATTENDANCE_BULK_RECORDED: 'attendance_record.bulk_recorded',
  ATTENDANCE_CORRECTION_APPLIED: 'attendance_correction.applied',

  ATTENDANCE_SUMMARY_REFRESHED: 'attendance_summary.refreshed',

  STORED_FILE_UPLOAD_INITIATED: 'stored_file.upload_initiated',
  STORED_FILE_UPLOAD_COMPLETED: 'stored_file.upload_completed',
  STORED_FILE_DOWNLOAD_URL_ISSUED: 'stored_file.download_url_issued',
  STORED_FILE_STATUS_CHANGED: 'stored_file.status_changed',
  STORED_FILE_ARCHIVED: 'stored_file.archived',

  SUBJECT_CREATED: 'subject.created',
  SUBJECT_UPDATED: 'subject.updated',

  CURRICULUM_CREATED: 'curriculum.created',
  CURRICULUM_UPDATED: 'curriculum.updated',

  PERSON_CREATED: 'person.created',
  PERSON_UPDATED: 'person.updated',
  PERSON_DEACTIVATED: 'person.deactivated',

  PERSON_PLACEMENT_ASSIGNED: 'person_placement.assigned',
  PERSON_PLACEMENT_ENDED: 'person_placement.ended',

  USER_ACCOUNT_CREATED: 'user_account.created',
  USER_ACCOUNT_UPDATED: 'user_account.updated',

  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',

  PERMISSION_CREATED: 'permission.created',

  ROLE_PERMISSION_GRANTED: 'role_permission.granted',
  ROLE_PERMISSION_REVOKED: 'role_permission.revoked',

  ROLE_ASSIGNMENT_CREATED: 'role_assignment.created',
  ROLE_ASSIGNMENT_STATUS_CHANGED: 'role_assignment.status_changed',
  ROLE_ASSIGNMENT_DELETED: 'role_assignment.deleted',
  ROLE_ASSIGNMENT_SCOPE_ADDED: 'role_assignment_scope.added',
  ROLE_ASSIGNMENT_SCOPE_REMOVED: 'role_assignment_scope.removed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Resource type catalogue.
 *
 * Matches the table name in singular form so an entry can be correlated with the
 * record it describes without a lookup table.
 */
export const AUDIT_RESOURCE_TYPES = {
  ORGANIZATION: 'organization',
  EDUCATION_PROGRAM: 'education_program',
  EDUCATION_BATCH: 'education_batch',
  ACADEMIC_CLASS: 'academic_class',
  CLASS_SUBJECT: 'class_subject',
  ENROLLMENT: 'enrollment',
  EDUCATOR_TYPE: 'educator_type',
  EDUCATOR_ASSIGNMENT: 'educator_assignment',
  CLASS_STAFF_ASSIGNMENT: 'class_staff_assignment',
  ACADEMIC_SCHEDULE: 'academic_schedule',
  LEARNING_MEETING: 'learning_meeting',
  LEARNING_ACTIVITY_TYPE: 'learning_activity_type',
  LEARNING_ACTIVITY: 'learning_activity',
  LEARNING_CONTENT: 'learning_content',
  LEARNING_PROGRESS: 'learning_progress',
  ASSESSMENT_TYPE: 'assessment_type',
  ASSESSMENT: 'assessment',
  QUESTION_BANK: 'question_bank',
  QUESTION: 'question',
  QUESTION_VERSION: 'question_version',
  EXAM: 'exam',
  ANSWER_GRADE: 'answer_grade',
  GRADING_SCHEME: 'grading_scheme',
  GRADING_COMPONENT: 'grading_component',
  FINAL_GRADE: 'final_grade',
  GRADUATION_RULE: 'graduation_rule',
  GRADUATION_RULE_COMPONENT: 'graduation_rule_component',
  GRADUATION_EVALUATION: 'graduation_evaluation',
  GRADUATION_DECISION: 'graduation_decision',
  CERTIFICATE_TEMPLATE: 'certificate_template',
  CERTIFICATE: 'certificate',
  REPORTING_METRIC: 'reporting_metric',
  ASSIGNMENT: 'assignment',
  ASSIGNMENT_SUBMISSION: 'assignment_submission',
  ASSIGNMENT_GRADE: 'assignment_grade',
  STORED_FILE: 'stored_file',
  SUBJECT: 'subject',
  CURRICULUM: 'curriculum',
  PERSON: 'person',
  PERSON_ORGANIZATION: 'person_organization',
  USER_ACCOUNT: 'user_account',
  ROLE: 'role',
  PERMISSION: 'permission',
  ROLE_PERMISSION: 'role_permission',
  ROLE_ASSIGNMENT: 'role_assignment',
  ROLE_ASSIGNMENT_SCOPE: 'role_assignment_scope',
} as const;

export type AuditResourceType =
  (typeof AUDIT_RESOURCE_TYPES)[keyof typeof AUDIT_RESOURCE_TYPES];
