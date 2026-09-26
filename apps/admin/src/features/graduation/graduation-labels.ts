import type {
  CertificateStatus,
  CertificateTemplateStatus,
  FinalGradeStatus,
  GraduationDecisionOutcome,
  GraduationDecisionStatus,
  GraduationEvaluationOutcome,
  GraduationRuleStatus,
} from '@lms/api-client';

// ---------------------------------------------------------------------------
// Graduation rule status
export const ruleStatusLabel = (s: GraduationRuleStatus): string => {
  const map: Record<GraduationRuleStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Diterbitkan',
    ARCHIVED: 'Arsip',
  };
  return map[s] ?? s;
};

export const ruleStatusTone = (
  s: GraduationRuleStatus,
): 'slate' | 'green' | 'blue' | 'amber' => {
  const map: Record<GraduationRuleStatus, 'slate' | 'green' | 'blue' | 'amber'> = {
    DRAFT: 'amber',
    PUBLISHED: 'green',
    ARCHIVED: 'slate',
  };
  return map[s];
};

// ---------------------------------------------------------------------------
// Evaluation outcome
export const evaluationOutcomeLabel = (o: GraduationEvaluationOutcome): string => {
  const map: Record<GraduationEvaluationOutcome, string> = {
    PENDING: 'Pending',
    ELIGIBLE: 'Lulus',
    NOT_ELIGIBLE: 'Tidak Lulus',
    SUPERSEDED: 'Tergantikan',
  };
  return map[o] ?? o;
};

export const evaluationOutcomeTone = (
  o: GraduationEvaluationOutcome,
): 'slate' | 'green' | 'red' | 'blue' | 'amber' => {
  const map: Record<GraduationEvaluationOutcome, 'slate' | 'green' | 'red' | 'blue' | 'amber'> = {
    PENDING: 'amber',
    ELIGIBLE: 'green',
    NOT_ELIGIBLE: 'red',
    SUPERSEDED: 'slate',
  };
  return map[o];
};

// ---------------------------------------------------------------------------
// Graduation decision outcome
export const decisionOutcomeLabel = (o: GraduationDecisionOutcome): string => {
  const map: Record<GraduationDecisionOutcome, string> = {
    PASS: 'Lulus',
    FAIL: 'Tidak Lulus',
    REMEDIAL: 'Remedial',
    WITHDRAWN: 'Mengundurkan Diri',
  };
  return map[o] ?? o;
};

export const decisionOutcomeTone = (
  o: GraduationDecisionOutcome,
): 'slate' | 'green' | 'red' | 'blue' | 'amber' => {
  const map: Record<GraduationDecisionOutcome, 'slate' | 'green' | 'red' | 'blue' | 'amber'> = {
    PASS: 'green',
    FAIL: 'red',
    REMEDIAL: 'amber',
    WITHDRAWN: 'slate',
  };
  return map[o];
};

// ---------------------------------------------------------------------------
// Graduation decision status
export const decisionStatusLabel = (s: GraduationDecisionStatus): string => {
  const map: Record<GraduationDecisionStatus, string> = {
    DRAFT: 'Draft',
    APPROVED: 'Disetujui',
    REVOKED: 'Dicabut',
  };
  return map[s] ?? s;
};

export const decisionStatusTone = (
  s: GraduationDecisionStatus,
): 'slate' | 'green' | 'blue' | 'amber' | 'red' => {
  const map: Record<GraduationDecisionStatus, 'slate' | 'green' | 'blue' | 'amber' | 'red'> = {
    DRAFT: 'amber',
    APPROVED: 'green',
    REVOKED: 'red',
  };
  return map[s];
};

// ---------------------------------------------------------------------------
// Certificate template status
export const templateStatusLabel = (s: CertificateTemplateStatus): string => {
  const map: Record<CertificateTemplateStatus, string> = {
    DRAFT: 'Draft',
    ACTIVE: 'Aktif',
    ARCHIVED: 'Arsip',
  };
  return map[s] ?? s;
};

export const templateStatusTone = (
  s: CertificateTemplateStatus,
): 'slate' | 'green' | 'blue' | 'amber' => {
  const map: Record<CertificateTemplateStatus, 'slate' | 'green' | 'blue' | 'amber'> = {
    DRAFT: 'amber',
    ACTIVE: 'green',
    ARCHIVED: 'slate',
  };
  return map[s];
};

// ---------------------------------------------------------------------------
// Certificate issued status
export const certificateStatusLabel = (s: CertificateStatus): string => {
  const map: Record<CertificateStatus, string> = {
    ISSUED: 'Diterbitkan',
    REVOKED: 'Dicabut',
  };
  return map[s] ?? s;
};

export const certificateStatusTone = (
  s: CertificateStatus,
): 'slate' | 'green' | 'red' => {
  const map: Record<CertificateStatus, 'slate' | 'green' | 'red'> = {
    ISSUED: 'green',
    REVOKED: 'red',
  };
  return map[s];
};

// ---------------------------------------------------------------------------
// Final grade status
export const finalGradeStatusLabel = (s: FinalGradeStatus): string => {
  const map: Record<FinalGradeStatus, string> = {
    CALCULATED: 'Dihitung',
    APPROVED: 'Disetujui',
    REOPENED: 'Dibuka Kembali',
  };
  return map[s] ?? s;
};

export const finalGradeStatusTone = (
  s: FinalGradeStatus,
): 'slate' | 'green' | 'blue' | 'amber' => {
  const map: Record<FinalGradeStatus, 'slate' | 'green' | 'blue' | 'amber'> = {
    CALCULATED: 'blue',
    APPROVED: 'green',
    REOPENED: 'amber',
  };
  return map[s];
};