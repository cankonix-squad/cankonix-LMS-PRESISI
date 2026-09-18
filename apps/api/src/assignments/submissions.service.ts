import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { AssignmentLifecycleStatusDto } from './dto/assignment-status.dto';
import {
  AssignmentGradeResponseDto,
  SubmissionFileResponseDto,
  SubmissionListResponseDto,
  SubmissionResponseDto,
  SubmitResponseDto,
} from './dto/assignment-response.dto';
import {
  isAllowedSubmissionTransition,
  AssignmentSubmissionStatusDto,
} from './dto/assignment-submission-status.dto';
import {
  AttachSubmissionFileDto,
  ListSubmissionsQueryDto,
} from './dto/submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import {
  AssignmentsRepository,
  ASSIGNMENTS_REPOSITORY,
} from './assignments.repository';
import {
  AssignmentGradeRecord,
  AssignmentRecord,
  SubmissionFileDetail,
  SubmissionRecord,
} from './assignment.types';

/**
 * The namespace a submission attachment must have been uploaded under. Mirrors
 * `Namespace` in the TASK-022 file module; kept local so the assignment domain
 * does not depend on file-domain internals just for one literal.
 */
const SUBMISSION_FILE_NAMESPACE = 'assignment-submission';

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(ASSIGNMENTS_REPOSITORY)
    private readonly repo: AssignmentsRepository,
    private readonly audit: AuditService,
  ) {}

  /**
   * Participant submission.
   *
   * Rules enforced:
   * 1. The assignment must be PUBLISHED.
   * 2. The enrollment must exist and be ACTIVE, and belong to the class the
   *    assignment's activity lives in.
   * 3. `attemptsAllowed` is enforced against a server-side count — never a
   *    client-supplied attempt number.
   * 4. **The deadline is server-authoritative**: lateness is decided by
   *    comparing the server clock to the stored `dueAt`, and a late submission
   *    is recorded with `isLate = true` rather than silently accepted or
   *    silently rejected.
   * 5. A resubmission never overwrites a previous attempt: it appends attempt
   *    `n + 1`, so the history stays intact.
   */
  async submit(
    assignmentId: string,
    enrollmentId: string,
    personId: string,
    textAnswer: string | null,
    now: Date = new Date(),
  ): Promise<SubmitResponseDto> {
    const assignment = await this.getAssignmentOrThrow(assignmentId);
    const activity = await this.repo.findActivityContext(assignment.activityId);
    if (!activity) {
      throw new NotFoundException('Activity for this assignment is missing');
    }

    if (assignment.status !== AssignmentLifecycleStatusDto.PUBLISHED) {
      throw new UnprocessableEntityException(
        `Assignment is ${assignment.status}; only a PUBLISHED assignment accepts submissions`,
      );
    }

    const enrollment = await this.repo.findEnrollmentContext(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} does not exist`);
    }
    // A participant may only submit as themselves. Without this check the
    // enrollment id in the body would be a bearer capability for someone else's
    // work.
    if (enrollment.personId !== personId) {
      throw new UnprocessableEntityException(
        'A participant may only submit through their own enrollment',
      );
    }
    if (enrollment.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Enrollment is ${enrollment.status}; only an ACTIVE enrollment may submit`,
      );
    }
    if (
      enrollment.academicClassId &&
      enrollment.academicClassId !== activity.academicClassId
    ) {
      throw new ConflictException(
        'Participant is not enrolled in the class this assignment belongs to',
      );
    }

    const existing = await this.repo.findLatestSubmission(
      assignmentId,
      enrollmentId,
    );
    if (existing && existing.status !== AssignmentSubmissionStatusDto.DRAFT) {
      const used = await this.repo.maxAttemptNo(assignmentId, enrollmentId);
      if (used >= assignment.attemptsAllowed) {
        throw new ConflictException(
          `All ${assignment.attemptsAllowed} attempt(s) for this assignment have been used`,
        );
      }
    }

    // A draft carries the work staged so far; the attempt number it was drafted
    // under is reused so a draft never leaves a hole in the attempt sequence.
    const draft = await this.findDraftOrNull(assignmentId, enrollmentId);

    // The answer must be non-empty: a submission with neither text nor a file
    // is not a submission.
    const answer = textAnswer ? textAnswer.trim() || null : null;
    if (!answer) {
      const fileCount = draft
        ? (await this.repo.listFiles(draft.id)).length
        : 0;
      if (fileCount === 0) {
        throw new BadRequestException(
          'A submission requires either a text answer or at least one attached file',
        );
      }
    }

    const nextAttempt = draft
      ? draft.attemptNo
      : (await this.repo.maxAttemptNo(assignmentId, enrollmentId)) + 1;

    // The deadline is server-authoritative: lateness is derived from the server
    // clock against the stored dueAt, never from anything the client says.
    const isLate = assignment.dueAt !== null && now > assignment.dueAt;
    const submittedAt = now;

    const record = draft
      ? await this.repo.updateSubmission(draft.id, {
          textAnswer: answer ?? draft.textAnswer,
          submittedAt,
          isLate,
          status: AssignmentSubmissionStatusDto.SUBMITTED,
        })
      : await this.repo.createSubmission({
          assignmentId,
          enrollmentId,
          attemptNo: nextAttempt,
          submittedAt,
          textAnswer: answer,
          isLate,
          status: AssignmentSubmissionStatusDto.SUBMITTED,
        });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_SUBMISSION_SUBMITTED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_SUBMISSION,
      resourceId: record.id,
      metadata: {
        assignmentId,
        enrollmentId,
        attemptNo: record.attemptNo,
        isLate,
        dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
        submittedAt: submittedAt.toISOString(),
      },
      before: draft ? submissionSnapshot(draft) : undefined,
      after: submissionSnapshot(record),
    });

    const attemptsUsed = await this.repo.maxAttemptNo(
      assignmentId,
      enrollmentId,
    );

    return {
      ...(await this.toSubmissionResponse(record)),
      attemptsUsed,
      attemptsRemaining: Math.max(0, assignment.attemptsAllowed - attemptsUsed),
    };
  }

  /** Opens or updates a DRAFT attempt, so a participant can stage work. */
  async saveDraft(
    assignmentId: string,
    enrollmentId: string,
    textAnswer: string | null,
  ): Promise<SubmissionResponseDto> {
    const assignment = await this.getAssignmentOrThrow(assignmentId);
    if (assignment.status !== AssignmentLifecycleStatusDto.PUBLISHED) {
      throw new UnprocessableEntityException(
        `Assignment is ${assignment.status}; only a PUBLISHED assignment accepts drafts`,
      );
    }

    const enrollment = await this.repo.findEnrollmentContext(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} does not exist`);
    }
    if (enrollment.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Enrollment is ${enrollment.status}; only an ACTIVE enrollment may save a draft`,
      );
    }

    const existing = await this.findDraftOrNull(assignmentId, enrollmentId);
    if (existing) {
      const updated = await this.repo.updateSubmission(existing.id, {
        textAnswer: textAnswer ? textAnswer.trim() || null : null,
      });
      return await this.toSubmissionResponse(updated);
    }

    const attemptNo =
      (await this.repo.maxAttemptNo(assignmentId, enrollmentId)) + 1;
    const created = await this.repo.createSubmission({
      assignmentId,
      enrollmentId,
      attemptNo,
      submittedAt: null,
      textAnswer: textAnswer ? textAnswer.trim() || null : null,
      isLate: false,
      status: AssignmentSubmissionStatusDto.DRAFT,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_SUBMISSION_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_SUBMISSION,
      resourceId: created.id,
      metadata: { assignmentId, enrollmentId, attemptNo: created.attemptNo },
      after: submissionSnapshot(created),
    });

    return await this.toSubmissionResponse(created);
  }

  async findOne(id: string): Promise<SubmissionResponseDto> {
    return await this.toSubmissionResponse(await this.getSubmissionOrThrow(id));
  }

  /** Edits the text answer of a DRAFT attempt; a submitted attempt is frozen. */
  async updateTextAnswer(
    submissionId: string,
    textAnswer: string | null,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionOrThrow(submissionId);
    if (submission.status !== AssignmentSubmissionStatusDto.DRAFT) {
      throw new UnprocessableEntityException(
        `Only a DRAFT attempt can be edited; this one is ${submission.status}`,
      );
    }

    const updated = await this.repo.updateSubmission(submissionId, {
      textAnswer: textAnswer ? textAnswer.trim() || null : null,
    });
    return await this.toSubmissionResponse(updated);
  }

  /** All attempts of one participant on one assignment, newest first. */
  async listAttempts(
    assignmentId: string,
    enrollmentId: string,
  ): Promise<SubmissionResponseDto[]> {
    const { data } = await this.repo.listSubmissions({
      assignmentId,
      enrollmentId,
      page: 1,
      limit: 100,
    });

    const sorted = [...data].sort((a, b) => b.attemptNo - a.attemptNo);
    const out: SubmissionResponseDto[] = [];
    for (const record of sorted) {
      out.push(await this.toSubmissionResponse(record));
    }
    return out;
  }

  async list(
    query: ListSubmissionsQueryDto,
    personId?: string,
  ): Promise<SubmissionListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.repo.listSubmissions({
      assignmentId: query.assignmentId,
      enrollmentId: query.enrollmentId,
      status: query.submissionStatus,
      ...(personId ? { personId } : {}),
      page,
      limit,
    });

    const out: SubmissionResponseDto[] = [];
    for (const record of data) {
      out.push(await this.toSubmissionResponse(record));
    }

    return { data: out, page, limit, total };
  }

  /**
   * Attaches an already-uploaded file.
   *
   * The file must have been uploaded (TASK-022) under the
   * `assignment-submission` namespace and be in a usable state. A submission may
   * only attach files while it is a DRAFT or SUBMITTED — once graded the work is
   * frozen, because swapping an attachment after grading would invalidate the
   * grade.
   */
  async attachFile(
    submissionId: string,
    dto: AttachSubmissionFileDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionOrThrow(submissionId);

    if (
      submission.status === AssignmentSubmissionStatusDto.GRADED ||
      submission.status === AssignmentSubmissionStatusDto.RETURNED
    ) {
      throw new UnprocessableEntityException(
        'Files cannot be changed after the submission has been graded',
      );
    }

    const storedFile = await this.repo.findStoredFileContext(dto.storedFileId);
    if (!storedFile) {
      throw new NotFoundException(
        `Stored file ${dto.storedFileId} does not exist`,
      );
    }
    if (storedFile.namespace !== SUBMISSION_FILE_NAMESPACE) {
      throw new UnprocessableEntityException(
        `File was uploaded under namespace ${storedFile.namespace}; submission attachments must use ${SUBMISSION_FILE_NAMESPACE}`,
      );
    }
    // Only a confirmed file is attachable: binding a PENDING object would record
    // a reference to bytes that may never arrive.
    if (storedFile.status !== 'UPLOADED' && storedFile.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Stored file is ${storedFile.status}; only a confirmed file can be attached`,
      );
    }
    if (await this.repo.findFileLink(submissionId, dto.storedFileId)) {
      throw new ConflictException(
        'This file is already attached to the submission',
      );
    }

    const link = await this.repo.attachFile(
      submissionId,
      dto.storedFileId,
      dto.label ? dto.label.trim() || null : null,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_SUBMISSION_FILE_ATTACHED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_SUBMISSION,
      resourceId: submissionId,
      metadata: {
        storedFileId: dto.storedFileId,
        label: link.label,
      },
    });

    return await this.toSubmissionResponse(submission);
  }

  async detachFile(
    submissionId: string,
    storedFileId: string,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionOrThrow(submissionId);

    if (
      submission.status === AssignmentSubmissionStatusDto.GRADED ||
      submission.status === AssignmentSubmissionStatusDto.RETURNED
    ) {
      throw new UnprocessableEntityException(
        'Files cannot be changed after the submission has been graded',
      );
    }

    if (!(await this.repo.findFileLink(submissionId, storedFileId))) {
      throw new NotFoundException(
        'This file is not attached to the submission',
      );
    }

    await this.repo.detachFile(submissionId, storedFileId);

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_SUBMISSION_FILE_DETACHED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_SUBMISSION,
      resourceId: submissionId,
      metadata: { storedFileId },
    });

    return await this.toSubmissionResponse(submission);
  }

  /**
   * Grades one attempt.
   *
   * `score` must be 0..the assignment's `maxScore`, validated here because the
   * ceiling lives on the assignment, not in the request. Grading an earlier
   * attempt does not touch any other attempt's grade: each attempt carries its
   * own grade row.
   */
  async grade(
    submissionId: string,
    graderPersonId: string,
    dto: GradeSubmissionDto,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionOrThrow(submissionId);

    if (submission.status === AssignmentSubmissionStatusDto.DRAFT) {
      throw new UnprocessableEntityException(
        'A DRAFT attempt cannot be graded; the participant has not submitted it',
      );
    }

    const assignment = await this.getAssignmentOrThrow(submission.assignmentId);

    if (dto.score < 0 || dto.score > assignment.maxScore) {
      throw new BadRequestException(
        `Score must be between 0 and ${assignment.maxScore}`,
      );
    }

    const grade = await this.repo.upsertGrade(submissionId, {
      score: dto.score.toFixed(2),
      graderPersonId,
      feedback: dto.feedback ? dto.feedback.trim() || null : null,
      gradedAt: new Date(),
    });

    const shouldReturn = dto.returnToParticipant === true;
    const targetStatus = shouldReturn
      ? AssignmentSubmissionStatusDto.RETURNED
      : AssignmentSubmissionStatusDto.GRADED;

    // The lifecycle has no direct SUBMITTED -> RETURNED edge: a return implies a
    // grade, so walk through GRADED. Same-status writes are skipped so a
    // re-grade of an already-graded attempt does not look like a transition.
    let updated = submission;
    for (const next of shouldReturn
      ? [AssignmentSubmissionStatusDto.GRADED, targetStatus]
      : [targetStatus]) {
      if (updated.status === next) {
        continue;
      }
      if (!isAllowedSubmissionTransition(updated.status, next)) {
        throw new UnprocessableEntityException(
          `Submission cannot move from ${updated.status} to ${next}`,
        );
      }
      updated = await this.repo.updateSubmission(submissionId, {
        status: next,
      });
    }

    await this.audit.record({
      action: shouldReturn
        ? AUDIT_ACTIONS.ASSIGNMENT_GRADE_RETURNED
        : AUDIT_ACTIONS.ASSIGNMENT_GRADED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_GRADE,
      resourceId: grade.id,
      metadata: {
        submissionId,
        assignmentId: assignment.id,
        attemptNo: submission.attemptNo,
        score: Number(grade.score),
        maxScore: assignment.maxScore,
        graderPersonId,
        returned: shouldReturn,
      },
      after: gradeSnapshot(grade),
    });

    return await this.toSubmissionResponse(updated);
  }

  /**
   * Reads one attempt's persisted grade. Feedback is only visible once the
   * grade has been released (status RETURNED) — a GRADED-but-not-returned row
   * still has its score recorded for the educator, but the participant should
   * not see feedback before the educator releases it.
   */
  async findGrade(submissionId: string): Promise<AssignmentGradeResponseDto> {
    const grade = await this.repo.findGrade(submissionId);
    if (!grade) {
      throw new NotFoundException('This submission has not been graded yet');
    }
    return toGradeResponse(grade);
  }

  /** Marks a graded attempt as returned so the participant can see the feedback. */
  async returnToParticipant(
    submissionId: string,
  ): Promise<SubmissionResponseDto> {
    const submission = await this.getSubmissionOrThrow(submissionId);

    if (submission.status !== AssignmentSubmissionStatusDto.GRADED) {
      throw new UnprocessableEntityException(
        `Only a GRADED submission can be returned; this one is ${submission.status}`,
      );
    }

    const updated = await this.repo.updateSubmission(submissionId, {
      status: AssignmentSubmissionStatusDto.RETURNED,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSIGNMENT_GRADE_RETURNED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSIGNMENT_SUBMISSION,
      resourceId: submissionId,
      metadata: { assignmentId: submission.assignmentId },
      before: submissionSnapshot(submission),
      after: submissionSnapshot(updated),
    });

    return await this.toSubmissionResponse(updated);
  }

  private async getAssignmentOrThrow(id: string): Promise<AssignmentRecord> {
    const found = await this.repo.findById(id);
    if (!found) {
      throw new NotFoundException('Assignment not found');
    }
    return found;
  }

  private async getSubmissionOrThrow(id: string): Promise<SubmissionRecord> {
    const found = await this.repo.findSubmissionById(id);
    if (!found) {
      throw new NotFoundException('Submission not found');
    }
    return found;
  }

  private async findDraftOrNull(
    assignmentId: string,
    enrollmentId: string,
  ): Promise<SubmissionRecord | null> {
    const { data } = await this.repo.listSubmissions({
      assignmentId,
      enrollmentId,
      status: AssignmentSubmissionStatusDto.DRAFT,
      page: 1,
      limit: 1,
    });
    return data[0] ?? null;
  }

  private async toSubmissionResponse(
    record: SubmissionRecord,
  ): Promise<SubmissionResponseDto> {
    const [files, grade] = await Promise.all([
      this.repo.listFiles(record.id),
      this.repo.findGrade(record.id),
    ]);

    // Feedback is withheld until the grade is released to the participant.
    const revealGrade =
      record.status === AssignmentSubmissionStatusDto.RETURNED;

    return {
      id: record.id,
      assignmentId: record.assignmentId,
      enrollmentId: record.enrollmentId,
      attemptNo: record.attemptNo,
      submittedAt: record.submittedAt ? record.submittedAt.toISOString() : null,
      textAnswer: record.textAnswer,
      isLate: record.isLate,
      status: record.status,
      files: files.map(toFileResponse),
      ...(grade
        ? {
            grade: revealGrade
              ? toGradeResponse(grade)
              : { ...toGradeResponse(grade), feedback: null },
          }
        : {}),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

export function toFileResponse(
  detail: SubmissionFileDetail,
): SubmissionFileResponseDto {
  return {
    id: detail.id,
    storedFileId: detail.storedFileId,
    label: detail.label,
    objectKey: detail.objectKey,
    originalName: detail.originalName,
    mimeType: detail.mimeType,
    sizeBytes: detail.sizeBytes,
  };
}

export function toGradeResponse(
  grade: AssignmentGradeRecord,
): AssignmentGradeResponseDto {
  return {
    id: grade.id,
    score: Number(grade.score),
    graderPersonId: grade.graderPersonId,
    feedback: grade.feedback,
    gradedAt: grade.gradedAt.toISOString(),
  };
}

export function submissionSnapshot(
  record: SubmissionRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    assignmentId: record.assignmentId,
    enrollmentId: record.enrollmentId,
    attemptNo: record.attemptNo,
    status: record.status,
    isLate: record.isLate,
    submittedAt: record.submittedAt ? record.submittedAt.toISOString() : null,
  };
}

export function gradeSnapshot(
  record: AssignmentGradeRecord,
): Record<string, unknown> {
  return {
    id: record.id,
    submissionId: record.submissionId,
    score: Number(record.score),
    graderPersonId: record.graderPersonId,
    gradedAt: record.gradedAt.toISOString(),
  };
}
