import {
  CertificateStatus,
  CertificateTemplateStatus,
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
} from '@prisma/client';

/**
 * Pure certificate rules (TASK-054).
 *
 * Free of Nest and Prisma so the acceptance criterion "only an eligible PASS
 * decision can be certified" is a testable predicate rather than a promise. The
 * service maps these answers to HTTP statuses; the rules themselves only answer.
 */

/**
 * The single eligibility gate for issuing a certificate.
 *
 * Three things must all hold, and each one is a distinct failure the operator
 * needs to be told about separately:
 *
 * 1. The decision is `APPROVED`. A `DRAFT` decision is not yet in force, so
 *    certifying it would publish a verdict nobody has approved. A `REVOKED`
 *    decision was withdrawn, so certifying it would re-assert something the
 *    institution explicitly took back.
 * 2. The verdict is `PASS`. `FAIL`, `REMEDIAL` and `WITHDRAWN` are not
 *    graduations; a certificate for them would be a false claim on a document
 *    presented to third parties.
 * 3. The underlying evaluation is not `SUPERSEDED` or `PENDING`. Even an
 *    approved PASS rests on evidence, and if that evidence has since been
 *    replaced the decision no longer describes the current record.
 *
 * Returning the reasons rather than a boolean lets the caller explain *which*
 * gate failed without duplicating the logic.
 */
export type EligibilityBlockReason =
  | 'DECISION_NOT_APPROVED'
  | 'DECISION_REVOKED'
  | 'VERDICT_NOT_PASS'
  | 'EVALUATION_NOT_ELIGIBLE'
  | 'EVALUATION_SUPERSEDED'
  | 'EVALUATION_PENDING';

export function certificateEligibilityBlockers(context: {
  decisionStatus: GraduationDecisionStatus;
  decisionOutcome: GraduationDecisionOutcome;
  evaluationOutcome: GraduationEvaluationOutcome;
}): EligibilityBlockReason[] {
  const blockers: EligibilityBlockReason[] = [];

  if (context.decisionStatus === GraduationDecisionStatus.REVOKED) {
    blockers.push('DECISION_REVOKED');
  } else if (context.decisionStatus !== GraduationDecisionStatus.APPROVED) {
    blockers.push('DECISION_NOT_APPROVED');
  }

  if (context.decisionOutcome !== GraduationDecisionOutcome.PASS) {
    blockers.push('VERDICT_NOT_PASS');
  }

  if (context.evaluationOutcome === GraduationEvaluationOutcome.NOT_ELIGIBLE) {
    blockers.push('EVALUATION_NOT_ELIGIBLE');
  } else if (
    context.evaluationOutcome === GraduationEvaluationOutcome.SUPERSEDED
  ) {
    blockers.push('EVALUATION_SUPERSEDED');
  } else if (
    context.evaluationOutcome === GraduationEvaluationOutcome.PENDING
  ) {
    blockers.push('EVALUATION_PENDING');
  }

  return blockers;
}

export function isCertificateEligible(context: {
  decisionStatus: GraduationDecisionStatus;
  decisionOutcome: GraduationDecisionOutcome;
  evaluationOutcome: GraduationEvaluationOutcome;
}): boolean {
  return certificateEligibilityBlockers(context).length === 0;
}

export function describeEligibilityBlocker(
  reason: EligibilityBlockReason,
): string {
  switch (reason) {
    case 'DECISION_REVOKED':
      return 'The graduation decision has been revoked and cannot be certified';
    case 'DECISION_NOT_APPROVED':
      return 'The graduation decision is not approved yet';
    case 'VERDICT_NOT_PASS':
      return 'Only a PASS graduation decision can be certified';
    case 'EVALUATION_NOT_ELIGIBLE':
      return 'The evaluation behind this decision is not eligible for certification';
    case 'EVALUATION_SUPERSEDED':
      return 'The evaluation behind this decision has been superseded';
    case 'EVALUATION_PENDING':
      return 'The evaluation behind this decision has no outcome yet';
  }
}

/**
 * Whether a template may be used to issue a certificate.
 *
 * Only `ACTIVE` templates are issuable. A `DRAFT` template has not been approved
 * for production, and an `ARCHIVED` one has been retired — issuing from either
 * would produce a document the institution does not stand behind.
 */
export function isTemplateIssuable(status: CertificateTemplateStatus): boolean {
  return status === CertificateTemplateStatus.ACTIVE;
}

export function describeTemplateBlocker(
  status: CertificateTemplateStatus,
): string {
  if (status === CertificateTemplateStatus.DRAFT) {
    return 'Certificate template is still a draft and cannot be used to issue';
  }
  return 'Certificate template is archived and cannot be used to issue';
}

/**
 * Permitted template lifecycle moves.
 *
 * `DRAFT → ACTIVE → ARCHIVED`, plus `DRAFT → ARCHIVED` for abandoning a draft.
 * `ARCHIVED` is terminal and there is no `ACTIVE → DRAFT`: a template that has
 * been used to issue a certificate must stay on the forward path, otherwise the
 * design of already-issued documents could be quietly reverted.
 */
export function canTransitionTemplate(
  from: CertificateTemplateStatus,
  to: CertificateTemplateStatus,
): boolean {
  if (from === CertificateTemplateStatus.DRAFT) {
    return (
      to === CertificateTemplateStatus.ACTIVE ||
      to === CertificateTemplateStatus.ARCHIVED
    );
  }
  if (from === CertificateTemplateStatus.ACTIVE) {
    return to === CertificateTemplateStatus.ARCHIVED;
  }
  return false;
}

export function describeTemplateTransitionBlocker(
  from: CertificateTemplateStatus,
  to: CertificateTemplateStatus,
): string {
  if (from === CertificateTemplateStatus.ARCHIVED) {
    return 'An archived certificate template is final and cannot be changed';
  }
  return `A certificate template in status ${from} cannot move to ${to}`;
}

/**
 * Whether a certificate may be withdrawn (TASK-055).
 *
 * Only an `ISSUED` certificate can be revoked. `REVOKED` is terminal: there is
 * no un-revoke, because "this document is not valid" is a statement made to
 * third parties, and silently taking it back would make the register
 * untrustworthy. Reinstating a wrongly withdrawn certificate is a new issuance
 * under a new number, which keeps both the withdrawal and the correction visible.
 */
export function canRevokeCertificate(status: CertificateStatus): boolean {
  return status === CertificateStatus.ISSUED;
}

export function describeRevocationBlocker(status: CertificateStatus): string {
  if (status === CertificateStatus.REVOKED) {
    return 'Certificate has already been revoked and cannot be revoked again';
  }
  return `A certificate in status ${status} cannot be revoked`;
}

/** Minimum length of a revocation reason. */
export const REVOCATION_REASON_MIN_LENGTH = 8;

/**
 * Whether a revocation reason is usable.
 *
 * A reason is mandatory because revocation declares that a document someone may
 * already be holding is no longer valid. The "why" is the part a verifier or an
 * auditor will need later, and it cannot be reconstructed from anything else in
 * the record — so an empty or one-word reason is not enough.
 */
export function isRevocationReasonAcceptable(reason: string): boolean {
  return reason.trim().length >= REVOCATION_REASON_MIN_LENGTH;
}

export function describeRevocationReasonBlocker(reason: string): string {
  if (!reason.trim()) {
    return 'A revocation reason is required';
  }
  return `A revocation reason must be at least ${REVOCATION_REASON_MIN_LENGTH} characters`;
}

/**
 * The public projection of a certificate.
 *
 * This is deliberately a separate, narrow shape rather than "the certificate
 * minus a few fields", because a public endpoint must expose *exactly* what was
 * chosen and nothing else. Adding a field to the internal record cannot leak it:
 * it has to be added here on purpose.
 *
 * Excluded on purpose: the holder's personnel number, any contact details, the
 * verification code itself (the caller already has it), internal ids, the
 * issuing user, and file keys.
 */
export interface PublicCertificateProjection {
  valid: boolean;
  status: string;
  certificateNumber: string;
  holderName: string;
  programName: string;
  batchName: string;
  templateName: string;
  templateVersion: number;
  issuedAt: string;
  /** Present only when the certificate has been revoked. */
  revokedReason?: string | null;
  revokedAt?: string | null;
}

/**
 * Builds the public projection from a certificate record.
 *
 * Kept pure so the "minimal public projection" acceptance criterion can be
 * asserted field-by-field in a test: a test that walks the projection's keys and
 * fails when an unexpected one appears is what stops PII creeping in later.
 */
export function toPublicProjection(certificate: {
  status: string;
  certificateNumber: string;
  issuedAt: Date;
  holderFullName: string;
  educationProgramName: string;
  educationBatchName: string;
  templateName: string;
  templateVersion: number;
  revokedReason?: string | null;
  revokedAt?: Date | null;
}): PublicCertificateProjection {
  const projection: PublicCertificateProjection = {
    valid: certificate.status === 'ISSUED',
    status: certificate.status,
    certificateNumber: certificate.certificateNumber,
    holderName: certificate.holderFullName,
    programName: certificate.educationProgramName,
    batchName: certificate.educationBatchName,
    templateName: certificate.templateName,
    templateVersion: certificate.templateVersion,
    issuedAt: certificate.issuedAt.toISOString(),
  };

  if (certificate.status !== 'ISSUED') {
    projection.revokedReason = certificate.revokedReason ?? null;
    projection.revokedAt = certificate.revokedAt
      ? certificate.revokedAt.toISOString()
      : null;
  }

  return projection;
}

/** The keys the public endpoint is allowed to return. */
export const PUBLIC_CERTIFICATE_FIELDS: readonly string[] = [
  'valid',
  'status',
  'certificateNumber',
  'holderName',
  'programName',
  'batchName',
  'templateName',
  'templateVersion',
  'issuedAt',
  'revokedReason',
  'revokedAt',
];
