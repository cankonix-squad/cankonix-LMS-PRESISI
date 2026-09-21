import { Injectable } from '@nestjs/common';
import {
  CertificateStatus,
  CertificateTemplateStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CertificateCreateData,
  CertificateDecisionContext,
  CertificateListFilter,
  CertificateListResult,
  CertificateRecord,
  CertificateRepository,
  CertificateRevocationCreateData,
  CertificateRevocationRecord,
  CertificateTemplateCreateData,
  CertificateTemplateListFilter,
  CertificateTemplateListResult,
  CertificateTemplateRecord,
  CertificateTemplateUpdateData,
} from './certificate.types';

/**
 * The relations a certificate needs to describe itself.
 *
 * Read as one nested include so the holder, program and batch come from the same
 * statement as the certificate. Reading them separately would let a certificate
 * be described against a batch or enrollment that changed in between.
 */
const CERTIFICATE_INCLUDE = {
  template: { select: { code: true, name: true, version: true } },
  revocation: {
    select: { reason: true, revokedAt: true, revokedByUserId: true },
  },
  decision: {
    select: {
      graduationEvaluation: {
        select: {
          enrollment: {
            select: {
              person: { select: { fullName: true } },
              educationBatch: {
                select: {
                  name: true,
                  educationProgram: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CertificateInclude;
type CertificateRow = Prisma.CertificateGetPayload<{
  include: typeof CERTIFICATE_INCLUDE;
}>;

/**
 * Prisma-backed certificate repository (TASK-054).
 *
 * There is no `delete`, by design: a certificate is withdrawn by moving its
 * `status` (TASK-055), so the issued document stays provable.
 *
 * Binary content is never stored here. A rendered certificate is referenced by
 * `fileId` into `stored_files` (TASK-022), which is what keeps PostgreSQL free
 * of blobs and lets the storage vendor change without a schema change.
 */
@Injectable()
export class PrismaCertificateRepository implements CertificateRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: CertificateRow): CertificateRecord {
    const enrollment = row.decision.graduationEvaluation.enrollment;
    return {
      id: row.id,
      decisionId: row.decisionId,
      templateId: row.templateId,
      certificateNumber: row.certificateNumber,
      verificationCode: row.verificationCode,
      status: row.status,
      issuedAt: row.issuedAt,
      issuedByUserId: row.issuedByUserId,
      fileId: row.fileId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      templateCode: row.template.code,
      templateName: row.template.name,
      templateVersion: row.template.version,
      holderFullName: enrollment.person.fullName,
      educationBatchName: enrollment.educationBatch.name,
      educationProgramName: enrollment.educationBatch.educationProgram.name,
    };
  }

  private toJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null || value === undefined) return Prisma.JsonNull;
    return value as Prisma.InputJsonValue;
  }

  // --- Templates -------------------------------------------------------------

  async createTemplate(
    data: CertificateTemplateCreateData,
  ): Promise<CertificateTemplateRecord> {
    return this.prisma.certificateTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        version: data.version,
        templateObjectKey: data.templateObjectKey,
        config: this.toJsonInput(data.config),
      },
    });
  }

  async findTemplateById(
    id: string,
  ): Promise<CertificateTemplateRecord | null> {
    return this.prisma.certificateTemplate.findUnique({ where: { id } });
  }

  async findLatestTemplateByCode(
    code: string,
  ): Promise<CertificateTemplateRecord | null> {
    return this.prisma.certificateTemplate.findFirst({
      where: { code },
      orderBy: [{ version: 'desc' }],
    });
  }

  async listTemplates(
    filter: CertificateTemplateListFilter,
  ): Promise<CertificateTemplateListResult> {
    const where: Prisma.CertificateTemplateWhereInput = {
      code: filter.code
        ? { contains: filter.code, mode: 'insensitive' }
        : undefined,
      status: filter.status,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.certificateTemplate.findMany({
        where,
        orderBy: [{ code: 'asc' }, { version: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.certificateTemplate.count({ where }),
    ]);

    return { data, total };
  }

  async updateTemplate(
    id: string,
    data: CertificateTemplateUpdateData,
  ): Promise<CertificateTemplateRecord> {
    return this.prisma.certificateTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        templateObjectKey: data.templateObjectKey,
        config:
          data.config === undefined ? undefined : this.toJsonInput(data.config),
      },
    });
  }

  async updateTemplateStatus(
    id: string,
    status: CertificateTemplateStatus,
  ): Promise<CertificateTemplateRecord> {
    return this.prisma.certificateTemplate.update({
      where: { id },
      data: { status },
    });
  }

  // --- Issuance inputs -------------------------------------------------------

  /**
   * Loads the decision, its evaluation, the enrollment, the person and the
   * batch/program in one statement.
   *
   * The eligibility rules read from this single result, so a decision cannot be
   * checked and then revoked before the certificate is written.
   */
  async findDecisionContext(
    decisionId: string,
  ): Promise<CertificateDecisionContext | null> {
    const decision = await this.prisma.graduationDecision.findUnique({
      where: { id: decisionId },
      select: {
        id: true,
        status: true,
        decision: true,
        approvedAt: true,
        graduationEvaluation: {
          select: {
            id: true,
            outcome: true,
            enrollment: {
              select: {
                id: true,
                person: { select: { id: true, fullName: true } },
                educationBatch: {
                  select: {
                    id: true,
                    name: true,
                    educationProgram: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!decision) return null;
    const enrollment = decision.graduationEvaluation.enrollment;

    return {
      decisionId: decision.id,
      decisionStatus: decision.status,
      decisionOutcome: decision.decision,
      decisionApprovedAt: decision.approvedAt,
      evaluationId: decision.graduationEvaluation.id,
      evaluationOutcome: decision.graduationEvaluation.outcome,
      enrollmentId: enrollment.id,
      personId: enrollment.person.id,
      personFullName: enrollment.person.fullName,
      educationBatchId: enrollment.educationBatch.id,
      educationBatchName: enrollment.educationBatch.name,
      educationProgramName: enrollment.educationBatch.educationProgram.name,
    };
  }

  async findStoredFileContext(fileId: string) {
    return this.prisma.storedFile.findUnique({
      where: { id: fileId },
      select: { id: true, status: true, namespace: true },
    });
  }

  // --- Certificates ----------------------------------------------------------

  async findByDecisionId(
    decisionId: string,
  ): Promise<CertificateRecord | null> {
    const row = await this.prisma.certificate.findUnique({
      where: { decisionId },
      include: CERTIFICATE_INCLUDE,
    });
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<CertificateRecord | null> {
    const row = await this.prisma.certificate.findUnique({
      where: { id },
      include: CERTIFICATE_INCLUDE,
    });
    return row ? this.toRecord(row) : null;
  }

  async findByVerificationCode(
    code: string,
  ): Promise<CertificateRecord | null> {
    const row = await this.prisma.certificate.findUnique({
      where: { verificationCode: code },
      include: CERTIFICATE_INCLUDE,
    });
    return row ? this.toRecord(row) : null;
  }

  async existsByCertificateNumber(certificateNumber: string): Promise<boolean> {
    const found = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      select: { id: true },
    });
    return found !== null;
  }

  async existsByVerificationCode(verificationCode: string): Promise<boolean> {
    const found = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      select: { id: true },
    });
    return found !== null;
  }

  async list(filter: CertificateListFilter): Promise<CertificateListResult> {
    const where: Prisma.CertificateWhereInput = {
      templateId: filter.templateId,
      status: filter.status,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        include: CERTIFICATE_INCLUDE,
        orderBy: [{ issuedAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    return { data: rows.map((row) => this.toRecord(row)), total };
  }

  async create(data: CertificateCreateData): Promise<CertificateRecord> {
    const row = await this.prisma.certificate.create({
      data: {
        decisionId: data.decisionId,
        templateId: data.templateId,
        certificateNumber: data.certificateNumber,
        verificationCode: data.verificationCode,
        issuedByUserId: data.issuedByUserId,
        fileId: data.fileId,
        issuedAt: data.issuedAt,
      },
      include: CERTIFICATE_INCLUDE,
    });
    return this.toRecord(row);
  }

  async attachFile(id: string, fileId: string): Promise<CertificateRecord> {
    const row = await this.prisma.certificate.update({
      where: { id },
      data: { fileId },
      include: CERTIFICATE_INCLUDE,
    });
    return this.toRecord(row);
  }

  async findRevocationByCertificateId(
    certificateId: string,
  ): Promise<CertificateRevocationRecord | null> {
    return this.prisma.certificateRevocation.findUnique({
      where: { certificateId },
    });
  }

  /**
   * Withdraws a certificate and records the evidence together.
   *
   * Both writes run in a single transaction, so a certificate can never be left
   * marked `REVOKED` without a recorded reason, nor carry a reason while still
   * reading as `ISSUED`. A partial outcome would make the public verification
   * endpoint either overstate or understate whether the document is valid.
   */
  async revoke(
    data: CertificateRevocationCreateData,
  ): Promise<CertificateRecord> {
    const [, row] = await this.prisma.$transaction([
      this.prisma.certificateRevocation.create({
        data: {
          certificateId: data.certificateId,
          reason: data.reason,
          revokedByUserId: data.revokedByUserId,
          revokedAt: data.revokedAt,
        },
      }),
      this.prisma.certificate.update({
        where: { id: data.certificateId },
        data: { status: CertificateStatus.REVOKED },
        include: CERTIFICATE_INCLUDE,
      }),
    ]);
    return this.toRecord(row);
  }
}
