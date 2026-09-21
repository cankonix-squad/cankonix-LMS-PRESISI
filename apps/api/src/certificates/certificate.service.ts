import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CertificateTemplateStatus, Prisma } from '@prisma/client';
import { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '../audit/audit-actions';
import { AuditService } from '../audit/audit.service';
import {
  generateCertificateNumber,
  generateVerificationCode,
  normalizeVerificationCode,
} from './certificate-codes';
import {
  canRevokeCertificate,
  canTransitionTemplate,
  certificateEligibilityBlockers,
  describeEligibilityBlocker,
  describeRevocationBlocker,
  describeRevocationReasonBlocker,
  describeTemplateBlocker,
  describeTemplateTransitionBlocker,
  isRevocationReasonAcceptable,
  isTemplateIssuable,
  toPublicProjection,
} from './certificate-rules';
import {
  CERTIFICATE_REPOSITORY,
  CertificateDecisionContext,
  CertificateListFilter,
  CertificateListResult,
  CertificateRecord,
  CertificateRepository,
  CertificateTemplateListFilter,
  CertificateTemplateListResult,
  CertificateTemplateRecord,
  CertificateTemplateUpdateData,
} from './certificate.types';
import { AttachCertificateFileDto } from './dto/certificate.dto';
import { RevokeCertificateDto } from './dto/certificate-revocation.dto';
import {
  ChangeCertificateTemplateStatusDto,
  CreateCertificateTemplateDto,
  CreateCertificateTemplateVersionDto,
  ListCertificateTemplatesQueryDto,
  UpdateCertificateTemplateDto,
} from './dto/certificate-template.dto';
import {
  IssueCertificateDto,
  ListCertificatesQueryDto,
} from './dto/certificate.dto';

/**
 * How many times to regenerate a colliding number/code before giving up.
 *
 * A single collision is already vanishingly unlikely; reaching this limit means
 * the generator is broken, not that we were unlucky, so failing loudly is right.
 */
const TOKEN_COLLISION_ATTEMPTS = 5;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Certificate issuance and verification (TASK-054).
 *
 * Two invariants drive the whole design:
 *
 * - **A certificate is derived, never authored.** It can only come from an
 *   approved, PASS, ELIGIBLE graduation decision. No caller may supply a holder,
 *   a program, a date, or a number.
 * - **Verification is public but says almost nothing.** The unauthenticated
 *   endpoint answers "is this document genuine" using a fixed projection, so
 *   personal data cannot leak through it (see `toPublicProjection`).
 */
@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @Inject(CERTIFICATE_REPOSITORY)
    private readonly repository: CertificateRepository,
    private readonly audit: AuditService,
  ) {}

  // --- Templates -------------------------------------------------------------

  async createTemplate(
    dto: CreateCertificateTemplateDto,
    actorUserId: string | null,
  ): Promise<CertificateTemplateRecord> {
    const code = dto.code.trim().toUpperCase();
    const latest = await this.repository.findLatestTemplateByCode(code);

    // Versions are assigned by the server, not supplied. A client-chosen version
    // could silently overwrite the meaning of already-issued documents.
    const version = (latest?.version ?? 0) + 1;

    const created = await this.repository.createTemplate({
      code,
      name: dto.name,
      description: dto.description ?? null,
      version,
      templateObjectKey: dto.templateObjectKey ?? null,
      config: dto.config ?? null,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE_TEMPLATE,
      resourceId: created.id,
      after: {
        code: created.code,
        version: created.version,
        status: created.status,
      },
      metadata: { createdByUserId: actorUserId },
    });

    return created;
  }

  /**
   * Creates the next version of an existing template code.
   *
   * Editing a published template in place would change what an already-issued
   * certificate claims to be, so a new version is the only way forward.
   */
  async createTemplateVersion(
    templateId: string,
    dto: CreateCertificateTemplateVersionDto,
    actorUserId: string | null,
  ): Promise<CertificateTemplateRecord> {
    const source = await this.getTemplateOrThrow(templateId);

    const created = await this.repository.createTemplate({
      code: source.code,
      name: dto.name ?? source.name,
      description: dto.description ?? source.description,
      version: source.version + 1,
      templateObjectKey: dto.templateObjectKey ?? source.templateObjectKey,
      config: (dto.config ?? source.config) as unknown,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_CREATED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE_TEMPLATE,
      resourceId: created.id,
      after: {
        code: created.code,
        version: created.version,
        derivedFromVersion: source.version,
      },
      metadata: { createdByUserId: actorUserId },
    });

    return created;
  }

  async updateTemplate(
    id: string,
    dto: UpdateCertificateTemplateDto,
    actorUserId: string | null,
  ): Promise<CertificateTemplateRecord> {
    const current = await this.getTemplateOrThrow(id);
    this.assertTemplateEditable(current);

    const updated = await this.repository.updateTemplate(
      id,
      toTemplateUpdate(dto),
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_UPDATED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE_TEMPLATE,
      resourceId: id,
      before: { name: current.name, status: current.status },
      after: { name: updated.name, status: updated.status },
      metadata: { updatedByUserId: actorUserId },
    });

    return updated;
  }

  async changeTemplateStatus(
    id: string,
    dto: ChangeCertificateTemplateStatusDto,
    actorUserId: string | null,
  ): Promise<CertificateTemplateRecord> {
    const current = await this.getTemplateOrThrow(id);
    const next = dto.status as unknown as CertificateTemplateStatus;

    if (current.status === next) {
      throw new ConflictException(
        `Certificate template is already ${current.status}`,
      );
    }
    if (!canTransitionTemplate(current.status, next)) {
      throw new ConflictException(
        describeTemplateTransitionBlocker(current.status, next),
      );
    }

    const updated = await this.repository.updateTemplateStatus(id, next);

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_TEMPLATE_STATUS_CHANGED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE_TEMPLATE,
      resourceId: id,
      before: { status: current.status },
      after: { status: updated.status },
      metadata: { changedByUserId: actorUserId },
    });

    return updated;
  }

  async findTemplate(id: string): Promise<CertificateTemplateRecord> {
    return this.getTemplateOrThrow(id);
  }

  async listTemplates(
    query: ListCertificateTemplatesQueryDto,
  ): Promise<CertificateTemplateListResult> {
    const filter: CertificateTemplateListFilter = {
      code: query.code,
      status: query.status as unknown as CertificateTemplateStatus | undefined,
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
    };
    return this.repository.listTemplates(filter);
  }

  // --- Issuance --------------------------------------------------------------

  /**
   * Issues the certificate for an approved graduation decision.
   *
   * Idempotent by refusal: a decision may hold exactly one certificate, so a
   * repeat call is a conflict rather than a second document. Producing two
   * certificates for one decision would make "the" certificate ambiguous.
   */
  async issueCertificate(
    dto: IssueCertificateDto,
    actorUserId: string | null,
  ): Promise<CertificateRecord> {
    const existing = await this.repository.findByDecisionId(dto.decisionId);
    if (existing) {
      throw new ConflictException(
        `Graduation decision already has certificate ${existing.certificateNumber}`,
      );
    }

    const context = await this.repository.findDecisionContext(dto.decisionId);
    if (!context) {
      throw new NotFoundException('Graduation decision not found');
    }
    this.assertEligible(context);

    const template = await this.getTemplateOrThrow(dto.templateId);
    if (!isTemplateIssuable(template.status)) {
      throw new ConflictException(describeTemplateBlocker(template.status));
    }

    if (dto.fileId) {
      await this.assertFileAttachable(dto.fileId);
    }

    const issuedAt = new Date();
    const year = issuedAt.getUTCFullYear();
    const tokens = await this.generateUniqueTokens(year);

    const created = await this.repository.create({
      decisionId: context.decisionId,
      templateId: template.id,
      certificateNumber: tokens.certificateNumber,
      verificationCode: tokens.verificationCode,
      issuedByUserId: dto.issuedByUserId ?? actorUserId,
      fileId: dto.fileId ?? null,
      issuedAt,
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      resourceId: created.id,
      after: {
        certificateNumber: created.certificateNumber,
        decisionId: created.decisionId,
        templateId: created.templateId,
        templateVersion: created.templateVersion,
      },
      // The verification code is deliberately absent: an audit trail is readable
      // by many people, and the code is the only secret protecting the public
      // lookup from being used to enumerate holders.
      metadata: {
        issuedByUserId: created.issuedByUserId,
        requestedByUserId: actorUserId,
      },
    });

    return created;
  }

  async findOne(id: string): Promise<CertificateRecord> {
    const certificate = await this.repository.findById(id);
    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }
    return certificate;
  }

  async list(query: ListCertificatesQueryDto): Promise<CertificateListResult> {
    const filter: CertificateListFilter = {
      templateId: query.templateId,
      status: query.status as unknown as CertificateListFilter['status'],
      page: query.page ?? DEFAULT_PAGE,
      limit: query.limit ?? DEFAULT_LIMIT,
    };
    return this.repository.list(filter);
  }

  /**
   * Attaches the rendered document to an issued certificate.
   *
   * Only a reference is stored; the bytes stay in object storage (TASK-022).
   */
  async attachFile(
    id: string,
    dto: AttachCertificateFileDto,
    actorUserId: string | null,
  ): Promise<CertificateRecord> {
    const certificate = await this.findOne(id);
    await this.assertFileAttachable(dto.fileId);

    const updated = await this.repository.attachFile(id, dto.fileId);

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_FILE_ATTACHED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      resourceId: id,
      before: { fileId: certificate.fileId },
      after: { fileId: dto.fileId },
      metadata: { attachedByUserId: actorUserId },
    });

    return updated;
  }

  // --- Public verification ---------------------------------------------------
  /**
   * Answers "is this certificate genuine" for an unauthenticated caller.
   *
   * Returns `null` for an unknown code rather than throwing, so the controller
   * can answer identically whether the code is wrong or simply unused — the
   * endpoint must not become an oracle for probing which codes exist.
   */
  async verifyByCode(
    code: string,
  ): Promise<ReturnType<typeof toPublicProjection> | null> {
    const normalized = normalizeVerificationCode(code);
    if (!normalized) return null;

    const certificate =
      await this.repository.findByVerificationCode(normalized);
    if (!certificate) return null;

    return toPublicProjection(certificate);
  }

  // --- Revocation (TASK-055) -------------------------------------------------

  /**
   * Withdraws an issued certificate.
   *
   * Two things are refused rather than tolerated:
   *
   * - revoking a certificate that is already `REVOKED`, so there is one
   *   authoritative reason instead of an append-only pile a reader must
   *   interpret. The spec calls for a revoke policy, and "first reason wins" is
   *   the policy: the later caller is told the certificate is already withdrawn
   *   and the earlier record is left untouched.
   * - an empty or trivial reason, because the reason is the only part of the
   *   record that cannot be reconstructed from anything else, and it is the part
   *   an auditor will actually need.
   *
   * Nothing is deleted. The certificate row, its number and its issuance details
   * all remain; only `status` moves, which is what lets the institution still
   * prove the document was once legitimately issued.
   */
  async revokeCertificate(
    id: string,
    dto: RevokeCertificateDto,
    actorUserId: string | null,
  ): Promise<CertificateRecord> {
    const certificate = await this.findOne(id);

    if (!canRevokeCertificate(certificate.status)) {
      throw new ConflictException(
        describeRevocationBlocker(certificate.status),
      );
    }

    const reason = dto.reason.trim();
    if (!isRevocationReasonAcceptable(reason)) {
      throw new BadRequestException(describeRevocationReasonBlocker(reason));
    }

    const revoked = await this.repository.revoke({
      certificateId: certificate.id,
      reason,
      revokedByUserId: dto.revokedByUserId ?? actorUserId,
      revokedAt: new Date(),
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.CERTIFICATE_REVOKED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      resourceId: revoked.id,
      before: { status: certificate.status },
      after: { status: revoked.status },
      // The reason is recorded here as well as in the evidence table: the trail
      // must explain the withdrawal even if read without joining the domain.
      metadata: {
        reason,
        revokedByUserId: revoked.revokedByUserId,
        requestedByUserId: actorUserId,
        certificateNumber: revoked.certificateNumber,
      },
    });

    return revoked;
  }

  // --- Internals -------------------------------------------------------------

  private async getTemplateOrThrow(
    id: string,
  ): Promise<CertificateTemplateRecord> {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }
    return template;
  }

  private assertTemplateEditable(template: CertificateTemplateRecord): void {
    if (template.status === CertificateTemplateStatus.ARCHIVED) {
      throw new ConflictException(
        'An archived certificate template cannot be modified',
      );
    }
  }

  private assertEligible(context: CertificateDecisionContext): void {
    const blocker = certificateEligibilityBlockers(context)[0];
    if (blocker) {
      throw new ConflictException(describeEligibilityBlocker(blocker));
    }
  }

  private async assertFileAttachable(fileId: string): Promise<void> {
    const file = await this.repository.findStoredFileContext(fileId);
    if (!file) {
      throw new NotFoundException('Stored file not found');
    }
    if (file.status !== 'ACTIVE') {
      throw new ConflictException(
        `Stored file is not available for attachment (status ${file.status})`,
      );
    }
  }

  /**
   * Generates a number and code that are not already taken.
   *
   * The pre-check exists only to turn a collision into a retry instead of a
   * unique-constraint error; the database constraint is still the guarantee, and
   * a racing writer would surface as a conflict rather than a duplicate.
   */
  private async generateUniqueTokens(year: number): Promise<{
    certificateNumber: string;
    verificationCode: string;
  }> {
    for (let attempt = 0; attempt < TOKEN_COLLISION_ATTEMPTS; attempt += 1) {
      const certificateNumber = generateCertificateNumber(year);
      const verificationCode = generateVerificationCode();

      const [numberTaken, codeTaken] = await Promise.all([
        this.repository.existsByCertificateNumber(certificateNumber),
        this.repository.existsByVerificationCode(verificationCode),
      ]);

      if (!numberTaken && !codeTaken) {
        return { certificateNumber, verificationCode };
      }
    }

    this.logger.error(
      `Failed to generate a unique certificate token after ${TOKEN_COLLISION_ATTEMPTS} attempts`,
    );
    throw new ConflictException(
      'Could not generate a unique certificate number, please retry',
    );
  }
}

/** Narrows the update DTO to the repository's update contract. */
function toTemplateUpdate(
  dto: UpdateCertificateTemplateDto,
): CertificateTemplateUpdateData {
  const update: CertificateTemplateUpdateData = {};
  if (dto.name !== undefined) update.name = dto.name;
  if (dto.description !== undefined) update.description = dto.description;
  if (dto.templateObjectKey !== undefined) {
    update.templateObjectKey = dto.templateObjectKey;
  }
  if (dto.config !== undefined) {
    update.config = dto.config as Prisma.InputJsonValue;
  }
  return update;
}
