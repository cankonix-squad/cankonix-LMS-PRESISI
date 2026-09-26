import type { AssessmentStatus, GradingSchemeStatus } from '@lms/api-client';

export function statusLabel(s: AssessmentStatus): string {
  const map: Record<AssessmentStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Dipublikasikan',
    CLOSED: 'Ditutup',
    ARCHIVED: 'Diarsipkan',
  };
  return map[s] ?? s;
}

export function statusBadgeTone(
  s: AssessmentStatus,
): 'slate' | 'blue' | 'green' | 'red' | 'amber' {
  switch (s) {
    case 'DRAFT': return 'slate';
    case 'PUBLISHED': return 'green';
    case 'CLOSED': return 'amber';
    case 'ARCHIVED': return 'red';
    default: return 'slate';
  }
}

export function gradingStatusLabel(s: GradingSchemeStatus): string {
  const map: Record<GradingSchemeStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Dipublikasikan',
    ARCHIVED: 'Diarsipkan',
  };
  return map[s] ?? s;
}

export function gradingStatusTone(
  s: GradingSchemeStatus,
): 'slate' | 'blue' | 'green' | 'red' | 'amber' {
  switch (s) {
    case 'DRAFT': return 'slate';
    case 'PUBLISHED': return 'green';
    case 'ARCHIVED': return 'red';
    default: return 'slate';
  }
}