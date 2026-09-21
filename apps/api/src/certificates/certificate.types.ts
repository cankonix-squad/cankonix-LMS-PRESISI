import type {
  CertificateStatus,
  CertificateTemplateStatus,
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
} from '@prisma/client';

export type {
  CertificateStatus,
  CertificateTemplateStatus,
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
};

/** A certificate template as stored. */
export interface CertificateTemplateRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: number;
  status: CertificateTemplateStatus;
  templateObjectKey: string | null;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateTemplateListFilter {
  code?: string;
  status?: CertificateTemplateStatus;
  page: number;
  limit: number;
}

export interface CertificateTemplateListResult {
  data: CertificateTemplateRecord[];
  total: number;
}

/**
 * The chain a certificate is issued from, flattened.
 *
 * Loaded in one query so the eligibility checks (decision in force, verdict
 * PASS, evaluation eligible) and the holder details come from a single
 * consistent snapshot rather than from several reads that could straddle a
 * correction or a revocation.
 */
export interface CertificateDecisionContext {
  decisionId: string;
  decisionStatus: GraduationDecisionStatus;
  decisionOutcome: GraduationDecisionOutcome;
  decisionApprovedAt: Date | null;
  evaluationId: string;
  evaluationOutcome: GraduationEvaluationOutcome;
  enrollmentId: string;
  personId: string;
  personFullName: string;
  educationBatchId: string;
  educationBatchName: string;
  educationProgramName: string;
}

/**
 * A certificate plus the display fields its relations supply.
 *
 * The joined names are flattened here rather than returned as nested objects, so
 * the public projection cannot accidentally serialise an internal relation.
 */
export interface CertificateRecord {
  id: string;
  decisionId: string;
  templateId: string;
  certificateNumber: string;
  verificationCode: string;
  status: CertificateStatus;
  issuedAt: Date;
  issuedByUserId: string | null;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  templateCode: string;
  templateName: string;
  templateVersion: number;
  holderFullName: string;
  educationBatchName: string;
  educationProgramName: string;
  /**
   * Revocation evidence, joined from TASK-055's table.
   *
   * Null while the certificate is in force. It lives on the record rather than
   * on a separate read because the public verification projection must be able
   * to answer "withdrawn, and why" in a single query.
   */
  revokedReason?: string | null;
  revokedAt?: Date | null;
  /** Who withdrew it, when it has been revoked (TASK-055). */
  revokedByUserId?: string | null;
}

/**
 * Revocation evidence as stored (TASK-055).
 *
 * Immutable once written: there is no update and no delete, so the record
 * remains a faithful account of the act even years later.
 */
export interface CertificateRevocationRecord {
  id: string;
  certificateId: string;
  reason: string;
  revokedByUserId: string | null;
  revokedAt: Date;
  createdAt: Date;
}

export interface CertificateListFilter {
  templateId?: string;
  status?: CertificateStatus;
  page: number;
  limit: number;
}

export interface CertificateListResult {
  data: CertificateRecord[];
  total: number;
}

export interface CertificateCreateData {
  decisionId: string;
  templateId: string;
  certificateNumber: string;
  verificationCode: string;
  issuedByUserId: string | null;
  fileId: string | null;
  issuedAt: Date;
}

/**
 * Input for withdrawing a certificate.
 *
 * The status move and the evidence row are written together, so a certificate
 * can never end up marked `REVOKED` without a recorded reason and author — or
 * the reverse.
 */
export interface CertificateRevocationCreateData {
  certificateId: string;
  reason: string;
  revokedByUserId: string | null;
  revokedAt: Date;
}

/**
 * Persistence contract for the certificate domain (TASK-054).
 *
 * There is no `delete`. A certificate is withdrawn by moving `status`
 * (TASK-055), so the record survives as proof the document was once issued.
 *
 * `existsByCertificateNumber` / `existsByVerificationCode` exist so the service
 * can regenerate a colliding value rather than surfacing a raw unique-constraint
 * error. The database constraints remain the real guarantee.
 */
export interface CertificateRepository {
  createTemplate(
    data: CertificateTemplateCreateData,
  ): Promise<CertificateTemplateRecord>;
  findTemplateById(id: string): Promise<CertificateTemplateRecord | null>;
  findLatestTemplateByCode(
    code: string,
  ): Promise<CertificateTemplateRecord | null>;
  listTemplates(
    filter: CertificateTemplateListFilter,
  ): Promise<CertificateTemplateListResult>;
  updateTemplate(
    id: string,
    data: CertificateTemplateUpdateData,
  ): Promise<CertificateTemplateRecord>;
  updateTemplateStatus(
    id: string,
    status: CertificateTemplateStatus,
  ): Promise<CertificateTemplateRecord>;

  findDecisionContext(
    decisionId: string,
  ): Promise<CertificateDecisionContext | null>;
  findStoredFileContext(
    fileId: string,
  ): Promise<{ id: string; status: string; namespace: string } | null>;

  findByDecisionId(decisionId: string): Promise<CertificateRecord | null>;
  findById(id: string): Promise<CertificateRecord | null>;
  findByVerificationCode(code: string): Promise<CertificateRecord | null>;
  existsByCertificateNumber(certificateNumber: string): Promise<boolean>;
  existsByVerificationCode(verificationCode: string): Promise<boolean>;
  list(filter: CertificateListFilter): Promise<CertificateListResult>;
  create(data: CertificateCreateData): Promise<CertificateRecord>;
  attachFile(id: string, fileId: string): Promise<CertificateRecord>;
  findRevocationByCertificateId(
    certificateId: string,
  ): Promise<CertificateRevocationRecord | null>;
  /**
   * Withdraws a certificate and returns it in its new state.
   *
   * Returns the certificate rather than the evidence row so the caller sees the
   * authoritative aftermath in one value: the status move and the recorded
   * reason are committed together and cannot be observed apart.
   */
  revoke(data: CertificateRevocationCreateData): Promise<CertificateRecord>;
}

export interface CertificateTemplateCreateData {
  code: string;
  name: string;
  description: string | null;
  version: number;
  templateObjectKey: string | null;
  config: unknown;
}

/**
 * Editable fields of a template.
 *
 * Deliberately excludes `code` and `version`: identity and version are not
 * editable, because an issued certificate names them. Changing the design is a
 * new version, not an edit.
 */
export interface CertificateTemplateUpdateData {
  name?: string;
  description?: string | null;
  templateObjectKey?: string | null;
  config?: unknown;
}

export const CERTIFICATE_REPOSITORY = Symbol('CERTIFICATE_REPOSITORY');
