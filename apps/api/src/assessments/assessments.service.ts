import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import { ChangeAssessmentStatusDto } from './dto/assessment-actions.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import {
  AssessmentListResponseDto,
  AssessmentResponseDto,
} from './dto/assessment-response.dto';
import {
  AssessmentStatusDto,
  isAllowedAssessmentTransition,
} from './dto/assessment-status.dto';
import { ListAssessmentsQueryDto } from './dto/list-assessments-query.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import {
  ASSESSMENTS_REPOSITORY,
  AssessmentsRepository,
} from './assessments.repository';
import {
  AssessmentRecord,
  AssessmentTypeContext,
  AssessmentUpdateData,
  ClassSubjectContext,
} from './assessment.types';

/** Statuses in which an assessment is visible to participants. */
const PARTICIPANT_VISIBLE_STATUSES: readonly string[] = [
  AssessmentStatusDto.PUBLISHED,
  AssessmentStatusDto.CLOSED,
];

/**
 * Assessments are the umbrella record for every grading method in the
 * institution, so the rules that matter here are lifecycle rules rather than
 * method-specific ones:
 *
 * - A type must exist and be `ACTIVE` to be selected.
 * - `maxScore` is the denominator (`> 0`) and `weight` is optional (`> 0`).
 * - The availability window must be ordered; a window that ends before it
 *   starts would silently hide the assessment.
 * - A `PUBLISHED` assessment is protected from destructive mutation: its
 *   `maxScore` and `weight` can no longer change, because participants have
 *   already been measured against them. Closing or archiving stays available.
 */
@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(ASSESSMENTS_REPOSITORY)
    private readonly assessments: AssessmentsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAssessmentDto): Promise<AssessmentResponseDto> {
    const classSubject = await this.ensureClassSubject(dto.classSubjectId);
    await this.ensureAssessmentType(dto.assessmentTypeId);

    const status = dto.status ?? AssessmentStatusDto.DRAFT;
    const availableFrom = parseOptionalInstant(
      dto.availableFrom,
      'availableFrom',
    );
    const availableUntil = parseOptionalInstant(
      dto.availableUntil,
      'availableUntil',
    );
    assertAvailabilityWindow(availableFrom, availableUntil);

    if (status === AssessmentStatusDto.PUBLISHED) {
      assertClassSubjectPublishable(classSubject);
    }

    const created = await this.assessments.create({
      classSubjectId: dto.classSubjectId,
      assessmentTypeId: dto.assessmentTypeId,
      title: dto.title.trim(),
      description: normalizeOptionalText(dto.description),
      maxScore: normalizeMaxScore(dto.maxScore),
      weight: normalizeWeight(dto.weight),
      availableFrom,
      availableUntil,
      status,
      metadata: dto.metadata ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSESSMENT_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSESSMENT,
      resourceId: created.id,
      after: assessmentSnapshot(created),
    });

    return toResponse(created);
  }

  async list(
    query: ListAssessmentsQueryDto,
  ): Promise<AssessmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.assessments.list({
      classSubjectId: query.classSubjectId,
      academicClassId: query.academicClassId,
      curriculumSubjectId: query.curriculumSubjectId,
      assessmentTypeId: query.assessmentTypeId,
      status: query.status,
      search: query.search?.trim() || undefined,
      page,
      limit,
    });

    return {
      data: result.data.map(toResponse),
      page,
      limit,
      total: result.total,
    };
  }

  async findOne(id: string): Promise<AssessmentResponseDto> {
    return toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
    const existing = await this.getOrThrow(id);
    const data: AssessmentUpdateData = {};

    if (dto.assessmentTypeId !== undefined) {
      await this.ensureAssessmentType(dto.assessmentTypeId);
      data.assessmentTypeId = dto.assessmentTypeId;
    }

    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      data.description = normalizeOptionalText(dto.description);
    }

    // A published assessment is already visible, so the numbers participants
    // were measured against are frozen. Unpublish first (PUBLISHED -> DRAFT) if
    // the denominator genuinely has to change.
    if (
      dto.maxScore !== undefined &&
      dto.maxScore !== Number(existing.maxScore)
    ) {
      this.assertMutable(existing, 'maxScore');
      data.maxScore = normalizeMaxScore(dto.maxScore);
    }

    if (dto.weight !== undefined) {
      const nextWeight = normalizeWeight(dto.weight);
      const currentWeight =
        existing.weight === null ? null : Number(existing.weight);
      if (nextWeight !== normalizeWeight(currentWeight)) {
        this.assertMutable(existing, 'weight');
        data.weight = nextWeight;
      }
    }

    const availableFrom =
      dto.availableFrom !== undefined
        ? parseOptionalInstant(dto.availableFrom, 'availableFrom')
        : existing.availableFrom;
    const availableUntil =
      dto.availableUntil !== undefined
        ? parseOptionalInstant(dto.availableUntil, 'availableUntil')
        : existing.availableUntil;
    assertAvailabilityWindow(availableFrom, availableUntil);
    if (dto.availableFrom !== undefined) {
      data.availableFrom = availableFrom;
    }
    if (dto.availableUntil !== undefined) {
      data.availableUntil = availableUntil;
    }

    if (dto.metadata !== undefined) {
      data.metadata = dto.metadata;
    }

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = this.assertTransition(existing.status, dto.status);
      if (data.status === AssessmentStatusDto.PUBLISHED) {
        assertClassSubjectPublishable(
          await this.ensureClassSubject(existing.classSubjectId),
        );
      }
    }

    const updated = await this.assessments.update(id, data);

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSESSMENT_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSESSMENT,
      resourceId: updated.id,
      before: assessmentSnapshot(existing),
      after: assessmentSnapshot(updated),
      metadata: { changedFields: Object.keys(data).sort() },
    });

    return toResponse(updated);
  }

  /**
   * Dedicated lifecycle endpoint. Kept separate from `update` so a status move
   * always carries the transition guard and its own audit action, whether it
   * came from the UI, an integration, or a publish button.
   *
   * A same-status request is an idempotent no-op: a retried publish must not
   * look like a transition or fill the audit trail with a change that never
   * happened.
   */
  async changeStatus(
    id: string,
    dto: ChangeAssessmentStatusDto,
  ): Promise<AssessmentResponseDto> {
    const existing = await this.getOrThrow(id);

    if (dto.status === existing.status) {
      return toResponse(existing);
    }

    const nextStatus = this.assertTransition(existing.status, dto.status);

    if (nextStatus === AssessmentStatusDto.PUBLISHED) {
      assertClassSubjectPublishable(
        await this.ensureClassSubject(existing.classSubjectId),
      );
    }

    const updated = await this.assessments.update(id, { status: nextStatus });

    await this.audit.record({
      action: AUDIT_ACTIONS.ASSESSMENT_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.ASSESSMENT,
      resourceId: updated.id,
      before: assessmentSnapshot(existing),
      after: assessmentSnapshot(updated),
      metadata: {
        from: existing.status,
        to: updated.status,
        reason: dto.reason?.trim() || undefined,
      },
    });

    return toResponse(updated);
  }

  private async getOrThrow(id: string): Promise<AssessmentRecord> {
    const found = await this.assessments.findById(id);
    if (!found) {
      throw new NotFoundException('Assessment not found');
    }
    return found;
  }

  private async ensureClassSubject(
    classSubjectId: string,
  ): Promise<ClassSubjectContext> {
    const classSubject =
      await this.assessments.findClassSubjectContext(classSubjectId);
    if (!classSubject) {
      throw new NotFoundException('Class subject not found');
    }
    return classSubject;
  }

  private async ensureAssessmentType(
    assessmentTypeId: string,
  ): Promise<AssessmentTypeContext> {
    const assessmentType =
      await this.assessments.findAssessmentTypeContext(assessmentTypeId);
    if (!assessmentType) {
      throw new NotFoundException('Assessment type not found');
    }
    if (assessmentType.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(
        `Assessment type ${assessmentType.code} is not active`,
      );
    }
    return assessmentType;
  }

  private assertMutable(record: AssessmentRecord, field: string): void {
    if (PARTICIPANT_VISIBLE_STATUSES.includes(record.status)) {
      throw new UnprocessableEntityException(
        `Assessment is ${record.status}: ${field} can no longer be changed. Move it back to DRAFT first.`,
      );
    }
  }

  private assertTransition(
    from: string,
    to: AssessmentStatusDto,
  ): AssessmentStatusDto {
    if (!isAllowedAssessmentTransition(from as AssessmentStatusDto, to)) {
      throw new UnprocessableEntityException(
        `Assessment cannot move from ${from} to ${to}`,
      );
    }
    return to;
  }
}

function toResponse(record: AssessmentRecord): AssessmentResponseDto {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    assessmentTypeId: record.assessmentTypeId,
    title: record.title,
    description: record.description,
    maxScore: Number(record.maxScore),
    weight: record.weight === null ? null : Number(record.weight),
    availableFrom: record.availableFrom
      ? record.availableFrom.toISOString()
      : null,
    availableUntil: record.availableUntil
      ? record.availableUntil.toISOString()
      : null,
    status: record.status as AssessmentStatusDto,
    metadata: (record.metadata as Record<string, unknown> | null) ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assessmentSnapshot(record: AssessmentRecord): Record<string, unknown> {
  return {
    id: record.id,
    classSubjectId: record.classSubjectId,
    assessmentTypeId: record.assessmentTypeId,
    title: record.title,
    maxScore: Number(record.maxScore),
    weight: record.weight === null ? null : Number(record.weight),
    status: record.status,
  };
}

/** `maxScore` is the denominator, so it must be a positive amount. */
function normalizeMaxScore(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('maxScore must be greater than 0');
  }
  return value.toFixed(2);
}

/** A missing weight means "not yet weighted"; a present one must be positive. */
function normalizeWeight(value: number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestException('weight must be greater than 0 when set');
  }
  return value.toFixed(2);
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value.trim() || null;
}

function parseOptionalInstant(
  value: string | null | undefined,
  field: string,
): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO-8601 instant`);
  }
  return parsed;
}

function assertAvailabilityWindow(
  availableFrom: Date | null,
  availableUntil: Date | null,
): void {
  if (availableFrom && availableUntil && availableUntil <= availableFrom) {
    throw new BadRequestException('availableUntil must be after availableFrom');
  }
}

function assertClassSubjectPublishable(
  classSubject: ClassSubjectContext,
): void {
  if (classSubject.status !== 'ACTIVE') {
    throw new UnprocessableEntityException(
      `Class subject is ${classSubject.status} and cannot host a published assessment`,
    );
  }
}
