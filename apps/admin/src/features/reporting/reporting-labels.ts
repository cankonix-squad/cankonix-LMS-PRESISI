import type {
  GraduationTrendGranularity,
  ReportingScopeType,
} from '@lms/api-client';

// ---------------------------------------------------------------------------
// Scope type label (Bahasa Indonesia, natural)
export const scopeTypeLabel = (scope: ReportingScopeType): string => {
  const map: Record<ReportingScopeType, string> = {
    ORGANIZATION: 'Organisasi',
    PROGRAM: 'Program',
    BATCH: 'Angkatan',
    CLASS: 'Kelas',
    CLASS_SUBJECT: 'Mata Pelajaran',
    ENROLLMENT: 'Peserta',
  };
  return map[scope] ?? scope;
};

export const scopeTypeTone = (
  scope: ReportingScopeType,
): 'slate' | 'green' | 'red' | 'blue' | 'amber' => {
  const map: Record<
    ReportingScopeType,
    'slate' | 'green' | 'red' | 'blue' | 'amber'
  > = {
    ORGANIZATION: 'blue',
    PROGRAM: 'green',
    BATCH: 'amber',
    CLASS: 'slate',
    CLASS_SUBJECT: 'red',
    ENROLLMENT: 'slate',
  };
  return map[scope];
};

export const accessLevelLabel = (level: 'NATIONAL' | 'SCOPED'): string =>
  level === 'NATIONAL' ? 'Nasional' : 'Terbatas';

export const granularityLabel = (g: GraduationTrendGranularity): string => {
  const map: Record<GraduationTrendGranularity, string> = {
    COHORT: 'Cohort',
    YEAR: 'Tahun',
    QUARTER: 'Triwulan',
    MONTH: 'Bulan',
  };
  return map[g] ?? g;
};

/** Formats a 0-100 percentage for display, keeping one decimal when needed. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('id-ID')}%`;
}

/** Formats a numeric count without false precision. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('id-ID');
}

/** Formats a date-time string into a compact Indonesian date. */
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
